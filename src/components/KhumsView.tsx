import React, { useState, useEffect, useMemo } from 'react';
import { KhumsSnapshot, Account } from '../types';
import { formatCurrency, formatNumberOnly, formatCurrencyMasked } from '../utils/formatters';
import { 
  computeKhums, 
  generateKhumsDraftFromAccounts, 
  saveKhumsSnapshot 
} from '../services/khumsEngine';
import { 
  Scale, 
  Lock, 
  Unlock, 
  Sparkles, 
  Calculator, 
  History, 
  CheckCircle2, 
  AlertCircle, 
  ShieldCheck, 
  Info,
  Calendar,
  Save,
  RotateCcw
} from 'lucide-react';

interface KhumsViewProps {
  khumsSnapshots: KhumsSnapshot[];
  accounts: Account[];
  onRefreshData: () => void;
  isPrivacyMasked?: boolean;
}

export const KhumsView: React.FC<KhumsViewProps> = ({
  khumsSnapshots,
  accounts,
  onRefreshData,
  isPrivacyMasked = false
}) => {
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState<number>(2025);

  // Form parameters
  const [totalSavingsPKR, setTotalSavingsPKR] = useState<number>(10850000);
  const [unusedConsumables20PctPKR, setUnusedConsumables20PctPKR] = useState<number>(82000);
  const [newUnusedItems25PctPKR, setNewUnusedItems25PctPKR] = useState<number>(62000);
  const [loansGivenReceivablesPKR, setLoansGivenReceivablesPKR] = useState<number>(328369);
  const [wifeAndCustodialSubtractPKR, setWifeAndCustodialSubtractPKR] = useState<number>(545000);
  const [pendingLiabilitiesCCSubtractPKR, setPendingLiabilitiesCCSubtractPKR] = useState<number>(335000);
  const [priorYearKhumsedCapitalPKR, setPriorYearKhumsedCapitalPKR] = useState<number>(8824738);
  const [extraVoluntaryPKR, setExtraVoluntaryPKR] = useState<number>(7473.8);
  const [notes, setNotes] = useState<string>('Audited Nov 30 Annual Calculation');
  const [isLocked, setIsLocked] = useState<boolean>(true);
  const [saveSuccessMessage, setSaveSuccessMessage] = useState<string | null>(null);

  // Load existing snapshot when selectedYear changes
  useEffect(() => {
    const existing = khumsSnapshots.find(s => s.year === selectedYear);
    if (existing) {
      setTotalSavingsPKR(existing.totalSavingsPKR);
      setUnusedConsumables20PctPKR(existing.unusedConsumables20PctPKR);
      setNewUnusedItems25PctPKR(existing.newUnusedItems25PctPKR);
      setLoansGivenReceivablesPKR(existing.loansGivenReceivablesPKR);
      setWifeAndCustodialSubtractPKR(existing.wifeAndCustodialSubtractPKR);
      setPendingLiabilitiesCCSubtractPKR(existing.pendingLiabilitiesCCSubtractPKR);
      setPriorYearKhumsedCapitalPKR(existing.priorYearKhumsedCapitalPKR);
      setExtraVoluntaryPKR(existing.extraVoluntaryPKR);
      setNotes(existing.notes || '');
      setIsLocked(existing.isLocked ?? false);
    } else {
      // Auto compute draft from live accounts
      handleAutoDraftFromAccounts(selectedYear);
    }
  }, [selectedYear, khumsSnapshots]);

  const handleAutoDraftFromAccounts = async (year: number) => {
    const draft = await generateKhumsDraftFromAccounts(year);
    setTotalSavingsPKR(draft.totalSavingsPKR);
    setUnusedConsumables20PctPKR(draft.unusedConsumables20PctPKR);
    setNewUnusedItems25PctPKR(draft.newUnusedItems25PctPKR);
    setLoansGivenReceivablesPKR(draft.loansGivenReceivablesPKR);
    setWifeAndCustodialSubtractPKR(draft.wifeAndCustodialSubtractPKR);
    setPendingLiabilitiesCCSubtractPKR(draft.pendingLiabilitiesCCSubtractPKR);
    setPriorYearKhumsedCapitalPKR(draft.priorYearKhumsedCapitalPKR);
    setExtraVoluntaryPKR(draft.extraVoluntaryPKR);
    setNotes(draft.notes || `Calculated Nov 30 ${year} snapshot`);
    setIsLocked(false);
  };

  // Live calculated snapshot using the exact formula
  const currentCalculation = useMemo(() => {
    return computeKhums({
      year: selectedYear,
      cutoffDate: `${selectedYear}-11-30`,
      totalSavingsPKR,
      unusedConsumables20PctPKR,
      newUnusedItems25PctPKR,
      loansGivenReceivablesPKR,
      wifeAndCustodialSubtractPKR,
      pendingLiabilitiesCCSubtractPKR,
      priorYearKhumsedCapitalPKR,
      extraVoluntaryPKR,
      notes
    });
  }, [
    selectedYear,
    totalSavingsPKR,
    unusedConsumables20PctPKR,
    newUnusedItems25PctPKR,
    loansGivenReceivablesPKR,
    wifeAndCustodialSubtractPKR,
    pendingLiabilitiesCCSubtractPKR,
    priorYearKhumsedCapitalPKR,
    extraVoluntaryPKR,
    notes
  ]);

  const totalAssetsSum = totalSavingsPKR + unusedConsumables20PctPKR + newUnusedItems25PctPKR + loansGivenReceivablesPKR;
  const totalDeductionsSum = wifeAndCustodialSubtractPKR + pendingLiabilitiesCCSubtractPKR + priorYearKhumsedCapitalPKR;

  // Save / Lock Snapshot
  const handleLockSnapshot = async (lockState: boolean) => {
    const snapshotToSave: KhumsSnapshot = {
      ...currentCalculation,
      isLocked: lockState
    };
    await saveKhumsSnapshot(snapshotToSave);
    setIsLocked(lockState);
    setSaveSuccessMessage(lockState ? `Snapshot for Nov 30, ${selectedYear} successfully LOCKED!` : 'Snapshot updated.');
    setTimeout(() => setSaveSuccessMessage(null), 4000);
    onRefreshData();
  };

  return (
    <div className="space-y-6">
      
      {/* Top Banner with Islamic Domain Formula Explanation */}
      <div className="bg-gradient-to-r from-purple-950/50 via-slate-900 to-slate-900 border border-purple-800/40 rounded-2xl p-5 sm:p-6 shadow-xl relative overflow-hidden">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-start space-x-3.5">
            <div className="h-12 w-12 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 shrink-0">
              <Scale className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-xl font-bold text-white tracking-tight">Annual Khums Calculator & Simulator</h3>
                <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-purple-500/20 text-purple-300 border border-purple-500/40">
                  Cutoff: Nov 30
                </span>
              </div>
              <p className="text-xs text-purple-200/80 mt-1 max-w-2xl">
                Implements the canonical formula: <span className="font-mono text-purple-300 font-semibold">Net Wealth = (Total Savings + 20% Consumables + 25% Unused Items + Receivables) &minus; (Custodial Amanat + CC Liabilities + Prior Year Purified Capital)</span>. 20% Khums is levied solely on the positive surplus.
              </p>
            </div>
          </div>

          {/* Year Selector */}
          <div className="flex items-center space-x-2 bg-slate-950 p-1.5 rounded-xl border border-slate-800 self-start lg:self-center">
            <span className="text-xs text-slate-400 pl-2">Year:</span>
            {[2022, 2023, 2024, 2025, 2026].map(y => (
              <button
                key={y}
                onClick={() => setSelectedYear(y)}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition ${
                  selectedYear === y 
                    ? 'bg-purple-600 text-white shadow-sm' 
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {y}
              </button>
            ))}
          </div>
        </div>

        {saveSuccessMessage && (
          <div className="mt-4 p-3 bg-emerald-950/80 border border-emerald-800 text-emerald-300 rounded-xl text-xs font-semibold flex items-center space-x-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
            <span>{saveSuccessMessage}</span>
          </div>
        )}
      </div>

      {/* Main Calculation Grid: Inputs on Left, Real-time Result on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left 2 Cols: Worksheet Inputs */}
        <div className="lg:col-span-2 space-y-5">
          
          {/* Section 1: Khumsable Assets & Receivables */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center space-x-2">
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                <h4 className="text-sm font-bold text-white uppercase tracking-wider">
                  1. Assets & Receivables (Additions)
                </h4>
              </div>
              <button
                onClick={() => handleAutoDraftFromAccounts(selectedYear)}
                className="flex items-center space-x-1 text-xs text-emerald-400 hover:text-emerald-300 font-semibold"
                title="Refresh inputs using current balances of all 26 accounts"
              >
                <Sparkles className="h-3.5 w-3.5" />
                <span>Auto-Pull from Accounts</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              
              {/* Total Liquid Savings */}
              <div>
                <label className="text-xs text-slate-300 font-medium flex items-center justify-between">
                  <span>Total Liquid Savings (PKR)</span>
                  <span className="font-mono text-emerald-400">{formatCurrency(totalSavingsPKR, 'PKR')}</span>
                </label>
                <input
                  type="number"
                  value={totalSavingsPKR}
                  onChange={(e) => setTotalSavingsPKR(parseFloat(e.target.value) || 0)}
                  className="w-full mt-1.5 px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white font-mono focus:outline-none focus:border-purple-500"
                />
                <p className="text-[10px] text-slate-500 mt-1">
                  Banks in PK & UAE, cash, digital wallets converted to PKR
                </p>
              </div>

              {/* Loans Given (Receivables) */}
              <div>
                <label className="text-xs text-slate-300 font-medium flex items-center justify-between">
                  <span>Loans Given / Receivables (PKR)</span>
                  <span className="font-mono text-emerald-400">{formatCurrency(loansGivenReceivablesPKR, 'PKR')}</span>
                </label>
                <input
                  type="number"
                  value={loansGivenReceivablesPKR}
                  onChange={(e) => setLoansGivenReceivablesPKR(parseFloat(e.target.value) || 0)}
                  className="w-full mt-1.5 px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white font-mono focus:outline-none focus:border-purple-500"
                />
                <p className="text-[10px] text-slate-500 mt-1">
                  e.g., 328,369 PKR family loan receivable (included in Khums)
                </p>
              </div>

              {/* Unused Consumables (20% items) */}
              <div>
                <label className="text-xs text-slate-300 font-medium flex items-center justify-between">
                  <span>Unused Consumables / Food / Perfume</span>
                  <span className="font-mono text-emerald-400">{formatCurrency(unusedConsumables20PctPKR, 'PKR')}</span>
                </label>
                <input
                  type="number"
                  value={unusedConsumables20PctPKR}
                  onChange={(e) => setUnusedConsumables20PctPKR(parseFloat(e.target.value) || 0)}
                  className="w-full mt-1.5 px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white font-mono focus:outline-none focus:border-purple-500"
                />
                <p className="text-[10px] text-slate-500 mt-1">
                  Estimated value of unused groceries, toiletries remaining on Nov 30
                </p>
              </div>

              {/* New Unused Items (25% items) */}
              <div>
                <label className="text-xs text-slate-300 font-medium flex items-center justify-between">
                  <span>New Unused Goods & Clothes</span>
                  <span className="font-mono text-emerald-400">{formatCurrency(newUnusedItems25PctPKR, 'PKR')}</span>
                </label>
                <input
                  type="number"
                  value={newUnusedItems25PctPKR}
                  onChange={(e) => setNewUnusedItems25PctPKR(parseFloat(e.target.value) || 0)}
                  className="w-full mt-1.5 px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white font-mono focus:outline-none focus:border-purple-500"
                />
                <p className="text-[10px] text-slate-500 mt-1">
                  Unworn clothes or unopened goods acquired during the annual cycle
                </p>
              </div>

            </div>

            <div className="pt-2 text-right text-xs text-slate-400 font-mono">
              Total Assets & Receivables: <span className="text-emerald-400 font-bold">{formatCurrency(totalAssetsSum, 'PKR')}</span>
            </div>
          </div>

          {/* Section 2: Deductions & Exclusions */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 space-y-4">
            <div className="flex items-center space-x-2 border-b border-slate-800 pb-3">
              <span className="h-2.5 w-2.5 rounded-full bg-rose-500" />
              <h4 className="text-sm font-bold text-white uppercase tracking-wider">
                2. Deductions & Purified Exemptions (Subtractions)
              </h4>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              
              {/* Prior Year Purified Capital */}
              <div>
                <label className="text-xs text-slate-300 font-medium flex items-center justify-between">
                  <span>Prior Year Khumsed Capital (Deducted)</span>
                  <span className="font-mono text-rose-400">-{formatCurrency(priorYearKhumsedCapitalPKR, 'PKR')}</span>
                </label>
                <input
                  type="number"
                  value={priorYearKhumsedCapitalPKR}
                  onChange={(e) => setPriorYearKhumsedCapitalPKR(parseFloat(e.target.value) || 0)}
                  className="w-full mt-1.5 px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white font-mono focus:outline-none focus:border-purple-500"
                />
                <p className="text-[10px] text-slate-500 mt-1">
                  Net wealth already purified in prior years (guarantees NO double Khums)
                </p>
              </div>

              {/* Wife & Custodial Children Galla */}
              <div>
                <label className="text-xs text-slate-300 font-medium flex items-center justify-between">
                  <span>Wife & Children Custodial Cash</span>
                  <span className="font-mono text-rose-400">-{formatCurrency(wifeAndCustodialSubtractPKR, 'PKR')}</span>
                </label>
                <input
                  type="number"
                  value={wifeAndCustodialSubtractPKR}
                  onChange={(e) => setWifeAndCustodialSubtractPKR(parseFloat(e.target.value) || 0)}
                  className="w-full mt-1.5 px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white font-mono focus:outline-none focus:border-purple-500"
                />
                <p className="text-[10px] text-slate-500 mt-1">
                  Amanat, wife's personal money, children galla (EXCLUDED from your liability)
                </p>
              </div>

              {/* Credit Card & Pending Liabilities */}
              <div>
                <label className="text-xs text-slate-300 font-medium flex items-center justify-between">
                  <span>Pending Liabilities & Credit Card Debt</span>
                  <span className="font-mono text-rose-400">-{formatCurrency(pendingLiabilitiesCCSubtractPKR, 'PKR')}</span>
                </label>
                <input
                  type="number"
                  value={pendingLiabilitiesCCSubtractPKR}
                  onChange={(e) => setPendingLiabilitiesCCSubtractPKR(parseFloat(e.target.value) || 0)}
                  className="w-full mt-1.5 px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white font-mono focus:outline-none focus:border-purple-500"
                />
                <p className="text-[10px] text-slate-500 mt-1">
                  Outstanding credit card cycle balances & unpaid loans taken
                </p>
              </div>

              {/* Extra Voluntary Sadaqah / Rounding */}
              <div>
                <label className="text-xs text-slate-300 font-medium flex items-center justify-between">
                  <span>Extra Voluntary Sadaqah / Buffer</span>
                  <span className="font-mono text-purple-400">+{formatCurrency(extraVoluntaryPKR, 'PKR')}</span>
                </label>
                <input
                  type="number"
                  value={extraVoluntaryPKR}
                  onChange={(e) => setExtraVoluntaryPKR(parseFloat(e.target.value) || 0)}
                  className="w-full mt-1.5 px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white font-mono focus:outline-none focus:border-purple-500"
                />
                <p className="text-[10px] text-slate-500 mt-1">
                  Optional rounding cushion or voluntary addition
                </p>
              </div>

            </div>

            <div className="pt-2 text-right text-xs text-slate-400 font-mono">
              Total Deductions: <span className="text-rose-400 font-bold">-{formatCurrency(totalDeductionsSum, 'PKR')}</span>
            </div>
          </div>

        </div>

        {/* Right Col: Dynamic Results Card & Lock Button */}
        <div className="space-y-5">
          
          <div className="bg-slate-900/90 border border-purple-800/40 rounded-2xl p-6 shadow-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 h-40 w-40 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />
            
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-purple-300">
                Nov 30, {selectedYear} Calculation
              </span>
              {isLocked ? (
                <span className="flex items-center space-x-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-950 text-emerald-300 border border-emerald-800">
                  <Lock className="h-3 w-3" />
                  <span>Locked</span>
                </span>
              ) : (
                <span className="flex items-center space-x-1 px-2 py-0.5 rounded text-[10px] font-bold bg-amber-950 text-amber-300 border border-amber-800">
                  <Unlock className="h-3 w-3" />
                  <span>Draft Simulation</span>
                </span>
              )}
            </div>

            {/* Net Khumsable Surplus */}
            <div className="mt-4 pt-4 border-t border-slate-800">
              <span className="text-xs text-slate-400">Net Khumsable Wealth (Surplus):</span>
              <div className="text-2xl font-black text-white font-mono mt-1">
                {formatCurrencyMasked(currentCalculation.netKhumsableAmountPKR, 'PKR', isPrivacyMasked)}
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                Total Assets ({formatCurrencyMasked(totalAssetsSum, 'PKR', isPrivacyMasked)}) &minus; Deductions ({formatCurrencyMasked(totalDeductionsSum, 'PKR', isPrivacyMasked)})
              </p>
            </div>

            {/* Calculated 20% Khums */}
            <div className="mt-5 p-4 rounded-xl bg-purple-950/60 border border-purple-800/60">
              <div className="flex items-center justify-between text-xs text-purple-200">
                <span>Calculated Khums (20%):</span>
                <span className="font-mono font-bold">20%</span>
              </div>
              <div className="text-3xl font-extrabold text-purple-300 font-mono mt-1 tracking-tight">
                {formatCurrencyMasked(currentCalculation.khumsCalculated20PctPKR, 'PKR', isPrivacyMasked)}
              </div>
              <div className="grid grid-cols-2 gap-2 mt-3 pt-2 border-t border-purple-900/60 text-[10px] text-purple-200/80 font-mono">
                <div>Sahm-e-Imam (10%): <br/><span className="text-white font-bold">{formatCurrencyMasked(currentCalculation.khumsCalculated20PctPKR / 2, 'PKR', isPrivacyMasked)}</span></div>
                <div>Sahm-e-Sadat (10%): <br/><span className="text-white font-bold">{formatCurrencyMasked(currentCalculation.khumsCalculated20PctPKR / 2, 'PKR', isPrivacyMasked)}</span></div>
              </div>
            </div>

            {/* Total Payable including voluntary */}
            <div className="mt-4 flex items-center justify-between text-sm">
              <span className="text-slate-300 font-medium">Total Paid / Payable:</span>
              <span className="text-lg font-bold text-emerald-400 font-mono">
                {formatCurrencyMasked(currentCalculation.khumsPaidPKR, 'PKR', isPrivacyMasked)}
              </span>
            </div>

            {/* Action Buttons */}
            <div className="mt-6 space-y-2">
              <button
                onClick={() => handleLockSnapshot(!isLocked)}
                className={`w-full flex items-center justify-center space-x-2 py-2.5 px-4 rounded-xl font-bold text-xs sm:text-sm transition shadow-lg ${
                  isLocked 
                    ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700' 
                    : 'bg-purple-600 hover:bg-purple-500 text-white shadow-purple-950/40'
                }`}
              >
                {isLocked ? <Unlock className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
                <span>{isLocked ? 'Unlock to Edit Snapshot' : 'Lock Annual Snapshot for Nov 30'}</span>
              </button>

              <button
                onClick={() => handleLockSnapshot(isLocked)}
                className="w-full flex items-center justify-center space-x-1.5 py-2 px-3 bg-slate-950 hover:bg-slate-800 text-slate-300 border border-slate-800 rounded-xl text-xs font-semibold transition"
              >
                <Save className="h-3.5 w-3.5 text-emerald-400" />
                <span>Save Changes to Local Database</span>
              </button>
            </div>
          </div>

          {/* Quick Guidance Box */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 text-xs text-slate-400 space-y-2">
            <div className="flex items-center space-x-1.5 text-slate-300 font-semibold">
              <Info className="h-4 w-4 text-purple-400" />
              <span>Fiqh Rules Applied</span>
            </div>
            <p>
              &bull; <strong>Deduction of Prior Capital:</strong> Ensures wealth purified in previous Nov 30 snapshots is never assessed twice.
            </p>
            <p>
              &bull; <strong>Receivables:</strong> Active family loans (e.g. Rs 328,369) are counted in total wealth as they are returnable.
            </p>
          </div>

        </div>

      </div>

      {/* Historical Year-over-Year Comparison Table (2016 - 2026) */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <History className="h-4 w-4 text-purple-400" />
            <h4 className="text-base font-bold text-white">Historical Year-Over-Year Khums Audit (2016–2026)</h4>
          </div>
          <span className="text-xs text-slate-400">Canonical Records from Excel Khums tab</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-slate-950/80 border-b border-slate-800 text-slate-400">
              <tr>
                <th className="py-2.5 px-3">Year</th>
                <th className="py-2.5 px-3 text-right">Total Savings</th>
                <th className="py-2.5 px-3 text-right">Loans Given</th>
                <th className="py-2.5 px-3 text-right">Wife/Amanat Deduct</th>
                <th className="py-2.5 px-3 text-right">Prior Capital Deduct</th>
                <th className="py-2.5 px-3 text-right">Net Khumsable</th>
                <th className="py-2.5 px-3 text-right">Khums 20%</th>
                <th className="py-2.5 px-3 text-right text-emerald-400">Total Paid</th>
                <th className="py-2.5 px-3 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {[...khumsSnapshots]
                .sort((a, b) => b.year - a.year)
                .map(k => (
                  <tr 
                    key={k.year}
                    onClick={() => setSelectedYear(k.year)}
                    className={`hover:bg-slate-800/40 transition cursor-pointer ${
                      k.year === selectedYear ? 'bg-purple-950/20 text-white font-semibold' : 'text-slate-300'
                    }`}
                  >
                    <td className="py-2.5 px-3 font-bold text-purple-300">
                      {k.year} (Nov 30)
                    </td>
                    <td className="py-2.5 px-3 text-right">{formatCurrency(k.totalSavingsPKR, 'PKR')}</td>
                    <td className="py-2.5 px-3 text-right">{formatCurrency(k.loansGivenReceivablesPKR, 'PKR')}</td>
                    <td className="py-2.5 px-3 text-right text-rose-400">-{formatCurrency(k.wifeAndCustodialSubtractPKR, 'PKR')}</td>
                    <td className="py-2.5 px-3 text-right text-rose-400">-{formatCurrency(k.priorYearKhumsedCapitalPKR, 'PKR')}</td>
                    <td className="py-2.5 px-3 text-right font-bold text-white">{formatCurrency(k.netKhumsableAmountPKR, 'PKR')}</td>
                    <td className="py-2.5 px-3 text-right font-bold text-purple-300">{formatCurrency(k.khumsCalculated20PctPKR, 'PKR')}</td>
                    <td className="py-2.5 px-3 text-right font-bold text-emerald-400">{formatCurrency(k.khumsPaidPKR, 'PKR')}</td>
                    <td className="py-2.5 px-3 text-center">
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-sans font-semibold bg-emerald-950 text-emerald-300 border border-emerald-800">
                        Certified
                      </span>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};

