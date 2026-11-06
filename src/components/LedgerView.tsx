import React, { useState, useMemo } from 'react';
import { 
  Transaction, 
  Account, 
  Currency, 
  TransactionType, 
  TransactionStatus 
} from '../types';
import { formatCurrency, formatDatePretty } from '../utils/formatters';
import { 
  Search, 
  Filter, 
  CheckCircle2, 
  AlertCircle, 
  ArrowUpRight, 
  ArrowDownRight, 
  ArrowLeftRight, 
  Trash2, 
  Phone, 
  CreditCard, 
  Sparkles, 
  PlusCircle,
  HelpCircle,
  Check
} from 'lucide-react';
import { db, recalculateAllAccountBalances } from '../db/db';

interface LedgerViewProps {
  transactions: Transaction[];
  accounts: Account[];
  initialFilterTab?: 'ALL' | 'NEEDS_REVIEW';
  onOpenAddModal: () => void;
  onRefreshData: () => void;
}

export const LedgerView: React.FC<LedgerViewProps> = ({
  transactions,
  accounts,
  initialFilterTab = 'ALL',
  onOpenAddModal,
  onRefreshData
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<'ALL' | TransactionType>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | TransactionStatus>(
    initialFilterTab === 'NEEDS_REVIEW' ? 'NEEDS_REVIEW' : 'ALL'
  );
  const [currencyFilter, setCurrencyFilter] = useState<'ALL' | Currency>('ALL');
  const [accountFilter, setAccountFilter] = useState<'ALL' | string>('ALL');

  const accountMap = useMemo(() => {
    const map = new Map<string, Account>();
    accounts.forEach(a => map.set(a.id, a));
    return map;
  }, [accounts]);

  // Filter transactions
  const filteredTransactions = useMemo(() => {
    return transactions.filter(t => {
      if (statusFilter !== 'ALL' && t.status !== statusFilter) return false;
      if (typeFilter !== 'ALL' && t.type !== typeFilter) return false;
      if (currencyFilter !== 'ALL' && t.currency !== currencyFilter) return false;
      if (accountFilter !== 'ALL') {
        if (t.sourceAccountId !== accountFilter && t.destinationAccountId !== accountFilter) {
          return false;
        }
      }

      if (searchTerm.trim() !== '') {
        const query = searchTerm.toLowerCase();
        const merchantMatch = (t.merchantOrRecipient || '').toLowerCase().includes(query);
        const catMatch = (t.category || '').toLowerCase().includes(query);
        const subCatMatch = (t.subCategory || '').toLowerCase().includes(query);
        const descMatch = (t.description || '').toLowerCase().includes(query);
        const phoneMatch = (t.beneficiaryPhone || '').includes(query);
        const channelMatch = (t.paymentChannel || '').toLowerCase().includes(query);
        const amtMatch = String(t.amount).includes(query);

        if (!merchantMatch && !catMatch && !subCatMatch && !descMatch && !phoneMatch && !channelMatch && !amtMatch) {
          return false;
        }
      }

      return true;
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [transactions, searchTerm, typeFilter, statusFilter, currencyFilter, accountFilter]);

  // Handle 1-click Confirm of a healed or reviewed transaction
  const handleConfirmRow = async (id: string) => {
    await db.transactions.update(id, {
      status: 'CONFIRMED'
    });
    onRefreshData();
  };

  // Handle 1-click Confirm All in Needs Review
  const handleConfirmAllNeedsReview = async () => {
    const ids = transactions.filter(t => t.status === 'NEEDS_REVIEW').map(t => t.id);
    for (const id of ids) {
      await db.transactions.update(id, { status: 'CONFIRMED' });
    }
    onRefreshData();
  };

  // Handle Delete
  const handleDeleteRow = async (id: string) => {
    if (confirm('Are you sure you want to delete this transaction record?')) {
      await db.transactions.delete(id);
      await recalculateAllAccountBalances();
      onRefreshData();
    }
  };

  const needsReviewCount = useMemo(() => {
    return transactions.filter(t => t.status === 'NEEDS_REVIEW').length;
  }, [transactions]);

  const getTypeBadge = (type: TransactionType) => {
    switch (type) {
      case 'EXPENSE':
      case 'CREDIT_CARD_SWIPE':
        return (
          <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-xs font-semibold bg-rose-950/80 text-rose-300 border border-rose-800">
            <ArrowUpRight className="h-3 w-3" />
            <span>Expense</span>
          </span>
        );
      case 'INCOME':
        return (
          <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-xs font-semibold bg-emerald-950/80 text-emerald-300 border border-emerald-800">
            <ArrowDownRight className="h-3 w-3" />
            <span>Income</span>
          </span>
        );
      case 'TRANSFER':
        return (
          <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-xs font-semibold bg-blue-950/80 text-blue-300 border border-blue-800">
            <ArrowLeftRight className="h-3 w-3" />
            <span>Transfer</span>
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 rounded text-xs font-semibold bg-slate-800 text-slate-300">
            {type}
          </span>
        );
    }
  };

  return (
    <div className="space-y-5">
      
      {/* Header and Quick Actions */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-900/90 border border-slate-800 rounded-2xl p-4 sm:p-5">
        <div>
          <h3 className="text-xl font-bold text-white tracking-tight">Unified Financial Ledger</h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Real-time multi-currency transaction history, foreign conversions & healed Excel rows
          </p>
        </div>

        <div className="flex items-center space-x-2">
          {needsReviewCount > 0 && (
            <button
              onClick={handleConfirmAllNeedsReview}
              className="flex items-center space-x-1.5 px-3 py-1.5 bg-amber-600/20 hover:bg-amber-600/30 text-amber-300 border border-amber-500/40 rounded-xl text-xs font-semibold transition"
            >
              <Check className="h-4 w-4 text-amber-400" />
              <span>Approve All Healed ({needsReviewCount})</span>
            </button>
          )}

          <button
            onClick={onOpenAddModal}
            className="flex items-center space-x-1.5 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs sm:text-sm font-semibold shadow-md shadow-emerald-900/30 transition"
          >
            <PlusCircle className="h-4 w-4" />
            <span>+ Add Transaction</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 space-y-3">
        
        {/* Top Filter Tabs: All vs Needs Review vs Expenses vs Incomes */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
          <div className="flex items-center space-x-1 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs font-medium">
            <button
              onClick={() => { setStatusFilter('ALL'); setTypeFilter('ALL'); }}
              className={`px-3 py-1.5 rounded-lg transition ${
                statusFilter === 'ALL' && typeFilter === 'ALL' ? 'bg-slate-800 text-white font-semibold' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              All Records ({transactions.length})
            </button>

            <button
              onClick={() => { setStatusFilter('NEEDS_REVIEW'); }}
              className={`flex items-center space-x-1 px-3 py-1.5 rounded-lg transition ${
                statusFilter === 'NEEDS_REVIEW' 
                  ? 'bg-amber-500/20 text-amber-300 font-semibold border border-amber-500/40' 
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <AlertCircle className="h-3.5 w-3.5 text-amber-400" />
              <span>Needs Review / Healed</span>
              {needsReviewCount > 0 && (
                <span className="ml-1 px-1.5 py-0.2 text-[10px] rounded-full bg-amber-500 text-slate-950 font-bold">
                  {needsReviewCount}
                </span>
              )}
            </button>

            <button
              onClick={() => { setStatusFilter('ALL'); setTypeFilter('EXPENSE'); }}
              className={`px-3 py-1.5 rounded-lg transition ${
                typeFilter === 'EXPENSE' && statusFilter === 'ALL' ? 'bg-rose-950 text-rose-300 font-semibold' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Expenses
            </button>

            <button
              onClick={() => { setStatusFilter('ALL'); setTypeFilter('INCOME'); }}
              className={`px-3 py-1.5 rounded-lg transition ${
                typeFilter === 'INCOME' && statusFilter === 'ALL' ? 'bg-emerald-950 text-emerald-300 font-semibold' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Income
            </button>

            <button
              onClick={() => { setStatusFilter('ALL'); setTypeFilter('TRANSFER'); }}
              className={`px-3 py-1.5 rounded-lg transition ${
                typeFilter === 'TRANSFER' && statusFilter === 'ALL' ? 'bg-blue-950 text-blue-300 font-semibold' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Transfers
            </button>
          </div>

          <div className="text-xs text-slate-400">
            Showing <span className="text-white font-mono font-semibold">{filteredTransactions.length}</span> of {transactions.length}
          </div>
        </div>

        {/* Detailed Controls Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          
          {/* Search Input */}
          <div className="relative">
            <Search className="h-4 w-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search merchant, category, 03xx, amount..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500"
            />
          </div>

          {/* Currency Filter */}
          <div className="flex items-center space-x-1.5">
            <span className="text-xs text-slate-400 whitespace-nowrap">Currency:</span>
            <select
              value={currencyFilter}
              onChange={(e) => setCurrencyFilter(e.target.value as any)}
              className="w-full py-1.5 px-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
            >
              <option value="ALL">All Currencies</option>
              <option value="PKR">PKR (Pakistani Rupee)</option>
              <option value="AED">AED (UAE Dirham)</option>
              <option value="USD">USD (US Dollar)</option>
              <option value="GBP">GBP (British Pound)</option>
              <option value="SAR">SAR (Saudi Riyal)</option>
              <option value="MYR">MYR (Ringgit)</option>
              <option value="IQD">IQD (Iraqi Dinar)</option>
            </select>
          </div>

          {/* Account Filter */}
          <div className="flex items-center space-x-1.5 sm:col-span-2">
            <span className="text-xs text-slate-400 whitespace-nowrap">Account:</span>
            <select
              value={accountFilter}
              onChange={(e) => setAccountFilter(e.target.value)}
              className="w-full py-1.5 px-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
            >
              <option value="ALL">All Accounts & Wallets</option>
              {accounts.map(acc => (
                <option key={acc.id} value={acc.id}>
                  {acc.name} ({acc.currency})
                </option>
              ))}
            </select>
          </div>

        </div>
      </div>

      {/* Transactions Table */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/80 border-b border-slate-800 text-slate-400 font-semibold">
              <tr>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Type</th>
                <th className="py-3 px-4">Category & Recipient</th>
                <th className="py-3 px-4">Account</th>
                <th className="py-3 px-4 text-right">Amount</th>
                <th className="py-3 px-4 text-right">PKR Equiv.</th>
                <th className="py-3 px-4 text-center">Status / Healing</th>
                <th className="py-3 px-4 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredTransactions.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-500">
                    <p className="text-sm font-medium">No transactions found matching your criteria</p>
                    <p className="text-xs mt-1">Try adjusting the search filter or load sample data from the top bar.</p>
                  </td>
                </tr>
              ) : (
                filteredTransactions.map(tx => {
                  const sourceAcc = tx.sourceAccountId ? accountMap.get(tx.sourceAccountId) : undefined;
                  const destAcc = tx.destinationAccountId ? accountMap.get(tx.destinationAccountId) : undefined;

                  return (
                    <tr 
                      key={tx.id} 
                      className={`hover:bg-slate-800/40 transition group ${
                        tx.status === 'NEEDS_REVIEW' ? 'bg-amber-950/10' : ''
                      }`}
                    >
                      {/* Date */}
                      <td className="py-3 px-4 font-mono text-slate-300 whitespace-nowrap">
                        {formatDatePretty(tx.date)}
                      </td>

                      {/* Type Badge */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        {getTypeBadge(tx.type)}
                      </td>

                      {/* Category & Recipient & Phone */}
                      <td className="py-3 px-4 max-w-xs">
                        <div className="font-semibold text-white truncate">
                          {tx.merchantOrRecipient || tx.category}
                        </div>
                        <div className="text-[11px] text-slate-400 flex items-center space-x-2 mt-0.5">
                          <span>{tx.category}</span>
                          {tx.subCategory && (
                            <>
                              <span>&bull;</span>
                              <span className="text-slate-300">{tx.subCategory}</span>
                            </>
                          )}
                        </div>

                        {/* Beneficiary Phone & Payment Channel */}
                        {(tx.beneficiaryPhone || tx.paymentChannel) && (
                          <div className="flex items-center space-x-1.5 mt-1">
                            {tx.beneficiaryPhone && (
                              <span className="inline-flex items-center text-[10px] font-mono text-emerald-400 bg-emerald-950/60 px-1.5 py-0.2 rounded border border-emerald-800/50">
                                <Phone className="h-2.5 w-2.5 mr-1" />
                                {tx.beneficiaryPhone}
                              </span>
                            )}
                            {tx.paymentChannel && (
                              <span className="inline-flex items-center text-[10px] text-cyan-300 bg-cyan-950/60 px-1.5 py-0.2 rounded border border-cyan-800/50">
                                {tx.paymentChannel}
                              </span>
                            )}
                          </div>
                        )}

                        {/* Shifted Column Numeric Reference */}
                        {tx.lastMonthReferenceAmount && (
                          <div className="text-[10px] text-amber-300/90 font-mono mt-0.5">
                            Ref: Rs {tx.lastMonthReferenceAmount}
                          </div>
                        )}
                      </td>

                      {/* Account */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        {tx.type === 'TRANSFER' ? (
                          <div className="text-[11px]">
                            <div className="text-slate-300">{sourceAcc?.name || 'Source'}</div>
                            <div className="text-slate-500">&darr; {destAcc?.name || 'Destination'}</div>
                          </div>
                        ) : (
                          <span className="text-slate-300">
                            {(sourceAcc || destAcc)?.name || 'Direct'}
                          </span>
                        )}
                      </td>

                      {/* Original Amount */}
                      <td className="py-3 px-4 text-right font-mono font-bold whitespace-nowrap">
                        <span className={
                          tx.type === 'INCOME' ? 'text-emerald-400' :
                          tx.type === 'TRANSFER' ? 'text-blue-400' : 'text-slate-100'
                        }>
                          {tx.type === 'INCOME' ? '+' : tx.type === 'EXPENSE' ? '-' : ''}
                          {formatCurrency(tx.amount, tx.currency)}
                        </span>
                      </td>

                      {/* Converted PKR */}
                      <td className="py-3 px-4 text-right font-mono text-slate-400 whitespace-nowrap">
                        {tx.currency !== 'PKR' ? (
                          <div>
                            <span className="text-slate-300 font-medium">
                              {formatCurrency(tx.convertedAmountPKR, 'PKR')}
                            </span>
                            <div className="text-[10px] text-slate-500">
                              @{tx.fxRateUsed}
                            </div>
                          </div>
                        ) : (
                          <span>-</span>
                        )}
                      </td>

                      {/* Status / Healing Log */}
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        {tx.status === 'NEEDS_REVIEW' ? (
                          <div className="inline-flex flex-col items-center">
                            <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                              <AlertCircle className="h-3 w-3" />
                              <span>Needs Review</span>
                            </span>
                            {tx.healingNotes && tx.healingNotes.length > 0 && (
                              <span className="text-[9px] text-amber-400/80 mt-0.5 max-w-[120px] truncate" title={tx.healingNotes.join('\n')}>
                                {tx.healingNotes[0]}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-950/60 text-emerald-400 border border-emerald-900/40">
                            <CheckCircle2 className="h-3 w-3" />
                            <span>Verified</span>
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center space-x-1.5">
                          {tx.status === 'NEEDS_REVIEW' && (
                            <button
                              onClick={() => handleConfirmRow(tx.id)}
                              className="p-1 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-600/40 transition"
                              title="Approve / Mark Verified"
                            >
                              <Check className="h-3.5 w-3.5" />
                            </button>
                          )}
                          <button
                            onClick={() => handleDeleteRow(tx.id)}
                            className="p-1 rounded-lg hover:bg-rose-950/50 text-slate-500 hover:text-rose-400 transition"
                            title="Delete transaction"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};

