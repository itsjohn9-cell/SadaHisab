import { ExtractedBillData, StatementRowDraft, Currency, TransactionType } from '../types';
import { db } from '../db/db';
import { extractPakistaniPhone, healAmountAndCurrency } from './excelHealer';
import { parseSMSMessage } from './smsParser';

// PDF.js worker setup
let pdfjsLib: any = null;
async function getPdfJs() {
  if (!pdfjsLib) {
    pdfjsLib = await import('pdfjs-dist');
    if (pdfjsLib.GlobalWorkerOptions && !pdfjsLib.GlobalWorkerOptions.workerSrc) {
      pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version || '4.10.38'}/pdf.worker.min.mjs`;
    }
  }
  return pdfjsLib;
}

// Convert image/file to Base64
export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// Create a small compressed thumbnail for fast display in transactions table
export async function createCompressedThumbnail(file: File, maxDim = 120): Promise<string> {
  if (file.type === 'application/pdf') {
    return 'PDF_DOC_ICON';
  }
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      let w = img.width;
      let h = img.height;
      if (w > h) {
        if (w > maxDim) {
          h = Math.round((h * maxDim) / w);
          w = maxDim;
        }
      } else {
        if (h > maxDim) {
          w = Math.round((w * maxDim) / h);
          h = maxDim;
        }
      }
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL('image/jpeg', 0.65));
      } else {
        resolve('');
      }
    };
    img.onerror = () => resolve('');
    img.src = URL.createObjectURL(file);
  });
}

// 1. Extract Text from PDF File (100% On-Device)
export async function extractTextFromPDF(file: File): Promise<string> {
  const pdfjs = await getPdfJs();
  const arrayBuffer = await file.arrayBuffer();
  const loadingTask = pdfjs.getDocument({ data: arrayBuffer });
  const pdf = await loadingTask.promise;

  let fullText = '';
  for (let pageNum = 1; pageNum <= Math.min(pdf.numPages, 10); pageNum++) {
    const page = await pdf.getPage(pageNum);
    const content = await page.getTextContent();
    const strings = content.items.map((item: any) => item.str);
    fullText += strings.join(' ') + '\n';
  }

  return fullText;
}

// 2. Extract Text from Image using Tesseract.js (100% On-Device OCR)
export async function extractTextFromImageOCR(
  file: File,
  onProgress?: (progress: number, status: string) => void
): Promise<string> {
  const { createWorker } = await import('tesseract.js');
  const worker = await createWorker('eng');

  if (onProgress) {
    onProgress(30, 'Analyzing image with on-device OCR engine...');
  }

  const ret = await worker.recognize(file);
  if (onProgress) {
    onProgress(100, 'OCR text extraction complete');
  }

  await worker.terminate();
  return ret.data.text;
}

// 3. Optional BYOK Gemini Flash Vision Mode
export async function extractBillWithGeminiVision(
  file: File,
  apiKey: string
): Promise<ExtractedBillData> {
  const base64DataUrl = await fileToBase64(file);
  const base64Content = base64DataUrl.split(',')[1];
  const mimeType = file.type || 'image/jpeg';

  const systemPrompt = `You are a financial document parser. Analyze this receipt, bill, or invoice image/PDF.
Extract and return STRICT JSON with this schema (no markdown, no backticks, ONLY JSON):
{
  "merchant": "Merchant or Biller Name (e.g. Imtiaz Super Market, DEWA, PSO, StromFiber, Green Island School)",
  "date": "YYYY-MM-DD",
  "totalAmount": 123.45,
  "taxAmount": 0.00,
  "currency": "AED | PKR | USD | GBP | SAR",
  "category": "Groceries | Utilities | School | Petrol | Bill Payment | Donation | Household | Dining",
  "subCategory": "Supermarket | Electricity & Water | Tuition Fee | Fuel | Internet",
  "accountHint": "ADCB | Al Habib | Nayapay | Easypaisa | JazzCash | SCB | Cash",
  "billReferenceNumber": "string or empty",
  "lineItems": [
    { "description": "item name", "amount": 10.00, "quantity": 1 }
  ]
}`;

  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{
        parts: [
          { text: systemPrompt },
          {
            inlineData: {
              mimeType,
              data: base64Content
            }
          }
        ]
      }]
    })
  });

  if (!response.ok) {
    throw new Error(`Gemini API error ${response.status}: ${await response.text()}`);
  }

  const result = await response.json();
  const rawCandidateText = result.candidates?.[0]?.content?.parts?.[0]?.text || '';
  
  // Clean JSON output
  const cleanJson = rawCandidateText.replace(/```json/gi, '').replace(/```/g, '').trim();
  const parsed = JSON.parse(cleanJson);

  return {
    merchant: parsed.merchant || 'Scanned Merchant',
    date: parsed.date || new Date().toISOString().split('T')[0],
    totalAmount: Number(parsed.totalAmount) || 0,
    taxAmount: Number(parsed.taxAmount) || 0,
    currency: (parsed.currency?.toUpperCase() as Currency) || 'PKR',
    category: parsed.category || 'General',
    subCategory: parsed.subCategory,
    accountHint: parsed.accountHint,
    billReferenceNumber: parsed.billReferenceNumber,
    lineItems: parsed.lineItems || [],
    rawText: rawCandidateText,
    confidence: 'HIGH',
    sourceEngine: 'GEMINI_VISION'
  };
}

// 4. Deterministic NLP Parser for On-Device Text Layer (PDF / OCR)
export function parseExtractedReceiptText(rawText: string, engine: 'LOCAL_PDF' | 'LOCAL_OCR'): ExtractedBillData {
  const lines = rawText.split('\n').map(l => l.trim()).filter(Boolean);
  let merchant = 'Scanned Receipt / Bill';
  let date = new Date().toISOString().split('T')[0];
  let totalAmount = 0;
  let currency: Currency = 'PKR';
  let category = 'Household';
  let subCategory: string | undefined;
  let billRef: string | undefined;
  const lineItems: Array<{ description: string; amount: number }> = [];

  const lower = rawText.toLowerCase();

  // Detect Currency
  if (lower.includes('aed') || lower.includes('dirham') || lower.includes('dh') || lower.includes('dewa') || lower.includes('addc') || lower.includes('adcb')) {
    currency = 'AED';
  } else if (lower.includes('usd') || lower.includes('$') || lower.includes('wise')) {
    currency = 'USD';
  } else if (lower.includes('gbp') || lower.includes('£')) {
    currency = 'GBP';
  } else {
    currency = 'PKR';
  }

  // Detect Merchant & Category
  if (lower.includes('imtiaz')) {
    merchant = 'Imtiaz Super Market';
    category = 'Grocery';
    subCategory = 'Supermarket';
  } else if (lower.includes('lulu')) {
    merchant = 'Lulu Hypermarket';
    category = 'Grocery';
    currency = 'AED';
  } else if (lower.includes('carrefour')) {
    merchant = 'Carrefour';
    category = 'Grocery';
    currency = 'AED';
  } else if (lower.includes('pso') || lower.includes('petrol') || lower.includes('pakistan state oil')) {
    merchant = 'PSO Petrol Station';
    category = 'Petrol';
    subCategory = 'Fuel';
  } else if (lower.includes('shell')) {
    merchant = 'Shell Fuel Station';
    category = 'Petrol';
    subCategory = 'Fuel';
  } else if (lower.includes('green island')) {
    merchant = 'Green Island School';
    category = 'School';
    subCategory = 'Tuition Fee';
    totalAmount = 12525;
  } else if (lower.includes('asghar') && lower.includes('van')) {
    merchant = 'Asghar Bhai Van';
    category = 'Van';
    subCategory = 'School Transport';
    totalAmount = 3500;
  } else if (lower.includes('stromfiber')) {
    merchant = 'StromFiber Internet';
    category = 'Bill Payment';
    subCategory = 'Internet';
  } else if (lower.includes('dewa')) {
    merchant = 'DEWA Dubai Electricity & Water';
    category = 'Utilities';
    currency = 'AED';
  } else if (lower.includes('addc')) {
    merchant = 'ADDC Abu Dhabi Distribution';
    category = 'Utilities';
    currency = 'AED';
  } else if (lower.includes('muhammadi')) {
    merchant = 'Muhammadi Welfare Trust';
    category = 'Donation';
  } else if (lines.length > 0) {
    // First line often holds store name
    merchant = lines[0].slice(0, 35);
  }

  // Extract Date
  const dateMatch = rawText.match(/(\d{1,2})[\/\.-](\d{1,2}|\w{3})[\/\.-](\d{2,4})/);
  if (dateMatch) {
    try {
      const parsedD = Date.parse(dateMatch[0]);
      if (!isNaN(parsedD)) {
        date = new Date(parsedD).toISOString().split('T')[0];
      }
    } catch {
      // keep today
    }
  }

  // Extract Total Amount
  if (totalAmount === 0) {
    // Search for keywords like "Total", "Grand Total", "Net Amount", "Amount Paid"
    const totalMatch = rawText.match(/(?:Total|Grand Total|Net Amount|Total Amount|Amount Due|Paid)\s*[:=]?\s*(?:Rs\.?|PKR|AED|USD|\$)?\s*([0-9,]+(?:\.[0-9]{1,2})?)/i);
    if (totalMatch) {
      totalAmount = parseFloat(totalMatch[1].replace(/,/g, '')) || 0;
    } else {
      // Fallback: search for highest numeric decimal in text
      const nums = rawText.match(/[0-9]+(?:\.[0-9]{2})/g);
      if (nums) {
        const parsedNums = nums.map(n => parseFloat(n)).filter(n => n > 0 && n < 1000000);
        if (parsedNums.length > 0) {
          totalAmount = Math.max(...parsedNums);
        }
      }
    }
  }

  // Extract Bill Reference Number
  const refMatch = rawText.match(/(?:Ref|Bill No|Invoice No|Receipt No|Account No|Voucher No)\s*[:#]?\s*([A-Za-z0-9\-]+)/i);
  if (refMatch) {
    billRef = refMatch[1];
  }

  return {
    merchant,
    date,
    totalAmount,
    currency,
    category,
    subCategory,
    billReferenceNumber: billRef,
    lineItems,
    rawText,
    confidence: totalAmount > 0 ? 'HIGH' : 'MEDIUM',
    sourceEngine: engine
  };
}

// 5. Multi-Row Bank / Card Statement Parser (50+ Row Staging Table)
export function parseStatementTextToRows(rawText: string, defaultAccountId = 'adcb-aed'): StatementRowDraft[] {
  const lines = rawText.split('\n').map(l => l.trim()).filter(Boolean);
  const rows: StatementRowDraft[] = [];

  // Match typical statement lines: Date (DD/MM or DD-MM-YYYY) + Description + Amount (optional DR/CR)
  const lineRegex = /^(\d{1,2}[\/\.-]\d{1,2}(?:[\/\.-]\d{2,4})?)\s+(.+?)\s+([0-9,]+\.[0-9]{2})\s*(DR|CR)?$/i;

  let idCounter = 1;
  for (const line of lines) {
    const match = line.match(lineRegex);
    if (match) {
      const rawDate = match[1];
      const desc = match[2].trim();
      const rawAmt = parseFloat(match[3].replace(/,/g, '')) || 0;
      const typeIndicator = (match[4] || '').toUpperCase();

      const direction: TransactionType = (typeIndicator === 'CR' || desc.toLowerCase().includes('salary') || desc.toLowerCase().includes('deposit')) 
        ? 'INCOME' 
        : 'EXPENSE';

      // Infer currency & category
      let curr: Currency = 'AED';
      if (desc.toLowerCase().includes('pkr') || desc.toLowerCase().includes('habib') || desc.toLowerCase().includes('pakistan')) {
        curr = 'PKR';
      }

      let category = 'Statement Expense';
      if (desc.toLowerCase().includes('lulu') || desc.toLowerCase().includes('carrefour') || desc.toLowerCase().includes('supermarket')) category = 'Grocery';
      else if (desc.toLowerCase().includes('dewa') || desc.toLowerCase().includes('addc') || desc.toLowerCase().includes('etisalat')) category = 'Utilities';
      else if (desc.toLowerCase().includes('petrol') || desc.toLowerCase().includes('fuel') || desc.toLowerCase().includes('enoc') || desc.toLowerCase().includes('adnoc')) category = 'Petrol';
      else if (desc.toLowerCase().includes('school') || desc.toLowerCase().includes('tuition')) category = 'School';
      else if (desc.toLowerCase().includes('salary')) category = 'Salary';

      let fullDate = new Date().toISOString().split('T')[0];
      try {
        const d = Date.parse(rawDate);
        if (!isNaN(d)) fullDate = new Date(d).toISOString().split('T')[0];
      } catch {}

      rows.push({
        id: `stmt-${Date.now()}-${idCounter++}`,
        date: fullDate,
        description: desc,
        amount: rawAmt,
        currency: curr,
        direction,
        inferredCategory: category,
        inferredAccountId: defaultAccountId,
        selected: true
      });
    }
  }

  return rows;
}
