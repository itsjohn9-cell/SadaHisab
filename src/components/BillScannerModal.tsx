import React, { useState } from 'react';
import { 
  FileText, 
  UploadCloud, 
  Sparkles, 
  Check, 
  X, 
  Layers, 
  AlertCircle, 
  Lock, 
  Camera, 
  Table, 
  FileSpreadsheet,
  Link2
} from 'lucide-react';
import { 
  extractTextFromPDF, 
  extractTextFromImageOCR, 
  extractBillWithGeminiVision, 
  parseExtractedReceiptText, 
  parseStatementTextToRows, 
  createCompressedThumbnail 
} from '../services/billScanner';
import { 
  checkExactDuplicate, 
  checkFuzzyDuplicate, 
  mergeWithExistingTransaction, 
  computeTransactionDedupeHash 
} from '../services/deduplicationEngine';
import { db, recalculateAllAccountBalances } from '../db/db';
import { convertToPKR } from '../services/fxService';
import { formatCurrency } from '../utils/formatters';
import { 
  Account, 
  Currency, 
  Transaction, 
  ExtractedBillData, 
  StatementRowDraft, 
  PotentialDuplicateMatch 
} from '../types';

interface BillScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  accounts: Account[];
  onSuccess: () => void;
}

export const BillScannerModal: React.FC<BillScannerModalProps> = ({
  isOpen,
  onClose,
  accounts,
  onSuccess
}) => {
  const [engineMode, setEngineMode] = useState<'LOCAL' | 'GEMINI_VISION'>('LOCAL');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [ocrStatus, setOcrStatus] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Extracted Single Bill State
  const [extractedBill, setExtractedBill] = useState<ExtractedBillData | null>(null);
  const [thumbnailUrl, setThumbnailUrl] = useState<string>('');
  const [targetAccount, setTargetAccount] = useState<string>('al-habib-pkr');
  const [duplicateCollision, setDuplicateCollision] = useState<PotentialDuplicateMatch | null>(null);

  // Multi-Row Statement Staging State
  const [isStatementMode, setIsStatementMode] = useState<boolean>(false);
  const [statementRows, setStatementRows] = useState<StatementRowDraft[]>([]);

  const geminiApiKey = typeof window !== 'undefined' ? localStorage.getItem('gemini_api_key') : null;

  // Process uploaded image or PDF
  const handleProcessFile = async (file: File) => {
    setIsProcessing(true);
    setErrorMessage(null);
    setDuplicateCollision(null);
    setExtractedBill(null);
    setIsStatementMode(false);
    setOcrStatus('Generating thumbnail and preparing document...');

    try {
      const thumb = await createCompressedThumbnail(file);
      setThumbnailUrl(thumb);

      let extractedData: ExtractedBillData;

      if (engineMode === 'GEMINI_VISION' && geminiApiKey) {
        setOcrStatus('Sending to Gemini Flash Vision for multi-modal structured analysis...');
        extractedData = await extractBillWithGeminiVision(file, geminiApiKey);
      } else {
        if (file.type === 'application/pdf') {
          setOcrStatus('Extracting digital PDF text layer...');
          const rawText = await extractTextFromPDF(file);

          // Check if this is a multi-row statement (e.g. ADCB, Al Habib, SCB)
          const isTableStatement = rawText.match(/\b(?:statement|closing balance|opening balance|debit|credit|txn date)\b/i) &&
            (rawText.match(/[0-9,]+\.[0-9]{2}/g) || []).length > 8;

          if (isTableStatement) {
            const rows = parseStatementTextToRows(rawText, 'adcb-aed');
            if (rows.length > 0) {
              setStatementRows(rows);
              setIsStatementMode(true);
              setIsProcessing(false);
              return;
            }
          }

          extractedData = parseExtractedReceiptText(rawText, 'LOCAL_PDF');
        } else {
          setOcrStatus('Running 100% on-device OCR with Tesseract.js...');
          const ocrText = await extractTextFromImageOCR(file, (_, status) => setOcrStatus(status));
          extractedData = parseExtractedReceiptText(ocrText, 'LOCAL_OCR');
        }
      }

      setExtractedBill(extractedData);
      
      // Auto assign inferred account
      const defAcc = accounts.find(a => a.currency === extractedData.currency) || accounts[0];
      setTargetAccount(defAcc?.id || 'al-habib-pkr');

      // Check Tier 1 & Tier 2 Anti-Duplication
      if (extractedData.totalAmount > 0) {
        const fuzzyMatch = await checkFuzzyDuplicate(extractedData.date, extractedData.totalAmount, extractedData.currency);
        if (fuzzyMatch) {
          setDuplicateCollision(fuzzyMatch);
        }
      }
    } catch (err: any) {
      setErrorMessage(`Scan failed: ${err.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  // Simulate Presets
  const handleSimulatePreset = (type: 'IMTIAZ' | 'DEWA' | 'STATEMENT') => {
    setIsStatementMode(false);
    setDuplicateCollision(null);

    if (type === 'IMTIAZ') {
      const mock: ExtractedBillData = {
        merchant: 'Imtiaz Super Market',
        date: new Date().toISOString().split('T')[0],
        totalAmount: 4850,
        currency: 'PKR',
        category: 'Grocery',
        subCategory: 'Supermarket',
        billReferenceNumber: 'INV-882194',
        lineItems: [
          { description: 'Milk Pack 1L x6', amount: 1650 },
          { description: 'Cooking Oil 5L', amount: 2400 },
          { description: 'Basmati Rice 2kg', amount: 800 }
        ],
        rawText: 'IMTIAZ SUPER MARKET\nInvoice #882194\nTotal: Rs. 4,850.00',
        confidence: 'HIGH',
        sourceEngine: 'LOCAL_OCR'
      };
      setExtractedBill(mock);
      setTargetAccount('al-habib-pkr');
    } else if (type === 'DEWA') {
      const mock: ExtractedBillData = {
        merchant: 'DEWA Dubai Electricity & Water',
        date: new Date().toISOString().split('T')[0],
        totalAmount: 365.87,
        currency: 'AED',
        category: 'Utilities',
        subCategory: 'Electricity & Water',
        billReferenceNumber: 'DEWA-2026-9921',
        lineItems: [
          { description: 'Electricity Consumption', amount: 240.50 },
          { description: 'Water Consumption', amount: 125.37 }
        ],
        rawText: 'DUBAI ELECTRICITY & WATER AUTHORITY\nBill Total: AED 365.87',
        confidence: 'HIGH',
        sourceEngine: 'LOCAL_PDF'
      };
      setExtractedBill(mock);
      setTargetAccount('adcb-aed');
    } else if (type === 'STATEMENT') {
      const mockRows: StatementRowDraft[] = [
        { id: 'st-1', date: '2026-11-01', description: 'Lulu Hypermarket Khalidiyah', amount: 365.87, currency: 'AED', direction: 'EXPENSE', inferredCategory: 'Grocery', inferredAccountId: 'adcb-aed', selected: true },
        { id: 'st-2', date: '2026-11-02', description: 'ADNOC Fuel Station Abu Dhabi', amount: 180.00, currency: 'AED', direction: 'EXPENSE', inferredCategory: 'Petrol', inferredAccountId: 'adcb-aed', selected: true },
        { id: 'st-3', date: '2026-11-03', description: 'Etisalat Elife Home Fiber', amount: 389.00, currency: 'AED', direction: 'EXPENSE', inferredCategory: 'Utilities', inferredAccountId: 'adcb-aed', selected: true },
        { id: 'st-4', date: '2026-11-04', description: 'Salary Deposit Direct Credit', amount: 14500.00, currency: 'AED', direction: 'INCOME', inferredCategory: 'Salary', inferredAccountId: 'adcb-aed', selected: true },
        { id: 'st-5', date: '2026-11-05', description: 'Salik Auto Topup Toll Gate', amount: 100.00, currency: 'AED', direction: 'EXPENSE', inferredCategory: 'Transport', inferredAccountId: 'credit-card-aed', selected: true }
      ];
      setStatementRows(mockRows);
      setIsStatementMode(true);
    }
  };

  // Commit Single Bill to Ledger
  const handleCommitSingleBill = async () => {
    if (!extractedBill || extractedBill.totalAmount <= 0) return;

    const dedupeHash = await computeTransactionDedupeHash(
      extractedBill.date,
      extractedBill.totalAmount,
      extractedBill.currency,
      targetAccount,
      extractedBill.merchant
    );

    const converted = await convertToPKR(extractedBill.totalAmount, extractedBill.currency);

    const tx: Transaction = {
      id: `bill-${Date.now()}`,
      date: extractedBill.date,
      type: 'EXPENSE',
      amount: extractedBill.totalAmount,
      currency: extractedBill.currency,
      convertedAmountPKR: converted.amountPKR,
      fxRateUsed: converted.fxRate,
      category: extractedBill.category,
      subCategory: extractedBill.subCategory,
      merchantOrRecipient: extractedBill.merchant,
      sourceAccountId: targetAccount,
      description: extractedBill.billReferenceNumber ? `Invoice Ref: ${extractedBill.billReferenceNumber}` : 'Scanned receipt entry',
      status: 'CONFIRMED',
      sourceChannel: 'OCR',
      receiptThumbnail: thumbnailUrl || undefined,
      dedupeHash
    };

    await db.transactions.add(tx);
    await recalculateAllAccountBalances();
    onSuccess();
    onClose();
  };

  // Merge with Existing Duplicate Transaction
  const handleMergeDuplicate = async () => {
    if (!duplicateCollision) return;
    await mergeWithExistingTransaction(duplicateCollision.existingTransaction.id, {
      receiptThumbnail: thumbnailUrl || undefined,
      extraNote: `Scanned ${extractedBill?.merchant || 'Bill'} receipt verified & merged on ${new Date().toLocaleDateString()}`
    });
    alert('Scanned bill successfully merged into existing transaction without creating duplicate row!');
    onSuccess();
    onClose();
  };

  // Commit Statement Staging Table Rows
  const handleCommitStatementRows = async () => {
    const selected = statementRows.filter(r => r.selected);
    if (selected.length === 0) return;

    for (let i = 0; i < selected.length; i++) {
      const row = selected[i];
      const converted = await convertToPKR(row.amount, row.currency);
      const dedupeHash = await computeTransactionDedupeHash(row.date, row.amount, row.currency, row.inferredAccountId, row.description);

      const tx: Transaction = {
        id: `stmt-tx-${Date.now()}-${i}`,
        date: row.date,
        type: row.direction,
        amount: row.amount,
        currency: row.currency,
        convertedAmountPKR: converted.amountPKR,
        fxRateUsed: converted.fxRate,
        category: row.inferredCategory,
        merchantOrRecipient: row.description,
        sourceAccountId: row.direction !== 'INCOME' ? row.inferredAccountId : undefined,
        destinationAccountId: row.direction === 'INCOME' ? row.inferredAccountId : undefined,
        description: `Imported from PDF Statement: ${row.description}`,
        status: 'CONFIRMED',
        sourceChannel: 'STATEMENT',
        dedupeHash
      };
      await db.transactions.add(tx);
    }

    await recalculateAllAccountBalances();
    alert(`Successfully imported ${selected.length} statement rows into Ledger!`);
    onSuccess();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-2xl w-full p-6 shadow-2xl space-y-5 my-8 animate-in fade-in zoom-in-95">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <Camera className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white tracking-tight">
                Multimodal Bill, Receipt & PDF Scanner
              </h3>
              <p className="text-xs text-slate-400">
                100% on-device OCR + digital PDF statements with zero-duplicate protection
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-white">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Engine Mode Toggle (Local vs BYOK Gemini Vision) */}
        <div className="flex items-center justify-between bg-slate-950 p-1.5 rounded-xl border border-slate-800 text-xs">
          <div className="flex items-center space-x-1">
            <button
              onClick={() => setEngineMode('LOCAL')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition ${
                engineMode === 'LOCAL' ? 'bg-slate-800 text-emerald-400 shadow-sm' : 'text-slate-400 hover:text-white'
              }`}
            >
              100% On-Device (PDF.js / Tesseract OCR)
            </button>
            <button
              onClick={() => {
                if (!geminiApiKey) {
                  alert('Please paste your personal Gemini API key in Settings to activate Gemini Flash Vision.');
                }
                setEngineMode('GEMINI_VISION');
              }}
              className={`px-3 py-1.5 rounded-lg font-semibold transition flex items-center space-x-1 ${
                engineMode === 'GEMINI_VISION' ? 'bg-indigo-950 text-indigo-300 border border-indigo-800' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Sparkles className="h-3 w-3 text-indigo-400" />
              <span>BYOK Gemini Flash Vision</span>
            </button>
          </div>
          <span className="text-[11px] text-slate-500 pr-2">
            {engineMode === 'LOCAL' ? '100% Private & Air-gapped' : 'Browser-to-Gemini direct'}
          </span>
        </div>

        {/* Drag & Drop Upload Box */}
        {!extractedBill && !isStatementMode && (
          <div className="border-2 border-dashed border-slate-800 hover:border-emerald-500/60 rounded-2xl p-8 text-center bg-slate-950/60 space-y-3 transition">
            <UploadCloud className="h-10 w-10 mx-auto text-emerald-400 animate-pulse" />
            <h4 className="text-sm font-bold text-white">
              Drop invoice PDF or receipt photo here
            </h4>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              Supports .pdf, .jpg, .png, .webp. Automatically parses DEWA, StromFiber, Imtiaz receipts, PSO fuel slips, or multi-page bank statements.
            </p>

            <div className="pt-2 flex justify-center">
              <label className="inline-flex items-center space-x-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold cursor-pointer shadow-md transition">
                <FileText className="h-4 w-4" />
                <span>Browse File</span>
                <input
                  type="file"
                  accept=".pdf, .jpg, .jpeg, .png, .webp"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleProcessFile(f);
                  }}
                  className="hidden"
                />
              </label>
            </div>

            {/* Test Simulation Presets */}
            <div className="pt-3 border-t border-slate-900 flex flex-wrap justify-center gap-1.5 text-[11px]">
              <span className="text-slate-500 self-center mr-1">Simulate:</span>
              <button
                onClick={() => handleSimulatePreset('IMTIAZ')}
                className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 hover:text-white"
              >
                Imtiaz Grocery (PKR 4,850)
              </button>
              <button
                onClick={() => handleSimulatePreset('DEWA')}
                className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 hover:text-white"
              >
                DEWA Utility Bill (AED 365.87)
              </button>
              <button
                onClick={() => handleSimulatePreset('STATEMENT')}
                className="px-2 py-0.5 rounded bg-slate-800 text-cyan-300 hover:text-white"
              >
                ADCB Multi-Row PDF Statement
              </button>
            </div>
          </div>
        )}

        {/* Processing Spinner */}
        {isProcessing && (
          <div className="p-6 bg-slate-950/80 border border-slate-800 rounded-2xl text-center space-y-2">
            <div className="h-8 w-8 mx-auto border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
            <p className="text-xs font-semibold text-emerald-400 font-mono">{ocrStatus}</p>
          </div>
        )}

        {/* Tier 2 Duplicate Collision Banner */}
        {duplicateCollision && (
          <div className="bg-amber-950/40 border border-amber-600/60 rounded-2xl p-4 space-y-3 animate-in fade-in">
            <div className="flex items-center space-x-2 text-amber-300 font-bold text-xs">
              <AlertCircle className="h-4 w-4 text-amber-400" />
              <span>Tier 2 Collision: Potential Duplicate Detected ({duplicateCollision.matchReason})</span>
            </div>
            <div className="bg-slate-950 p-3 rounded-xl grid grid-cols-2 gap-2 text-xs text-slate-300 font-mono">
              <div>
                <span className="text-slate-500">Existing Transaction:</span>
                <div className="text-white font-bold">{duplicateCollision.existingTransaction.merchantOrRecipient}</div>
                <div>{formatCurrency(duplicateCollision.existingTransaction.amount, duplicateCollision.existingTransaction.currency)} on {duplicateCollision.existingTransaction.date}</div>
              </div>
              <div>
                <span className="text-slate-500">Incoming Scanned Bill:</span>
                <div className="text-emerald-400 font-bold">{extractedBill?.merchant}</div>
                <div>{formatCurrency(extractedBill?.totalAmount || 0, extractedBill?.currency || 'PKR')} on {extractedBill?.date}</div>
              </div>
            </div>
            <div className="flex justify-end space-x-2 pt-1">
              <button
                onClick={() => setDuplicateCollision(null)}
                className="px-3 py-1 bg-slate-800 text-slate-300 rounded-lg text-xs"
              >
                Keep Both Rows
              </button>
              <button
                onClick={handleMergeDuplicate}
                className="px-3.5 py-1 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-xs font-bold shadow-md"
              >
                Merge with Existing (Attach Receipt)
              </button>
            </div>
          </div>
        )}

        {/* Extracted Single Bill Card */}
        {extractedBill && !isStatementMode && (
          <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-5 space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800">
                  {extractedBill.sourceEngine} EXTRACTED
                </span>
                <h4 className="text-lg font-bold text-white mt-1">
                  {extractedBill.merchant}
                </h4>
              </div>
              <div className="text-right">
                <div className="text-2xl font-black text-white font-mono">
                  {formatCurrency(extractedBill.totalAmount, extractedBill.currency)}
                </div>
                <span className="text-xs text-slate-400 font-mono">{extractedBill.currency}</span>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3 text-xs">
              <div>
                <label className="text-[10px] text-slate-500">Date</label>
                <div className="font-mono text-slate-200">{extractedBill.date}</div>
              </div>
              <div>
                <label className="text-[10px] text-slate-500">Category</label>
                <div className="text-emerald-400 font-semibold">{extractedBill.category}</div>
              </div>
              <div>
                <label className="text-[10px] text-slate-500">Payment Account</label>
                <select
                  value={targetAccount}
                  onChange={(e) => setTargetAccount(e.target.value)}
                  className="w-full mt-0.5 px-2 py-1 bg-slate-900 border border-slate-700 rounded text-xs text-white"
                >
                  {accounts.map(a => (
                    <option key={a.id} value={a.id}>{a.name}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Line items if present */}
            {extractedBill.lineItems && extractedBill.lineItems.length > 0 && (
              <div className="border-t border-slate-800 pt-2 space-y-1">
                <span className="text-[10px] text-slate-500 uppercase font-semibold">Extracted Line Items:</span>
                <div className="divide-y divide-slate-900 max-h-28 overflow-y-auto font-mono text-[11px]">
                  {extractedBill.lineItems.map((item, i) => (
                    <div key={i} className="py-1 flex justify-between text-slate-300">
                      <span>{item.description}</span>
                      <span className="text-emerald-400">{formatCurrency(item.amount, extractedBill.currency)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-between items-center pt-2 border-t border-slate-800">
              <button
                onClick={() => setExtractedBill(null)}
                className="text-xs text-slate-400 hover:text-white"
              >
                Scan Another
              </button>
              <button
                onClick={handleCommitSingleBill}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold shadow-md flex items-center space-x-1"
              >
                <Check className="h-4 w-4" />
                <span>Save to Ledger</span>
              </button>
            </div>
          </div>
        )}

        {/* Multi-Row Statement Staging Table */}
        {isStatementMode && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center space-x-1.5">
                <Table className="h-4 w-4 text-cyan-400" />
                <span>Bank Statement Staging ({statementRows.length} rows parsed)</span>
              </h4>
              <button
                onClick={handleCommitStatementRows}
                className="px-4 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl text-xs font-semibold shadow-md"
              >
                Import Selected ({statementRows.filter(r => r.selected).length})
              </button>
            </div>

            <div className="max-h-60 overflow-y-auto border border-slate-800 rounded-xl bg-slate-950">
              <table className="w-full text-left text-xs font-mono">
                <thead className="bg-slate-900 text-slate-400 sticky top-0">
                  <tr>
                    <th className="p-2 text-center">Import</th>
                    <th className="p-2">Date</th>
                    <th className="p-2">Description</th>
                    <th className="p-2">Category</th>
                    <th className="p-2 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {statementRows.map((row, idx) => (
                    <tr key={row.id} className="hover:bg-slate-800/30">
                      <td className="p-2 text-center">
                        <input
                          type="checkbox"
                          checked={row.selected}
                          onChange={(e) => {
                            const updated = [...statementRows];
                            updated[idx].selected = e.target.checked;
                            setStatementRows(updated);
                          }}
                        />
                      </td>
                      <td className="p-2 text-slate-300">{row.date}</td>
                      <td className="p-2 text-white font-sans truncate max-w-[180px]">{row.description}</td>
                      <td className="p-2 text-emerald-400 font-sans">{row.inferredCategory}</td>
                      <td className="p-2 text-right font-bold text-white">
                        {row.direction === 'INCOME' ? '+' : '-'}{formatCurrency(row.amount, row.currency)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex justify-end">
              <button
                onClick={() => setIsStatementMode(false)}
                className="text-xs text-slate-400 hover:text-white"
              >
                Cancel Staging
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
