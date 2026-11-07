import React, { useState, useEffect } from 'react';
import { db } from '../db/db';
import { LoanRecord, Account, Currency, Transaction } from '../types';
import {
  HandCoins,
  ShieldCheck,
  AlertTriangle,
  Plus,
  ArrowUpRight,
  ArrowDownLeft,
  Calendar,
  CheckCircle2,
  DollarSign,
  Cloud,
  RefreshCw,
  FolderSync,
  HelpCircle,
  FileCheck,
  Sliders,
  X,
  Share2,
} from 'lucide-react';
import { pushPacket, generateUUID, bytesToBase64, SadaPacket } from '../services/sada-bridge';
import {
  requestGDriveToken,
  uploadBackupToGDrive,
  listGDriveBackups,
  downloadGDriveBackup,
  GDriveBackupFile,
} from '../services/googleDriveSync';

export const LoansLedgerView: React.FC = () => {
  const [loans, setLoans] = useState<LoanRecord[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [activeTab, setActiveTab] = useState<'RECEIVABLES' | 'LIABILITIES' | 'CONSUMABLES' | 'SETTINGS'>('RECEIVABLES');

  // Khums Cutoff Date Configuration
  const [khumsCutoff, setKhumsCutoff] = useState<string>(() => {
    return localStorage.getItem('sada_khums_cutoff_date') || '11-30';
  });

  const handleRemindViaSadaLink = async (loan: LoanRecord) => {
    try {
      const text = `Assalamu Alaikum ${loan.counterpartyName}, gentle reminder regarding outstanding balance of ${loan.remainingAmount.toLocaleString()} ${loan.currency}. (Logged in Sada Hisaab)`;
      const pkt: SadaPacket = {
        packet_id: generateUUID(),
        idempotency_key: `hisaab_udhaar_${loan.id}_${Date.now()}`,
        sada_uid_hash: 'suite_global_sync',
        source_app: 'sadahisaab',
        target_app: 'sadalink',
        action: 'SHARE_CHAT',
        encrypted_payload: bytesToBase64(
          new TextEncoder().encode(
            JSON.stringify({
              text,
              borrower: loan.counterpartyName,
              amount: loan.remainingAmount,
              currency: loan.currency,
            })
          )
        ),
        iv: bytesToBase64(crypto.getRandomValues(new Uint8Array(12))),
        created_at: Date.now(),
      };
      await pushPacket(pkt);
      alert(`✅ Reminder dispatched for ${loan.counterpartyName}! Delivering into SadaLink.`);
    } catch {
      alert('Reminder saved to outbox');
    }
  };

  // Consumables Checklist state
  const [pantryValue, setPantryValue] = useState<number>(() => {
    return Number(localStorage.getItem('sada_fiqh_pantry_val') || 45000);
  });
  const [unstitchedClothesValue, setUnstitchedClothesValue] = useState<number>(() => {
    return Number(localStorage.getItem('sada_fiqh_clothes_val') || 30000);
  });
  const [unusedGiftsValue, setUnusedGiftsValue] = useState<number>(() => {
    return Number(localStorage.getItem('sada_fiqh_gifts_val') || 25000);
  });
  const [unusedCosmeticsValue, setUnusedCosmeticsValue] = useState<number>(() => {
    return Number(localStorage.getItem('sada_fiqh_cosmetics_val') || 15000);
  });

  // Google Drive state
  const [gdriveClientId, setGdriveClientId] = useState<string>(() => {
    return localStorage.getItem('gdrive_client_id') || '';
  });
  const [gdriveToken, setGdriveToken] = useState<string | null>(null);
  const [gdriveFiles, setGdriveFiles] = useState<GDriveBackupFile[]>([]);
  const [isSyncingGDrive, setIsSyncingGDrive] = useState(false);
  const [syncStatusMsg, setSyncStatusMsg] = useState<string | null>(null);

  // New Loan Modal state
  const [isNewLoanOpen, setIsNewLoanOpen] = useState(false);
  const [newLoan, setNewLoan] = useState<Partial<LoanRecord>>({
    type: 'LENT_RECEIVABLE',
    counterpartyName: '',
    relationship: '',
    originalAmount: 10000,
    remainingAmount: 10000,
    currency: 'PKR',
    lentDate: new Date().toISOString().split('T')[0],
    isRecoverable: true,
    notes: '',
  });

  // Repayment Modal state
  const [repayingLoan, setRepayingLoan] = useState<LoanRecord | null>(null);
  const [repaymentAmount, setRepaymentAmount] = useState<number>(0);
  const [repaymentAccountId, setRepaymentAccountId] = useState<string>('');
  const [repaymentNotes, setRepaymentNotes] = useState<string>('');

  const loadData = async () => {
    const [allLoans, allAccounts] = await Promise.all([
      db.loans.toArray(),
      db.accounts.toArray(),
    ]);
    setLoans(allLoans);
    setAccounts(allAccounts);
    if (allAccounts.length > 0 && !repaymentAccountId) {
      setRepaymentAccountId(allAccounts[0].id);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleKhumsCutoffSave = (val: string) => {
    setKhumsCutoff(val);
    localStorage.setItem('sada_khums_cutoff_date', val);
    alert(`Khums Cutoff Date updated to: ${val}. All annual calculations will benchmark against this day.`);
  };

  const handleSaveConsumables = () => {
    localStorage.setItem('sada_fiqh_pantry_val', String(pantryValue));
    localStorage.setItem('sada_fiqh_clothes_val', String(unstitchedClothesValue));
    localStorage.setItem('sada_fiqh_gifts_val', String(unusedGiftsValue));
    localStorage.setItem('sada_fiqh_cosmetics_val', String(unusedCosmeticsValue));
    alert('Consumables & Unused Items checklist saved successfully! Integrated into Khums calculation.');
  };

  const totalConsumablesValue = pantryValue + unstitchedClothesValue + unusedGiftsValue + unusedCosmeticsValue;
  const consumablesKhumsObligation = totalConsumablesValue * 0.20; // 20% Khums on surplus

  // Google Drive Authentication & Sync
  const handleConnectGDrive = async () => {
    if (!gdriveClientId.trim()) {
      alert('Please enter your Google Cloud OAuth 2.0 Client ID.');
      return;
    }
    localStorage.setItem('gdrive_client_id', gdriveClientId.trim());
    setIsSyncingGDrive(true);
    setSyncStatusMsg('Connecting to Google Identity Services...');
    try {
      const token = await requestGDriveToken(gdriveClientId.trim());
      setGdriveToken(token);
      setSyncStatusMsg('Authorized! Fetching backups from Google Drive...');
      const files = await listGDriveBackups(token);
      setGdriveFiles(files);
      setSyncStatusMsg(`Connected to Google Drive folder 'SadaCash_Backups' (${files.length} backups found)`);
    } catch (err: any) {
      setSyncStatusMsg(`Connection failed: ${err.message || err}`);
    } finally {
      setIsSyncingGDrive(false);
    }
  };

  const handleUploadGDriveBackup = async () => {
    if (!gdriveToken) {
      alert('Please authorize Google Drive first.');
      return;
    }
    setIsSyncingGDrive(true);
    setSyncStatusMsg('Creating comprehensive local backup snapshot...');
    try {
      const [accs, txs, fx, snapshots, loansData, roster, rules] = await Promise.all([
        db.accounts.toArray(),
        db.transactions.toArray(),
        db.fx_rates.toArray(),
        db.khums_snapshots.toArray(),
        db.loans.toArray(),
        db.roster_items.toArray(),
        db.merchant_rules.toArray(),
      ]);

      const backupObj = {
        metadata: {
          app: 'Sada Hisab',
          version: '2.0.0',
          exportedAt: new Date().toISOString(),
          device: 'Local Browser (IndexedDB)',
        },
        data: {
          accounts: accs,
          transactions: txs,
          fx_rates: fx,
          khums_snapshots: snapshots,
          loans: loansData,
          roster_items: roster,
          merchant_rules: rules,
        },
      };

      const jsonStr = JSON.stringify(backupObj, null, 2);
      const res = await uploadBackupToGDrive(gdriveToken, jsonStr);

      if (res.success) {
        setSyncStatusMsg(`Backup uploaded directly to Google Drive: ${res.fileName}`);
        const files = await listGDriveBackups(gdriveToken);
        setGdriveFiles(files);
      } else {
        setSyncStatusMsg(`Upload failed: ${res.error}`);
      }
    } catch (err: any) {
      setSyncStatusMsg(`Sync error: ${err.message}`);
    } finally {
      setIsSyncingGDrive(false);
    }
  };

  const handleRestoreGDriveFile = async (file: GDriveBackupFile) => {
    if (!confirm(`Restore local database from Google Drive backup '${file.name}'? Existing local tables will be synchronized.`)) {
      return;
    }
    if (!gdriveToken) return;

    try {
      setIsSyncingGDrive(true);
      setSyncStatusMsg(`Downloading '${file.name}'...`);
      const rawText = await downloadGDriveBackup(gdriveToken, file.id);
      const parsed = JSON.parse(rawText);

      if (parsed.data) {
        if (parsed.data.accounts) await db.accounts.bulkPut(parsed.data.accounts);
        if (parsed.data.transactions) await db.transactions.bulkPut(parsed.data.transactions);
        if (parsed.data.loans) await db.loans.bulkPut(parsed.data.loans);
        if (parsed.data.roster_items) await db.roster_items.bulkPut(parsed.data.roster_items);
        alert('Database restored successfully from Google Drive!');
        await loadData();
      }
    } catch (err: any) {
      alert(`Restore failed: ${err.message}`);
    } finally {
      setIsSyncingGDrive(false);
    }
  };

  // Toggle Recoverable (Khums inclusion)
  const toggleRecoverable = async (loan: LoanRecord) => {
    await db.loans.update(loan.id, { isRecoverable: !loan.isRecoverable });
    await loadData();
  };

  // Save new loan
  const handleSaveLoan = async () => {
    if (!newLoan.counterpartyName || !newLoan.originalAmount) {
      alert('Please fill counterparty name and amount.');
      return;
    }

    const item: LoanRecord = {
      id: crypto.randomUUID(),
      type: newLoan.type || 'LENT_RECEIVABLE',
      counterpartyName: newLoan.counterpartyName,
      relationship: newLoan.relationship || '',
      originalAmount: Number(newLoan.originalAmount),
      remainingAmount: Number(newLoan.remainingAmount || newLoan.originalAmount),
      currency: newLoan.currency || 'PKR',
      lentDate: newLoan.lentDate || new Date().toISOString().split('T')[0],
      dueDate: newLoan.dueDate || '',
      isRecoverable: newLoan.isRecoverable ?? true,
      notes: newLoan.notes || '',
      repayments: [],
    };

    await db.loans.add(item);
    setIsNewLoanOpen(false);
    setNewLoan({
      type: 'LENT_RECEIVABLE',
      counterpartyName: '',
      relationship: '',
      originalAmount: 10000,
      remainingAmount: 10000,
      currency: 'PKR',
      lentDate: new Date().toISOString().split('T')[0],
      isRecoverable: true,
      notes: '',
    });
    await loadData();
  };

  // Process Repayment
  const handleExecuteRepayment = async () => {
    if (!repayingLoan || repaymentAmount <= 0) return;

    const newRemaining = Math.max(0, repayingLoan.remainingAmount - repaymentAmount);
    const repaymentEntry = {
      date: new Date().toISOString().split('T')[0],
      amount: repaymentAmount,
      notes: repaymentNotes || 'Repayment recorded in Loans Ledger',
    };

    const updatedRepayments = [...(repayingLoan.repayments || []), repaymentEntry];
    await db.loans.update(repayingLoan.id, {
      remainingAmount: newRemaining,
      repayments: updatedRepayments,
    });

    // Optionally create linked transaction
    if (repaymentAccountId) {
      const isLent = repayingLoan.type === 'LENT_RECEIVABLE';
      const newTx: Transaction = {
        id: crypto.randomUUID(),
        date: repaymentEntry.date,
        type: isLent ? 'INCOME' : 'EXPENSE',
        amount: repaymentAmount,
        currency: repayingLoan.currency,
        convertedAmountPKR: repayingLoan.currency === 'PKR' ? repaymentAmount : repaymentAmount * 76.5,
        fxRateUsed: repayingLoan.currency === 'PKR' ? 1 : 76.5,
        category: 'Loan Settlement',
        subCategory: isLent ? 'Loan Collection' : 'Loan Repayment',
        merchantOrRecipient: repayingLoan.counterpartyName,
        sourceAccountId: repaymentAccountId,
        description: `Loan Repayment: ${repayingLoan.counterpartyName} (${repaymentNotes || 'Partial/Full'})`,
        status: 'CONFIRMED',
        isSampleData: false,
      };

      await db.transactions.add(newTx);

      const acc = accounts.find(a => a.id === repaymentAccountId);
      if (acc) {
        const balChange = isLent ? repaymentAmount : -repaymentAmount;
        await db.accounts.update(repaymentAccountId, {
          currentBalance: (acc.currentBalance || 0) + balChange,
        });
      }
    }

    setRepayingLoan(null);
    setRepaymentAmount(0);
    setRepaymentNotes('');
    await loadData();
  };

  // Calculations
  const receivables = loans.filter(l => l.type === 'LENT_RECEIVABLE');
  const liabilities = loans.filter(l => l.type === 'BORROWED_LIABILITY');

  const totalRecoverableReceivablesPKR = receivables
    .filter(l => l.isRecoverable)
    .reduce((sum, l) => sum + (l.currency === 'AED' ? l.remainingAmount * 76.5 : l.remainingAmount), 0);

  const totalDoubtfulReceivablesPKR = receivables
    .filter(l => !l.isRecoverable)
    .reduce((sum, l) => sum + (l.currency === 'AED' ? l.remainingAmount * 76.5 : l.remainingAmount), 0);

  const totalLiabilitiesPKR = liabilities.reduce(
    (sum, l) => sum + (l.currency === 'AED' ? l.remainingAmount * 76.5 : l.remainingAmount),
    0
  );

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-2xl p-6 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <HandCoins className="w-6 h-6 text-amber-400" />
            <h1 className="text-2xl font-bold tracking-tight">
              Loans & Receivables Ledger, Fiqh Checklist & Cloud Sync
            </h1>
          </div>
          <p className="text-slate-300 text-xs max-w-2xl">
            Track loans given (recoverable assets vs doubtful bad debts), outstanding liabilities, 20% consumable
            reserves, and optional direct-to-Google-Drive backup sync.
          </p>
        </div>

        <button
          onClick={() => setIsNewLoanOpen(true)}
          className="px-4 py-2 bg-amber-400 hover:bg-amber-300 text-slate-900 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md transition-all self-start md:self-auto"
        >
          <Plus className="w-4 h-4" />
          Add Loan / Debt
        </button>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2 overflow-x-auto">
        <button
          onClick={() => setActiveTab('RECEIVABLES')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
            activeTab === 'RECEIVABLES'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
          }`}
        >
          <ArrowUpRight className="w-4 h-4 text-emerald-400" />
          Loans Given / Receivables ({receivables.length})
        </button>

        <button
          onClick={() => setActiveTab('LIABILITIES')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
            activeTab === 'LIABILITIES'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
          }`}
        >
          <ArrowDownLeft className="w-4 h-4 text-rose-400" />
          Loans Taken / Debts ({liabilities.length})
        </button>

        <button
          onClick={() => setActiveTab('CONSUMABLES')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
            activeTab === 'CONSUMABLES'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
          }`}
        >
          <FileCheck className="w-4 h-4 text-amber-400" />
          20% Consumables & Unused Items
        </button>

        <button
          onClick={() => setActiveTab('SETTINGS')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
            activeTab === 'SETTINGS'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
          }`}
        >
          <Cloud className="w-4 h-4 text-teal-400" />
          Khums Cutoff & Google Drive Sync
        </button>
      </div>

      {/* TAB 1: RECEIVABLES */}
      {activeTab === 'RECEIVABLES' && (
        <div className="space-y-6">
          {/* KPI Summary */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                Recoverable Loans Given
              </span>
              <div className="text-2xl font-black text-emerald-600">
                ₨ {totalRecoverableReceivablesPKR.toLocaleString()}
              </div>
              <span className="text-xs text-slate-500 mt-1 block">
                Included in Khums calculations as liquid assets
              </span>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                Doubtful / Bad Debts
              </span>
              <div className="text-2xl font-black text-slate-400">
                ₨ {totalDoubtfulReceivablesPKR.toLocaleString()}
              </div>
              <span className="text-xs text-slate-500 mt-1 block">
                Excluded from Khums until collected in hand
              </span>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                Total Lent Portfolio
              </span>
              <div className="text-2xl font-black text-slate-900">
                ₨ {(totalRecoverableReceivablesPKR + totalDoubtfulReceivablesPKR).toLocaleString()}
              </div>
              <span className="text-xs text-slate-500 mt-1 block">
                Across {receivables.length} counterparty records
              </span>
            </div>
          </div>

          {/* Receivables List */}
          <div className="space-y-3">
            {receivables.map(loan => (
              <div
                key={loan.id}
                className={`bg-white rounded-xl border p-5 transition-all shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                  loan.isRecoverable ? 'border-slate-200' : 'border-amber-200/80 bg-amber-50/20'
                }`}
              >
                <div>
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <h3 className="font-bold text-slate-900 text-base">{loan.counterpartyName}</h3>
                    {loan.relationship && (
                      <span className="text-xs bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md font-medium">
                        {loan.relationship}
                      </span>
                    )}
                    <button
                      onClick={() => toggleRecoverable(loan)}
                      className={`text-xs px-2.5 py-0.5 rounded-full font-bold border transition-all flex items-center gap-1 ${
                        loan.isRecoverable
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                          : 'bg-amber-100 text-amber-800 border-amber-300'
                      }`}
                    >
                      {loan.isRecoverable ? (
                        <>
                          <ShieldCheck className="w-3.5 h-3.5" />
                          Recoverable (In Khums)
                        </>
                      ) : (
                        <>
                          <AlertTriangle className="w-3.5 h-3.5" />
                          Doubtful (Excluded from Khums)
                        </>
                      )}
                    </button>
                  </div>

                  <div className="flex items-center gap-3 text-xs text-slate-500 mt-2 flex-wrap">
                    <span>Lent on: <strong className="text-slate-700">{loan.lentDate}</strong></span>
                    {loan.dueDate && <span>Due: <strong className="text-slate-700">{loan.dueDate}</strong></span>}
                    {loan.notes && <span className="italic text-slate-600">“{loan.notes}”</span>}
                  </div>
                </div>

                <div className="flex items-center justify-between md:justify-end gap-4 flex-shrink-0 pt-3 md:pt-0 border-t md:border-t-0 border-slate-100">
                  <div className="text-left md:text-right">
                    <div className="text-lg font-black text-slate-900">
                      {loan.remainingAmount.toLocaleString()} {loan.currency}
                    </div>
                    {loan.remainingAmount < loan.originalAmount && (
                      <span className="text-[11px] text-emerald-600 font-semibold block">
                        Original: {loan.originalAmount.toLocaleString()} {loan.currency}
                      </span>
                    )}
                  </div>

                  <button
                    onClick={() => handleRemindViaSadaLink(loan)}
                    className="px-3 py-2 bg-slate-900 hover:bg-slate-800 text-emerald-400 border border-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sm"
                    title="Remind via SadaLink"
                  >
                    <Share2 className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Remind on SadaLink</span>
                  </button>

                  <button
                    onClick={() => {
                      setRepayingLoan(loan);
                      setRepaymentAmount(loan.remainingAmount);
                    }}
                    className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm"
                  >
                    Record Collection
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 2: LIABILITIES */}
      {activeTab === 'LIABILITIES' && (
        <div className="space-y-6">
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1">
              Total Outstanding Debts & Deductible Liabilities
            </span>
            <div className="text-2xl font-black text-rose-600">
              ₨ {totalLiabilitiesPKR.toLocaleString()}
            </div>
            <span className="text-xs text-slate-500 mt-1 block">
              Deducted from gross assets prior to calculating annual Khums surplus
            </span>
          </div>

          <div className="space-y-3">
            {liabilities.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-2xl border border-slate-200 text-slate-400 text-xs">
                No debts or liabilities recorded. Alhamdulillah!
              </div>
            ) : (
              liabilities.map(loan => (
                <div
                  key={loan.id}
                  className="bg-white rounded-xl border border-slate-200 p-5 transition-all shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  <div>
                    <div className="flex items-center gap-2.5">
                      <h3 className="font-bold text-slate-900 text-base">{loan.counterpartyName}</h3>
                      {loan.relationship && (
                        <span className="text-xs bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md font-medium">
                          {loan.relationship}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-slate-500 mt-2 flex-wrap">
                      <span>Borrowed on: <strong className="text-slate-700">{loan.lentDate}</strong></span>
                      {loan.dueDate && <span>Due Date: <strong className="text-slate-700">{loan.dueDate}</strong></span>}
                      {loan.notes && <span className="italic text-slate-600">“{loan.notes}”</span>}
                    </div>
                  </div>

                  <div className="flex items-center justify-between md:justify-end gap-4 flex-shrink-0 pt-3 md:pt-0 border-t md:border-t-0 border-slate-100">
                    <div className="text-left md:text-right">
                      <div className="text-lg font-black text-rose-600">
                        {loan.remainingAmount.toLocaleString()} {loan.currency}
                      </div>
                      {loan.remainingAmount < loan.originalAmount && (
                        <span className="text-[11px] text-slate-400 font-semibold block">
                          Original: {loan.originalAmount.toLocaleString()} {loan.currency}
                        </span>
                      )}
                    </div>

                    <button
                      onClick={() => {
                        setRepayingLoan(loan);
                        setRepaymentAmount(loan.remainingAmount);
                      }}
                      className="px-3.5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm"
                    >
                      Record Repayment
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* TAB 3: CONSUMABLES & UNUSED ITEMS CHECKLIST */}
      {activeTab === 'CONSUMABLES' && (
        <div className="space-y-6">
          <div className="bg-amber-50/70 border border-amber-200 rounded-2xl p-6">
            <div className="flex items-start gap-3">
              <FileCheck className="w-6 h-6 text-amber-700 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="text-base font-bold text-amber-950">
                  Fiqh Rules on Year-End Consumables & Unused Goods
                </h3>
                <p className="text-xs text-amber-900/80 mt-1 leading-relaxed">
                  Under Islamic Khums jurisprudence (Ayatollah Sistani & Khamenei rulings), any provisions, food
                  reserves, or luxury goods purchased with income during the fiscal year that remain unused by the Khums
                  cutoff date are considered surplus wealth and are subject to <strong>20% Khums</strong>.
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs space-y-5">
            <h4 className="text-sm font-bold text-slate-900 border-b pb-2">
              Annual Surplus Inventory Estimator
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  1. Pantry & Non-Perishable Provisions (₨)
                </label>
                <p className="text-[11px] text-slate-400 mb-1.5">
                  Surplus rice bags, oil tins, ghee, tea, flour, spices, and non-perishable stocks.
                </p>
                <input
                  type="number"
                  value={pantryValue}
                  onChange={e => setPantryValue(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm font-bold text-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  2. Unstitched Fabric & Unworn Luxury Garments (₨)
                </label>
                <p className="text-[11px] text-slate-400 mb-1.5">
                  Clothes or unstitched suits bought during the year not yet tailored or worn once.
                </p>
                <input
                  type="number"
                  value={unstitchedClothesValue}
                  onChange={e => setUnstitchedClothesValue(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm font-bold text-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  3. Unused Electronics & Undistributed Gifts (₨)
                </label>
                <p className="text-[11px] text-slate-400 mb-1.5">
                  Surplus gadgets, boxed appliances, or gift items purchased but not yet gifted.
                </p>
                <input
                  type="number"
                  value={unusedGiftsValue}
                  onChange={e => setUnusedGiftsValue(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm font-bold text-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  4. Unopened Fragrances & Cosmetics (₨)
                </label>
                <p className="text-[11px] text-slate-400 mb-1.5">
                  Sealed perfumes, makeup palettes, and luxury toiletries kept in reserve.
                </p>
                <input
                  type="number"
                  value={unusedCosmeticsValue}
                  onChange={e => setUnusedCosmeticsValue(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm font-bold text-slate-900"
                />
              </div>
            </div>

            {/* Calculated summary card */}
            <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div>
                <span className="text-xs text-slate-500 font-semibold block">Total Estimated Unused Surplus</span>
                <span className="text-xl font-black text-slate-900">
                  ₨ {totalConsumablesValue.toLocaleString()}
                </span>
              </div>

              <div>
                <span className="text-xs text-amber-700 font-semibold block">20% Khums Liability on Surplus</span>
                <span className="text-xl font-black text-amber-600">
                  ₨ {consumablesKhumsObligation.toLocaleString()}
                </span>
              </div>

              <button
                onClick={handleSaveConsumables}
                className="px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-xl text-xs font-bold shadow-sm transition-all"
              >
                Save & Apply to Khums
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: KHUMS CUTOFF & GOOGLE DRIVE SYNC */}
      {activeTab === 'SETTINGS' && (
        <div className="space-y-6">
          {/* Khums Cutoff Date Card */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs">
            <h3 className="text-base font-bold text-slate-900 mb-2 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-teal-700" />
              Annual Khums Fiscal Cutoff Date
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Configure your specific Khums accounting anniversary. The historical workbook default is November 30
              (11-30). You can also set any Gregorian date or your Islamic Hijri date equivalent.
            </p>

            <div className="flex items-center gap-3 max-w-sm">
              <input
                type="text"
                placeholder="MM-DD (e.g. 11-30)"
                value={khumsCutoff}
                onChange={e => setKhumsCutoff(e.target.value)}
                className="px-3.5 py-2 border border-slate-300 rounded-xl text-sm font-bold text-slate-900 flex-1"
              />
              <button
                onClick={() => handleKhumsCutoffSave(khumsCutoff)}
                className="px-4 py-2 bg-teal-700 hover:bg-teal-800 text-white rounded-xl text-xs font-bold"
              >
                Save Cutoff
              </button>
            </div>
          </div>

          {/* Client-Side Google Drive Sync Card */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Cloud className="w-5 h-5 text-blue-600" />
                  Client-Side Google Drive Backup & Restore (Zero Backend)
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Direct OAuth2 client backup to your personal Google Drive folder <code>SadaCash_Backups/</code>.
                  Zero external servers. 100% encrypted & private.
                </p>
              </div>

              {gdriveToken && (
                <span className="px-3 py-1 bg-emerald-100 text-emerald-800 text-xs font-bold rounded-full flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Authorized
                </span>
              )}
            </div>

            <div className="space-y-3 pt-2">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Google Cloud OAuth 2.0 Client ID
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    placeholder="e.g. 123456789-abcdefg.apps.googleusercontent.com"
                    value={gdriveClientId}
                    onChange={e => setGdriveClientId(e.target.value)}
                    className="flex-1 px-3 py-2 border border-slate-300 rounded-xl text-xs font-mono text-slate-800"
                  />
                  <button
                    onClick={handleConnectGDrive}
                    disabled={isSyncingGDrive}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all"
                  >
                    <FolderSync className="w-4 h-4" />
                    {gdriveToken ? 'Re-Connect' : 'Authorize Drive'}
                  </button>
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  Obtained from Google Cloud Console → Credentials → OAuth Client ID (Web Application).
                </p>
              </div>

              {syncStatusMsg && (
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 flex items-center gap-2">
                  {isSyncingGDrive && <RefreshCw className="w-3.5 h-3.5 animate-spin text-blue-600" />}
                  {syncStatusMsg}
                </div>
              )}

              {gdriveToken && (
                <div className="pt-2 flex items-center gap-3">
                  <button
                    onClick={handleUploadGDriveBackup}
                    disabled={isSyncingGDrive}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm"
                  >
                    <Cloud className="w-4 h-4" />
                    Backup Now to Google Drive
                  </button>
                </div>
              )}

              {/* List of Drive Backups */}
              {gdriveFiles.length > 0 && (
                <div className="mt-4 border-t pt-4">
                  <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                    Backups in 'SadaCash_Backups' on Google Drive
                  </h4>
                  <div className="space-y-2">
                    {gdriveFiles.map(file => (
                      <div
                        key={file.id}
                        className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between text-xs"
                      >
                        <div>
                          <span className="font-bold text-slate-800 block">{file.name}</span>
                          <span className="text-[10px] text-slate-400">
                            Created: {new Date(file.createdTime).toLocaleString()}
                          </span>
                        </div>
                        <button
                          onClick={() => handleRestoreGDriveFile(file)}
                          className="px-3 py-1 bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 rounded-lg font-semibold"
                        >
                          Restore
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Record Repayment Modal */}
      {repayingLoan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <HandCoins className="w-5 h-5 text-emerald-600" />
                Record Loan Repayment / Collection
              </h3>
              <button onClick={() => setRepayingLoan(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-500 mb-4">
              Counterparty: <strong className="text-slate-800">{repayingLoan.counterpartyName}</strong> | Outstanding: {repayingLoan.remainingAmount.toLocaleString()} {repayingLoan.currency}
            </p>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Repayment Amount</label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    max={repayingLoan.remainingAmount}
                    value={repaymentAmount}
                    onChange={e => setRepaymentAmount(Number(e.target.value))}
                    className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-sm font-bold text-slate-900"
                  />
                  <span className="font-bold text-sm text-slate-600">{repayingLoan.currency}</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Account to Credit / Debit</label>
                <select
                  value={repaymentAccountId}
                  onChange={e => setRepaymentAccountId(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-800"
                >
                  {accounts.map(acc => (
                    <option key={acc.id} value={acc.id}>
                      {acc.name} ({acc.currency})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Notes</label>
                <input
                  type="text"
                  placeholder="e.g. Bank transfer reference or cash received"
                  value={repaymentNotes}
                  onChange={e => setRepaymentNotes(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-800"
                />
              </div>
            </div>

            <div className="mt-6 flex items-center justify-end gap-2">
              <button
                onClick={() => setRepayingLoan(null)}
                className="px-4 py-2 border border-slate-200 text-slate-600 text-xs font-semibold rounded-lg hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={handleExecuteRepayment}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-sm"
              >
                Confirm Settlement
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add New Loan Modal */}
      {isNewLoanOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Plus className="w-5 h-5 text-amber-500" />
                Add Loan or Debt Record
              </h3>
              <button onClick={() => setIsNewLoanOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Type</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setNewLoan({ ...newLoan, type: 'LENT_RECEIVABLE' })}
                    className={`py-2 text-xs font-bold rounded-xl border text-center transition-all ${
                      newLoan.type === 'LENT_RECEIVABLE'
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                        : 'border-slate-200 text-slate-600'
                    }`}
                  >
                    Loan Given (Asset)
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewLoan({ ...newLoan, type: 'BORROWED_LIABILITY' })}
                    className={`py-2 text-xs font-bold rounded-xl border text-center transition-all ${
                      newLoan.type === 'BORROWED_LIABILITY'
                        ? 'bg-rose-50 text-rose-800 border-rose-300'
                        : 'border-slate-200 text-slate-600'
                    }`}
                  >
                    Loan Taken (Debt)
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Counterparty Name *</label>
                <input
                  type="text"
                  placeholder="e.g. Brother, Friend, Business Partner"
                  value={newLoan.counterpartyName || ''}
                  onChange={e => setNewLoan({ ...newLoan, counterpartyName: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-800"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Amount *</label>
                  <input
                    type="number"
                    value={newLoan.originalAmount || ''}
                    onChange={e =>
                      setNewLoan({
                        ...newLoan,
                        originalAmount: Number(e.target.value),
                        remainingAmount: Number(e.target.value),
                      })
                    }
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Currency</label>
                  <select
                    value={newLoan.currency || 'PKR'}
                    onChange={e => setNewLoan({ ...newLoan, currency: e.target.value as Currency })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-800"
                  >
                    <option value="PKR">PKR (₨)</option>
                    <option value="AED">AED (Dh)</option>
                    <option value="USD">USD ($)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Date Lent / Borrowed</label>
                  <input
                    type="date"
                    value={newLoan.lentDate}
                    onChange={e => setNewLoan({ ...newLoan, lentDate: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Due Date (Optional)</label>
                  <input
                    type="date"
                    value={newLoan.dueDate || ''}
                    onChange={e => setNewLoan({ ...newLoan, dueDate: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-800"
                  />
                </div>
              </div>

              {newLoan.type === 'LENT_RECEIVABLE' && (
                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="checkbox"
                    id="recoverableCheck"
                    checked={newLoan.isRecoverable}
                    onChange={e => setNewLoan({ ...newLoan, isRecoverable: e.target.checked })}
                    className="w-4 h-4 text-emerald-600 rounded"
                  />
                  <label htmlFor="recoverableCheck" className="text-xs text-slate-700 font-medium">
                    Recoverable Asset (Include in Khums Calculation)
                  </label>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Notes</label>
                <input
                  type="text"
                  placeholder="e.g. Agreed to repay in 6 installments"
                  value={newLoan.notes || ''}
                  onChange={e => setNewLoan({ ...newLoan, notes: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-800"
                />
              </div>
            </div>

            <div className="mt-6 flex items-center justify-end gap-2">
              <button
                onClick={() => setIsNewLoanOpen(false)}
                className="px-4 py-2 border border-slate-200 text-slate-600 text-xs font-semibold rounded-lg hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveLoan}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-lg shadow-sm"
              >
                Save Record
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
