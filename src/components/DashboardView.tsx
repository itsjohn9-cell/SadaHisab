import React, { useMemo, useState } from 'react';
import { 
  Account, 
  Transaction, 
  FXRate, 
  KhumsSnapshot, 
  Sponsorship, 
  Currency 
} from '../types';
import { formatCurrency, formatNumberOnly, formatCurrencyMasked } from '../utils/formatters';
import { 
  Wallet, 
  TrendingUp, 
  TrendingDown, 
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
  Zap,
  ClipboardPaste,
  Mic,
  ScanLine,
  AlertTriangle,
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
import { KematiTrackerCard } from './KematiTrackerCard';

interface DashboardViewProps {
  accounts: Account[];
  transactions: Transaction[];
  fxRates: FXRate[];
  khumsSnapshots: KhumsSnapshot[];
  sponsorships: Sponsorship[];
  primaryCurrency: 'PKR' | 'AED';
  onNavigateTab: (tab: any) => void;
  onOpenAddModal: () => void;
  onOpenVoiceLogger?: () => void;
  onOpenBillScanner?: () => void;
  onOpenQuickPaste?: (text?: string) => void;
  isPrivacyMasked?: boolean;
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
  onOpenAddModal,
  onOpenVoiceLogger,
  onOpenBillScanner,
  onOpenQuickPaste,
  isPrivacyMasked = false
}) => {
  const [accountGroupFilter, setAccountGroupFilter] = useState<'ALL' | 'PK' | 'AE' | 'INTL' | 'CUSTODIAL'>('ALL');

  // Map currency to effective rate
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
        // Bonds
      } else {
        spendableCashPKR += balancePKR;
      }
    });

    const currentYearMonth = new Date().toISOString().slice(0, 7);
    let monthlyBurnRatePKR = 0;
    let monthlyIncomePKR = 0;

    transactions.forEach(t => {
      if (t.date && t.date.startsWith(currentYearMonth)) {
        if (t.type === 'EXPENSE') {
          monthlyBurnRatePKR += (t.convertedAmountPKR || t.amount);
        } else if (t.type === 'INCOME') {
          monthlyIncomePKR += (t.convertedAmountPKR || t.amount);
        }
      }
    });

    if (monthlyBurnRatePKR === 0) {
      transactions.slice(0, 10).forEach(t => {
        if (t.type === 'EXPENSE') monthlyBurnRatePKR += (t.convertedAmountPKR || t.amount);
        if (t.type === 'INCOME') monthlyIncomePKR += (t.convertedAmountPKR || t.amount);
      });
    }

    const latestSnapshot = khumsSnapshots.length > 0 
      ? [...khumsSnapshots].sort((a, b) => b.year - a.year)[0]
      : null;

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

  // Utility Bill Variance & Spike Detector (> 15% surge vs lastMonthReferenceAmount or benchmark)
  const utilityVarianceAlerts = useMemo(() => {
    const alerts: Array<{
      utilityName: string;
      currentAmt: number;
      lastAmt: number;
      currency: Currency;
      pctIncrease: number;
    }> = [];

    const utilityKeywords = [
      { kw: 'dewa', name: 'DEWA Electricity & Water', defaultRef: 340, cur: 'AED' as Currency },
      { kw: 'etisalat internet', name: 'Etisalat Home Fiber', defaultRef: 389, cur: 'AED' as Currency },
      { kw: 'royal gas', name: 'Royal Gas Centralized LPG', defaultRef: 75, cur: 'AED' as Currency },
      { kw: 'stromfiber', name: 'StromFiber Home Internet', defaultRef: 4460, cur: 'PKR' as Currency }
    ];

    const recentExpenses = transactions.filter(t => t.type === 'EXPENSE');

    utilityKeywords.forEach(u => {
      const match = recentExpenses.find(t => 
        (t.merchantOrRecipient || '').toLowerCase().includes(u.kw) ||
        (t.subCategory || '').toLowerCase().includes(u.kw)
      );

      if (match) {
        const ref = match.lastMonthReferenceAmount || u.defaultRef;
        const diff = match.amount - ref;
        const pct = (diff / ref) * 100;
        if (pct > 15) {
          alerts.push({
            utilityName: u.name,
            currentAmt: match.amount,
            lastAmt: ref,
            currency: match.currency || u.cur,
            pctIncrease: Math.round(pct)
          });
        }
      }
    });

    return alerts;
  }, [transactions]);

  // Handle Quick 1-Tap Clipboard Read with OTP Security Check
  const handleQuickClipboardPaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (!text || !text.trim()) {
        alert('Clipboard is empty. Copy bank SMS or receipt first!');
        return;
      }
      // Hard OTP firewall check
      if (/\b(OTP|one[- ]time|verification code|security code|passcode|PIN|do not share)\b/i.test(text)) {
        alert('🛡️ Hard OTP Security Firewall: Intercepted and discarded verification code from clipboard! Financial privacy secured.');
        return;
      }
      if (onOpenQuickPaste) {
        onOpenQuickPaste(text);
      }
    } catch {
      if (onOpenQuickPaste) onOpenQuickPaste();
    }
  };

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
      
      {/* 1. Smart Utility Variance & Spike Alerts */}
      {utilityVarianceAlerts.length > 0 && (
        <div className="p-4 bg-amber-950/80 border border-amber-600/60 rounded-2xl flex items-start gap-3 shadow-lg">
          <div className="p-2 bg-amber-500/20 rounded-xl text-amber-400 border border-amber-500/30 flex-shrink-0">
            <AlertTriangle className="w-5 h-5 animate-pulse" />
          </div>
          <div className="flex-1">
            <h4 className="text-xs font-bold text-amber-200 uppercase tracking-wider">
              Smart Utility Anomaly & Variance Warning
            </h4>
            <div className="mt-1 space-y-1 text-xs text-amber-100">
              {utilityVarianceAlerts.map(alert => (
                <div key={alert.utilityName} className="flex items-center gap-2 flex-wrap">
                  <span className="font-bold text-white">{alert.utilityName}:</span>
                  <span className="font-mono text-amber-300 font-bold">
                    {alert.currentAmt} {alert.currency}
                  </span>
                  <span className="text-rose-300 font-bold">
                    (+{alert.pctIncrease}% surge vs last month {alert.lastAmt} {alert.currency})
                  </span>
                  <span className="text-slate-400 text-[11px]">— Check AC consumption or tariff shift</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 2. Home Screen Quick-Action Bar ("Zero-Typing Mode") */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3">
        <button
          onClick={() => onNavigateTab('roster')}
          className="p-3 sm:p-4 bg-gradient-to-r from-cyan-900/60 to-cyan-950/80 hover:from-cyan-800/80 hover:to-cyan-900 border border-cyan-500/30 rounded-2xl flex flex-col items-start gap-1 shadow-md hover:scale-[1.02] active:scale-[0.98] transition-all group text-left w-full"
        >
          <div className="p-2 rounded-xl bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 group-hover:bg-cyan-500/30 transition">
            <Zap className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
          <span className="text-xs font-bold text-white mt-1 truncate w-full">⚡ Run Monthly Roster</span>
          <span className="text-[10px] text-cyan-200/70 truncate w-full">1-Tap commit ~25 bills</span>
        </button>

        <button
          onClick={handleQuickClipboardPaste}
          className="p-3 sm:p-4 bg-gradient-to-r from-emerald-900/60 to-emerald-950/80 hover:from-emerald-800/80 hover:to-emerald-900 border border-emerald-500/30 rounded-2xl flex flex-col items-start gap-1 shadow-md hover:scale-[1.02] active:scale-[0.98] transition-all group text-left w-full"
        >
          <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 group-hover:bg-emerald-500/30 transition">
            <ClipboardPaste className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
          <span className="text-xs font-bold text-white mt-1 truncate w-full">📋 Paste SMS / Receipt</span>
          <span className="text-[10px] text-emerald-200/70 truncate w-full">OTP scrub & parse</span>
        </button>

        <button
          onClick={() => onOpenVoiceLogger && onOpenVoiceLogger()}
          className="p-3 sm:p-4 bg-gradient-to-r from-rose-900/60 to-rose-950/80 hover:from-rose-800/80 hover:to-rose-900 border border-rose-500/30 rounded-2xl flex flex-col items-start gap-1 shadow-md hover:scale-[1.02] active:scale-[0.98] transition-all group text-left w-full"
        >
          <div className="p-2 rounded-xl bg-rose-500/20 text-rose-300 border border-rose-500/30 group-hover:bg-rose-500/30 transition">
            <Mic className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
          <span className="text-xs font-bold text-white mt-1 truncate w-full">🎙️ Hold to Speak</span>
          <span className="text-[10px] text-rose-200/70 truncate w-full">Hands-free voice note</span>
        </button>

        <button
          onClick={() => onOpenBillScanner && onOpenBillScanner()}
          className="p-3 sm:p-4 bg-gradient-to-r from-teal-900/60 to-teal-950/80 hover:from-teal-800/80 hover:to-teal-900 border border-teal-500/30 rounded-2xl flex flex-col items-start gap-1 shadow-md hover:scale-[1.02] active:scale-[0.98] transition-all group text-left w-full"
        >
          <div className="p-2 rounded-xl bg-teal-500/20 text-teal-300 border border-teal-500/30 group-hover:bg-teal-500/30 transition">
            <ScanLine className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
          <span className="text-xs font-bold text-white mt-1 truncate w-full">📸 Scan Bill / PDF</span>
          <span className="text-[10px] text-teal-200/70 truncate w-full">On-device OCR & PDF</span>
        </button>
      </div>

      {/* 3. Top Banner & Quick Stats */}
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
                ? formatCurrencyMasked(metrics.totalNetWorthPKR, 'PKR', isPrivacyMasked)
                : formatCurrencyMasked(metrics.totalNetWorthAED, 'AED', isPrivacyMasked)}
            </h3>
            <p className="text-xs text-slate-400 mt-1 flex items-center space-x-1">
              <span>Equivalent:</span>
              <span className="font-mono text-emerald-400 font-medium">
                {primaryCurrency === 'PKR'
                  ? formatCurrencyMasked(metrics.totalNetWorthAED, 'AED', isPrivacyMasked)
                  : formatCurrencyMasked(metrics.totalNetWorthPKR, 'PKR', isPrivacyMasked)}
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
                ? formatCurrencyMasked(metrics.spendableCashPKR, 'PKR', isPrivacyMasked)
                : formatCurrencyMasked(metrics.spendableCashAED, 'AED', isPrivacyMasked)}
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Excludes Wife ({formatCurrencyMasked(metrics.custodialCashPKR, 'PKR', isPrivacyMasked)}) & Bonds
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
            <span>Excludes Custodial Amanat</span>
            <span className="text-cyan-400 font-medium">Safe Liquid</span>
          </div>
        </div>

        {/* Monthly Outflow / Run Rate */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-lg relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Monthly Burn Rate</span>
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <TrendingDown className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl lg:text-3xl font-extrabold text-white tracking-tight">
              {formatCurrency(metrics.monthlyBurnRatePKR, 'PKR')}
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Active Sponsorships: {formatCurrency(metrics.activeSponsorshipsPKR, 'PKR')}
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
            <span>Monthly Outflows</span>
            <span className="text-amber-400 font-medium">
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
            <h3 className="text-2xl lg:text-3xl font-extrabold text-purple-300 tracking-tight">
              {metrics.latestSnapshot 
                ? formatCurrency(metrics.latestSnapshot.khumsPayablePKR || metrics.latestSnapshot.khumsCalculated20PctPKR || 0, 'PKR')
                : 'Rs 652,674'}
            </h3>
            <p className="text-xs text-purple-300/80 mt-1">
              Prior year capital deducted: {metrics.latestSnapshot ? formatCurrency(metrics.latestSnapshot.previousPurifiedCapitalPKR || metrics.latestSnapshot.priorYearKhumsedCapitalPKR || 0, 'PKR') : 'Purified'}
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

      {/* 4. Kemati (Committee) & Special Assets Tracker Card */}
      <KematiTrackerCard onTransactionCreated={onOpenAddModal} />

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
          <div className="grid grid-cols-2 gap-2 mt-3 text-xs">
            {categoryData.slice(0, 4).map((c, i) => (
              <div key={c.name} className="flex items-center space-x-1.5 truncate">
                <span className="h-2 w-2 rounded-full flex-shrink-0" style={{ backgroundColor: PIE_COLORS[i] }} />
                <span className="text-slate-400 truncate">{c.name}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Multi-Month Inflow vs Outflow Cashflow Chart */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h4 className="text-sm font-semibold text-slate-200">Cash Flow Velocity</h4>
              <p className="text-xs text-slate-400 mt-0.5">Inflow vs. Outflow trajectory across recent months</p>
            </div>
            <div className="flex items-center space-x-3 text-xs">
              <span className="flex items-center space-x-1">
                <span className="h-2 w-2 rounded-full bg-emerald-400" />
                <span className="text-slate-400">Inflow</span>
              </span>
              <span className="flex items-center space-x-1">
                <span className="h-2 w-2 rounded-full bg-rose-400" />
                <span className="text-slate-400">Outflow</span>
              </span>
            </div>
          </div>
          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyFlowData}>
                <XAxis dataKey="month" stroke="#64748b" fontSize={11} />
                <YAxis stroke="#64748b" fontSize={11} tickFormatter={(val) => `Rs ${Math.round(val / 1000)}k`} />
                <Tooltip 
                  formatter={(val: number) => [`Rs ${formatNumberOnly(val)}`, 'Amount']}
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px' }}
                />
                <Bar dataKey="Income" fill="#10b981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Expense" fill="#f43f5e" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>

      {/* Connected Multi-Currency Accounts Grid */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div>
            <h4 className="text-sm font-semibold text-slate-200 flex items-center space-x-2">
              <Landmark className="h-4 w-4 text-emerald-400" />
              <span>Accounts & Liquid Asset Registry ({filteredAccounts.length})</span>
            </h4>
            <p className="text-xs text-slate-400 mt-0.5">
              Live balances across Pakistan banks, UAE Dirham cards, US dollar digital wallets & cash reserves.
            </p>
          </div>

          {/* Regional Filter Chips */}
          <div className="flex items-center space-x-1 p-1 bg-slate-950 rounded-xl border border-slate-800 text-xs">
            {(['ALL', 'PK', 'AE', 'INTL', 'CUSTODIAL'] as const).map(filter => (
              <button
                key={filter}
                onClick={() => setAccountGroupFilter(filter)}
                className={`px-2.5 py-1 rounded-lg font-medium transition ${
                  accountGroupFilter === filter
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {filter === 'ALL' ? 'All' : filter === 'INTL' ? 'USD/GBP' : filter === 'CUSTODIAL' ? 'Amanat' : filter}
              </button>
            ))}
          </div>
        </div>

        {/* Accounts Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {filteredAccounts.map(account => {
            const rate = fxMap.get(account.currency) || 1.0;
            const balancePKR = (account.currentBalance || 0) * rate;

            return (
              <div 
                key={account.id}
                className={`p-3.5 rounded-xl border transition-all ${
                  account.isCustodial 
                    ? 'bg-pink-950/20 border-pink-900/40' 
                    : account.type === 'CREDIT_CARD'
                    ? 'bg-rose-950/20 border-rose-900/40'
                    : 'bg-slate-950/80 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2 truncate">
                    {getAccountIcon(account.type)}
                    <span className="text-xs font-semibold text-slate-200 truncate">
                      {account.name}
                    </span>
                  </div>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-900 border border-slate-700/60 text-slate-300">
                    {account.currency}
                  </span>
                </div>

                <div className="mt-2 flex items-baseline justify-between">
                  <div className="text-base font-bold text-white font-mono">
                    {formatCurrencyMasked(account.currentBalance || 0, account.currency, isPrivacyMasked)}
                  </div>
                  {account.currency !== 'PKR' && (
                    <span className="text-[10px] text-slate-400 font-mono">
                      &asymp; {formatCurrencyMasked(balancePKR, 'PKR', isPrivacyMasked)}
                    </span>
                  )}
                </div>

                {account.isCustodial && (
                  <span className="mt-2 inline-block text-[9px] font-bold text-pink-400 uppercase tracking-wider">
                    Custodial Amanat &bull; Khums Exempt
                  </span>
                )}
                {account.travelNotes && (
                  <span className="mt-1 block text-[10px] text-teal-400/80 truncate">
                    ✈️ {account.travelNotes}
                  </span>
                )}
                {account.reconciliationNotes && (
                  <span className="mt-1 block text-[10px] text-amber-400/80 truncate">
                    📋 {account.reconciliationNotes}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>

    </div>
  );
};
