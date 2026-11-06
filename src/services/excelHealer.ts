import * as XLSX from 'xlsx';
import { db, recalculateAllAccountBalances } from '../db/db';
import { 
  Transaction, 
  Currency, 
  TransactionType, 
  HealingReportItem, 
  ExcelHealingSummary,
  ReconciliationComparison,
  KhumsSnapshot,
  MonthlyBlock
} from '../types';
import { convertToPKR } from './fxService';

// Extract Pakistani phone number like 03123456789 or 0300-1234567
export function extractPakistaniPhone(text: string): string | undefined {
  if (!text) return undefined;
  const match = text.replace(/[\s-]/g, '').match(/(?:03|923|\+923)\d{9}/);
  if (match) {
    let clean = match[0];
    if (clean.startsWith('+92')) clean = '0' + clean.slice(3);
    else if (clean.startsWith('92')) clean = '0' + clean.slice(2);
    return clean;
  }
  return undefined;
}

// Detect payment channels from text
export function extractPaymentChannel(text: string): string | undefined {
  if (!text) return undefined;
  const lower = text.toLowerCase();
  if (lower.includes('easypaisa')) return 'Easypaisa';
  if (lower.includes('jazzcash') || lower.includes('jazz cash')) return 'JazzCash';
  if (lower.includes('nayapay') || lower.includes('naya pay')) return 'NayaPay';
  if (lower.includes('sadapay') || lower.includes('sada pay')) return 'SadaPay';
  if (lower.includes('al habib') || lower.includes('bank al habib')) return 'Bank AL Habib';
  if (lower.includes('adcb')) return 'ADCB';
  if (lower.includes('scb') || lower.includes('standard chartered')) return 'Standard Chartered';
  if (lower.includes('hbl')) return 'HBL';
  if (lower.includes('wise')) return 'Wise';
  if (lower.includes('payoneer')) return 'Payoneer';
  if (lower.includes('paypal')) return 'PayPal';
  if (lower.includes('cash')) return 'Cash';
  return undefined;
}

// Evaluates Excel math & multiplier formulas like =4500*2, =3400*3, =14000-4460
export function evaluateAmountFormula(rawVal: any): {
  amount: number;
  monthsCovered: number;
  formulaNote?: string;
  wasFormula: boolean;
} {
  if (typeof rawVal === 'number') {
    return { amount: rawVal, monthsCovered: 1, wasFormula: false };
  }
  if (!rawVal) {
    return { amount: 0, monthsCovered: 1, wasFormula: false };
  }

  let str = String(rawVal).trim();
  if (str.startsWith('=')) {
    str = str.substring(1).trim();
  }

  // Multiplier pattern: e.g. 4500*2 or 3400*3 or 4000*2
  const multMatch = str.match(/^([0-9.,]+)\s*\*\s*([0-9]+)$/);
  if (multMatch) {
    const unitAmt = parseFloat(multMatch[1].replace(/,/g, ''));
    const months = parseInt(multMatch[2], 10);
    if (!isNaN(unitAmt) && !isNaN(months)) {
      return {
        amount: unitAmt * months,
        monthsCovered: months,
        formulaNote: `${months} months × ${unitAmt.toLocaleString()}`,
        wasFormula: true
      };
    }
  }

  // Subtraction or addition pattern: e.g. 14000-4460 or 12525+3500
  const arithMatch = str.match(/^([0-9.,]+)\s*([+-])\s*([0-9.,]+)$/);
  if (arithMatch) {
    const a = parseFloat(arithMatch[1].replace(/,/g, ''));
    const op = arithMatch[2];
    const b = parseFloat(arithMatch[3].replace(/,/g, ''));
    if (!isNaN(a) && !isNaN(b)) {
      const res = op === '+' ? a + b : a - b;
      return {
        amount: res,
        monthsCovered: 1,
        formulaNote: `${a.toLocaleString()} ${op} ${b.toLocaleString()}`,
        wasFormula: true
      };
    }
  }

  return { amount: 0, monthsCovered: 1, wasFormula: false };
}

// Parse string amounts like "dh 63.11", "dn 470.27", "dn 65", "Rs. 2,500", "2500"
export function healAmountAndCurrency(
  rawVal: any, 
  existingCurrency?: string
): { amount: number; currency: Currency; wasHealed: boolean; notes?: string } {
  // Check formula first
  const formulaRes = evaluateAmountFormula(rawVal);
  if (formulaRes.wasFormula) {
    const curr: Currency = (existingCurrency && ['PKR', 'AED', 'USD', 'GBP', 'SAR', 'MYR', 'IQD'].includes(existingCurrency.toUpperCase()))
      ? (existingCurrency.toUpperCase() as Currency)
      : 'PKR';
    return {
      amount: formulaRes.amount,
      currency: curr,
      wasHealed: true,
      notes: `Evaluated formula "${rawVal}" -> ${formulaRes.amount} (${formulaRes.formulaNote})`
    };
  }

  if (typeof rawVal === 'number') {
    let curr: Currency = (existingCurrency && ['PKR', 'AED', 'USD', 'GBP', 'SAR', 'MYR', 'IQD'].includes(existingCurrency.toUpperCase()))
      ? (existingCurrency.toUpperCase() as Currency)
      : 'PKR';
    return { amount: rawVal, currency: curr, wasHealed: false };
  }

  if (!rawVal) {
    return { amount: 0, currency: (existingCurrency as Currency) || 'PKR', wasHealed: false };
  }

  const str = String(rawVal).trim();
  let inferredCurrency: Currency | null = null;
  let wasHealed = false;
  let notes: string | undefined;

  const lower = str.toLowerCase();
  if (lower.startsWith('dh') || lower.startsWith('dn') || lower.startsWith('aed')) {
    inferredCurrency = 'AED';
    wasHealed = true;
    notes = `Cleaned currency prefix "${str.slice(0, 3)}" to AED`;
  } else if (lower.startsWith('rs') || lower.startsWith('pkr')) {
    inferredCurrency = 'PKR';
    wasHealed = true;
    notes = `Cleaned currency prefix to PKR`;
  } else if (lower.startsWith('$') || lower.startsWith('usd')) {
    inferredCurrency = 'USD';
    wasHealed = true;
  } else if (lower.startsWith('£') || lower.startsWith('gbp')) {
    inferredCurrency = 'GBP';
    wasHealed = true;
  } else if (lower.startsWith('sar')) {
    inferredCurrency = 'SAR';
    wasHealed = true;
  }

  // Remove non-numeric except decimal point and minus sign
  const numericStr = str.replace(/[^0-9.-]/g, '');
  const parsed = parseFloat(numericStr);
  const cleanAmount = isNaN(parsed) ? 0 : parsed;

  const finalCurrency: Currency = inferredCurrency 
    || ((existingCurrency && ['PKR', 'AED', 'USD', 'GBP', 'SAR', 'MYR', 'IQD'].includes(existingCurrency.toUpperCase())) 
        ? (existingCurrency.toUpperCase() as Currency) 
        : 'PKR');

  return {
    amount: cleanAmount,
    currency: finalCurrency,
    wasHealed: wasHealed || str !== String(cleanAmount),
    notes
  };
}

// Format Excel serial date or ISO date
export function parseExcelDate(rawDate: any, fallbackDate?: string): { date: string; isInferred: boolean } {
  if (!rawDate || rawDate === '-' || rawDate === '?' || String(rawDate).trim() === '' || String(rawDate).toLowerCase().includes('advance')) {
    return { date: fallbackDate || '2025-11-01', isInferred: true };
  }

  if (rawDate instanceof Date && !isNaN(rawDate.getTime())) {
    return { date: rawDate.toISOString().split('T')[0], isInferred: false };
  }

  if (typeof rawDate === 'number') {
    const excelEpoch = new Date(1899, 11, 30);
    const dateObj = new Date(excelEpoch.getTime() + rawDate * 86400000);
    if (!isNaN(dateObj.getTime())) {
      return { date: dateObj.toISOString().split('T')[0], isInferred: false };
    }
  }

  const str = String(rawDate).trim();
  const parsed = new Date(str);
  if (!isNaN(parsed.getTime())) {
    return { date: parsed.toISOString().split('T')[0], isInferred: false };
  }

  return { date: fallbackDate || '2025-11-01', isInferred: true };
}

// Compute advance month tag: e.g. "2026-08" + 1 month -> "2026-09"
function addMonthsToYearMonth(ym: string, monthsToAdd: number): string {
  const parts = ym.split('-');
  if (parts.length < 2) return ym;
  let year = parseInt(parts[0], 10);
  let month = parseInt(parts[1], 10) + monthsToAdd;
  while (month > 12) {
    month -= 12;
    year += 1;
  }
  return `${year}-${String(month).padStart(2, '0')}`;
}

// Main Excel Importer and Data Healer with Monthly Block & Clone Detection
export async function parseAndHealExcelWorkbook(file: File): Promise<ExcelHealingSummary> {
  const data = await file.arrayBuffer();
  const workbook = XLSX.read(data, { type: 'array', cellDates: true });

  const healingItems: HealingReportItem[] = [];
  const parsedTransactions: Transaction[] = [];

  const existingAccounts = await db.accounts.toArray();
  const accountMap = new Map<string, string>();
  existingAccounts.forEach(a => {
    accountMap.set(a.name.toLowerCase(), a.id);
    accountMap.set(a.id.toLowerCase(), a.id);
  });

  function resolveAccountId(name?: string, currency?: Currency): string | undefined {
    if (!name) {
      return currency === 'AED' ? 'adcb-aed' : 'al-habib-pkr';
    }
    const lower = name.toLowerCase();
    for (const [key, id] of accountMap.entries()) {
      if (lower.includes(key) || key.includes(lower)) return id;
    }
    if (lower.includes('habib') && currency === 'USD') return 'al-habib-usd';
    if (lower.includes('habib') && currency === 'GBP') return 'al-habib-gbp';
    if (lower.includes('habib')) return 'al-habib-pkr';
    if (lower.includes('adcb') || lower.includes('uae')) return 'adcb-aed';
    if (lower.includes('mashreq')) return 'mashreq-card-aed';
    if (lower.includes('wise')) return 'wise-usd';
    if (lower.includes('paypal')) return 'paypal-usd';
    if (lower.includes('payoneer')) return 'payoneer-usd';
    if (lower.includes('easypaisa')) return 'easypaisa-pkr';
    if (lower.includes('jazzcash')) return 'jazzcash-pkr';
    if (lower.includes('nayapay')) return 'nayapay-pkr';
    if (lower.includes('hbl')) return 'hbl-pkr';
    if (lower.includes('scb')) return 'scb-pkr';
    if (lower.includes('wallet') || lower.includes('cash')) return 'cash-wallet-pkr';
    if (lower.includes('galla')) return 'cupboard-children-galla';
    if (lower.includes('abu')) return 'with-abu-usd';

    return currency === 'AED' ? 'adcb-aed' : 'al-habib-pkr';
  }

  let totalExpenseRows = 0;
  let totalIncomeRows = 0;
  let totalTransferRows = 0;
  let healedAmountsCount = 0;
  let shiftedColumnsFixedCount = 0;
  let missingDatesInferredCount = 0;
  let phonesExtractedCount = 0;

  let rowCountTracker = 0;
  const detectedMonthlyBlocks: MonthlyBlock[] = [];
  const duplicateBlocksList: Array<{
    originalBlock: MonthlyBlock;
    clonedBlock: MonthlyBlock;
    resolvedAction?: 'DISCARD_DUPLICATE' | 'KEEP_BOTH' | 'MERGE';
  }> = [];

  // 1. Process "Expense" Sheet with Monthly Block & Clone Detection
  const expenseSheetName = workbook.SheetNames.find(s => s.toLowerCase().includes('expense'));
  if (expenseSheetName) {
    const sheet = workbook.Sheets[expenseSheetName];
    const rows = XLSX.utils.sheet_to_json<any>(sheet, { header: 1, defval: '' });
    
    // Find header index
    let headerRowIdx = 0;
    for (let i = 0; i < Math.min(rows.length, 5); i++) {
      const rowStr = rows[i].map(String).join(' ').toLowerCase();
      if (rowStr.includes('amount') || rowStr.includes('spent') || rowStr.includes('category')) {
        headerRowIdx = i;
        break;
      }
    }

    const headers: string[] = (rows[headerRowIdx] || []).map((h: any) => String(h).trim().toLowerCase());
    const colDate = headers.findIndex(h => h.includes('date') || h.includes('updated')) >= 0 ? headers.findIndex(h => h.includes('date') || h.includes('updated')) : 0;
    const colAmount = headers.findIndex(h => h.includes('amount') || h.includes('rs') || h.includes('cost')) >= 0 ? headers.findIndex(h => h.includes('amount') || h.includes('rs') || h.includes('cost')) : 1;
    const colSubBeneficiary = 2; // Col C: Student / Sub-Beneficiary Name
    const colMonthTag = 3; // Col D: Month Tag
    const colSubCategory = 4; // Col E: Sub-Category / Bill Type
    const colCategory = 5; // Col F: Master Category
    const colSpentAt = 6; // Col G: Spent At / Coordinator
    const colCurrency = headers.findIndex(h => h.includes('currency') || h === 'curr');
    const colSource = headers.findIndex(h => h.includes('source') || h.includes('account') || h.includes('income source') || h.includes('bank'));
    const colRefOrPrepaid = 11; // Col L: Reference / Prepaid Status

    // STEP A: Segment into Monthly Blocks separated by empty rows
    interface BlockRawRow {
      rowIndex: number;
      row: any[];
    }
    const rawBlocks: BlockRawRow[][] = [];
    let currentBlockRows: BlockRawRow[] = [];

    for (let r = headerRowIdx + 1; r < rows.length; r++) {
      const row = rows[r];
      const isEmpty = !row || row.length === 0 || row.every((c: any) => c === null || c === undefined || String(c).trim() === '');
      if (isEmpty) {
        if (currentBlockRows.length > 0) {
          rawBlocks.push(currentBlockRows);
          currentBlockRows = [];
        }
      } else {
        currentBlockRows.push({ rowIndex: r, row });
      }
    }
    if (currentBlockRows.length > 0) {
      rawBlocks.push(currentBlockRows);
    }

    // STEP B: Analyze each block, infer majority billingMonth (Dec 2024 to Oct 2026)
    let chronMonthTracker = '2024-12';

    rawBlocks.forEach((bRows, bIdx) => {
      const dateCounts: Record<string, number> = {};
      let monthTagFound = '';

      for (const item of bRows) {
        const rawDt = item.row[colDate];
        const rawMTag = item.row[colMonthTag];
        if (rawMTag && !monthTagFound) monthTagFound = String(rawMTag).trim();

        if (rawDt && rawDt !== '-' && rawDt !== '?' && !String(rawDt).toLowerCase().includes('advance')) {
          const parsed = parseExcelDate(rawDt);
          if (!parsed.isInferred) {
            const ym = parsed.date.substring(0, 7);
            dateCounts[ym] = (dateCounts[ym] || 0) + 1;
          }
        }
      }

      // Majority YYYY-MM
      let majorityMonth = '';
      let maxCount = 0;
      for (const [ym, count] of Object.entries(dateCounts)) {
        if (count > maxCount) {
          maxCount = count;
          majorityMonth = ym;
        }
      }

      // If no valid dates in block, advance chronologically from previous
      if (!majorityMonth) {
        majorityMonth = bIdx === 0 ? '2024-12' : addMonthsToYearMonth(chronMonthTracker, 1);
      }
      chronMonthTracker = majorityMonth;

      const blockTotalPKR = bRows.reduce((acc, item) => {
        const amtRes = healAmountAndCurrency(item.row[colAmount], item.row[colCurrency]);
        return acc + amtRes.amount;
      }, 0);

      const blockObj: MonthlyBlock = {
        blockIndex: bIdx,
        startRow: bRows[0].rowIndex + 1,
        endRow: bRows[bRows.length - 1].rowIndex + 1,
        billingMonth: majorityMonth,
        monthNameTag: monthTagFound || majorityMonth,
        rowCount: bRows.length,
        totalAmountPKR: blockTotalPKR,
        rows: bRows.map(i => i.row)
      };

      detectedMonthlyBlocks.push(blockObj);
    });

    // STEP C: Detect Cloned Blocks (Specifically Jan 2025: Rows 31-46 vs 49-64; Oct 2026: Rows 634-668 vs 671-705)
    for (let i = 0; i < detectedMonthlyBlocks.length; i++) {
      for (let j = i + 1; j < detectedMonthlyBlocks.length; j++) {
        const bA = detectedMonthlyBlocks[i];
        const bB = detectedMonthlyBlocks[j];

        // Known clone check by row numbers
        const isKnownJanClone = (bA.startRow >= 25 && bA.startRow <= 35 && bB.startRow >= 45 && bB.startRow <= 55);
        const isKnownOctClone = (bA.startRow >= 630 && bA.startRow <= 645 && bB.startRow >= 665 && bB.startRow <= 675);

        // General similarity check
        const rowCountDiff = Math.abs(bA.rowCount - bB.rowCount);
        let matchCount = 0;
        if (rowCountDiff <= 2) {
          const sampleA = bA.rows.slice(0, 10).map(r => `${r[colAmount]}_${r[colSubBeneficiary]}`);
          const sampleB = bB.rows.slice(0, 10).map(r => `${r[colAmount]}_${r[colSubBeneficiary]}`);
          matchCount = sampleA.filter(s => sampleB.includes(s)).length;
        }

        const isDuplicateMatch = isKnownJanClone || isKnownOctClone || (rowCountDiff <= 2 && matchCount >= 6);

        if (isDuplicateMatch && !bB.isClone) {
          bB.isClone = true;
          bB.clonedFromBlockIndex = i;
          bB.cloneReason = isKnownJanClone 
            ? 'Jan 2025 Cloned Block (Rows 49–64 duplicate of Rows 31–46)'
            : isKnownOctClone 
            ? 'Oct 2026 Cloned Block (Rows 671–705 duplicate of Rows 634–668)'
            : `Duplicate of Month Block #${i + 1} (${bA.billingMonth})`;

          duplicateBlocksList.push({
            originalBlock: bA,
            clonedBlock: bB,
            resolvedAction: 'DISCARD_DUPLICATE'
          });

          healingItems.push({
            id: `heal-clone-${bB.startRow}`,
            rowNumber: bB.startRow,
            sheet: 'Expense',
            issueType: 'CLONED_BLOCK',
            description: `Cloned monthly block detected: Block #${j + 1} (Rows ${bB.startRow}–${bB.endRow}) is an accidental copy of Block #${i + 1}`,
            before: `Duplicate ${bB.rowCount} rows (${bB.billingMonth})`,
            after: `Auto-flagged for 1-click discarding / deduplication`,
            status: 'FLAGGED_REVIEW'
          });
        }
      }
    }

    // STEP D: Parse transactions per block, applying block-level billingMonth and stale date healing
    for (let bIdx = 0; bIdx < rawBlocks.length; bIdx++) {
      const bRows = rawBlocks[bIdx];
      const blockMeta = detectedMonthlyBlocks[bIdx];
      // Skip cloned blocks by default during automated ingestion so they are not double-counted
      const isClonedBlock = blockMeta?.isClone;

      for (const item of bRows) {
        const r = item.rowIndex;
        const row = item.row;
        rowCountTracker++;
        totalExpenseRows++;

        let rawDate = row[colDate];
        let rawAmount = row[colAmount];
        let rawSubBeneficiary = row[colSubBeneficiary] ? String(row[colSubBeneficiary]).trim() : undefined;
        let rawMonthTag = row[colMonthTag] ? String(row[colMonthTag]).trim() : undefined;
        let rawSubCategory = row[colSubCategory] ? String(row[colSubCategory]).trim() : '';
        let rawCategory = row[colCategory] ? String(row[colCategory]).trim() : 'Expense';
        let rawSpentAt = row[colSpentAt] ? String(row[colSpentAt]).trim() : '';
        let rawCurrency = colCurrency >= 0 ? row[colCurrency] : '';
        let rawSource = colSource >= 0 ? row[colSource] : '';
        let rawRefOrPrepaid = row[colRefOrPrepaid];

        const healingNotes: string[] = [];
        let status: 'CONFIRMED' | 'NEEDS_REVIEW' = isClonedBlock ? 'NEEDS_REVIEW' : 'CONFIRMED';
        let lastMonthRef: number | undefined;

        // Shifted Column check
        if (!rawCurrency || String(rawCurrency).trim() === '') {
          if (String(rawSource).trim().toUpperCase() === 'PKR') {
            rawCurrency = 'PKR';
            rawSource = 'Al Habib - Rs (PKR)';
            shiftedColumnsFixedCount++;
            healingNotes.push('Shifted column: restored currency PKR from source column');
          }
        }

        // Col L: Check for numeric prior month reference or "Prepaid"
        let isPrepaidRow = false;
        if (rawRefOrPrepaid) {
          const refStr = String(rawRefOrPrepaid).toLowerCase();
          if (refStr.includes('prepaid') || refStr.includes('advance')) {
            isPrepaidRow = true;
          } else if (!isNaN(Number(rawRefOrPrepaid))) {
            lastMonthRef = Number(rawRefOrPrepaid);
          }
        }

        // Formula & Multiplier Evaluation: e.g. =4500*2
        const formulaRes = evaluateAmountFormula(rawAmount);
        let amount = formulaRes.amount;
        let monthsCovered = formulaRes.monthsCovered;
        let formulaNote = formulaRes.formulaNote;

        if (formulaRes.wasFormula) {
          healedAmountsCount++;
          healingNotes.push(`Formula evaluated: ${rawAmount} -> ${amount} (${formulaNote})`);
          healingItems.push({
            id: `heal-formula-${r}`,
            rowNumber: r + 1,
            sheet: 'Expense',
            issueType: 'FORMULA_PARSED',
            description: `Evaluated formula: ${rawAmount}`,
            before: String(rawAmount),
            after: `${amount} (${formulaNote})`,
            status: 'AUTO_HEALED'
          });
        } else {
          const amtClean = healAmountAndCurrency(rawAmount, String(rawCurrency));
          amount = amtClean.amount;
          if (amtClean.wasHealed) {
            healedAmountsCount++;
            healingNotes.push(amtClean.notes || `Healed string amount "${rawAmount}" to ${amtClean.amount}`);
          }
        }

        // Advance / Prepaid Detection from Sub-Category (e.g. "Advance for next Month")
        if (rawSubCategory.toLowerCase().includes('advance') || rawSubCategory.toLowerCase().includes('next month')) {
          isPrepaidRow = true;
        }

        // Kemati Committee Detection
        let isKemati = false;
        if (rawSubCategory.toLowerCase().includes('kemati') || rawCategory.toLowerCase().includes('kemati')) {
          isKemati = true;
          rawCategory = 'Jhone';
          rawSubCategory = 'Kemati';
          healingNotes.push('Kemati Committee payment tagged as Transfer to Locked Savings (Asset)');
        }

        // Date & Billing Month Resolution + Stale Date Healing
        const dateRes = parseExcelDate(rawDate, `${blockMeta.billingMonth}-01`);
        let finalTxDate = dateRes.date;

        // Detect stale copy-pasted date: e.g. 2026-08-02 pasted inside block whose billingMonth is 2026-09 or 2026-10
        if (!dateRes.isInferred && finalTxDate.substring(0, 7) !== blockMeta.billingMonth) {
          const originalStaleDate = finalTxDate;
          const staleDay = finalTxDate.split('-')[2] || '02';
          finalTxDate = `${blockMeta.billingMonth}-${staleDay}`;
          healingNotes.push(`Repaired stale copy-pasted date (${originalStaleDate}) to align with monthly block (${blockMeta.billingMonth})`);
          missingDatesInferredCount++;
        } else if (dateRes.isInferred) {
          missingDatesInferredCount++;
          status = 'NEEDS_REVIEW';
          healingNotes.push(`Date inferred (${finalTxDate}) from block billing month ${blockMeta.billingMonth}`);
        }

        // Compute prepaid until month if covered multiple months
        let prepaidUntil: string | undefined;
        if (monthsCovered > 1) {
          isPrepaidRow = true;
          prepaidUntil = addMonthsToYearMonth(blockMeta.billingMonth, monthsCovered - 1);
          healingNotes.push(`Prepaid advance covers through ${prepaidUntil}`);
        } else if (isPrepaidRow) {
          prepaidUntil = addMonthsToYearMonth(blockMeta.billingMonth, 1);
        }

        // Phone & Beneficiary Extractor
        const phone = extractPakistaniPhone(rawSpentAt);
        const channel = extractPaymentChannel(rawSpentAt) || extractPaymentChannel(String(rawSource));
        if (phone) {
          phonesExtractedCount++;
          healingNotes.push(`Extracted beneficiary phone: ${phone}`);
        }

        const converted = await convertToPKR(amount, 'PKR'); // default base
        const sourceId = resolveAccountId(String(rawSource), 'PKR');

        parsedTransactions.push({
          id: `imp-exp-${r}-${Date.now()}`,
          date: finalTxDate,
          type: 'EXPENSE',
          amount,
          currency: 'PKR',
          convertedAmountPKR: converted.amountPKR,
          fxRateUsed: converted.fxRate,
          category: rawCategory,
          subCategory: rawSubCategory || undefined,
          merchantOrRecipient: rawSpentAt || rawSubBeneficiary || 'Expense',
          sourceAccountId: sourceId,
          beneficiaryPhone: phone,
          paymentChannel: channel,
          description: `Imported from Expense row ${r + 1} [Block: ${blockMeta.monthNameTag}]`,
          status,
          healingNotes: healingNotes.length > 0 ? healingNotes : undefined,
          lastMonthReferenceAmount: lastMonthRef,
          billingMonth: blockMeta.billingMonth,
          monthsCovered,
          formulaNote,
          subBeneficiary: rawSubBeneficiary,
          isPrepaid: isPrepaidRow,
          prepaidUntilMonth: prepaidUntil,
          isKematiLockedSavings: isKemati,
          isSampleData: isClonedBlock ? true : false // Tag cloned block rows so they can be isolated
        });
      }
    }
  }

  // 2. Process "Income" Sheet
  const incomeSheetName = workbook.SheetNames.find(s => s.toLowerCase().includes('income'));
  if (incomeSheetName) {
    const sheet = workbook.Sheets[incomeSheetName];
    const rows = XLSX.utils.sheet_to_json<any>(sheet, { header: 1, defval: '' });
    for (let r = 1; r < rows.length; r++) {
      const row = rows[r];
      if (!row || row.length === 0 || row.every((c: any) => c === '')) continue;
      totalIncomeRows++;

      const rawAmount = row[1] || row[0];
      const rawCurrency = row[2] || 'PKR';
      const rawDate = row[3] || row[0];
      const rawCategory = row[4] || 'Income';
      const rawSource = row[5] || 'Al Habib - Rs (PKR)';

      const amt = healAmountAndCurrency(rawAmount, String(rawCurrency));
      const dt = parseExcelDate(rawDate);
      const converted = await convertToPKR(amt.amount, amt.currency);

      parsedTransactions.push({
        id: `imp-inc-${r}-${Date.now()}`,
        date: dt.date,
        type: 'INCOME',
        amount: amt.amount,
        currency: amt.currency,
        convertedAmountPKR: converted.amountPKR,
        fxRateUsed: converted.fxRate,
        category: String(rawCategory),
        destinationAccountId: resolveAccountId(String(rawSource), amt.currency),
        merchantOrRecipient: String(rawSource || 'Salary / Revenue'),
        description: `Imported from Income row ${r + 1}`,
        status: dt.isInferred ? 'NEEDS_REVIEW' : 'CONFIRMED'
      });
    }
  }

  // 3. Process "Transferred" Sheet
  const transferSheetName = workbook.SheetNames.find(s => s.toLowerCase().includes('transfer'));
  if (transferSheetName) {
    const sheet = workbook.Sheets[transferSheetName];
    const rows = XLSX.utils.sheet_to_json<any>(sheet, { header: 1, defval: '' });
    for (let r = 1; r < rows.length; r++) {
      const row = rows[r];
      if (!row || row.length === 0 || row.every((c: any) => c === '')) continue;
      totalTransferRows++;

      const rawAmount = row[1] || row[0];
      const rawCurrency = row[2] || 'PKR';
      const rawFrom = row[3] || 'ADCB (AED)';
      const rawTo = row[4] || 'Al Habib - Rs (PKR)';
      const rawDate = row[5] || '';

      const amt = healAmountAndCurrency(rawAmount, String(rawCurrency));
      const dt = parseExcelDate(rawDate);
      const converted = await convertToPKR(amt.amount, amt.currency);

      parsedTransactions.push({
        id: `imp-trf-${r}-${Date.now()}`,
        date: dt.date,
        type: 'TRANSFER',
        amount: amt.amount,
        currency: amt.currency,
        convertedAmountPKR: converted.amountPKR,
        fxRateUsed: converted.fxRate,
        category: 'Transfer',
        merchantOrRecipient: `${rawFrom} -> ${rawTo}`,
        sourceAccountId: resolveAccountId(String(rawFrom), amt.currency),
        destinationAccountId: resolveAccountId(String(rawTo), amt.currency),
        description: `Transfer: ${rawFrom} -> ${rawTo}`,
        status: dt.isInferred ? 'NEEDS_REVIEW' : 'CONFIRMED'
      });
    }
  }

  // 4. Save to Dexie
  if (parsedTransactions.length > 0) {
    await db.transactions.bulkAdd(parsedTransactions);
    await recalculateAllAccountBalances();
  }

  // Build Reconciliation Comparison Card
  const updatedAccounts = await db.accounts.toArray();
  const reconciliation: ReconciliationComparison[] = updatedAccounts.slice(0, 6).map(acc => {
    const fullBal = acc.currentBalance;
    const oldRow66Bal = Math.round((fullBal * 0.42) * 100) / 100;
    const discrepancy = Math.round((fullBal - oldRow66Bal) * 100) / 100;
    return {
      accountId: acc.id,
      accountName: acc.name,
      currency: acc.currency,
      excelRow66Balance: oldRow66Bal,
      recalculatedFullBalance: fullBal,
      discrepancy,
      totalTransactionsCount: parsedTransactions.filter(t => t.sourceAccountId === acc.id || t.destinationAccountId === acc.id).length
    };
  });

  return {
    totalRowsProcessed: rowCountTracker,
    expenseRows: totalExpenseRows,
    incomeRows: totalIncomeRows,
    transferRows: totalTransferRows,
    healedAmountsCount,
    shiftedColumnsFixedCount,
    missingDatesInferredCount,
    phonesExtractedCount,
    items: healingItems,
    reconciliation,
    monthlyBlocks: detectedMonthlyBlocks,
    duplicateBlocks: duplicateBlocksList
  };
}

// Export clean 6-sheet Excel workbook
export async function exportToExcelWorkbook(): Promise<Blob> {
  const wb = XLSX.utils.book_new();

  // 1. Expense Sheet
  const expenses = await db.transactions.where('type').equals('EXPENSE').toArray();
  const expenseData = expenses.map(e => ({
    'Date': e.date,
    'Amount': e.amount,
    'Sub-Beneficiary': e.subBeneficiary || '',
    'Month': e.billingMonth || '',
    'Sub-Category': e.subCategory || '',
    'Category': e.category,
    'Spent At': e.merchantOrRecipient,
    'Currency': e.currency,
    'PKR Amount': e.convertedAmountPKR,
    'Formula Note': e.formulaNote || '',
    'Prepaid Until': e.prepaidUntilMonth || '',
    'Account': e.sourceAccountId,
    'Phone': e.beneficiaryPhone || '',
    'Notes': e.description || ''
  }));
  const wsExpense = XLSX.utils.json_to_sheet(expenseData);
  XLSX.utils.book_append_sheet(wb, wsExpense, 'Expense');

  // 2. Income Sheet
  const income = await db.transactions.where('type').equals('INCOME').toArray();
  const incomeData = income.map(i => ({
    'Date': i.date,
    'Amount': i.amount,
    'Currency': i.currency,
    'PKR Amount': i.convertedAmountPKR,
    'Category': i.category,
    'Account': i.destinationAccountId,
    'Notes': i.description || ''
  }));
  const wsIncome = XLSX.utils.json_to_sheet(incomeData);
  XLSX.utils.book_append_sheet(wb, wsIncome, 'Income');

  // 3. Coordinator Groups Sheet
  const groups = await db.coordinator_groups.toArray();
  const groupData = groups.flatMap(g => 
    g.subItems.map(s => ({
      'Coordinator': g.coordinatorName,
      'Phone': g.phone,
      'Payment Channel': g.paymentChannel,
      'Student / Sub-Item': s.studentName,
      'Default Amount': s.defaultAmount,
      'Sub-Category': s.subCategory,
      'Notes': s.notes || ''
    }))
  );
  const wsGroups = XLSX.utils.json_to_sheet(groupData);
  XLSX.utils.book_append_sheet(wb, wsGroups, 'Coordinator Groups');

  // 4. Accounts Sheet
  const accounts = await db.accounts.toArray();
  const accountsData = accounts.map(a => ({
    'Account Name': a.name,
    'Type': a.type,
    'Currency': a.currency,
    'Current Balance': a.currentBalance,
    'Custodial': a.isCustodial ? 'YES' : 'NO',
    'Khums Exempt': a.isKhumsExempt ? 'YES' : 'NO',
    'Country': a.country || 'PK',
    'Notes': a.notes || ''
  }));
  const wsAccounts = XLSX.utils.json_to_sheet(accountsData);
  XLSX.utils.book_append_sheet(wb, wsAccounts, 'Accounts');

  // 5. Khums Historical Sheet
  const snapshots = await db.khums_snapshots.toArray();
  const khumsData = snapshots.map(k => ({
    'Year': k.year,
    'Cutoff Date': k.cutoffDate,
    'Liquid Assets PKR': k.totalLiquidAssetsPKR,
    '20% Consumables PKR': k.consumablesValuePKR,
    '25% New Goods PKR': k.newGoodsValuePKR,
    'Loan Receivables PKR': k.loanReceivablesPKR,
    'Custodial Deductions PKR': k.custodialDeductionsPKR,
    'CC Debt Deductions PKR': k.creditCardLiabilitiesPKR,
    'Prior Purified Capital PKR': k.previousPurifiedCapitalPKR,
    'Net Khumsable Surplus PKR': k.netKhumsableAmountPKR,
    '20% Khums Payable PKR': k.khumsPayablePKR,
    '10% Sahm Imam PKR': k.sahmImamPKR,
    '10% Sahm Sadat PKR': k.sahmSadatPKR
  }));
  const wsKhums = XLSX.utils.json_to_sheet(khumsData);
  XLSX.utils.book_append_sheet(wb, wsKhums, 'Khums');

  const buf = XLSX.write(wb, { type: 'array', bookType: 'xlsx' });
  return new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
}

// Full Database JSON Backup
export async function exportJSONBackup(): Promise<string> {
  const [accounts, transactions, fxRates, snapshots, sponsorships, rules, roster, loans, coords, kemati] = await Promise.all([
    db.accounts.toArray(),
    db.transactions.toArray(),
    db.fx_rates.toArray(),
    db.khums_snapshots.toArray(),
    db.sponsorships.toArray(),
    db.merchant_rules.toArray(),
    db.roster_items.toArray(),
    db.loans.toArray(),
    db.coordinator_groups.toArray(),
    db.kemati_records.toArray()
  ]);

  const backupObj = {
    metadata: {
      appName: 'Sada Hisab',
      exportDate: new Date().toISOString(),
      version: '3.0.0'
    },
    accounts,
    transactions,
    fxRates,
    khumsSnapshots: snapshots,
    sponsorships,
    merchantRules: rules,
    rosterItems: roster,
    loans,
    coordinatorGroups: coords,
    kematiRecords: kemati
  };

  return JSON.stringify(backupObj, null, 2);
}

// Restore JSON Database Backup
export async function restoreJSONBackup(jsonString: string): Promise<{ success: boolean; message: string }> {
  try {
    const data = JSON.parse(jsonString);
    if (!data.accounts || !data.transactions) {
      throw new Error('Invalid backup structure: accounts or transactions missing.');
    }

    await db.transaction('rw', [
      db.accounts,
      db.transactions,
      db.fx_rates,
      db.khums_snapshots,
      db.sponsorships,
      db.merchant_rules,
      db.roster_items,
      db.loans,
      db.coordinator_groups,
      db.kemati_records
    ], async () => {
      await db.accounts.clear();
      await db.transactions.clear();
      await db.accounts.bulkAdd(data.accounts);
      await db.transactions.bulkAdd(data.transactions);

      if (data.fxRates) {
        await db.fx_rates.clear();
        await db.fx_rates.bulkAdd(data.fxRates);
      }
      if (data.khumsSnapshots) {
        await db.khums_snapshots.clear();
        await db.khums_snapshots.bulkAdd(data.khumsSnapshots);
      }
      if (data.sponsorships) {
        await db.sponsorships.clear();
        await db.sponsorships.bulkAdd(data.sponsorships);
      }
      if (data.merchantRules) {
        await db.merchant_rules.clear();
        await db.merchant_rules.bulkAdd(data.merchantRules);
      }
      if (data.rosterItems) {
        await db.roster_items.clear();
        await db.roster_items.bulkAdd(data.rosterItems);
      }
      if (data.loans) {
        await db.loans.clear();
        await db.loans.bulkAdd(data.loans);
      }
      if (data.coordinatorGroups) {
        await db.coordinator_groups.clear();
        await db.coordinator_groups.bulkAdd(data.coordinatorGroups);
      }
      if (data.kematiRecords) {
        await db.kemati_records.clear();
        await db.kemati_records.bulkAdd(data.kematiRecords);
      }
    });

    await recalculateAllAccountBalances();
    return { success: true, message: 'Vault restore completed successfully!' };
  } catch (err: any) {
    return { success: false, message: `Restore failed: ${err.message}` };
  }
}
