import React, { useState, useEffect } from 'react';
import { 
  CalendarCheck2, 
  Layers, 
  Send, 
  PlusCircle, 
  Trash2, 
  CheckSquare, 
  Square, 
  ChevronLeft, 
  ChevronRight,
  DollarSign,
  AlertCircle,
  CheckCircle2,
  Users,
  Repeat,
  ShieldCheck,
  Sparkles,
  ArrowRightLeft
} from 'lucide-react';
import { RosterBatchDraftItem, Account, Currency } from '../types';
import { 
  generateMonthlyRosterDraft, 
  executeRosterCommit, 
  addNewRosterItem, 
  deleteRosterItem 
} from '../services/rosterEngine';

interface MonthlyRosterViewProps {
  accounts: Account[];
  onRefreshData: () => void;
  onNavigateToCoordinators?: () => void;
}

export const MonthlyRosterView: React.FC<MonthlyRosterViewProps> = ({
  accounts,
  onRefreshData,
  onNavigateToCoordinators
}) => {
  // Current month in YYYY-MM format
  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    const now = new Date();
    return now.toISOString().slice(0, 7);
  });

  const [draftItems, setDraftItems] = useState<RosterBatchDraftItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isCommitting, setIsCommitting] = useState(false);
  const [commitSuccessMsg, setCommitSuccessMsg] = useState<string | null>(null);

  // New Template Modal state
  const [showAddModal, setShowAddModal] = useState(false);
  const [newItemName, setNewItemName] = useState('');
  const [newItemCategory, setNewItemCategory] = useState('Donation');
  const [newItemAmount, setNewItemAmount] = useState('5000');
  const [newItemCurrency, setNewItemCurrency] = useState<Currency>('PKR');
  const [newItemAccountId, setNewItemAccountId] = useState('al-habib-pkr');
  const [newItemDay, setNewItemDay] = useState('1');
  const [newItemPhone, setNewItemPhone] = useState('');

  // Load draft items whenever selectedMonth changes
  const loadRosterDraft = async (monthStr: string) => {
    setIsLoading(true);
    const draft = await generateMonthlyRosterDraft(monthStr);
    setDraftItems(draft);
    setIsLoading(false);
  };

  useEffect(() => {
    loadRosterDraft(selectedMonth);
  }, [selectedMonth]);

  // Navigate months
  const handlePrevMonth = () => {
    const [y, m] = selectedMonth.split('-').map(Number);
    const prevDate = new Date(y, m - 2, 1);
    setSelectedMonth(prevDate.toISOString().slice(0, 7));
  };

  const handleNextMonth = () => {
    const [y, m] = selectedMonth.split('-').map(Number);
    const nextDate = new Date(y, m, 1);
    setSelectedMonth(nextDate.toISOString().slice(0, 7));
  };

  // Toggle item selection
  const handleToggleSelect = (index: number) => {
    const updated = [...draftItems];
    updated[index].selected = !updated[index].selected;
    setDraftItems(updated);
  };

  // Select All / Deselect All
  const handleToggleAll = (selectState: boolean) => {
    const updated = draftItems.map(item => ({ 
      ...item, 
      selected: item.isPrepaidSkipped ? false : selectState 
    }));
    setDraftItems(updated);
  };

  // Months Covered selector (1, 2, 3 months)
  const handleMonthsCoveredChange = (index: number, months: number) => {
    const updated = [...draftItems];
    updated[index].monthsCovered = months;
    setDraftItems(updated);
  };

  // Inline amount adjustment
  const handleAmountChange = (index: number, val: number) => {
    const updated = [...draftItems];
    updated[index].adjustedAmount = val;
    setDraftItems(updated);
  };

  // Inline note adjustment
  const handleNoteChange = (index: number, note: string) => {
    const updated = [...draftItems];
    updated[index].adjustmentNote = note;
    setDraftItems(updated);
  };

  // Toggle Wife Dual Currency (350 AED in UAE vs 18,000 PKR in PK)
  const handleToggleWifeCurrency = (index: number) => {
    const updated = [...draftItems];
    const item = updated[index];
    if (item.currency === 'AED') {
      item.currency = 'PKR';
      item.adjustedAmount = 18000;
      item.sourceAccountId = 'al-habib-pkr';
      item.adjustmentNote = 'Pakistan Mode: 18,000 PKR';
    } else {
      item.currency = 'AED';
      item.adjustedAmount = 350;
      item.sourceAccountId = 'adcb-aed';
      item.adjustmentNote = 'UAE Living Mode: 350 AED';
    }
    setDraftItems(updated);
  };

  // Commit selected items
  const handleCommitBatch = async () => {
    const selectedCount = draftItems.filter(i => i.selected).length;
    if (selectedCount === 0) return;

    setIsCommitting(true);
    const res = await executeRosterCommit(selectedMonth, draftItems);
    setIsCommitting(false);

    setCommitSuccessMsg(`Committed ${res.count} recurring transactions for ${selectedMonth} to Ledger!`);
    setTimeout(() => setCommitSuccessMsg(null), 5000);

    await loadRosterDraft(selectedMonth);
    onRefreshData();
  };

  // Add new template
  const handleCreateTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemName.trim()) return;

    await addNewRosterItem({
      name: newItemName.trim(),
      category: newItemCategory,
      defaultAmount: Number(newItemAmount),
      currency: newItemCurrency,
      sourceAccountId: newItemAccountId,
      defaultDay: Number(newItemDay) || 1,
      beneficiaryPhone: newItemPhone.trim() || undefined,
      isActive: true,
      isBillReminder: true
    });

    setShowAddModal(false);
    setNewItemName('');
    setNewItemAmount('5000');
    setNewItemPhone('');

    await loadRosterDraft(selectedMonth);
    onRefreshData();
  };

  const handleDeleteTemplate = async (id: string) => {
    if (!confirm('Are you sure you want to delete this recurring roster template?')) return;
    await deleteRosterItem(id);
    await loadRosterDraft(selectedMonth);
    onRefreshData();
  };

  // Format currency helpers
  const formatCurrency = (val: number, cur: string) => {
    return `${cur === 'PKR' ? '₨' : cur === 'AED' ? 'AED' : cur} ${val.toLocaleString(undefined, {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    })}`;
  };

  // Calculate totals
  const totals = draftItems.reduce((acc, curr) => {
    if (curr.selected) {
      acc.selectedCount++;
      const months = curr.monthsCovered || 1;
      const effectiveAmount = curr.adjustedAmount * months;
      if (curr.currency === 'PKR') {
        acc.totalPKR += effectiveAmount;
        acc.totalAED += effectiveAmount / 75.31;
      } else if (curr.currency === 'AED') {
        acc.totalAED += effectiveAmount;
        acc.totalPKR += effectiveAmount * 75.31;
      } else if (curr.currency === 'USD') {
        acc.totalPKR += effectiveAmount * 276.53;
        acc.totalAED += (effectiveAmount * 276.53) / 75.31;
      }
    }
    acc.totalCount++;
    return acc;
  }, { selectedCount: 0, totalCount: 0, totalPKR: 0, totalAED: 0 });

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      
      {/* Top Banner & Month Selector */}
      <div className="bg-gradient-to-r from-cyan-950 via-slate-900 to-slate-950 border border-cyan-800/40 rounded-2xl p-6 shadow-2xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <span className="p-2 rounded-xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
                <CalendarCheck2 className="h-5 w-5" />
              </span>
              <h2 className="text-xl font-black text-white tracking-tight">
                Monthly Recurring Roster Engine
              </h2>
            </div>
            <p className="text-xs text-slate-400 mt-1 max-w-2xl">
              1-Click batch commit for recurring student sponsorships, charities, family allowances, and fixed utilities.
              Features automatic multi-month advance tracking and prepaid protection.
            </p>
          </div>

          {/* Month Selector Carousel */}
          <div className="flex items-center space-x-3 bg-slate-900/90 p-1.5 rounded-2xl border border-slate-800 shadow-inner self-start md:self-auto">
            <button
              onClick={handlePrevMonth}
              className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition"
              title="Previous Month"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <div className="flex items-center space-x-2 px-3 py-1 bg-slate-950 rounded-xl border border-slate-800/80">
              <span className="text-xs font-mono font-bold text-cyan-400">
                {selectedMonth}
              </span>
            </div>
            <button
              onClick={handleNextMonth}
              className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition"
              title="Next Month"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>

        {commitSuccessMsg && (
          <div className="mt-4 p-3 bg-emerald-950/90 border border-emerald-700 text-emerald-200 rounded-xl text-xs font-semibold flex items-center space-x-2 animate-in fade-in">
            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
            <span>{commitSuccessMsg}</span>
          </div>
        )}
      </div>

      {/* Summary KPI Strip & Commit Action Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        
        {/* Selected Items Counter */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 flex items-center justify-between">
          <div>
            <span className="text-[11px] text-slate-400 uppercase font-semibold">Active In Batch</span>
            <div className="text-2xl font-black text-white font-mono mt-0.5">
              {totals.selectedCount} / {totals.totalCount}
            </div>
          </div>
          <div className="flex items-center space-x-1.5 text-xs">
            <button
              onClick={() => handleToggleAll(true)}
              className="text-cyan-400 hover:text-cyan-300 font-semibold"
            >
              Select All
            </button>
            <span className="text-slate-600">&bull;</span>
            <button
              onClick={() => handleToggleAll(false)}
              className="text-slate-400 hover:text-slate-200"
            >
              None
            </button>
          </div>
        </div>

        {/* Total Batch Amount */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 flex items-center justify-between">
          <div>
            <span className="text-[11px] text-slate-400 uppercase font-semibold">Batch Total (PKR Equiv.)</span>
            <div className="text-2xl font-black text-cyan-400 font-mono mt-0.5">
              {formatCurrency(totals.totalPKR, 'PKR')}
            </div>
            <span className="text-[10px] text-slate-500 font-mono">
              &asymp; {formatCurrency(totals.totalAED, 'AED')}
            </span>
          </div>
          <div className="p-2.5 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
            <DollarSign className="h-5 w-5" />
          </div>
        </div>

        {/* 1-Click Commit Button */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 flex items-center justify-between">
          <div>
            <span className="text-[11px] text-slate-400 uppercase font-semibold">Target Ledger</span>
            <div className="text-xs text-slate-300 font-medium mt-0.5">
              Month of {selectedMonth}
            </div>
          </div>
          <button
            onClick={handleCommitBatch}
            disabled={isCommitting || totals.selectedCount === 0}
            className="flex items-center space-x-2 px-5 py-2.5 bg-cyan-600 hover:bg-cyan-500 disabled:bg-slate-800 text-white rounded-xl text-xs sm:text-sm font-bold shadow-lg shadow-cyan-950/50 transition"
          >
            <Send className="h-4 w-4" />
            <span>Commit Selected ({totals.selectedCount})</span>
          </button>
        </div>

      </div>

      {/* Roster Items Checklist */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Layers className="h-4 w-4 text-cyan-400" />
            <h4 className="text-sm font-bold text-white uppercase tracking-wider">
              Monthly Recurring Checklist ({draftItems.length} Templates)
            </h4>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center space-x-1 px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-xs font-semibold transition"
          >
            <PlusCircle className="h-3.5 w-3.5 text-cyan-400" />
            <span>+ Add Template</span>
          </button>
        </div>

        <div className="divide-y divide-slate-800/60">
          {draftItems.map((item, idx) => {
            const isCommittedThisMonth = item.lastCommittedMonth === selectedMonth;
            const monthsCovered = item.monthsCovered || 1;
            const isKemati = item.subCategory?.toLowerCase() === 'kemati' || item.name.toLowerCase().includes('kemati');
            const isWife = item.isWifeDualCurrency || item.name.toLowerCase().includes('wife');

            return (
              <div 
                key={item.id}
                className={`p-4 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 transition hover:bg-slate-800/30 ${
                  item.isPrepaidSkipped 
                    ? 'bg-emerald-950/20 border-l-4 border-l-emerald-500' 
                    : item.selected 
                    ? 'bg-slate-900/40' 
                    : 'opacity-60 bg-slate-950/40'
                }`}
              >
                {/* Left: Checkbox & Name */}
                <div className="flex items-start space-x-3 max-w-lg">
                  <button
                    type="button"
                    onClick={() => handleToggleSelect(idx)}
                    className="mt-1 text-cyan-400 hover:text-cyan-300 transition"
                  >
                    {item.selected ? (
                      <CheckSquare className="h-5 w-5" />
                    ) : (
                      <Square className="h-5 w-5 text-slate-600" />
                    )}
                  </button>

                  <div>
                    <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                      <span className="text-[10px] font-semibold uppercase px-2 py-0.2 rounded bg-cyan-950 text-cyan-300 border border-cyan-800">
                        {item.category}
                      </span>
                      {item.isPrepaidSkipped && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-700 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                          Prepaid in Prior Month ✅ (Auto-Skipped)
                        </span>
                      )}
                      {isCommittedThisMonth && !item.isPrepaidSkipped && (
                        <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-emerald-950 text-emerald-300 border border-emerald-800">
                          Already Committed
                        </span>
                      )}
                      {isKemati && (
                        <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-purple-950 text-purple-300 border border-purple-800">
                          Locked Savings Asset (Khums Included)
                        </span>
                      )}
                    </div>

                    <h5 className="text-sm font-bold text-white mt-0.5">
                      {item.name}
                    </h5>

                    <div className="text-[11px] text-slate-400 flex items-center space-x-2 mt-0.5 flex-wrap">
                      <span>Day: {item.defaultDay}th</span>
                      <span>&bull;</span>
                      <span>Account: {accounts.find(a => a.id === item.sourceAccountId)?.name || item.sourceAccountId}</span>
                      {item.beneficiaryPhone && (
                        <>
                          <span>&bull;</span>
                          <span className="text-emerald-400 font-mono">{item.beneficiaryPhone}</span>
                        </>
                      )}
                      {monthsCovered > 1 && (
                        <>
                          <span>&bull;</span>
                          <span className="text-amber-300 font-bold">Advance: {monthsCovered} Months</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right: Months Covered, Dual Currency, Amount & Actions */}
                <div className="flex flex-col sm:flex-row items-end sm:items-center space-y-2 sm:space-y-0 sm:space-x-3 w-full lg:w-auto">
                  
                  {/* Wife Dual Currency Switcher */}
                  {isWife && (
                    <button
                      type="button"
                      onClick={() => handleToggleWifeCurrency(idx)}
                      className="px-2 py-1 bg-slate-950 hover:bg-slate-800 text-[10px] font-bold text-teal-300 border border-teal-700/60 rounded-lg flex items-center gap-1"
                      title="Switch between UAE (350 AED) and Pakistan (18,000 PKR)"
                    >
                      <ArrowRightLeft className="w-3 h-3" />
                      {item.currency === 'AED' ? 'Switch to PK (18k PKR)' : 'Switch to UAE (350 AED)'}
                    </button>
                  )}

                  {/* Multi-Month Advance Covered Selector */}
                  <div className="flex items-center space-x-1">
                    <span className="text-[10px] text-slate-500 font-semibold hidden sm:inline">Cover:</span>
                    <select
                      value={monthsCovered}
                      onChange={(e) => handleMonthsCoveredChange(idx, Number(e.target.value))}
                      className="px-2 py-1 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-300 focus:outline-none focus:border-cyan-500 font-semibold"
                      title="Months covered in this payment (auto-skips subsequent months)"
                    >
                      <option value={1}>1 Month</option>
                      <option value={2}>2 Months (Advance)</option>
                      <option value={3}>3 Months (Advance)</option>
                    </select>
                  </div>

                  {/* Adjustment Note */}
                  <input
                    type="text"
                    placeholder="Adjustment note"
                    value={item.adjustmentNote || ''}
                    onChange={(e) => handleNoteChange(idx, e.target.value)}
                    className="w-full sm:w-44 px-2.5 py-1 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-300 placeholder-slate-600 focus:outline-none focus:border-cyan-500"
                  />

                  {/* Amount Input */}
                  <div className="flex items-center space-x-1.5">
                    <input
                      type="number"
                      value={item.adjustedAmount * monthsCovered}
                      onChange={(e) => handleAmountChange(idx, (parseFloat(e.target.value) || 0) / monthsCovered)}
                      className="w-24 px-2 py-1 bg-slate-950 border border-slate-800 rounded-lg text-xs font-mono font-bold text-white text-right focus:outline-none focus:border-cyan-500"
                    />
                    <span className="text-xs text-slate-400 font-mono">{item.currency}</span>
                  </div>

                  {/* Delete Template Trigger */}
                  <button
                    onClick={() => handleDeleteTemplate(item.id)}
                    className="p-1 text-slate-600 hover:text-rose-400 transition"
                    title="Delete recurring template"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Add Roster Item Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <h3 className="text-base font-bold text-white mb-4 flex items-center space-x-2">
              <PlusCircle className="h-5 w-5 text-cyan-400" />
              <span>Create Recurring Roster Template</span>
            </h3>

            <form onSubmit={handleCreateTemplate} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-400 mb-1 font-semibold">Beneficiary or Bill Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Maulana Qalbe Ali (Students)"
                  value={newItemName}
                  onChange={(e) => setNewItemName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1 font-semibold">Category</label>
                  <select
                    value={newItemCategory}
                    onChange={(e) => setNewItemCategory(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white"
                  >
                    <option value="Donation">Donation</option>
                    <option value="School">School</option>
                    <option value="Van">Van</option>
                    <option value="Utilities">Utilities</option>
                    <option value="Bill Payment">Bill Payment</option>
                    <option value="Family Allowance">Family Allowance</option>
                    <option value="Wife">Wife</option>
                    <option value="Rohia">Rohia</option>
                    <option value="Jhone">Jhone</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 mb-1 font-semibold">Expected Day of Month</label>
                  <input
                    type="number"
                    min="1"
                    max="31"
                    value={newItemDay}
                    onChange={(e) => setNewItemDay(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1 font-semibold">Default Amount *</label>
                  <input
                    type="number"
                    required
                    value={newItemAmount}
                    onChange={(e) => setNewItemAmount(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white font-mono"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1 font-semibold">Currency</label>
                  <select
                    value={newItemCurrency}
                    onChange={(e) => setNewItemCurrency(e.target.value as Currency)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white"
                  >
                    <option value="PKR">PKR (Rs)</option>
                    <option value="AED">AED (Dh)</option>
                    <option value="USD">USD ($)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-semibold">Default Deduction Account</label>
                <select
                  value={newItemAccountId}
                  onChange={(e) => setNewItemAccountId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white"
                >
                  {accounts.map(a => (
                    <option key={a.id} value={a.id}>{a.name} ({a.currency})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-semibold">Beneficiary Phone / Contact</label>
                <input
                  type="text"
                  placeholder="e.g. 03120976573"
                  value={newItemPhone}
                  onChange={(e) => setNewItemPhone(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white font-mono"
                />
              </div>

              <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl font-bold shadow-md shadow-cyan-950/50"
                >
                  Save Template
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
