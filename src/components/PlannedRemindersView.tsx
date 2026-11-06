import React, { useState, useEffect } from 'react';
import { db } from '../db/db';
import { RosterItem, Account, Transaction } from '../types';
import { generateRosterICS, downloadICS } from '../services/calendarExport';
import {
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  Plus,
  Download,
  Bell,
  BellRing,
  Filter,
  DollarSign,
  Heart,
  Home,
  GraduationCap,
  X,
} from 'lucide-react';

export const PlannedRemindersView: React.FC = () => {
  const [items, setItems] = useState<RosterItem[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [currentMonthTransactions, setCurrentMonthTransactions] = useState<Transaction[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [notificationPermission, setNotificationPermission] = useState<string>(
    typeof Notification !== 'undefined' ? Notification.permission : 'default'
  );
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [payingItem, setPayingItem] = useState<RosterItem | null>(null);
  const [payAccountId, setPayAccountId] = useState<string>('');
  const [payDate, setPayDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [payAmount, setPayAmount] = useState<number>(0);

  // New item form state
  const [newItem, setNewItem] = useState<Partial<RosterItem>>({
    name: '',
    category: 'Fixed Bills',
    subCategory: '',
    defaultAmount: 1000,
    currency: 'PKR',
    reminderType: 'FIXED_BILL',
    defaultDay: 1,
    isActive: true,
    notes: '',
  });

  const today = new Date();
  const currentDay = today.getDate();
  const currentMonthStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;

  const loadData = async () => {
    const [allRoster, allAccounts, allTxs] = await Promise.all([
      db.roster_items.toArray(),
      db.accounts.toArray(),
      db.transactions.toArray(),
    ]);

    // Transactions in the current calendar month
    const thisMonthTxs = allTxs.filter(t => t.date && t.date.startsWith(currentMonthStr));

    setItems(allRoster.sort((a, b) => a.defaultDay - b.defaultDay));
    setAccounts(allAccounts);
    setCurrentMonthTransactions(thisMonthTxs);

    if (allAccounts.length > 0 && !payAccountId) {
      setPayAccountId(allAccounts[0].id);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const requestNotificationPermission = async () => {
    if (typeof Notification === 'undefined') {
      alert('Browser notifications are not supported in this environment.');
      return;
    }
    const perm = await Notification.requestPermission();
    setNotificationPermission(perm);
    if (perm === 'granted') {
      new Notification('Sada Hisab Reminder System Active', {
        body: 'You will receive on-device bill & donation due date reminders.',
        icon: '/icon.svg',
      });
    }
  };

  const handleExportCalendar = () => {
    const icsContent = generateRosterICS(items, { calendarName: 'Sada Hisab Monthly Roster' });
    downloadICS(icsContent, `sada_hisab_roster_${currentMonthStr}.ics`);
  };

  const isItemPaidThisMonth = (item: RosterItem): boolean => {
    const itemName = (item.name || '').toLowerCase();
    return currentMonthTransactions.some(t => {
      const merchant = (t.merchantOrRecipient || '').toLowerCase();
      const matchName = merchant.includes(itemName) || itemName.includes(merchant);
      const matchAmt = Math.abs(t.amount - item.defaultAmount) / (item.defaultAmount || 1) < 0.15; // within 15% tolerance
      return matchName && matchAmt;
    });
  };

  const getItemStatus = (item: RosterItem) => {
    const paid = isItemPaidThisMonth(item);
    if (paid) return { label: 'Paid this month', color: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: CheckCircle2, type: 'PAID' };

    const dueDay = item.defaultDay;
    if (dueDay === currentDay) {
      return { label: 'Due Today', color: 'bg-amber-50 text-amber-700 border-amber-300 animate-pulse', icon: AlertCircle, type: 'DUE_TODAY' };
    }
    if (dueDay < currentDay) {
      const daysOverdue = currentDay - dueDay;
      return { label: `${daysOverdue}d Overdue`, color: 'bg-rose-50 text-rose-700 border-rose-300', icon: AlertCircle, type: 'OVERDUE' };
    }
    const daysLeft = dueDay - currentDay;
    return { label: `Due in ${daysLeft} days (Day ${dueDay})`, color: 'bg-blue-50 text-blue-700 border-blue-200', icon: Clock, type: 'UPCOMING' };
  };

  const handleQuickPay = (item: RosterItem) => {
    setPayingItem(item);
    setPayAmount(item.defaultAmount);
    setPayAccountId(item.sourceAccountId || (accounts[0] ? accounts[0].id : ''));
    setPayDate(new Date().toISOString().split('T')[0]);
  };

  const confirmPayment = async () => {
    if (!payingItem || !payAccountId) return;
    const account = accounts.find(a => a.id === payAccountId);

    const newTx: Transaction = {
      id: crypto.randomUUID(),
      date: payDate,
      type: 'EXPENSE',
      amount: payAmount,
      currency: payingItem.currency,
      convertedAmountPKR: payingItem.currency === 'PKR' ? payAmount : payAmount * 76.5,
      fxRateUsed: payingItem.currency === 'PKR' ? 1 : 76.5,
      category: payingItem.category,
      subCategory: payingItem.subCategory,
      merchantOrRecipient: payingItem.name,
      sourceAccountId: payAccountId,
      description: `Roster auto-log: ${payingItem.notes || payingItem.name}`,
      status: 'CONFIRMED',
      isSampleData: false,
    };

    await db.transactions.add(newTx);

    // Update account balance
    if (account) {
      const newBal = (account.currentBalance || 0) - payAmount;
      await db.accounts.update(payAccountId, { currentBalance: newBal });
    }

    setPayingItem(null);
    await loadData();
  };

  const handleSaveNewItem = async () => {
    if (!newItem.name || !newItem.defaultAmount) {
      alert('Please fill recipient name and amount.');
      return;
    }

    const item: RosterItem = {
      id: crypto.randomUUID(),
      name: newItem.name,
      category: newItem.category || 'Fixed Bills',
      subCategory: newItem.subCategory || '',
      defaultAmount: Number(newItem.defaultAmount),
      currency: newItem.currency || 'PKR',
      reminderType: newItem.reminderType || 'FIXED_BILL',
      defaultDay: Number(newItem.defaultDay) || 1,
      sourceAccountId: newItem.sourceAccountId || (accounts[0] ? accounts[0].id : ''),
      beneficiaryPhone: newItem.beneficiaryPhone || '',
      notes: newItem.notes || '',
      isActive: true,
      isBillReminder: true,
    };

    await db.roster_items.add(item);
    setIsNewModalOpen(false);
    setNewItem({
      name: '',
      category: 'Fixed Bills',
      subCategory: '',
      defaultAmount: 1000,
      currency: 'PKR',
      reminderType: 'FIXED_BILL',
      defaultDay: 1,
      isActive: true,
      notes: '',
    });
    await loadData();
  };

  const toggleItemActive = async (id: string, current: boolean) => {
    await db.roster_items.update(id, { isActive: !current });
    await loadData();
  };

  // Filter items
  const filteredItems = items.filter(item => {
    if (selectedCategory === 'ALL') return true;
    if (selectedCategory === 'FAMILY') return item.reminderType === 'FAMILY_ALLOWANCE';
    if (selectedCategory === 'BILL') return item.reminderType === 'FIXED_BILL';
    if (selectedCategory === 'EDUCATION') return item.reminderType === 'EDUCATION';
    if (selectedCategory === 'SADAQAH') return item.reminderType === 'SADAQAH_ROSTER';
    return true;
  });

  // Calculate totals
  const totalMonthlyCommitmentPKR = items
    .filter(i => i.isActive)
    .reduce((acc, curr) => {
      const multiplier = curr.currency === 'AED' ? 76.5 : curr.currency === 'USD' ? 280 : 1;
      return acc + curr.defaultAmount * multiplier;
    }, 0);

  const totalPaidThisMonthPKR = items
    .filter(i => i.isActive && isItemPaidThisMonth(i))
    .reduce((acc, curr) => {
      const multiplier = curr.currency === 'AED' ? 76.5 : curr.currency === 'USD' ? 280 : 1;
      return acc + curr.defaultAmount * multiplier;
    }, 0);

  const overdueCount = items.filter(i => i.isActive && getItemStatus(i).type === 'OVERDUE').length;
  const dueTodayCount = items.filter(i => i.isActive && getItemStatus(i).type === 'DUE_TODAY').length;

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-emerald-800 to-teal-900 text-white rounded-2xl p-6 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Calendar className="w-6 h-6 text-emerald-300" />
            <h1 className="text-2xl font-bold tracking-tight">Planned Schedules & Monthly Reminders</h1>
          </div>
          <p className="text-emerald-100 text-xs max-w-2xl">
            Track day-of-month commitments (1st–31st): Family allowances, utilities, education, and recurring Sadaqah.
            Never miss a payment with on-device notifications & 1-click Google Calendar sync.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {notificationPermission !== 'granted' ? (
            <button
              onClick={requestNotificationPermission}
              className="px-3.5 py-2 bg-emerald-700/80 hover:bg-emerald-600 rounded-xl text-xs font-medium flex items-center gap-1.5 border border-emerald-500/30 transition-all shadow-sm"
              title="Enable browser notifications for due bills"
            >
              <Bell className="w-4 h-4 text-emerald-200" />
              Enable Alerts
            </button>
          ) : (
            <span className="px-3 py-1.5 bg-emerald-950/60 rounded-xl text-xs font-medium text-emerald-300 border border-emerald-500/20 flex items-center gap-1.5">
              <BellRing className="w-3.5 h-3.5 text-emerald-400" />
              Alerts Active
            </span>
          )}

          <button
            onClick={handleExportCalendar}
            className="px-3.5 py-2 bg-white/10 hover:bg-white/20 rounded-xl text-xs font-semibold flex items-center gap-1.5 border border-white/20 transition-all backdrop-blur-sm"
            title="Export .ics file for Google / Apple Calendar"
          >
            <Download className="w-4 h-4 text-white" />
            Export Calendar (.ics)
          </button>

          <button
            onClick={() => setIsNewModalOpen(true)}
            className="px-4 py-2 bg-amber-400 hover:bg-amber-300 text-slate-900 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md transition-all"
          >
            <Plus className="w-4 h-4" />
            Add Reminder
          </button>
        </div>
      </div>

      {/* KPI Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Monthly Commitment</span>
            <DollarSign className="w-4 h-4 text-teal-600" />
          </div>
          <div className="text-2xl font-black text-slate-800">
            ₨ {totalMonthlyCommitmentPKR.toLocaleString()}
          </div>
          <p className="text-xs text-slate-400 mt-1">{items.filter(i => i.isActive).length} active scheduled items</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-semibold uppercase tracking-wider">Paid This Month</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-black text-emerald-600">
            ₨ {totalPaidThisMonthPKR.toLocaleString()}
          </div>
          <div className="w-full bg-slate-100 rounded-full h-1.5 mt-2">
            <div
              className="bg-emerald-500 h-1.5 rounded-full"
              style={{
                width: `${Math.min(
                  totalMonthlyCommitmentPKR > 0
                    ? (totalPaidThisMonthPKR / totalMonthlyCommitmentPKR) * 100
                    : 0,
                  100
                )}%`,
              }}
            />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-semibold uppercase tracking-wider">Due Today</span>
            <AlertCircle className="w-4 h-4 text-amber-500" />
          </div>
          <div className={`text-2xl font-black ${dueTodayCount > 0 ? 'text-amber-600' : 'text-slate-800'}`}>
            {dueTodayCount}
          </div>
          <p className="text-xs text-slate-400 mt-1">Day {currentDay} of current month</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-semibold uppercase tracking-wider">Overdue Alerts</span>
            <AlertCircle className="w-4 h-4 text-rose-500" />
          </div>
          <div className={`text-2xl font-black ${overdueCount > 0 ? 'text-rose-600' : 'text-slate-800'}`}>
            {overdueCount}
          </div>
          <p className="text-xs text-slate-400 mt-1">Requires immediate attention</p>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-2">
        <div className="flex items-center gap-1 overflow-x-auto">
          {[
            { id: 'ALL', label: 'All Scheduled', icon: Calendar },
            { id: 'FAMILY', label: 'Family Allowances', icon: Heart },
            { id: 'BILL', label: 'Utilities & Bills', icon: Home },
            { id: 'EDUCATION', label: 'Education & Van', icon: GraduationCap },
            { id: 'SADAQAH', label: 'Sadaqah & Welfare', icon: Heart },
          ].map(tab => {
            const Icon = tab.icon;
            const active = selectedCategory === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setSelectedCategory(tab.id)}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
                  active
                    ? 'bg-slate-900 text-white shadow-sm'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {tab.label}
              </button>
            );
          })}
        </div>
        <span className="text-xs text-slate-400 font-medium hidden sm:inline">
          Showing {filteredItems.length} items
        </span>
      </div>

      {/* Roster Calendar List */}
      <div className="space-y-3">
        {filteredItems.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-2xl border border-slate-200">
            <Calendar className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="text-sm font-semibold text-slate-700">No scheduled reminders in this category</h3>
            <p className="text-xs text-slate-400 mt-1">Add your recurring bills, family allowances, or Sadaqah roster.</p>
          </div>
        ) : (
          filteredItems.map(item => {
            const status = getItemStatus(item);
            const StatusIcon = status.icon;
            const isPaid = status.type === 'PAID';

            return (
              <div
                key={item.id}
                className={`bg-white rounded-xl border transition-all p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                  status.type === 'OVERDUE'
                    ? 'border-rose-300 bg-rose-50/20 shadow-sm'
                    : status.type === 'DUE_TODAY'
                    ? 'border-amber-300 bg-amber-50/20 shadow-sm'
                    : 'border-slate-200 hover:border-slate-300'
                } ${!item.isActive ? 'opacity-60 bg-slate-50' : ''}`}
              >
                {/* Left: Due Date Badge & Info */}
                <div className="flex items-start gap-3.5">
                  <div className="flex flex-col items-center justify-center w-12 h-12 rounded-xl bg-slate-100 border border-slate-200 flex-shrink-0 text-slate-800">
                    <span className="text-[10px] font-bold text-slate-400 uppercase leading-none">Day</span>
                    <span className="text-lg font-black leading-none mt-0.5">{item.defaultDay}</span>
                  </div>

                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="font-bold text-slate-900 text-sm">{item.name}</h4>
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border flex items-center gap-1 ${status.color}`}>
                        <StatusIcon className="w-3 h-3" />
                        {status.label}
                      </span>
                      {!item.isActive && (
                        <span className="text-[10px] bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded">
                          Paused
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 text-xs text-slate-500 mt-1 flex-wrap">
                      <span className="font-medium text-slate-700">{item.category}</span>
                      {item.subCategory && <span>• {item.subCategory}</span>}
                      {item.beneficiaryPhone && (
                        <span className="text-slate-400 font-mono">({item.beneficiaryPhone})</span>
                      )}
                      {item.notes && <span className="text-slate-400 italic">“{item.notes}”</span>}
                    </div>
                  </div>
                </div>

                {/* Right: Amount & Actions */}
                <div className="flex items-center justify-between md:justify-end gap-3 flex-shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-slate-100">
                  <div className="text-left md:text-right">
                    <div className="text-base font-extrabold text-slate-900">
                      {item.defaultAmount.toLocaleString()} {item.currency}
                    </div>
                    {item.sourceAccountId && (
                      <span className="text-[11px] text-slate-400">
                        via {accounts.find(a => a.id === item.sourceAccountId)?.name || 'Default Account'}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {isPaid ? (
                      <span className="px-3 py-1.5 bg-emerald-100 text-emerald-800 text-xs font-semibold rounded-lg flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Logged
                      </span>
                    ) : (
                      <button
                        onClick={() => handleQuickPay(item)}
                        disabled={!item.isActive}
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center gap-1 transition-all shadow-sm"
                        title="Quick Log this scheduled payment as confirmed"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Log Paid
                      </button>
                    )}

                    <button
                      onClick={() => toggleItemActive(item.id, item.isActive)}
                      className="px-2 py-1.5 text-xs text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
                      title={item.isActive ? 'Pause reminder' : 'Resume reminder'}
                    >
                      {item.isActive ? 'Pause' : 'Resume'}
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Quick Pay Modal */}
      {payingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                Confirm Payment Log
              </h3>
              <button
                onClick={() => setPayingItem(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-500 mb-4">
              Logging payment for <strong className="text-slate-800">{payingItem.name}</strong> into your ledger.
            </p>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Amount</label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={payAmount}
                    onChange={e => setPayAmount(Number(e.target.value))}
                    className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-sm font-bold text-slate-900"
                  />
                  <span className="font-bold text-sm text-slate-600">{payingItem.currency}</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Payment Date</label>
                <input
                  type="date"
                  value={payDate}
                  onChange={e => setPayDate(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-800"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Deduct from Account</label>
                <select
                  value={payAccountId}
                  onChange={e => setPayAccountId(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-800"
                >
                  {accounts.map(acc => (
                    <option key={acc.id} value={acc.id}>
                      {acc.name} ({acc.currency}) - Bal: {acc.currentBalance?.toLocaleString()}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="mt-6 flex items-center justify-end gap-2">
              <button
                onClick={() => setPayingItem(null)}
                className="px-4 py-2 border border-slate-200 text-slate-600 text-xs font-semibold rounded-lg hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={confirmPayment}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-sm"
              >
                Confirm & Deduct
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add New Reminder Modal */}
      {isNewModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Plus className="w-5 h-5 text-teal-600" />
                Add New Planned Reminder
              </h3>
              <button
                onClick={() => setIsNewModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Recipient or Merchant Name *
                </label>
                <input
                  type="text"
                  placeholder="e.g. StromFiber, Green Island School, Rohia Allowance"
                  value={newItem.name || ''}
                  onChange={e => setNewItem({ ...newItem, name: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-800"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Amount *</label>
                  <input
                    type="number"
                    value={newItem.defaultAmount || ''}
                    onChange={e => setNewItem({ ...newItem, defaultAmount: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Currency</label>
                  <select
                    value={newItem.currency || 'PKR'}
                    onChange={e => setNewItem({ ...newItem, currency: e.target.value as any })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-800"
                  >
                    <option value="PKR">PKR (₨)</option>
                    <option value="AED">AED (Dh)</option>
                    <option value="USD">USD ($)</option>
                    <option value="GBP">GBP (£)</option>
                    <option value="SAR">SAR (﷼)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Day of Month (1st–31st)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="31"
                    value={newItem.defaultDay || 1}
                    onChange={e => setNewItem({ ...newItem, defaultDay: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-800"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Item Type</label>
                  <select
                    value={newItem.reminderType || 'FIXED_BILL'}
                    onChange={e => setNewItem({ ...newItem, reminderType: e.target.value as any })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-800"
                  >
                    <option value="FIXED_BILL">Fixed Bill / Utility</option>
                    <option value="FAMILY_ALLOWANCE">Family Allowance (Wife/Children)</option>
                    <option value="EDUCATION">Education / School / Van</option>
                    <option value="SADAQAH_ROSTER">Sadaqah / Student Roster</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Category</label>
                <input
                  type="text"
                  placeholder="e.g. Utility, School, Donation, Allowance"
                  value={newItem.category || ''}
                  onChange={e => setNewItem({ ...newItem, category: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-800"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Default Account</label>
                <select
                  value={newItem.sourceAccountId || (accounts[0] ? accounts[0].id : '')}
                  onChange={e => setNewItem({ ...newItem, sourceAccountId: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-800"
                >
                  {accounts.map(acc => (
                    <option key={acc.id} value={acc.id}>
                      {acc.name} ({acc.currency})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Notes</label>
                <input
                  type="text"
                  placeholder="e.g. Due before 5th to avoid late fee"
                  value={newItem.notes || ''}
                  onChange={e => setNewItem({ ...newItem, notes: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-800"
                />
              </div>
            </div>

            <div className="mt-6 flex items-center justify-end gap-2">
              <button
                onClick={() => setIsNewModalOpen(false)}
                className="px-4 py-2 border border-slate-200 text-slate-600 text-xs font-semibold rounded-lg hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveNewItem}
                className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold rounded-lg shadow-sm"
              >
                Save Schedule
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
