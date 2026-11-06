import React, { useState } from 'react';
import { 
  parseAndHealExcelWorkbook, 
  exportToExcelWorkbook, 
  exportJSONBackup, 
  restoreJSONBackup 
} from '../services/excelHealer';
import { ExcelHealingSummary } from '../types';
import { formatCurrency } from '../utils/formatters';
import { 
  FileSpreadsheet, 
  UploadCloud, 
  Download, 
  ShieldCheck, 
  AlertTriangle, 
  CheckCircle2, 
  Sparkles, 
  FileJson, 
  RotateCcw,
  RefreshCw,
  Phone,
  Calendar,
  Layers,
  ArrowRight
} from 'lucide-react';

interface ImportExportViewProps {
  onRefreshData: () => void;
}

export const ImportExportView: React.FC<ImportExportViewProps> = ({
  onRefreshData
}) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [healingSummary, setHealingSummary] = useState<ExcelHealingSummary | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  // Handle file drop / upload
  const handleFileUpload = async (file: File) => {
    if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
      setErrorMessage('Please upload a valid Excel (.xlsx / .xls) workbook.');
      return;
    }

    try {
      setIsProcessing(true);
      setErrorMessage(null);
      const summary = await parseAndHealExcelWorkbook(file);
      setHealingSummary(summary);
      onRefreshData();
    } catch (err: any) {
      console.error(err);
      setErrorMessage(`Failed to parse workbook: ${err.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  // Run a built-in simulation of importing the user's legacy workbook
  const handleRunSimulation = async () => {
    setIsProcessing(true);
    setErrorMessage(null);
    try {
      // Mock an Excel buffer containing the user's legacy structures
      const XLSX = await import('xlsx');
      const wb = XLSX.utils.book_new();

      // Expense sheet with legacy bugs: "dh 63.11", shifted PKR, "-" date, phone numbers
      const rawExpenseData = [
        { 'Date': '2025-10-15', 'Amount': 'dh 63.11', 'Currency': '', 'Category': 'Groceries', 'Spent At': 'Lulu Hypermarket Khalidiyah', 'Source': 'ADCB (AED)' },
        { 'Date': '2025-10-20', 'Amount': 'dn 470.27', 'Currency': '', 'Category': 'Household', 'Spent At': 'Carrefour Marina Mall', 'Source': 'ADCB (AED)' },
        { 'Date': '2025-10-25', 'Amount': 'dn 65', 'Currency': '', 'Category': 'Dining', 'Spent At': 'Al Farooj Shawarma', 'Source': 'ADCB (AED)' },
        { 'Date': '-', 'Amount': 8500, 'Currency': '', 'Category': 'School Fees', 'Spent At': 'Mustafa Tuition Fee 03123456789 Easypaisa', 'Source': 'PKR' },
        { 'Date': '?', 'Amount': 15000, 'Currency': '', 'Category': "Maulana's", 'Spent At': 'Maulana Monthly Wazeefa 03009876543 JazzCash', 'Source': 'PKR' },
        { 'Date': '2025-11-05', 'Amount': 2700, 'Currency': '', 'Category': 'Water', 'Spent At': 'Sufi Water Can delivery', 'Source': '2700' },
        { 'Date': '2025-11-10', 'Amount': 6200, 'Currency': 'PKR', 'Category': 'Exam Fees', 'Spent At': 'Fatima FBIS Board Registration 03335551212', 'Source': 'Al Habib - Rs (PKR)' }
      ];

      // Add extra simulated rows to demonstrate the Row-66 truncation fix
      for (let i = 8; i <= 85; i++) {
        rawExpenseData.push({
          'Date': `2025-11-${String((i % 28) + 1).padStart(2, '0')}`,
          'Amount': (i % 2 === 0 ? 3200 : 4500) as any,
          'Currency': 'PKR',
          'Category': 'Utilities & Household',
          'Spent At': `Simulated Expense Row #${i}`,
          'Source': 'Al Habib - Rs (PKR)'
        });
      }

      const wsExpense = XLSX.utils.json_to_sheet(rawExpenseData);
      XLSX.utils.book_append_sheet(wb, wsExpense, 'Expense');

      const out = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
      const testFile = new File([out], 'Khums - November 30 2025 - Daily.xlsx');

      const summary = await parseAndHealExcelWorkbook(testFile);
      setHealingSummary(summary);
      onRefreshData();
    } catch (err: any) {
      setErrorMessage(`Simulation error: ${err.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  // Export clean 6-sheet Excel
  const handleExportExcel = async () => {
    try {
      const blob = await exportToExcelWorkbook();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Sada_Hisab_Clean_Ledger_${new Date().toISOString().split('T')[0]}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err: any) {
      alert(`Export error: ${err.message}`);
    }
  };

  // Export JSON Backup
  const handleExportJSON = async () => {
    try {
      const json = await exportJSONBackup();
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Sada_Hisab_Backup_${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err: any) {
      alert(`Backup error: ${err.message}`);
    }
  };

  // Restore JSON Backup
  const handleRestoreJSON = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    const res = await restoreJSONBackup(text);
    if (res.success) {
      alert('Backup restored successfully!');
      onRefreshData();
    } else {
      alert(res.message);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-emerald-950/40 via-slate-900 to-slate-900 border border-emerald-900/50 rounded-2xl p-5 sm:p-6 shadow-xl">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center space-x-3.5">
            <div className="h-12 w-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
              <FileSpreadsheet className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-white tracking-tight">Import, Export & Data Healer Hub</h3>
              <p className="text-xs text-slate-400 mt-1">
                Drag-and-drop your legacy <span className="font-mono text-emerald-300">Khums - November 30 2025 - Daily.xlsx</span> workbook to automatically heal string amounts, resolve shifted columns, extract phones, and recalculate balances beyond row 66.
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={handleRunSimulation}
              disabled={isProcessing}
              className="flex items-center space-x-1.5 px-3.5 py-2 bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/40 rounded-xl text-xs font-semibold transition"
            >
              <Sparkles className="h-4 w-4 text-indigo-400" />
              <span>Simulate Excel Import</span>
            </button>
          </div>
        </div>
      </div>

      {errorMessage && (
        <div className="p-4 bg-rose-950/80 border border-rose-800 text-rose-300 rounded-2xl text-xs font-semibold flex items-center space-x-2">
          <AlertTriangle className="h-4 w-4 text-rose-400" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Drag & Drop Upload Zone */}
      <div 
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragging(false);
          const file = e.dataTransfer.files[0];
          if (file) handleFileUpload(file);
        }}
        className={`border-2 border-dashed rounded-2xl p-8 sm:p-12 text-center transition ${
          isDragging 
            ? 'border-emerald-500 bg-emerald-950/20' 
            : 'border-slate-800 bg-slate-900/60 hover:border-slate-700'
        }`}
      >
        <UploadCloud className="h-12 w-12 mx-auto text-emerald-400 mb-3 animate-pulse" />
        <h4 className="text-base font-bold text-white">
          Drop your Excel workbook here, or click to browse
        </h4>
        <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
          Supports 11-sheet workbook formats with sheets: Expense, Income, Transferred, Totals, Credit Card (Loan), and Khums.
        </p>

        <label className="inline-flex items-center space-x-2 mt-5 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-emerald-950/40 cursor-pointer transition">
          <FileSpreadsheet className="h-4 w-4" />
          <span>Select Excel File (.xlsx)</span>
          <input
            type="file"
            accept=".xlsx, .xls"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFileUpload(file);
            }}
            className="hidden"
          />
        </label>
      </div>

      {/* Row-66 Truncation Bug Fix Comparison Card */}
      {healingSummary && healingSummary.reconciliation && (
        <div className="bg-slate-900/90 border border-emerald-800/40 rounded-2xl p-5 shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center space-x-2.5">
              <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white uppercase tracking-wider">
                  Row-66 Truncation Bug Resolved & Reconciliation Card
                </h4>
                <p className="text-xs text-slate-400">
                  Old Excel formula stopped calculating sums at row 66. Sada Hisab recalculated all {healingSummary.totalRowsProcessed}+ rows!
                </p>
              </div>
            </div>
            <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-950 text-emerald-300 border border-emerald-800">
              100% Fixed
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {healingSummary.reconciliation.map(rec => (
              <div key={rec.accountId} className="bg-slate-950/80 border border-slate-800 rounded-xl p-3.5 space-y-2">
                <div className="flex items-center justify-between">
                  <h5 className="text-xs font-bold text-white truncate max-w-[150px]">
                    {rec.accountName}
                  </h5>
                  <span className="text-[10px] text-slate-400 font-mono">{rec.currency}</span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs pt-1 border-t border-slate-800/60">
                  <div>
                    <span className="text-[10px] text-slate-500">Old Excel (Row 66):</span>
                    <div className="text-slate-400 font-mono line-through">
                      {formatCurrency(rec.excelRow66Balance, rec.currency)}
                    </div>
                  </div>
                  <div>
                    <span className="text-[10px] text-emerald-400 font-medium">True Full Balance:</span>
                    <div className="text-emerald-400 font-mono font-bold">
                      {formatCurrency(rec.recalculatedFullBalance, rec.currency)}
                    </div>
                  </div>
                </div>

                <div className="text-[11px] text-cyan-300 font-mono bg-cyan-950/40 px-2 py-0.5 rounded border border-cyan-900/40">
                  Discrepancy: +{formatCurrency(rec.discrepancy, rec.currency)} recovered
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Healing Summary Statistics & Log */}
      {healingSummary && (
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h4 className="text-sm font-bold text-white uppercase tracking-wider flex items-center space-x-2">
              <Sparkles className="h-4 w-4 text-emerald-400" />
              <span>Automated Healing Report ({healingSummary.totalRowsProcessed} Rows Analyzed)</span>
            </h4>
            <span className="text-xs text-slate-400">
              {healingSummary.items.length} Healed Adjustments
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3 text-center">
              <span className="text-slate-400">String Amounts Healed</span>
              <div className="text-xl font-bold text-emerald-400 font-mono mt-1">
                {healingSummary.healedAmountsCount}
              </div>
            </div>
            <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3 text-center">
              <span className="text-slate-400">Shifted Columns Fixed</span>
              <div className="text-xl font-bold text-amber-400 font-mono mt-1">
                {healingSummary.shiftedColumnsFixedCount}
              </div>
            </div>
            <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3 text-center">
              <span className="text-slate-400">Missing Dates Inferred</span>
              <div className="text-xl font-bold text-cyan-400 font-mono mt-1">
                {healingSummary.missingDatesInferredCount}
              </div>
            </div>
            <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3 text-center">
              <span className="text-slate-400">Phones Extracted</span>
              <div className="text-xl font-bold text-purple-400 font-mono mt-1">
                {healingSummary.phonesExtractedCount}
              </div>
            </div>
          </div>

          {/* Healing Log Table */}
          <div className="overflow-x-auto max-h-72">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-slate-950 text-slate-400 sticky top-0">
                <tr>
                  <th className="py-2 px-3">Row</th>
                  <th className="py-2 px-3">Type</th>
                  <th className="py-2 px-3">Issue Detected</th>
                  <th className="py-2 px-3">Original Raw Value</th>
                  <th className="py-2 px-3">Healed Value</th>
                  <th className="py-2 px-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {healingSummary.items.map(item => (
                  <tr key={item.id} className="hover:bg-slate-800/30">
                    <td className="py-2 px-3 text-slate-400">{item.rowNumber}</td>
                    <td className="py-2 px-3 text-slate-300 font-bold">{item.issueType}</td>
                    <td className="py-2 px-3 text-slate-400">{item.description}</td>
                    <td className="py-2 px-3 text-rose-300 truncate max-w-[120px]">{item.before}</td>
                    <td className="py-2 px-3 text-emerald-400 font-semibold truncate max-w-[150px]">{item.after}</td>
                    <td className="py-2 px-3 text-center">
                      <span className={`px-1.5 py-0.5 rounded text-[10px] ${
                        item.status === 'AUTO_HEALED' 
                          ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' 
                          : 'bg-amber-950 text-amber-300 border border-amber-800'
                      }`}>
                        {item.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Export Section */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
        <h4 className="text-sm font-bold text-white uppercase tracking-wider">
          Export & Local Backup
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          
          {/* Excel Export Card */}
          <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-4 flex flex-col justify-between space-y-3">
            <div>
              <div className="flex items-center space-x-2 text-white font-bold text-sm">
                <FileSpreadsheet className="h-4 w-4 text-emerald-400" />
                <span>Clean Multi-Sheet Excel (.xlsx)</span>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Generates a clean 6-sheet workbook: Expense, Income, Transferred, Totals, Khums, and Sponsorships.
              </p>
            </div>
            <button
              onClick={handleExportExcel}
              className="flex items-center justify-center space-x-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-semibold border border-slate-700 transition"
            >
              <Download className="h-3.5 w-3.5" />
              <span>Download .xlsx Workbook</span>
            </button>
          </div>

          {/* JSON Full Backup Card */}
          <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-4 flex flex-col justify-between space-y-3">
            <div>
              <div className="flex items-center space-x-2 text-white font-bold text-sm">
                <FileJson className="h-4 w-4 text-cyan-400" />
                <span>Full Local JSON Backup & Restore</span>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                100% complete dump of IndexedDB stores including historical Khums audits, FX spreads and custom accounts.
              </p>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={handleExportJSON}
                className="flex-1 flex items-center justify-center space-x-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-semibold border border-slate-700 transition"
              >
                <Download className="h-3.5 w-3.5" />
                <span>Export JSON</span>
              </button>
              <label className="flex-1 flex items-center justify-center space-x-1.5 px-3 py-2 bg-cyan-600/20 hover:bg-cyan-600/30 text-cyan-300 border border-cyan-600/40 rounded-lg text-xs font-semibold cursor-pointer transition">
                <RotateCcw className="h-3.5 w-3.5" />
                <span>Restore JSON</span>
                <input
                  type="file"
                  accept=".json"
                  onChange={handleRestoreJSON}
                  className="hidden"
                />
              </label>
            </div>
          </div>

        </div>
      </div>

    </div>
  );
};
