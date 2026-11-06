import React, { useState } from 'react';
import { Sponsorship, Account, Currency } from '../types';
import { formatCurrency, formatDatePretty } from '../utils/formatters';
import { 
  HeartHandshake, 
  PlusCircle, 
  Phone, 
  CreditCard, 
  Calendar, 
  CheckCircle2, 
  AlertCircle, 
  Trash2, 
  Edit, 
  Send
} from 'lucide-react';
import { db, recalculateAllAccountBalances } from '../db/db';

interface SponsorshipViewProps {
  sponsorships: Sponsorship[];
  accounts: Account[];
  onRefreshData: () => void;
}

export const SponsorshipView: React.FC<SponsorshipViewProps> = ({
  sponsorships,
  accounts,
  onRefreshData
}) => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [name, setName] = useState('');
  const [category, setCategory] = useState<'STUDENT_FEE' | 'RELIGIOUS' | 'FAMILY_SUPPORT' | 'HEALTHCARE'>('STUDENT_FEE');
  const [monthlyAmount, setMonthlyAmount] = useState<number>(5000);
  const [currency, setCurrency] = useState<Currency>('PKR');
  const [recipientPhone, setRecipientPhone] = useState('');
  const [preferredChannel, setPreferredChannel] = useState('Easypaisa');
  const [dueDay, setDueDay] = useState<number>(5);
  const [notes, setNotes] = useState('');

  // Handle adding new sponsorship
  const handleAddSponsorship = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const newSpons: Sponsorship = {
      id: `spons-${Date.now()}`,
      name: name.trim(),
      category,
      monthlyAmount: Number(monthlyAmount),
      currency,
      recipientPhone: recipientPhone.trim() || undefined,
      preferredChannel: preferredChannel.trim() || undefined,
      dueDay: Number(dueDay) || 1,
      active: true,
      notes: notes.trim() || undefined
    };

    await db.sponsorships.add(newSpons);
    setShowAddModal(false);
    // Reset form
    setName('');
    setMonthlyAmount(5000);
    setRecipientPhone('');
    setNotes('');
    onRefreshData();
  };

  // Toggle active status
  const handleToggleActive = async (s: Sponsorship) => {
    await db.sponsorships.update(s.id, { active: !s.active });
    onRefreshData();
  };

  // Quick 1-click Pay: records an EXPENSE in transactions
  const handleRecordPayment = async (s: Sponsorship) => {
    const defaultAccount = accounts.find(a => a.currency === s.currency && (a.id.includes('easypaisa') || a.id.includes('al-habib'))) || accounts[0];
    const today = new Date().toISOString().split('T')[0];

    await db.transactions.add({
      id: `pay-spons-${s.id}-${Date.now()}`,
      date: today,
      type: 'EXPENSE',
      amount: s.monthlyAmount,
      currency: s.currency,
      convertedAmountPKR: s.monthlyAmount, // Default 1:1 if PKR
      fxRateUsed: 1.0,
      category: 'Charity & Sponsorships',
      subCategory: s.category === 'STUDENT_FEE' ? 'School Fees' : s.category === 'RELIGIOUS' ? "Maulana's" : 'Family Support',
      merchantOrRecipient: `${s.name}${s.recipientPhone ? ' - ' + s.recipientPhone : ''}`,
      sourceAccountId: defaultAccount?.id,
      beneficiaryPhone: s.recipientPhone,
      paymentChannel: s.preferredChannel,
      description: `Monthly sponsorship payment: ${s.name}`,
      status: 'CONFIRMED'
    });

    await db.sponsorships.update(s.id, {
      lastPaidDate: today
    });

    await recalculateAllAccountBalances();
    alert(`Payment of ${formatCurrency(s.monthlyAmount, s.currency)} successfully recorded to Ledger!`);
    onRefreshData();
  };

  // Delete sponsorship
  const handleDeleteSponsorship = async (id: string) => {
    if (confirm('Delete this sponsorship record?')) {
      await db.sponsorships.delete(id);
      onRefreshData();
    }
  };

  const totalMonthlyCommitment = sponsorships
    .filter(s => s.active)
    .reduce((sum, s) => sum + s.monthlyAmount, 0);

  return (
    <div className="space-y-6">
      
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-cyan-950/40 via-slate-900 to-slate-900 border border-cyan-900/50 rounded-2xl p-5 sm:p-6 shadow-xl">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center space-x-3.5">
            <div className="h-12 w-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 shrink-0">
              <HeartHandshake className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-xl font-bold text-white tracking-tight">Recurring Sponsorships & Charity</h3>
                <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                  {sponsorships.filter(s => s.active).length} Active
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Track monthly student fees (Mustafa, Fatima FBIS), Maulana honorariums, and welfare disbursements with 1-click ledger logging.
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <div className="text-right hidden sm:block">
              <span className="text-[11px] text-slate-400">Total Monthly:</span>
              <div className="text-base font-bold text-cyan-400 font-mono">
                {formatCurrency(totalMonthlyCommitment, 'PKR')}
              </div>
            </div>
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center space-x-1.5 px-3.5 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl text-xs sm:text-sm font-semibold shadow-md shadow-cyan-950/40 transition"
            >
              <PlusCircle className="h-4 w-4" />
              <span>+ Add Sponsorship</span>
            </button>
          </div>
        </div>
      </div>

      {/* Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {sponsorships.map(s => {
          return (
            <div 
              key={s.id}
              className={`bg-slate-900/90 border rounded-2xl p-5 shadow-lg space-y-4 transition group ${
                s.active ? 'border-slate-800 hover:border-slate-700' : 'border-slate-800/40 opacity-60'
              }`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-300 border border-cyan-500/20">
                      {s.category.replace('_', ' ')}
                    </span>
                    <span className="text-xs text-slate-400">
                      Due: {s.dueDay}th of each month
                    </span>
                  </div>
                  <h4 className="text-lg font-bold text-white mt-1.5">
                    {s.name}
                  </h4>
                </div>

                <div className="text-right">
                  <div className="text-xl font-extrabold text-cyan-300 font-mono">
                    {formatCurrency(s.monthlyAmount, s.currency)}
                  </div>
                  <span className="text-[11px] text-slate-500">monthly</span>
                </div>
              </div>

              {/* Beneficiary Details */}
              <div className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-3 grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-slate-500">Mobile / Account:</span>
                  <div className="text-emerald-400 font-mono font-semibold flex items-center space-x-1 mt-0.5">
                    <Phone className="h-3 w-3" />
                    <span>{s.recipientPhone || 'Unspecified'}</span>
                  </div>
                </div>
                <div>
                  <span className="text-slate-500">Preferred Channel:</span>
                  <div className="text-slate-200 font-semibold flex items-center space-x-1 mt-0.5">
                    <CreditCard className="h-3 w-3 text-cyan-400" />
                    <span>{s.preferredChannel || 'Bank Transfer'}</span>
                  </div>
                </div>
              </div>

              {s.notes && (
                <p className="text-xs text-slate-400 italic">
                  &ldquo;{s.notes}&rdquo;
                </p>
              )}

              {/* Actions Footer */}
              <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
                <div className="text-[11px] text-slate-500">
                  {s.lastPaidDate ? `Last paid: ${formatDatePretty(s.lastPaidDate)}` : 'Not paid this month'}
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => handleToggleActive(s)}
                    className="text-xs text-slate-400 hover:text-white px-2 py-1"
                  >
                    {s.active ? 'Pause' : 'Activate'}
                  </button>
                  <button
                    onClick={() => handleDeleteSponsorship(s.id)}
                    className="p-1 text-slate-500 hover:text-rose-400"
                    title="Delete"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => handleRecordPayment(s)}
                    className="flex items-center space-x-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold shadow-sm transition"
                  >
                    <Send className="h-3 w-3" />
                    <span>Record Payment</span>
                  </button>
                </div>
              </div>

            </div>
          );
        })}
      </div>

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <h3 className="text-lg font-bold text-white">Add Recurring Sponsorship</h3>
            <form onSubmit={handleAddSponsorship} className="space-y-3">
              <div>
                <label className="text-xs text-slate-400">Beneficiary / Cause Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g., Mustafa - School Fees"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full mt-1 px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-400">Category</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as any)}
                    className="w-full mt-1 px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white"
                  >
                    <option value="STUDENT_FEE">Student Fee</option>
                    <option value="RELIGIOUS">Religious / Maulana</option>
                    <option value="FAMILY_SUPPORT">Family Support</option>
                    <option value="HEALTHCARE">Healthcare</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-slate-400">Monthly Amount (PKR)</label>
                  <input
                    type="number"
                    required
                    value={monthlyAmount}
                    onChange={(e) => setMonthlyAmount(parseFloat(e.target.value) || 0)}
                    className="w-full mt-1 px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-400">Recipient Phone (03xx)</label>
                  <input
                    type="text"
                    placeholder="03123456789"
                    value={recipientPhone}
                    onChange={(e) => setRecipientPhone(e.target.value)}
                    className="w-full mt-1 px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-400">Preferred Channel</label>
                  <input
                    type="text"
                    placeholder="Easypaisa / JazzCash / Bank"
                    value={preferredChannel}
                    onChange={(e) => setPreferredChannel(e.target.value)}
                    className="w-full mt-1 px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs text-slate-400">Notes / Purpose</label>
                <input
                  type="text"
                  placeholder="e.g. Class 9 tuition fee"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
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
                  Save Sponsorship
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

