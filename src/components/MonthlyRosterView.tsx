import React, { useState, useEffect, useMemo } from 'react';
import { 
  RosterItem, 
  RosterBatchDraftItem, 
  Account, 
  Currency 
} from '../types';
import { 
  generateMonthlyRosterDraft, 
  executeRosterCommit, 
  addNewRosterItem, 
  deleteRosterItem 
} from '../services/rosterEngine';
import { db } from '../db/db';
import { formatCurrency } from '../utils/formatters';
import { 
  CheckSquare, 
  Square, 
  Calendar, 
  Send, 
  CheckCircle2, 
  Sparkles, 
  PlusCircle, 
  Trash2, 
  Edit3, 
  Layers, 
  DollarSign, 
  Clock, 
  ChevronLeft, 
  ChevronRight,
  Info
} from 'lucide-react';

interface MonthlyRosterViewProps {
  accounts: Account[];
  onRefreshData: () => void;
}

export const MonthlyRosterView: React.FC<MonthlyRosterViewProps> = ({
  accounts,
  onRefreshData
}) => {
  // Format current year and month: YYYY-MM
  const initialYearMonth = new Date().toISOString().slice(0, 7); // e.g. "2026-11"
  const [selectedMonth, setSelectedMonth] = useState<string>(initialYearMonth);
  const [draftItems, setDraftItems] = useState<RosterBatchDraftItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isCommitting, setIsCommitting] = useState<boolean>(false);
  const [commitSuccessMsg, setCommitSuccessMsg] = useState<string | null>(null);

  // New Roster Item Modal state
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [newItemName, setNewItemName] = useState('');
  const [newItemCategory, setNewItemCategory] = useState('School');
  const [newItemAmount, setNewItemAmount] = useState<number>(5000);
  const [newItemCurrency, setNewItemCurrency] = useState<Currency>('PKR');
  const [newItemAccountId, setNewItemAccountId] = useState('al-habib-pkr');
  const [newItemDay, setNewItemDay] = useState<number>(5);
  const [newItemNotes, setNewItemNotes] = useState('');

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
    const updated = draftItems.map(item => ({ ...item, selected: selectState }));
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
      isActive: true,
      notes: newItemNotes.trim() || undefined
    });

    setShowAddModal(false);
    setNewItemName('');
    setNewItemAmount(5000);
    setNewItemNotes('');
    await loadRosterDraft(selectedMonth);
  };

  // Delete template
  const handleDeleteTemplate = async (id: string) => {
    if (confirm('Delete this recurring roster template?')) {
      await deleteRosterItem(id);
      await loadRosterDraft(selectedMonth);
    }
  };

  // Calculated batch totals
  const totals = useMemo(() => {
    let totalPKR = 0;
    let selectedCount = 0;

    draftItems.forEach(item => {
      if (item.selected) {
        selectedCount++;
        // Rough converted preview
        if (item.currency === 'AED') totalPKR += item.adjustedAmount * 74.31;
        else if (item.currency === 'USD') totalPKR += item.adjustedAmount * 275.53;
        else totalPKR += item.adjustedAmount;
      }
    });

    return {
      totalPKR,
      totalAED: totalPKR / 74.31,
      selectedCount,
      totalCount: draftItems.length
    };
  }, [draftItems]);

  return (
    <div className="space-y-6">
      
      {/* Top Banner & Month Selector */}
      <div className="bg-gradient-to-r from-cyan-950/50 via-slate-900 to-slate-900 border border-cyan-800/40 rounded-2xl p-5 sm:p-6 shadow-xl relative overflow-hidden">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-start space-x-3.5">
            <div className="h-12 w-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 shrink-0">
              <Calendar className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-xl font-bold text-white tracking-tight">1-Click Monthly Recurring Roster</h3>
                <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                  Automation Engine
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-1 max-w-xl">
                Batch post ~25 monthly student fees (Mustafa, Fatima FBIS), Maulana wazeefas, school van transport, broadband and bills in 1 click.
              </p>
            </div>
          </div>

          {/* Month Selector Carousel */}
          <div className="flex items-center space-x-2 bg-slate-950 p-1.5 rounded-xl border border-slate-800 self-start lg:self-center">
            <button
              onClick={handlePrevMonth}
              className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition"
              title="Previous Month"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="px-3 py-1 font-mono font-bold text-sm text-cyan-300">
              {selectedMonth}
            </span>
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

            return (
              <div 
                key={item.id}
                className={`p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 transition hover:bg-slate-800/30 ${
                  item.selected ? 'bg-slate-900/40' : 'opacity-60 bg-slate-950/40'
                }`}
              >
                {/* Left: Checkbox & Name */}
                <div className="flex items-start space-x-3 max-w-md">
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
                    <div className="flex items-center space-x-2">
                      <span className="text-[10px] font-semibold uppercase px-2 py-0.2 rounded bg-cyan-950 text-cyan-300 border border-cyan-800">
                        {item.category}
                      </span>
                      {isCommittedThisMonth && (
                        <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-emerald-950 text-emerald-300 border border-emerald-800">
                          Already Committed
                        </span>
                      )}
                    </div>
                    <h5 className="text-sm font-bold text-white mt-0.5">
                      {item.name}
                    </h5>
                    <div className="text-[11px] text-slate-400 flex items-center space-x-2 mt-0.5">
                      <span>Day: {item.defaultDay}th</span>
                      <span>&bull;</span>
                      <span>Account: {accounts.find(a => a.id === item.sourceAccountId)?.name || item.sourceAccountId}</span>
                      {item.beneficiaryPhone && (
                        <>
                          <span>&bull;</span>
                          <span className="text-emerald-400 font-mono">{item.beneficiaryPhone}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right: Amount & Adjustment Note */}
                <div className="flex flex-col sm:flex-row items-end sm:items-center space-y-2 sm:space-y-0 sm:space-x-3 w-full sm:w-auto">
                  
                  {/* One-Time Adjustment Note */}
                  <input
                    type="text"
                    placeholder="Adjustment note (e.g. +650 winter charges)"
                    value={item.adjustmentNote || ''}
                    onChange={(e) => handleNoteChange(idx, e.target.value)}
                    className="w-full sm:w-48 px-2.5 py-1 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-300 placeholder-slate-600 focus:outline-none focus:border-cyan-500"
                  />

                  {/* Amount Input */}
                  <div className="flex items-center space-x-1.5">
                    <input
                      type="number"
                      value={item.adjustedAmount}
                      onChange={(e) => handleAmountChange(idx, parseFloat(e.target.value) || 0)}
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <h3 className="text-lg font-bold text-white">Add Recurring Roster Template</h3>
            <form onSubmit={handleCreateTemplate} className="space-y-3">
              <div>
                <label className="text-xs text-slate-400">Template / Beneficiary Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Green Island School Fees"
                  value={newItemName}
                  onChange={(e) => setNewItemName(e.target.value)}
                  className="w-full mt-1 px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-400">Category</label>
                  <input
                    type="text"
                    required
                    value={newItemCategory}
                    onChange={(e) => setNewItemCategory(e.target.value)}
                    className="w-full mt-1 px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-400">Default Amount</label>
                  <input
                    type="number"
                    required
                    value={newItemAmount}
                    onChange={(e) => setNewItemAmount(parseFloat(e.target.value) || 0)}
                    className="w-full mt-1 px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-400">Currency</label>
                  <select
                    value={newItemCurrency}
                    onChange={(e) => setNewItemCurrency(e.target.value as any)}
                    className="w-full mt-1 px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white"
                  >
                    <option value="PKR">PKR (Rs)</option>
                    <option value="AED">AED (Dh)</option>
                    <option value="USD">USD ($)</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-slate-400">Due Day of Month</label>
                  <input
                    type="number"
                    min="1"
                    max="31"
                    value={newItemDay}
                    onChange={(e) => setNewItemDay(parseInt(e.target.value) || 1)}
                    className="w-full mt-1 px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs text-slate-400">Default Source Account</label>
                <select
                  value={newItemAccountId}
                  onChange={(e) => setNewItemAccountId(e.target.value)}
                  className="w-full mt-1 px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white"
                >
                  {accounts.map(a => (
                    <option key={a.id} value={a.id}>{a.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs text-slate-400">Notes</label>
                <input
                  type="text"
                  placeholder="Optional notes..."
                  value={newItemNotes}
                  onChange={(e) => setNewItemNotes(e.target.value)}
                  className="w-full mt-1 px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl text-xs font-semibold shadow-md"
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

