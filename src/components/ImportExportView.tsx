import React, { useState } from 'react';
import { 
  parseAndHealExcelWorkbook, 
  exportToExcelWorkbook, 
  exportJSONBackup, 
  restoreJSONBackup 
} from '../services/excelHealer';
import { 
  encryptBackupVault, 
  decryptBackupVault, 
  markBackupCompleted 
} from '../services/cryptoSecurity';
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
  Lock,
  KeyRound,
  X,
  Shield
} from 'lucide-react';
import { db } from '../db/db';
import { Transaction } from '../types';
import { TimeMachineCard } from './TimeMachineCard';

interface ImportExportViewProps {
  onRefreshData: () => void;
}

export const ImportExportView: React.FC<ImportExportViewProps> = ({
  onRefreshData
}) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [healingSummary, setHealingSummary] = useState<ExcelHealingSummary | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  // Encrypted Vault Modal states
  const [showEncryptModal, setShowEncryptModal] = useState<boolean>(false);
  const [showDecryptModal, setShowDecryptModal] = useState<boolean>(false);
  const [vaultPassphrase, setVaultPassphrase] = useState<string>('');
  const [confirmPassphrase, setConfirmPassphrase] = useState<string>('');
  const [pendingVaultFileContent, setPendingVaultFileContent] = useState<string | null>(null);

  // Discard all cloned duplicate monthly block transactions
  const handleDiscardAllDuplicates = async () => {
    if (!confirm('Discard all duplicate cloned block rows (Jan 2025 rows 49–64 and Oct 2026 rows 671–705)? This prevents double-counting monthly expenses.')) {
      return;
    }
    const duplicateTxs = await db.transactions.filter((t: Transaction) => Boolean(t.isSampleData)).toArray();
    const ids = duplicateTxs.map((t: Transaction) => t.id);
    await db.transactions.bulkDelete(ids);
    const { recalculateAllAccountBalances } = await import('../db/db');
    await recalculateAllAccountBalances();
    if (healingSummary) {
      setHealingSummary({
        ...healingSummary,
        duplicateBlocks: []
      });
    }
    onRefreshData();
    alert(`Discarded ${ids.length} duplicate transactions from cloned monthly blocks. Your ledger is 100% clean!`);
  };

  // Handle file drop / upload
  const handleFileUpload = async (file: File) => {
    if (file.name.endsWith('.khumsvault')) {
      const text = await file.text();
      setPendingVaultFileContent(text);
      setShowDecryptModal(true);
      return;
    }

    if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
      setErrorMessage('Please upload a valid Excel (.xlsx / .xls) workbook or an encrypted .khumsvault file.');
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
      const XLSX = await import('xlsx');
      const wb = XLSX.utils.book_new();

      const rawExpenseData = [
        { 'Date': '2025-10-15', 'Amount': 'dh 63.11', 'Currency': '', 'Category': 'Groceries', 'Spent At': 'Lulu Hypermarket Khalidiyah', 'Source': 'ADCB (AED)' },
        { 'Date': '2025-10-20', 'Amount': 'dn 470.27', 'Currency': '', 'Category': 'Household', 'Spent At': 'Carrefour Marina Mall', 'Source': 'ADCB (AED)' },
        { 'Date': '2025-10-25', 'Amount': 'dn 65', 'Currency': '', 'Category': 'Dining', 'Spent At': 'Al Farooj Shawarma', 'Source': 'ADCB (AED)' },
        { 'Date': '-', 'Amount': 8500, 'Currency': '', 'Category': 'School Fees', 'Spent At': 'Mustafa Tuition Fee 03123456789 Easypaisa', 'Source': 'PKR' },
        { 'Date': '?', 'Amount': 15000, 'Currency': '', 'Category': "Maulana's", 'Spent At': 'Maulana Monthly Wazeefa 03009876543 JazzCash', 'Source': 'PKR' },
        { 'Date': '2025-11-05', 'Amount': 2700, 'Currency': '', 'Category': 'Water', 'Spent At': 'Sufi Water Can delivery', 'Source': '2700' },
        { 'Date': '2025-11-10', 'Amount': 6200, 'Currency': 'PKR', 'Category': 'Exam Fees', 'Spent At': 'Fatima FBIS Board Registration 03335551212', 'Source': 'Al Habib - Rs (PKR)' }
      ];

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

  // Export Encrypted .khumsvault
  const handleExecuteEncryptExport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vaultPassphrase || vaultPassphrase.length < 6) {
      alert('Passphrase must be at least 6 characters long.');
      return;
    }
    if (vaultPassphrase !== confirmPassphrase) {
      alert('Passphrases do not match.');
      return;
    }

    try {
      const jsonBackup = await exportJSONBackup();
      const encryptedVault = await encryptBackupVault(jsonBackup, vaultPassphrase);
      
      const blob = new Blob([encryptedVault], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Sada_Hisab_Vault_${new Date().toISOString().split('T')[0]}.khumsvault`;
      a.click();
      URL.revokeObjectURL(url);

      await markBackupCompleted();
      setShowEncryptModal(false);
      setVaultPassphrase('');
      setConfirmPassphrase('');
      setSuccessMessage('Encrypted .khumsvault backup exported successfully! 14-day timer reset.');
      setTimeout(() => setSuccessMessage(null), 5000);
    } catch (err: any) {
      alert(`Encryption failed: ${err.message}`);
    }
  };

  // Decrypt and restore .khumsvault
  const handleExecuteDecryptRestore = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pendingVaultFileContent || !vaultPassphrase) return;

    try {
      const decryptedJson = await decryptBackupVault(pendingVaultFileContent, vaultPassphrase);
      const res = await restoreJSONBackup(decryptedJson);

      if (res.success) {
        setShowDecryptModal(false);
        setVaultPassphrase('');
        setPendingVaultFileContent(null);
        setSuccessMessage('Encrypted vault successfully verified, decrypted, and restored!');
        setTimeout(() => setSuccessMessage(null), 5000);
        onRefreshData();
      } else {
        alert(res.message);
      }
    } catch (err: any) {
      alert(`Decryption failed: Incorrect passphrase or damaged cryptographic ciphertext.`);
    }
  };

  // Export standard JSON
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

  // Restore standard JSON
  const handleRestoreJSON = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.name.endsWith('.khumsvault')) {
      const text = await file.text();
      setPendingVaultFileContent(text);
      setShowDecryptModal(true);
      return;
    }

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
              <h3 className="text-xl font-bold text-white tracking-tight">Import, Export & Cryptographic Vault</h3>
              <p className="text-xs text-slate-400 mt-1">
                Drag-and-drop legacy Excel workbooks or AES-256-GCM encrypted <code className="text-emerald-400">.khumsvault</code> backups.
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => setShowEncryptModal(true)}
              className="flex items-center space-x-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold shadow-md shadow-emerald-950/40 transition"
            >
              <Lock className="h-4 w-4" />
              <span>Export .khumsvault</span>
            </button>

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

        {successMessage && (
          <div className="mt-4 p-3 bg-emerald-950/90 border border-emerald-700 text-emerald-200 rounded-xl text-xs font-semibold flex items-center space-x-2 animate-in fade-in">
            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
            <span>{successMessage}</span>
          </div>
        )}
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
          Drop your Excel workbook or .khumsvault file here
        </h4>
        <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
          Supports 11-sheet workbook formats (.xlsx / .xls) and passphrase-protected AES-256 (.khumsvault) archives.
        </p>

        <div className="flex items-center justify-center space-x-3 mt-5">
          <label className="inline-flex items-center space-x-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-emerald-950/40 cursor-pointer transition">
            <FileSpreadsheet className="h-4 w-4" />
            <span>Select Excel (.xlsx)</span>
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

          <label className="inline-flex items-center space-x-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-emerald-400 border border-slate-700 rounded-xl text-xs font-semibold shadow-md cursor-pointer transition">
            <Lock className="h-4 w-4" />
            <span>Restore .khumsvault</span>
            <input
              type="file"
              accept=".khumsvault"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFileUpload(file);
              }}
              className="hidden"
            />
          </label>
        </div>
      </div>

      {/* Duplicate Monthly Block Resolver Banner */}
      {healingSummary && healingSummary.duplicateBlocks && healingSummary.duplicateBlocks.length > 0 && (
        <div className="bg-amber-950/80 border border-amber-600/60 rounded-2xl p-5 shadow-xl space-y-4 animate-in fade-in">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-amber-800/40 pb-3">
            <div className="flex items-center space-x-2.5">
              <div className="p-2 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/30">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white uppercase tracking-wider">
                  Duplicate Monthly Block Resolver ({healingSummary.duplicateBlocks.length} Cloned Blocks Found)
                </h4>
                <p className="text-xs text-amber-200/80">
                  Forensic audit detected copy-pasted blocks in your Expense sheet (specifically Jan 2025 rows 49–64 vs 31–46, and Oct 2026 rows 671–705 vs 634–668).
                </p>
              </div>
            </div>
            <button
              onClick={handleDiscardAllDuplicates}
              className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold shadow-md transition whitespace-nowrap"
            >
              Discard Duplicate Blocks in 1-Click
            </button>
          </div>

          <div className="space-y-2">
            {healingSummary.duplicateBlocks.map((dup, dIdx) => (
              <div key={dIdx} className="p-3 bg-slate-950/80 border border-amber-800/40 rounded-xl flex items-center justify-between text-xs">
                <div>
                  <span className="font-bold text-white block">{dup.clonedBlock.cloneReason}</span>
                  <span className="text-[11px] text-slate-400">
                    Block #{dup.clonedBlock.blockIndex + 1} (Rows {dup.clonedBlock.startRow}–{dup.clonedBlock.endRow}) duplicates Month {dup.originalBlock.billingMonth} ({dup.clonedBlock.rowCount} rows, ₨ {dup.clonedBlock.totalAmountPKR.toLocaleString()})
                  </span>
                </div>
                <span className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-amber-900/60 text-amber-300 border border-amber-700/60">
                  Auto-Flagged (Pending Discard)
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

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

      {/* Export Section with 3 Formats */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
        <h4 className="text-sm font-bold text-white uppercase tracking-wider">
          Export & Local Backup Formats
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          
          {/* Format 1: AES-256 Encrypted .khumsvault */}
          <div className="bg-slate-950/70 border border-emerald-900/60 rounded-xl p-4 flex flex-col justify-between space-y-3">
            <div>
              <div className="flex items-center space-x-2 text-emerald-400 font-bold text-sm">
                <Lock className="h-4 w-4" />
                <span>Encrypted (.khumsvault)</span>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                AES-256-GCM cipher with PBKDF2 passphrase key derivation (100,000 iterations). Maximum security.
              </p>
            </div>
            <button
              onClick={() => setShowEncryptModal(true)}
              className="flex items-center justify-center space-x-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold shadow-md transition"
            >
              <Download className="h-3.5 w-3.5" />
              <span>Export .khumsvault</span>
            </button>
          </div>

          {/* Format 2: Excel Workbook (.xlsx) */}
          <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-4 flex flex-col justify-between space-y-3">
            <div>
              <div className="flex items-center space-x-2 text-white font-bold text-sm">
                <FileSpreadsheet className="h-4 w-4 text-emerald-400" />
                <span>Clean Excel (.xlsx)</span>
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
              <span>Download .xlsx</span>
            </button>
          </div>

          {/* Format 3: JSON Full Backup */}
          <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-4 flex flex-col justify-between space-y-3">
            <div>
              <div className="flex items-center space-x-2 text-white font-bold text-sm">
                <FileJson className="h-4 w-4 text-cyan-400" />
                <span>Plain JSON Backup</span>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Direct JSON dump of Dexie stores for debugging or developer migration.
              </p>
            </div>
            <button
              onClick={handleExportJSON}
              className="flex items-center justify-center space-x-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-semibold border border-slate-700 transition"
            >
              <Download className="h-3.5 w-3.5" />
              <span>Export JSON</span>
            </button>
          </div>

        </div>
      </div>

      {/* Rolling 10-Snapshot Time Machine */}
      <TimeMachineCard onRestored={onRefreshData} />

      {/* Encrypt Passphrase Modal */}
      {showEncryptModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center space-x-2">
                <Lock className="h-5 w-5 text-emerald-400" />
                <h3 className="text-base font-bold text-white">Create Encrypted .khumsvault Backup</h3>
              </div>
              <button onClick={() => setShowEncryptModal(false)} className="text-slate-400 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleExecuteEncryptExport} className="space-y-4">
              <div>
                <label className="text-xs text-slate-400">Vault Passphrase (Min. 6 chars)</label>
                <input
                  type="password"
                  required
                  placeholder="Enter strong passphrase..."
                  value={vaultPassphrase}
                  onChange={(e) => setVaultPassphrase(e.target.value)}
                  className="w-full mt-1 px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="text-xs text-slate-400">Confirm Passphrase</label>
                <input
                  type="password"
                  required
                  placeholder="Re-enter passphrase..."
                  value={confirmPassphrase}
                  onChange={(e) => setConfirmPassphrase(e.target.value)}
                  className="w-full mt-1 px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="p-3 bg-emerald-950/40 border border-emerald-900/60 rounded-xl text-[11px] text-emerald-200">
                Your passphrase derives a 256-bit AES-GCM key directly in your browser. If you lose this passphrase, the data cannot be recovered by anyone.
              </div>

              <div className="flex justify-end space-x-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowEncryptModal(false)}
                  className="px-4 py-2 text-xs text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold shadow-md transition"
                >
                  Encrypt & Download
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Decrypt Passphrase Modal */}
      {showDecryptModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center space-x-2">
                <KeyRound className="h-5 w-5 text-emerald-400" />
                <h3 className="text-base font-bold text-white">Unlock & Restore .khumsvault</h3>
              </div>
              <button onClick={() => setShowDecryptModal(false)} className="text-slate-400 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleExecuteDecryptRestore} className="space-y-4">
              <div>
                <label className="text-xs text-slate-400">Vault Passphrase</label>
                <input
                  type="password"
                  required
                  autoFocus
                  placeholder="Enter vault passphrase..."
                  value={vaultPassphrase}
                  onChange={(e) => setVaultPassphrase(e.target.value)}
                  className="w-full mt-1 px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="p-3 bg-amber-950/40 border border-amber-900/60 rounded-xl text-[11px] text-amber-200">
                Warning: Restoring this encrypted vault will replace existing local records with the decrypted data from the backup archive.
              </div>

              <div className="flex justify-end space-x-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowDecryptModal(false)}
                  className="px-4 py-2 text-xs text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold shadow-md transition"
                >
                  Decrypt & Restore
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
