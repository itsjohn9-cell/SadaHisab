import React, { useState, useEffect } from 'react';
import { db } from '../db/db';
import { CoordinatorGroup, Account, Transaction } from '../types';
import {
  Users,
  Copy,
  Check,
  Send,
  Plus,
  ArrowRight,
  ExternalLink,
  MessageCircle,
  DollarSign,
  Calendar,
  Layers,
  Sparkles,
  Phone,
  CreditCard,
  X
} from 'lucide-react';

export const CoordinatorManagerView: React.FC = () => {
  const [groups, setGroups] = useState<CoordinatorGroup[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [copiedGroupId, setCopiedGroupId] = useState<string | null>(null);
  const [selectedGroupToSplit, setSelectedGroupToSplit] = useState<CoordinatorGroup | null>(null);
  
  // Split dialog state
  const currentMonthYM = new Date().toISOString().substring(0, 7);
  const [splitMonth, setSplitMonth] = useState<string>(currentMonthYM);
  const [splitAccountId, setSplitAccountId] = useState<string>('al-habib-pkr');
  const [splitItemAmounts, setSplitItemAmounts] = useState<Record<string, number>>({});
  const [isSplitting, setIsSplitting] = useState(false);
  const [splitSuccessMsg, setSplitSuccessMsg] = useState<string | null>(null);

  const loadData = async () => {
    const [allGroups, allAccounts] = await Promise.all([
      db.coordinator_groups.toArray(),
      db.accounts.toArray()
    ]);
    setGroups(allGroups);
    setAccounts(allAccounts);
  };

  useEffect(() => {
    loadData();
  }, []);

  // Format WhatsApp breakdown message
  const generateWhatsAppMessage = (group: CoordinatorGroup, monthYM: string): string => {
    const [year, monthNum] = monthYM.split('-');
    const dateObj = new Date(parseInt(year), parseInt(monthNum) - 1, 1);
    const monthName = dateObj.toLocaleString('default', { month: 'long', year: 'numeric' });

    let lines = [
      `Salam ${group.coordinatorName},`,
      `Alhamdulillah, transferred Rs. ${group.totalMonthlyCommitment.toLocaleString()} for ${monthName} via ${group.paymentChannel}.`,
      '',
      `📋 *Breakdown:*`
    ];

    group.subItems.forEach(item => {
      lines.push(`• ${item.studentName}: Rs. ${item.defaultAmount.toLocaleString()} (${item.subCategory})`);
    });

    lines.push('');
    lines.push(`*Total Transferred:* Rs. ${group.totalMonthlyCommitment.toLocaleString()}`);
    lines.push(`Jazakallah Khair.`);
    lines.push(`— Sada Hisab`);

    return lines.join('\n');
  };

  const handleCopyWhatsApp = (group: CoordinatorGroup) => {
    const text = generateWhatsAppMessage(group, splitMonth);
    navigator.clipboard.writeText(text);
    setCopiedGroupId(group.id);
    setTimeout(() => setCopiedGroupId(null), 3000);
  };

  const handleOpenSplitModal = (group: CoordinatorGroup) => {
    setSelectedGroupToSplit(group);
    setSplitAccountId(group.defaultAccountId || 'al-habib-pkr');
    const initialAmounts: Record<string, number> = {};
    group.subItems.forEach(item => {
      initialAmounts[item.id] = item.defaultAmount;
    });
    setSplitItemAmounts(initialAmounts);
  };

  const handleExecuteAutoSplit = async () => {
    if (!selectedGroupToSplit) return;
    setIsSplitting(true);
    try {
      const parentTransferId = `coord-batch-${Date.now()}`;
      const todayISO = new Date().toISOString().split('T')[0];

      let batchTotalPKR = 0;
      const childTransactions: Transaction[] = [];

      for (const sub of selectedGroupToSplit.subItems) {
        const amt = splitItemAmounts[sub.id] ?? sub.defaultAmount;
        batchTotalPKR += amt;

        childTransactions.push({
          id: `tx-split-${sub.id}-${Date.now()}`,
          date: todayISO,
          type: 'EXPENSE',
          amount: amt,
          currency: 'PKR',
          convertedAmountPKR: amt,
          fxRateUsed: 1.0,
          category: 'Donation',
          subCategory: sub.subCategory || 'School Fees',
          merchantOrRecipient: `${selectedGroupToSplit.coordinatorName} -> ${sub.studentName}`,
          subBeneficiary: sub.studentName,
          sourceAccountId: splitAccountId,
          parentTransferId,
          beneficiaryPhone: selectedGroupToSplit.phone,
          paymentChannel: selectedGroupToSplit.paymentChannel,
          description: `Coordinator Auto-Split: ${selectedGroupToSplit.coordinatorName} for ${sub.studentName} [${splitMonth}]`,
          billingMonth: splitMonth,
          status: 'CONFIRMED',
          isSampleData: false
        });
      }

      await db.transactions.bulkAdd(childTransactions);

      // Deduct from account balance
      const account = accounts.find(a => a.id === splitAccountId);
      if (account) {
        await db.accounts.update(splitAccountId, {
          currentBalance: (account.currentBalance || 0) - batchTotalPKR
        });
      }

      setSplitSuccessMsg(
        `Successfully auto-split Rs. ${batchTotalPKR.toLocaleString()} across ${childTransactions.length} students into your ledger!`
      );
      setTimeout(() => {
        setSplitSuccessMsg(null);
        setSelectedGroupToSplit(null);
      }, 3000);

      await loadData();
    } catch (err: any) {
      alert(`Auto-Split failed: ${err.message}`);
    } finally {
      setIsSplitting(false);
    }
  };

  const totalMonthlyAllCoordinators = groups.reduce((acc, g) => acc + g.totalMonthlyCommitment, 0);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-teal-900 via-slate-900 to-indigo-950 text-white rounded-2xl p-6 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Users className="w-6 h-6 text-teal-300" />
            <h1 className="text-2xl font-bold tracking-tight">Coordinator Groups & Auto-Splitter</h1>
          </div>
          <p className="text-teal-100 text-xs max-w-2xl">
            Lump-sum transfers to coordinators auto-split into individual child student transactions.
            Generate formatted WhatsApp breakdown messages with 1 click.
          </p>
        </div>

        <div className="flex items-center gap-3 bg-white/10 px-4 py-2 rounded-xl backdrop-blur-md border border-white/20 self-start md:self-auto">
          <div>
            <span className="text-[10px] text-teal-200 uppercase font-bold block">Total Monthly Commitment</span>
            <span className="text-xl font-black text-white">₨ {totalMonthlyAllCoordinators.toLocaleString()}</span>
          </div>
        </div>
      </div>

      {/* Coordinator Groups Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {groups.map(group => {
          const isCopied = copiedGroupId === group.id;
          return (
            <div
              key={group.id}
              className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs flex flex-col justify-between hover:border-teal-300 transition-all"
            >
              <div>
                {/* Header */}
                <div className="flex items-start justify-between gap-3 mb-3 pb-3 border-b border-slate-100">
                  <div>
                    <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                      {group.coordinatorName}
                      <span className="text-[11px] font-semibold bg-teal-50 text-teal-700 px-2 py-0.5 rounded-full border border-teal-200">
                        {group.subItems.length} Students
                      </span>
                    </h3>
                    <div className="flex items-center gap-2 text-xs text-slate-500 mt-1 flex-wrap">
                      <span className="flex items-center gap-1 font-mono">
                        <Phone className="w-3 h-3 text-slate-400" />
                        {group.phone}
                      </span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <CreditCard className="w-3 h-3 text-slate-400" />
                        {group.paymentChannel}
                      </span>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-xs text-slate-400 block font-semibold">Total Lump Sum</span>
                    <span className="text-lg font-black text-slate-900">
                      ₨ {group.totalMonthlyCommitment.toLocaleString()}
                    </span>
                  </div>
                </div>

                {/* Sub-Items List */}
                <div className="space-y-1.5 mb-4 max-h-56 overflow-y-auto pr-1">
                  {group.subItems.map(item => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between py-1 px-2.5 rounded-lg bg-slate-50 hover:bg-slate-100/80 text-xs transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-slate-800">{item.studentName}</span>
                        <span className="text-[10px] text-slate-400">({item.subCategory})</span>
                      </div>
                      <span className="font-mono font-bold text-slate-700">
                        ₨ {item.defaultAmount.toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                <button
                  onClick={() => handleCopyWhatsApp(group)}
                  className={`flex-1 px-3 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                    isCopied
                      ? 'bg-emerald-600 text-white'
                      : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200'
                  }`}
                  title="Copy formatted WhatsApp breakdown message to clipboard"
                >
                  {isCopied ? <Check className="w-4 h-4" /> : <MessageCircle className="w-4 h-4 text-emerald-600" />}
                  {isCopied ? 'Copied WhatsApp Msg!' : 'Copy WhatsApp Breakdown'}
                </button>

                <button
                  onClick={() => handleOpenSplitModal(group)}
                  className="flex-1 px-3 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm transition-all"
                  title="Transfer and automatically split into individual student transactions"
                >
                  <Send className="w-3.5 h-3.5 text-teal-400" />
                  Transfer & Auto-Split
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Auto-Split Execution Modal */}
      {selectedGroupToSplit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Send className="w-5 h-5 text-teal-600" />
                Auto-Split Transfer: {selectedGroupToSplit.coordinatorName}
              </h3>
              <button onClick={() => setSelectedGroupToSplit(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-500 mb-4">
              Creates 1 batch transfer and {selectedGroupToSplit.subItems.length} linked child transactions in the unified ledger.
            </p>

            {splitSuccessMsg ? (
              <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-bold flex items-center gap-2">
                <Check className="w-5 h-5 text-emerald-600" />
                {splitSuccessMsg}
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Billing Month</label>
                    <input
                      type="month"
                      value={splitMonth}
                      onChange={e => setSplitMonth(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-800 font-bold"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Deduct from Account</label>
                    <select
                      value={splitAccountId}
                      onChange={e => setSplitAccountId(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-800"
                    >
                      {accounts.map(acc => (
                        <option key={acc.id} value={acc.id}>
                          {acc.name} ({acc.currency})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-2">Student Breakdown Amounts</label>
                  <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                    {selectedGroupToSplit.subItems.map(sub => (
                      <div key={sub.id} className="flex items-center justify-between gap-3 text-xs">
                        <span className="font-semibold text-slate-800 flex-1 truncate">{sub.studentName}</span>
                        <div className="flex items-center gap-1.5">
                          <span className="text-slate-400 font-bold">₨</span>
                          <input
                            type="number"
                            value={splitItemAmounts[sub.id] ?? sub.defaultAmount}
                            onChange={e =>
                              setSplitItemAmounts({
                                ...splitItemAmounts,
                                [sub.id]: Number(e.target.value)
                              })
                            }
                            className="w-24 px-2 py-1 border border-slate-300 rounded-md font-mono font-bold text-right text-slate-900"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Total Preview */}
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-600">Total Transfer Amount</span>
                  <span className="text-base font-black text-slate-900">
                    ₨{' '}
                    {Object.values(splitItemAmounts)
                      .reduce((sum, v) => sum + v, 0)
                      .toLocaleString()}
                  </span>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    onClick={() => setSelectedGroupToSplit(null)}
                    className="px-4 py-2 border border-slate-200 text-slate-600 text-xs font-semibold rounded-lg hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleExecuteAutoSplit}
                    disabled={isSplitting}
                    className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold rounded-lg shadow-sm flex items-center gap-1.5"
                  >
                    <Send className="w-4 h-4" />
                    Confirm & Split Transfer
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
