import React, { useState, useEffect } from 'react';
import { db } from '../db/db';
import { KematiRecord, Account, Transaction } from '../types';
import { 
  PiggyBank, 
  ShieldCheck, 
  Plus, 
  Calendar, 
  TrendingUp, 
  CheckCircle2, 
  DollarSign, 
  ArrowRight,
  Eye,
  EyeOff,
  Clock
} from 'lucide-react';

interface Props {
  onTransactionCreated?: () => void;
}

export const KematiTrackerCard: React.FC<Props> = ({ onTransactionCreated }) => {
  const [kematiList, setKematiList] = useState<KematiRecord[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [excludeFromExpenses, setExcludeFromExpenses] = useState<boolean>(() => {
    return localStorage.getItem('sada_kemati_as_asset') !== 'false';
  });
  const [isLoggingPayment, setIsLoggingPayment] = useState(false);

  const loadData = async () => {
    const [records, accs, txs] = await Promise.all([
      db.kemati_records.toArray(),
      db.accounts.toArray(),
      db.transactions.toArray()
    ]);

    // Count how many transactions have subCategory === 'Kemati'
    const kematiTxs = txs.filter(t => t.subCategory?.toLowerCase() === 'kemati' || t.isKematiLockedSavings);
    const totalMonthsPaid = kematiTxs.length;

    // Update records if count differs
    const updated = records.map(r => ({
      ...r,
      monthsPaid: Math.max(r.monthsPaid, totalMonthsPaid)
    }));

    setKematiList(updated);
    setAccounts(accs);
  };

  useEffect(() => {
    loadData();
  }, []);

  const toggleExcludeFromExpenses = () => {
    const nextVal = !excludeFromExpenses;
    setExcludeFromExpenses(nextVal);
    localStorage.setItem('sada_kemati_as_asset', String(nextVal));
  };

  const activeKemati = kematiList[0] || {
    id: 'kemati-jhone-50k',
    name: 'Kemati 50k (Jhone)',
    monthlyAmount: 50000,
    currency: 'PKR',
    startDate: '2025-01-01',
    durationMonths: 20,
    monthsPaid: 10,
    payoutAmount: 1000000,
    expectedPayoutMonth: '2026-10',
    isPayoutReceived: false,
    includeInKhums: true,
    notes: 'Monthly 50k committee - Transfer to Locked Savings (Asset).'
  };

  const accumulatedEquity = activeKemati.monthsPaid * activeKemati.monthlyAmount;
  const progressPct = Math.min((activeKemati.monthsPaid / activeKemati.durationMonths) * 100, 100);

  const handleQuickPayKemati = async () => {
    setIsLoggingPayment(true);
    try {
      const todayISO = new Date().toISOString().split('T')[0];
      const monthYM = todayISO.substring(0, 7);

      const newTx: Transaction = {
        id: `kemati-pay-${Date.now()}`,
        date: todayISO,
        type: 'EXPENSE',
        amount: activeKemati.monthlyAmount,
        currency: 'PKR',
        convertedAmountPKR: activeKemati.monthlyAmount,
        fxRateUsed: 1.0,
        category: 'Jhone',
        subCategory: 'Kemati',
        merchantOrRecipient: 'Kemati 50k Committee',
        sourceAccountId: 'al-habib-pkr',
        description: `Monthly Kemati payment: ${monthYM} (Transfer to Locked Savings)`,
        billingMonth: monthYM,
        status: 'CONFIRMED',
        isKematiLockedSavings: true
      };

      await db.transactions.add(newTx);

      // Deduct from Al Habib
      const acc = accounts.find(a => a.id === 'al-habib-pkr');
      if (acc) {
        await db.accounts.update('al-habib-pkr', {
          currentBalance: (acc.currentBalance || 0) - activeKemati.monthlyAmount
        });
      }

      // Update record
      await db.kemati_records.update(activeKemati.id, {
        monthsPaid: activeKemati.monthsPaid + 1
      });

      await loadData();
      if (onTransactionCreated) onTransactionCreated();
      alert(`Logged 50,000 PKR Kemati payment for ${monthYM}! Added to locked equity.`);
    } catch (err: any) {
      alert(`Payment failed: ${err.message}`);
    } finally {
      setIsLoggingPayment(false);
    }
  };

  return (
    <div className="bg-gradient-to-br from-slate-900 to-indigo-950 border border-indigo-800/40 rounded-2xl p-6 shadow-xl text-white">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5 pb-4 border-b border-indigo-800/40">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-indigo-500/20 rounded-xl border border-indigo-500/30 text-indigo-300">
            <PiggyBank className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-bold flex items-center gap-2">
              {activeKemati.name}
              <span className="text-[10px] bg-purple-900/80 text-purple-200 border border-purple-700/60 font-semibold px-2 py-0.5 rounded-full">
                Locked Savings Asset
              </span>
            </h3>
            <p className="text-xs text-indigo-200/80">
              ROSCA / Committee Accounting: Treated as equity accumulation rather than consumed expense.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Cash Flow View Toggle */}
          <button
            onClick={toggleExcludeFromExpenses}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 border transition-all ${
              excludeFromExpenses
                ? 'bg-indigo-600/30 border-indigo-400 text-indigo-200'
                : 'bg-slate-800 border-slate-700 text-slate-400'
            }`}
            title="Toggle whether monthly 50k is shown as operational expense or locked asset"
          >
            {excludeFromExpenses ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            {excludeFromExpenses ? 'Asset View (Excluded from Outflows)' : 'Expense View (Included)'}
          </button>

          <button
            onClick={handleQuickPayKemati}
            disabled={isLoggingPayment}
            className="px-3.5 py-1.5 bg-amber-400 hover:bg-amber-300 text-slate-950 rounded-xl text-xs font-bold flex items-center gap-1 shadow-md transition-all"
          >
            <Plus className="w-4 h-4" />
            Log 50k Payment
          </button>
        </div>
      </div>

      {/* Main KPI Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-5">
        <div className="bg-slate-950/60 p-4 rounded-xl border border-indigo-800/30">
          <span className="text-[10px] uppercase font-bold text-indigo-300 block mb-1">Total Equity Paid</span>
          <div className="text-2xl font-black text-amber-300 font-mono">
            ₨ {accumulatedEquity.toLocaleString()}
          </div>
          <span className="text-[11px] text-slate-400 mt-1 block">
            {activeKemati.monthsPaid} installments completed
          </span>
        </div>

        <div className="bg-slate-950/60 p-4 rounded-xl border border-indigo-800/30">
          <span className="text-[10px] uppercase font-bold text-indigo-300 block mb-1">Expected Payout</span>
          <div className="text-2xl font-black text-emerald-400 font-mono">
            ₨ {activeKemati.payoutAmount.toLocaleString()}
          </div>
          <span className="text-[11px] text-slate-400 mt-1 block flex items-center gap-1">
            <Calendar className="w-3 h-3 text-slate-400" />
            Payout: {activeKemati.expectedPayoutMonth}
          </span>
        </div>

        <div className="bg-slate-950/60 p-4 rounded-xl border border-indigo-800/30">
          <span className="text-[10px] uppercase font-bold text-indigo-300 block mb-1">Remaining Installments</span>
          <div className="text-2xl font-black text-white font-mono">
            {Math.max(0, activeKemati.durationMonths - activeKemati.monthsPaid)} months
          </div>
          <span className="text-[11px] text-slate-400 mt-1 block">
            ₨ {((activeKemati.durationMonths - activeKemati.monthsPaid) * activeKemati.monthlyAmount).toLocaleString()} remaining
          </span>
        </div>

        <div className="bg-slate-950/60 p-4 rounded-xl border border-indigo-800/30">
          <span className="text-[10px] uppercase font-bold text-indigo-300 block mb-1">Khums Asset Status</span>
          <div className="text-sm font-bold text-purple-300 flex items-center gap-1.5 mt-1">
            <ShieldCheck className="w-4 h-4 text-purple-400" />
            Auto-Included in Nov 30
          </div>
          <span className="text-[10px] text-slate-400 mt-1 block leading-tight">
            20% applied to accumulated equity on fiscal cutoff date
          </span>
        </div>
      </div>

      {/* Cycle Progress Bar */}
      <div className="space-y-1.5">
        <div className="flex justify-between text-xs font-semibold text-indigo-200">
          <span>Cycle Progress ({activeKemati.monthsPaid} of {activeKemati.durationMonths} Months)</span>
          <span className="font-mono">{progressPct.toFixed(0)}%</span>
        </div>
        <div className="h-2.5 w-full bg-slate-950 rounded-full overflow-hidden border border-indigo-800/40">
          <div
            className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-amber-400 rounded-full transition-all duration-500"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </div>
    </div>
  );
};
