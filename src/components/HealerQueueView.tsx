import React, { useState } from 'react';
import { Transaction, Account } from '../types';
import { formatCurrency, formatDatePretty } from '../utils/formatters';
import { 
  ShieldCheck, 
  Check, 
  AlertTriangle, 
  Sparkles, 
  Phone, 
  Calendar, 
  Tag, 
  Building, 
  CheckCheck,
  Edit2,
  Trash2,
  HelpCircle
} from 'lucide-react';
import { db, recalculateAllAccountBalances } from '../db/db';

interface HealerQueueViewProps {
  transactions: Transaction[];
  accounts: Account[];
  onRefreshData: () => void;
}

export const HealerQueueView: React.FC<HealerQueueViewProps> = ({
  transactions,
  accounts,
  onRefreshData
}) => {
  const needsReviewList = transactions.filter(t => t.status === 'NEEDS_REVIEW');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editAmount, setEditAmount] = useState<number>(0);
  const [editDate, setEditDate] = useState<string>('');
  const [editCategory, setEditCategory] = useState<string>('');

  const handleStartEdit = (t: Transaction) => {
    setEditingId(t.id);
    setEditAmount(t.amount);
    setEditDate(t.date);
    setEditCategory(t.category);
  };

  const handleSaveEdit = async (t: Transaction) => {
    await db.transactions.update(t.id, {
      amount: editAmount,
      date: editDate,
      category: editCategory,
      status: 'CONFIRMED'
    });
    setEditingId(null);
    await recalculateAllAccountBalances();
    onRefreshData();
  };

  const handleApprove = async (id: string) => {
    await db.transactions.update(id, { status: 'CONFIRMED' });
    onRefreshData();
  };

  const handleApproveAll = async () => {
    for (const t of needsReviewList) {
      await db.transactions.update(t.id, { status: 'CONFIRMED' });
    }
    onRefreshData();
  };

  const handleDelete = async (id: string) => {
    if (confirm('Delete this transaction?')) {
      await db.transactions.delete(id);
      await recalculateAllAccountBalances();
      onRefreshData();
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-amber-950/40 via-slate-900 to-slate-900 border border-amber-900/50 rounded-2xl p-5 sm:p-6 shadow-xl">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center space-x-3.5">
            <div className="h-12 w-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-xl font-bold text-white tracking-tight">Data Healer Queue</h3>
                <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                  {needsReviewList.length} items to review
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Automated fixes applied from Excel migration: string amounts parsed, shifted columns aligned, missing dates inferred & phone numbers extracted.
              </p>
            </div>
          </div>

          {needsReviewList.length > 0 && (
            <button
              onClick={handleApproveAll}
              className="flex items-center space-x-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs sm:text-sm font-semibold shadow-lg shadow-emerald-950/40 transition"
            >
              <CheckCheck className="h-4 w-4" />
              <span>Approve All Healed ({needsReviewList.length})</span>
            </button>
          )}
        </div>
      </div>

      {/* Healer List or Empty State */}
      {needsReviewList.length === 0 ? (
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-12 text-center">
          <div className="h-16 w-16 mx-auto rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mb-4">
            <CheckCheck className="h-8 w-8" />
          </div>
          <h4 className="text-lg font-bold text-white">All Transactions Verified & Clean!</h4>
          <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
            There are no pending healed rows in the queue. When you import new Excel sheets or when an item has missing metadata, it will appear here for 1-click verification.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {needsReviewList.map(t => {
            const isEditing = editingId === t.id;

            return (
              <div 
                key={t.id}
                className="bg-slate-900/90 border border-amber-900/40 hover:border-amber-700/60 rounded-2xl p-5 shadow-lg space-y-3 transition group"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/20">
                      FLAGGED FOR VERIFICATION
                    </span>
                    <h4 className="text-base font-bold text-white mt-1">
                      {t.merchantOrRecipient || t.category}
                    </h4>
                  </div>
                  
                  <div className="text-right">
                    <div className="text-lg font-extrabold text-amber-300 font-mono">
                      {formatCurrency(t.amount, t.currency)}
                    </div>
                    {t.currency !== 'PKR' && (
                      <div className="text-[11px] text-slate-400 font-mono">
                        &asymp; {formatCurrency(t.convertedAmountPKR, 'PKR')}
                      </div>
                    )}
                  </div>
                </div>

                {/* Healing Notes / Explanations */}
                <div className="bg-slate-950/80 border border-slate-800/80 rounded-xl p-3 space-y-1.5">
                  <div className="text-[11px] font-semibold text-slate-300 flex items-center space-x-1">
                    <Sparkles className="h-3 w-3 text-amber-400" />
                    <span>Auto-Healed Adjustments:</span>
                  </div>
                  {t.healingNotes && t.healingNotes.length > 0 ? (
                    t.healingNotes.map((note, idx) => (
                      <div key={idx} className="text-xs text-slate-300 font-mono flex items-start space-x-1.5">
                        <span className="text-emerald-400 mt-0.5">&bull;</span>
                        <span>{note}</span>
                      </div>
                    ))
                  ) : (
                    <div className="text-xs text-slate-400 font-mono">
                      Inferred missing date or shifted columns.
                    </div>
                  )}

                  {t.lastMonthReferenceAmount && (
                    <div className="text-xs text-cyan-300 font-mono pt-1 border-t border-slate-800/60">
                      Preserved numeric reference: Rs {t.lastMonthReferenceAmount}
                    </div>
                  )}
                </div>

                {/* Metadata Row */}
                <div className="grid grid-cols-2 gap-2 text-xs text-slate-400 pt-1">
                  <div className="flex items-center space-x-1.5">
                    <Calendar className="h-3.5 w-3.5 text-slate-500" />
                    <span>Date: <span className="text-white font-mono">{formatDatePretty(t.date)}</span></span>
                  </div>
                  <div className="flex items-center space-x-1.5">
                    <Tag className="h-3.5 w-3.5 text-slate-500" />
                    <span>Cat: <span className="text-white">{t.category}</span></span>
                  </div>
                  {t.beneficiaryPhone && (
                    <div className="flex items-center space-x-1.5 col-span-2">
                      <Phone className="h-3.5 w-3.5 text-emerald-400" />
                      <span>Beneficiary: <span className="text-emerald-300 font-mono">{t.beneficiaryPhone}</span></span>
                      {t.paymentChannel && (
                        <span className="text-[10px] bg-slate-800 px-1.5 py-0.2 rounded text-slate-300">
                          {t.paymentChannel}
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Inline Editing Form */}
                {isEditing && (
                  <div className="pt-3 border-t border-slate-800 space-y-2">
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <label className="text-[10px] text-slate-400">Amount</label>
                        <input
                          type="number"
                          value={editAmount}
                          onChange={(e) => setEditAmount(parseFloat(e.target.value) || 0)}
                          className="w-full px-2 py-1 bg-slate-950 border border-slate-700 rounded text-xs text-white"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-slate-400">Date (YYYY-MM-DD)</label>
                        <input
                          type="date"
                          value={editDate}
                          onChange={(e) => setEditDate(e.target.value)}
                          className="w-full px-2 py-1 bg-slate-950 border border-slate-700 rounded text-xs text-white"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-slate-400">Category</label>
                        <input
                          type="text"
                          value={editCategory}
                          onChange={(e) => setEditCategory(e.target.value)}
                          className="w-full px-2 py-1 bg-slate-950 border border-slate-700 rounded text-xs text-white"
                        />
                      </div>
                    </div>
                    <div className="flex justify-end space-x-2 pt-1">
                      <button
                        onClick={() => setEditingId(null)}
                        className="px-2.5 py-1 text-xs text-slate-400 hover:text-white"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => handleSaveEdit(t)}
                        className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-xs font-semibold"
                      >
                        Save & Verify
                      </button>
                    </div>
                  </div>
                )}

                {/* Actions Footer */}
                {!isEditing && (
                  <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handleStartEdit(t)}
                        className="flex items-center space-x-1 text-xs text-slate-400 hover:text-slate-200"
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                        <span>Edit</span>
                      </button>
                      <button
                        onClick={() => handleDelete(t.id)}
                        className="flex items-center space-x-1 text-xs text-rose-400 hover:text-rose-300 ml-2"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        <span>Delete</span>
                      </button>
                    </div>

                    <button
                      onClick={() => handleApprove(t.id)}
                      className="flex items-center space-x-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold shadow-sm transition"
                    >
                      <Check className="h-3.5 w-3.5" />
                      <span>Confirm & Approve</span>
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

    </div>
  );
};

