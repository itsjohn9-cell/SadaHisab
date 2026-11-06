import React, { useState, useMemo } from 'react';
import { 
  Account, 
  Transaction, 
  Currency, 
  TransactionType 
} from '../types';
import { db, recalculateAllAccountBalances } from '../db/db';
import { formatCurrency, formatDatePretty } from '../utils/formatters';
import { convertToPKR } from '../services/fxService';
import { 
  Scale, 
  CheckCircle2, 
  AlertCircle, 
  Wrench, 
  CreditCard, 
  Calendar, 
  ArrowRight, 
  Check, 
  Building2, 
  Landmark, 
  Smartphone, 
  Banknote,
  TrendingDown,
  Info
} from 'lucide-react';

interface ReconciliationAuditViewProps {
  accounts: Account[];
  transactions: Transaction[];
  onRefreshData: () => void;
}

export const ReconciliationAuditView: React.FC<ReconciliationAuditViewProps> = ({
  accounts,
  transactions,
  onRefreshData
}) => {
  // Map of actual bank balances entered by user
  const [actualBalances, setActualBalances] = useState<Record<string, number>>(() => {
    const init: Record<string, number> = {};
    accounts.forEach(a => {
      init[a.id] = a.lastReconciledBalance !== undefined ? a.lastReconciledBalance : a.currentBalance;
    });
    return init;
  });

  const [activeFilter, setActiveFilter] = useState<'ALL' | 'DISCREPANCIES' | 'CREDIT_CARD'>('ALL');
  const [successToast, setSuccessToast] = useState<string | null>(null);

  const handleActualChange = (accId: string, val: number) => {
    setActualBalances(prev => ({
      ...prev,
      [accId]: val
    }));
  };

  // 1-Click Auto-Reconcile Adjustment (Matches workbook Totals Adjusted / Adjustment Date)
  const handleAutoReconcile = async (account: Account) => {
    const actual = actualBalances[account.id] !== undefined ? actualBalances[account.id] : account.currentBalance;
    const discrepancy = actual - account.currentBalance;

    if (Math.abs(discrepancy) < 0.01) return;

    const today = new Date().toISOString().split('T')[0];
    const converted = await convertToPKR(Math.abs(discrepancy), account.currency);

    // If actual > calculated -> adjustment income; if actual < calculated -> adjustment expense
    const type: TransactionType = 'RECONCILIATION_ADJUSTMENT';

    const adjTx: Transaction = {
      id: `reconcile-${account.id}-${Date.now()}`,
      date: today,
      type: discrepancy > 0 ? 'INCOME' : 'EXPENSE',
      amount: Math.abs(discrepancy),
      currency: account.currency,
      convertedAmountPKR: converted.amountPKR,
      fxRateUsed: converted.fxRate,
      category: 'Reconciliation Adjustment',
      subCategory: discrepancy > 0 ? 'Surplus Recovery' : 'Omitted Expense / Bank Fee',
      merchantOrRecipient: `Audit Balancing: ${account.name}`,
      sourceAccountId: discrepancy < 0 ? account.id : undefined,
      destinationAccountId: discrepancy > 0 ? account.id : undefined,
      description: `Reconciliation adjustment to match actual bank balance of ${formatCurrency(actual, account.currency)} (Discrepancy: ${discrepancy > 0 ? '+' : ''}${formatCurrency(discrepancy, account.currency)})`,
      status: 'CONFIRMED',
      isReconciliationAdjustment: true
    };

    await db.transactions.add(adjTx);

    // Update account with reconciliation metadata
    await db.accounts.update(account.id, {
      lastReconciledDate: today,
      lastReconciledBalance: actual
    });

    await recalculateAllAccountBalances();
    setSuccessToast(`Account "${account.name}" reconciled cleanly to ${formatCurrency(actual, account.currency)}!`);
    setTimeout(() => setSuccessToast(null), 3500);
    onRefreshData();
  };

  // Credit Card Statements & Swipes Reconciliation Calculations
  const ccMetrics = useMemo(() => {
    const ccAccount = accounts.find(a => a.type === 'CREDIT_CARD') || accounts.find(a => a.id.includes('credit-card'));
    if (!ccAccount) return null;

    let totalSwipes = 0;
    let totalPayments = 0;
    const swipes: Transaction[] = [];
    const payments: Transaction[] = [];

    transactions.forEach(t => {
      if (t.sourceAccountId === ccAccount.id) {
        if (t.type === 'EXPENSE' || t.type === 'CREDIT_CARD_SWIPE') {
          totalSwipes += t.amount;
          swipes.push(t);
        }
      }
      if (t.destinationAccountId === ccAccount.id && (t.type === 'TRANSFER' || t.type === 'CREDIT_CARD_PAYMENT')) {
        totalPayments += t.amount;
        payments.push(t);
      }
    });

    const netCycleLiability = Math.abs(ccAccount.currentBalance);

    return {
      ccAccount,
      totalSwipes,
      totalPayments,
      netCycleLiability,
      swipesCount: swipes.length,
      paymentsCount: payments.length
    };
  }, [accounts, transactions]);

  // Accounts list with calculated discrepancies
  const accountRows = useMemo(() => {
    return accounts.map(a => {
      const actual = actualBalances[a.id] !== undefined ? actualBalances[a.id] : a.currentBalance;
      const discrepancy = Math.round((actual - a.currentBalance) * 100) / 100;
      return {
        account: a,
        actual,
        calculated: a.currentBalance,
        discrepancy,
        hasDiscrepancy: Math.abs(discrepancy) >= 0.01
      };
    });
  }, [accounts, actualBalances]);

  const filteredRows = useMemo(() => {
    if (activeFilter === 'DISCREPANCIES') return accountRows.filter(r => r.hasDiscrepancy);
    if (activeFilter === 'CREDIT_CARD') return accountRows.filter(r => r.account.type === 'CREDIT_CARD');
    return accountRows;
  }, [accountRows, activeFilter]);

  const totalDiscrepanciesCount = accountRows.filter(r => r.hasDiscrepancy).length;

  return (
    <div className="space-y-6">
      
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-emerald-950/40 via-slate-900 to-slate-900 border border-emerald-900/50 rounded-2xl p-5 sm:p-6 shadow-xl">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center space-x-3.5">
            <div className="h-12 w-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
              <Scale className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-xl font-bold text-white tracking-tight">Financial Integrity & Reconciliation Auditor</h3>
                <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                  {totalDiscrepanciesCount === 0 ? '100% Balanced' : `${totalDiscrepanciesCount} Discrepancies`}
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-1 max-w-2xl">
                Compare calculated ledger balances against your live mobile banking apps. Automatically logs balancing adjustments with timestamps (matching your Excel <code className="text-emerald-400">Totals!Adjusted</code> columns).
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => setActiveFilter('DISCREPANCIES')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
                activeFilter === 'DISCREPANCIES' 
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' 
                  : 'bg-slate-800 text-slate-300 hover:text-white'
              }`}
            >
              Needs Adjustment ({totalDiscrepanciesCount})
            </button>
            <button
              onClick={() => setActiveFilter('ALL')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
                activeFilter === 'ALL' ? 'bg-slate-800 text-white border border-slate-700' : 'text-slate-400'
              }`}
            >
              All Accounts ({accounts.length})
            </button>
          </div>
        </div>

        {successToast && (
          <div className="mt-4 p-3 bg-emerald-950/90 border border-emerald-700 text-emerald-200 rounded-xl text-xs font-semibold flex items-center space-x-2 animate-in fade-in">
            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
            <span>{successToast}</span>
          </div>
        )}
      </div>

      {/* Credit Card Statement Reconciliation Section */}
      {ccMetrics && (
        <div className="bg-slate-900/90 border border-purple-800/40 rounded-2xl p-5 shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center space-x-2">
              <CreditCard className="h-5 w-5 text-purple-400" />
              <h4 className="text-sm font-bold text-white uppercase tracking-wider">
                Credit Card Statement Reconciliation (No Double-Counting Engine)
              </h4>
            </div>
            <span className="px-2 py-0.5 rounded text-[11px] font-mono bg-purple-950 text-purple-300 border border-purple-800">
              {ccMetrics.ccAccount.name} ({ccMetrics.ccAccount.currency})
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            
            {/* Total Card Swipes */}
            <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3.5">
              <span className="text-[11px] text-slate-400 font-semibold">1. Purchases / Swipes (Expenses)</span>
              <div className="text-xl font-bold text-rose-400 font-mono mt-1">
                {formatCurrency(ccMetrics.totalSwipes, ccMetrics.ccAccount.currency)}
              </div>
              <p className="text-[10px] text-slate-500 mt-1">
                {ccMetrics.swipesCount} swipes logged directly to expense categories
              </p>
            </div>

            {/* Total Card Payments */}
            <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3.5">
              <span className="text-[11px] text-slate-400 font-semibold">2. Bill Payments (Transfers In)</span>
              <div className="text-xl font-bold text-emerald-400 font-mono mt-1">
                +{formatCurrency(ccMetrics.totalPayments, ccMetrics.ccAccount.currency)}
              </div>
              <p className="text-[10px] text-slate-500 mt-1">
                {ccMetrics.paymentsCount} transfers paid from bank to clear liability
              </p>
            </div>

            {/* Current Net Liability */}
            <div className="bg-slate-950/80 border border-purple-900/50 rounded-xl p-3.5">
              <span className="text-[11px] text-purple-300 font-semibold">3. Net Pending Liability (Khums Deductible)</span>
              <div className="text-xl font-black text-white font-mono mt-1">
                -{formatCurrency(ccMetrics.netCycleLiability, ccMetrics.ccAccount.currency)}
              </div>
              <p className="text-[10px] text-purple-200/70 mt-1">
                Deducted on Nov 30 Khums without double-counting swipes
              </p>
            </div>

          </div>

          <div className="bg-purple-950/30 border border-purple-900/40 rounded-xl p-3 text-xs text-purple-200 flex items-start space-x-2">
            <Info className="h-4 w-4 text-purple-400 shrink-0 mt-0.5" />
            <span>
              <strong>Accounting Rule Verified:</strong> Credit card purchases are accounted for as operational expenses at time of swipe. Monthly bank bill payments are treated as transfers reducing the card liability. This mathematically prevents credit card purchases from being counted twice in your Cashflow and Khums audits.
            </span>
          </div>
        </div>
      )}

      {/* Main Reconciliation Table */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <h4 className="text-sm font-bold text-white uppercase tracking-wider">
            Account Balance Audit & Discrepancy Reconciliation
          </h4>
          <span className="text-xs text-slate-400">
            {filteredRows.length} Accounts Displayed
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950 text-slate-400 font-semibold border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">Account Name</th>
                <th className="py-3 px-4">Currency</th>
                <th className="py-3 px-4 text-right">Calculated Ledger Balance</th>
                <th className="py-3 px-4 text-right">Actual Bank App Balance</th>
                <th className="py-3 px-4 text-right">Discrepancy</th>
                <th className="py-3 px-4">Last Reconciled</th>
                <th className="py-3 px-4 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono">
              {filteredRows.map(row => {
                const isZero = !row.hasDiscrepancy;

                return (
                  <tr key={row.account.id} className="hover:bg-slate-800/30 transition">
                    
                    {/* Account Name */}
                    <td className="py-3 px-4 font-sans font-semibold text-white">
                      <div className="flex items-center space-x-2">
                        <span>{row.account.name}</span>
                        {row.account.isCustodial && (
                          <span className="text-[9px] px-1.5 py-0.2 rounded bg-pink-950 text-pink-300 border border-pink-800 font-sans">
                            Amanat
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Currency */}
                    <td className="py-3 px-4 text-slate-400">
                      {row.account.currency}
                    </td>

                    {/* Calculated Balance */}
                    <td className="py-3 px-4 text-right font-bold text-slate-200">
                      {formatCurrency(row.calculated, row.account.currency)}
                    </td>

                    {/* Actual Bank Input */}
                    <td className="py-3 px-4 text-right">
                      <input
                        type="number"
                        step="any"
                        value={row.actual}
                        onChange={(e) => handleActualChange(row.account.id, parseFloat(e.target.value) || 0)}
                        className="w-32 px-2 py-1 bg-slate-950 border border-slate-800 rounded text-xs text-right text-white font-mono font-bold focus:outline-none focus:border-emerald-500"
                      />
                    </td>

                    {/* Discrepancy */}
                    <td className="py-3 px-4 text-right">
                      {isZero ? (
                        <span className="text-emerald-400 font-bold inline-flex items-center">
                          <Check className="h-3.5 w-3.5 mr-1" /> Balanced
                        </span>
                      ) : (
                        <span className={row.discrepancy > 0 ? 'text-cyan-400 font-bold' : 'text-amber-400 font-bold'}>
                          {row.discrepancy > 0 ? '+' : ''}{formatCurrency(row.discrepancy, row.account.currency)}
                        </span>
                      )}
                    </td>

                    {/* Last Reconciled */}
                    <td className="py-3 px-4 text-slate-400 text-[11px]">
                      {row.account.lastReconciledDate ? formatDatePretty(row.account.lastReconciledDate) : 'Never'}
                    </td>

                    {/* Action: 1-Click Auto-Reconcile Adjustment */}
                    <td className="py-3 px-4 text-center">
                      <button
                        onClick={() => handleAutoReconcile(row.account)}
                        disabled={isZero}
                        className={`inline-flex items-center space-x-1 px-3 py-1 rounded-lg text-xs font-semibold transition ${
                          isZero 
                            ? 'bg-slate-800/40 text-slate-600 cursor-not-allowed' 
                            : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm'
                        }`}
                        title="Post balanced adjustment transaction to match actual balance"
                      >
                        <Wrench className="h-3 w-3" />
                        <span>Auto-Reconcile</span>
                      </button>
                    </td>

                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};

