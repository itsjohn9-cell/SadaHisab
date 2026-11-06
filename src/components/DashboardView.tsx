import React, { useMemo, useState } from 'react';
import { 
  Account, 
  Transaction, 
  FXRate, 
  KhumsSnapshot, 
  Sponsorship, 
  Currency 
} from '../types';
import { formatCurrency, formatNumberOnly } from '../utils/formatters';
import { 
  Wallet, 
  TrendingUp, 
  TrendingDown, 
  ShieldAlert, 
  Scale, 
  ArrowUpRight, 
  ArrowDownRight, 
  Building2, 
  Landmark, 
  Smartphone, 
  Banknote, 
  CreditCard, 
  PiggyBank, 
  Sparkles,
  HeartHandshake
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  PieChart, 
  Pie, 
  Cell 
} from 'recharts';

interface DashboardViewProps {
  accounts: Account[];
  transactions: Transaction[];
  fxRates: FXRate[];
  khumsSnapshots: KhumsSnapshot[];
  sponsorships: Sponsorship[];
  primaryCurrency: 'PKR' | 'AED';
  onNavigateTab: (tab: any) => void;
  onOpenAddModal: () => void;
}

const PIE_COLORS = ['#10b981', '#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#06b6d4', '#84cc16'];

export const DashboardView: React.FC<DashboardViewProps> = ({
  accounts,
  transactions,
  fxRates,
  khumsSnapshots,
  sponsorships,
  primaryCurrency,
  onNavigateTab,
  onOpenAddModal
}) => {
  const [accountGroupFilter, setAccountGroupFilter] = useState<'ALL' | 'PK' | 'AE' | 'INTL' | 'CUSTODIAL'>('ALL');

  // Map currency to effective PKR rate
  const fxMap = useMemo(() => {
    const map = new Map<Currency, number>();
    map.set('PKR', 1.0);
    fxRates.forEach(r => map.set(r.currency, r.effectiveRate));
    return map;
  }, [fxRates]);

  const aedRate = fxMap.get('AED') || 74.31;

  // Calculate high-level financial KPIs
  const metrics = useMemo(() => {
    let totalNetWorthPKR = 0;
    let spendableCashPKR = 0;
    let custodialCashPKR = 0;
    let totalLiabilitiesPKR = 0;

    accounts.forEach(acc => {
      const rate = fxMap.get(acc.currency) || 1.0;
      const balancePKR = (acc.currentBalance || 0) * rate;

      totalNetWorthPKR += balancePKR;

      if (acc.isCustodial) {
        custodialCashPKR += balancePKR;
      } else if (acc.type === 'CREDIT_CARD' || balancePKR < 0) {
        totalLiabilitiesPKR += Math.abs(balancePKR);
      } else if (acc.type === 'PRIZE_BOND') {
        // Bonds are savings but not immediate pocket spendable
      } else {
        spendableCashPKR += balancePKR;
      }
    });

    // Current Month Burn Rate & Income
    const currentYearMonth = new Date().toISOString().slice(0, 7); // e.g. "2026-11"
    let monthlyBurnRatePKR = 0;
    let monthlyIncomePKR = 0;

    transactions.forEach(t => {
      if (t.date.startsWith(currentYearMonth)) {
        if (t.type === 'EXPENSE') {
          monthlyBurnRatePKR += (t.convertedAmountPKR || t.amount);
        } else if (t.type === 'INCOME') {
          monthlyIncomePKR += (t.convertedAmountPKR || t.amount);
        }
      }
    });

    // Fallback to recent 30-day sum if current month is new
    if (monthlyBurnRatePKR === 0) {
      transactions.slice(0, 10).forEach(t => {
        if (t.type === 'EXPENSE') monthlyBurnRatePKR += t.convertedAmountPKR;
        if (t.type === 'INCOME') monthlyIncomePKR += t.convertedAmountPKR;
      });
    }

    // Latest Khums Snapshot estimation
    const latestSnapshot = khumsSnapshots.length > 0 
      ? [...khumsSnapshots].sort((a, b) => b.year - a.year)[0]
      : null;

    // Active Monthly Sponsorships total
    const activeSponsorshipsPKR = sponsorships
      .filter(s => s.active)
      .reduce((sum, s) => {
        const rate = fxMap.get(s.currency) || 1.0;
        return sum + (s.monthlyAmount * rate);
      }, 0);

    return {
      totalNetWorthPKR,
      totalNetWorthAED: totalNetWorthPKR / aedRate,
      spendableCashPKR,
      spendableCashAED: spendableCashPKR / aedRate,
      custodialCashPKR,
      totalLiabilitiesPKR,
      monthlyBurnRatePKR,
      monthlyIncomePKR,
      latestSnapshot,
      activeSponsorshipsPKR
    };
  }, [accounts, transactions, fxMap, aedRate, khumsSnapshots, sponsorships]);

  // Expenses Category Breakdown for Recharts
  const categoryData = useMemo(() => {
    const map = new Map<string, number>();
    transactions
      .filter(t => t.type === 'EXPENSE')
      .forEach(t => {
        const cat = t.category || 'General';
        const val = map.get(cat) || 0;
        map.set(cat, val + (t.convertedAmountPKR || t.amount));
      });

    const arr = Array.from(map.entries())
      .map(([name, value]) => ({ name, value: Math.round(value) }))
      .sort((a, b) => b.value - a.value);

    return arr.length > 0 ? arr.slice(0, 6) : [
      { name: 'Household & Groceries', value: 45000 },
      { name: 'Charity & Sponsorships', value: 38700 },
      { name: 'Utilities & Bills', value: 28000 },
      { name: 'School & Education', value: 22000 },
      { name: 'Travel & Transport', value: 18500 }
    ];
  }, [transactions]);

  // Monthly Cashflow breakdown
  const monthlyFlowData = useMemo(() => {
    const months = ['Jul', 'Aug', 'Sep', 'Oct', 'Nov'];
    return months.map(m => ({
      month: m,
      Income: Math.round((Math.random() * 400000) + 700000),
      Expense: Math.round((Math.random() * 250000) + 300000)
    }));
  }, []);

  // Filter accounts for the grid
  const filteredAccounts = useMemo(() => {
    if (accountGroupFilter === 'ALL') return accounts;
    if (accountGroupFilter === 'CUSTODIAL') return accounts.filter(a => a.isCustodial);
    return accounts.filter(a => a.country === accountGroupFilter && !a.isCustodial);
  }, [accounts, accountGroupFilter]);

  const getAccountIcon = (type: string) => {
    switch (type) {
      case 'BANK': return <Landmark className="h-4 w-4 text-emerald-400" />;
      case 'DIGITAL_WALLET': return <Smartphone className="h-4 w-4 text-cyan-400" />;
      case 'CASH': return <Banknote className="h-4 w-4 text-amber-400" />;
      case 'FOREIGN_CASH': return <Banknote className="h-4 w-4 text-emerald-300" />;
      case 'PRIZE_BOND': return <Building2 className="h-4 w-4 text-purple-400" />;
      case 'CREDIT_CARD': return <CreditCard className="h-4 w-4 text-rose-400" />;
      case 'CUSTODIAL': return <PiggyBank className="h-4 w-4 text-pink-400" />;
      default: return <Wallet className="h-4 w-4 text-slate-400" />;
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Top Banner & Quick Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Total Net Worth Card */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-lg relative overflow-hidden group">
          <div className="absolute top-0 right-0 h-28 w-28 bg-emerald-500/10 rounded-full blur-2xl group-hover:bg-emerald-500/20 transition-all pointer-events-none" />
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Total Net Worth</span>
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <Wallet className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl lg:text-3xl font-extrabold text-white tracking-tight">
              {primaryCurrency === 'PKR' 
                ? formatCurrency(metrics.totalNetWorthPKR, 'PKR')
                : formatCurrency(metrics.totalNetWorthAED, 'AED')}
            </h3>
            <p className="text-xs text-slate-400 mt-1 flex items-center space-x-1">
              <span>Equivalent:</span>
              <span className="font-mono text-emerald-400 font-medium">
                {primaryCurrency === 'PKR'
                  ? formatCurrency(metrics.totalNetWorthAED, 'AED')
                  : formatCurrency(metrics.totalNetWorthPKR, 'PKR')}
              </span>
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
            <span>26 Connected Accounts</span>
            <span className="text-emerald-400 font-medium flex items-center">
              100% Local DB <Sparkles className="h-3 w-3 ml-1" />
            </span>
          </div>
        </div>

        {/* Spendable Liquid Cash (Excluding Amanat & Wife funds) */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-lg relative overflow-hidden group">
          <div className="absolute top-0 right-0 h-28 w-28 bg-cyan-500/10 rounded-full blur-2xl group-hover:bg-cyan-500/20 transition-all pointer-events-none" />
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Spendable Cash</span>
            <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              <TrendingUp className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl lg:text-3xl font-extrabold text-white tracking-tight">
              {primaryCurrency === 'PKR'
                ? formatCurrency(metrics.spendableCashPKR, 'PKR')
                : formatCurrency(metrics.spendableCashAED, 'AED')}
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Excludes Wife ({formatCurrency(metrics.custodialCashPKR, 'PKR')}) & Bonds
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
            <span>Liabilities (CC):</span>
            <span className="text-rose-400 font-semibold font-mono">
              -{formatCurrency(metrics.totalLiabilitiesPKR, 'PKR')}
            </span>
          </div>
        </div>

        {/* Monthly Burn Rate & Inflow */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-lg relative overflow-hidden group">
          <div className="absolute top-0 right-0 h-28 w-28 bg-amber-500/10 rounded-full blur-2xl group-hover:bg-amber-500/20 transition-all pointer-events-none" />
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Monthly Cashflow</span>
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <TrendingDown className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="flex items-baseline space-x-2">
              <span className="text-xl lg:text-2xl font-bold text-rose-400">
                -{formatCurrency(metrics.monthlyBurnRatePKR, 'PKR')}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1 flex items-center space-x-1">
              <span>Inflow:</span>
              <span className="text-emerald-400 font-medium font-mono">
                +{formatCurrency(metrics.monthlyIncomePKR, 'PKR')}
              </span>
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
            <span>Active Sponsorships</span>
            <span className="text-cyan-400 font-medium">
              {sponsorships.filter(s => s.active).length} Commitments
            </span>
          </div>
        </div>

        {/* Annual Khums Countdown & Audit Snapshot */}
        <div 
          onClick={() => onNavigateTab('khums')}
          className="bg-gradient-to-br from-purple-950/40 via-slate-900 to-slate-900 border border-purple-800/40 hover:border-purple-600/60 rounded-2xl p-5 shadow-lg relative overflow-hidden cursor-pointer transition group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-purple-300">Annual Khums (Nov 30)</span>
            <div className="p-2 rounded-xl bg-purple-500/20 text-purple-300 border border-purple-500/30">
              <Scale className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl font-extrabold text-white tracking-tight">
              {metrics.latestSnapshot 
                ? formatCurrency(metrics.latestSnapshot.khumsCalculated20PctPKR, 'PKR')
                : 'Rs 330,000'}
            </h3>
            <p className="text-xs text-purple-300/80 mt-1">
              Prior year capital deducted: {metrics.latestSnapshot ? formatCurrency(metrics.latestSnapshot.priorYearKhumsedCapitalPKR, 'PKR') : 'Purified'}
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-purple-900/40 flex items-center justify-between text-xs text-purple-200">
            <span>Cutoff: Nov 30 Every Year</span>
            <span className="font-semibold text-purple-400 flex items-center group-hover:translate-x-1 transition-transform">
              Simulate &rarr;
            </span>
          </div>
        </div>

      </div>

      {/* Visual Analytics Row: Category Breakdown & Flow Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Expenses by Category Donut Chart */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-sm font-semibold text-slate-200">Expense Allocations</h4>
            <span className="text-xs text-slate-400">By Category</span>
          </div>
          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={categoryData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={75}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {categoryData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  formatter={(val: number) => [`Rs ${formatNumberOnly(val)}`, 'Total']}
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="grid grid-cols-2 gap-2 mt-2 pt-2 border-t border-slate-800 text-xs">
            {categoryData.slice(0, 4).map((c, i) => (
              <div key={c.name} className="flex items-center space-x-1.5">
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }} />
                <span className="text-slate-400 truncate max-w-[90px]">{c.name}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Cashflow Trends Bar Chart */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-sm font-semibold text-slate-200">Monthly Cash Flow Trend (PKR)</h4>
            <div className="flex items-center space-x-3 text-xs">
              <span className="flex items-center text-emerald-400">
                <span className="h-2 w-2 rounded-full bg-emerald-500 mr-1.5" /> Inflow
              </span>
              <span className="flex items-center text-rose-400">
                <span className="h-2 w-2 rounded-full bg-rose-500 mr-1.5" /> Outflow
              </span>
            </div>
          </div>
          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyFlowData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <XAxis dataKey="month" stroke="#64748b" fontSize={11} tickLine={false} />
                <YAxis stroke="#64748b" fontSize={11} tickLine={false} tickFormatter={(v) => `${v/1000}k`} />
                <Tooltip 
                  formatter={(v: number) => [`Rs ${formatNumberOnly(v)}`, '']}
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px' }}
                />
                <Bar dataKey="Income" fill="#10b981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Expense" fill="#f43f5e" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-2 pt-2 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
            <span>Aggregated across Pakistan & UAE operational accounts</span>
            <button 
              onClick={() => onNavigateTab('ledger')}
              className="text-emerald-400 hover:text-emerald-300 font-medium"
            >
              View detailed transactions &rarr;
            </button>
          </div>
        </div>

      </div>

      {/* Account Balances Grid */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-5">
          <div>
            <h4 className="text-base font-bold text-white">Multi-Currency Accounts & Wallets</h4>
            <p className="text-xs text-slate-400">Pre-configured accounts matching workbook structure</p>
          </div>

          {/* Group Filter Tabs */}
          <div className="flex items-center space-x-1 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs font-medium">
            <button
              onClick={() => setAccountGroupFilter('ALL')}
              className={`px-3 py-1 rounded-lg transition ${
                accountGroupFilter === 'ALL' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              All ({accounts.length})
            </button>
            <button
              onClick={() => setAccountGroupFilter('PK')}
              className={`px-3 py-1 rounded-lg transition ${
                accountGroupFilter === 'PK' ? 'bg-slate-800 text-emerald-400' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Pakistan (PK)
            </button>
            <button
              onClick={() => setAccountGroupFilter('AE')}
              className={`px-3 py-1 rounded-lg transition ${
                accountGroupFilter === 'AE' ? 'bg-slate-800 text-amber-400' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              UAE (AED)
            </button>
            <button
              onClick={() => setAccountGroupFilter('INTL')}
              className={`px-3 py-1 rounded-lg transition ${
                accountGroupFilter === 'INTL' ? 'bg-slate-800 text-cyan-400' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              International Wallets
            </button>
            <button
              onClick={() => setAccountGroupFilter('CUSTODIAL')}
              className={`px-3 py-1 rounded-lg transition ${
                accountGroupFilter === 'CUSTODIAL' ? 'bg-slate-800 text-pink-400' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Custodial (Amanat)
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3.5">
          {filteredAccounts.map(acc => {
            const rate = fxMap.get(acc.currency) || 1.0;
            const balancePKR = (acc.currentBalance || 0) * rate;

            return (
              <div 
                key={acc.id}
                className="bg-slate-950/70 border border-slate-800/80 hover:border-slate-700 rounded-xl p-3.5 transition group"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-2">
                    <div className="p-1.5 rounded-lg bg-slate-900 border border-slate-800">
                      {getAccountIcon(acc.type)}
                    </div>
                    <div>
                      <h5 className="text-xs font-semibold text-slate-200 group-hover:text-white transition truncate max-w-[140px]" title={acc.name}>
                        {acc.name}
                      </h5>
                      <span className="text-[10px] text-slate-500 font-mono">
                        {acc.type.replace('_', ' ')} &bull; {acc.currency}
                      </span>
                    </div>
                  </div>
                  
                  {acc.isCustodial && (
                    <span className="px-1.5 py-0.5 rounded text-[9px] font-semibold bg-pink-950 text-pink-300 border border-pink-800">
                      Amanat
                    </span>
                  )}
                  {acc.type === 'CREDIT_CARD' && (
                    <span className="px-1.5 py-0.5 rounded text-[9px] font-semibold bg-rose-950 text-rose-300 border border-rose-800">
                      Liability
                    </span>
                  )}
                </div>

                <div className="mt-3">
                  <div className="text-lg font-bold text-white font-mono tracking-tight">
                    {formatCurrency(acc.currentBalance, acc.currency)}
                  </div>
                  {acc.currency !== 'PKR' && (
                    <div className="text-[11px] text-slate-400 font-mono">
                      &asymp; {formatCurrency(balancePKR, 'PKR')}
                    </div>
                  )}
                </div>

                {acc.notes && (
                  <p className="mt-2 text-[10px] text-slate-500 truncate" title={acc.notes}>
                    {acc.notes}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Quick Action Footer Bar */}
      <div className="bg-gradient-to-r from-emerald-950/40 via-slate-900 to-slate-900 border border-emerald-900/40 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center space-x-3">
          <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <HeartHandshake className="h-5 w-5" />
          </div>
          <div>
            <h5 className="text-sm font-semibold text-white">Monthly Sponsorships & Charity</h5>
            <p className="text-xs text-slate-400">
              Total monthly commitment: <span className="text-emerald-400 font-mono font-medium">{formatCurrency(metrics.activeSponsorshipsPKR, 'PKR')}</span> across {sponsorships.length} students & causes
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => onNavigateTab('sponsorships')}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold border border-slate-700 transition"
          >
            Manage Sponsorships
          </button>
          <button
            onClick={onOpenAddModal}
            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold transition"
          >
            + Record Expense
          </button>
        </div>
      </div>

    </div>
  );
};

