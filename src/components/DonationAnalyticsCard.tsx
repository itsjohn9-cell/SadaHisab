import React, { useState, useEffect } from 'react';
import { db } from '../db/db';
import { Transaction } from '../types';
import { Heart, Target, TrendingUp, Award, Info, Users, BookOpen, ShieldCheck } from 'lucide-react';

interface Props {
  startDate?: string;
  endDate?: string;
}

export const DonationAnalyticsCard: React.FC<Props> = ({ startDate, endDate }) => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [targetPercentage, setTargetPercentage] = useState<number>(() => {
    return Number(localStorage.getItem('sada_donation_target_pct') || 10);
  });

  useEffect(() => {
    const fetchTransactions = async () => {
      let txs = await db.transactions.toArray();
      if (startDate && endDate) {
        txs = txs.filter(t => t.date >= startDate && t.date <= endDate);
      }
      setTransactions(txs);
    };
    fetchTransactions();
  }, [startDate, endDate]);

  const handleTargetChange = (val: number) => {
    setTargetPercentage(val);
    localStorage.setItem('sada_donation_target_pct', String(val));
  };

  // Total Income in PKR
  const totalIncomePKR = transactions
    .filter(t => t.type === 'INCOME')
    .reduce((sum, t) => sum + (t.convertedAmountPKR || t.amount), 0);

  // Total Non-Khums Charitable Giving in PKR
  // Criteria: Category or subcategory is Donation, Sadaqah, Charity, School Fees, Student, Maulana, Welfare
  const charityKeywords = ['donation', 'sadaqah', 'charity', 'welfare', 'maulana', 'student', 'school fee', 'sponsorship'];
  
  const donationTxs = transactions.filter(t => {
    if (t.type !== 'EXPENSE') return false;
    const cat = (t.category || '').toLowerCase();
    const sub = (t.subCategory || '').toLowerCase();
    const desc = (t.description || '').toLowerCase();
    const merch = (t.merchantOrRecipient || '').toLowerCase();
    return charityKeywords.some(kw => cat.includes(kw) || sub.includes(kw) || desc.includes(kw) || merch.includes(kw));
  });

  const totalDonationsPKR = donationTxs.reduce((sum, t) => sum + (t.convertedAmountPKR || t.amount), 0);

  // Categorized breakdowns
  const studentEduDonations = donationTxs
    .filter(t => {
      const text = `${t.category} ${t.subCategory} ${t.merchantOrRecipient} ${t.description}`.toLowerCase();
      return text.includes('school') || text.includes('student') || text.includes('qalbe') || text.includes('fbis');
    })
    .reduce((sum, t) => sum + (t.convertedAmountPKR || t.amount), 0);

  const clergyDonations = donationTxs
    .filter(t => {
      const text = `${t.category} ${t.subCategory} ${t.merchantOrRecipient} ${t.description}`.toLowerCase();
      return text.includes('maulana') || text.includes('latif');
    })
    .reduce((sum, t) => sum + (t.convertedAmountPKR || t.amount), 0);

  const welfareDonations = donationTxs
    .filter(t => {
      const text = `${t.category} ${t.subCategory} ${t.merchantOrRecipient} ${t.description}`.toLowerCase();
      return text.includes('welfare') || text.includes('muhammadi') || text.includes('khatoon') || text.includes('zaibun');
    })
    .reduce((sum, t) => sum + (t.convertedAmountPKR || t.amount), 0);

  const otherCharity = Math.max(0, totalDonationsPKR - studentEduDonations - clergyDonations - welfareDonations);

  const actualPercentage = totalIncomePKR > 0 ? (totalDonationsPKR / totalIncomePKR) * 100 : 0;
  const targetMet = actualPercentage >= targetPercentage;

  return (
    <div className="bg-gradient-to-br from-white to-amber-50/40 rounded-2xl border border-amber-200/80 p-6 shadow-sm">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
        <div className="flex items-center gap-2.5">
          <div className="p-2.5 bg-amber-100 rounded-xl text-amber-700">
            <Heart className="w-5 h-5 fill-amber-500 text-amber-600" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              Yearly Sadaqah & Donation % Tracker
              <span className="text-[10px] bg-amber-100 text-amber-800 font-semibold px-2 py-0.5 rounded-full border border-amber-200">
                Non-Khums Giving
              </span>
            </h3>
            <p className="text-xs text-slate-500">
              Live percentage of gross income allocated to charitable causes & student sponsorships
            </p>
          </div>
        </div>

        {/* Target Slider */}
        <div className="flex items-center gap-3 bg-white px-3 py-1.5 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center gap-1.5 text-xs text-slate-600">
            <Target className="w-4 h-4 text-amber-600" />
            <span className="font-semibold">Goal:</span>
            <span className="font-black text-slate-900">{targetPercentage}%</span>
          </div>
          <input
            type="range"
            min="3"
            max="25"
            step="1"
            value={targetPercentage}
            onChange={e => handleTargetChange(Number(e.target.value))}
            className="w-24 accent-amber-600 cursor-pointer"
            title="Adjust your annual charity percentage target"
          />
        </div>
      </div>

      {/* Main Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1">
            Total Sadaqah / Giving
          </span>
          <div className="text-2xl font-black text-amber-600">
            ₨ {totalDonationsPKR.toLocaleString()}
          </div>
          <span className="text-xs text-slate-500 mt-1 block">
            Across {donationTxs.length} charitable contributions
          </span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1">
            Total Annual Inflow
          </span>
          <div className="text-2xl font-black text-slate-800">
            ₨ {totalIncomePKR.toLocaleString()}
          </div>
          <span className="text-xs text-slate-500 mt-1 block">
            Salaries, consulting & verified revenue
          </span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1">
            Current Giving Ratio
          </span>
          <div className="flex items-baseline gap-2">
            <span className={`text-2xl font-black ${targetMet ? 'text-emerald-600' : 'text-amber-600'}`}>
              {actualPercentage.toFixed(1)}%
            </span>
            <span className="text-xs text-slate-500 font-medium">of gross income</span>
          </div>
          <div className="flex items-center gap-1 text-[11px] font-semibold mt-1">
            {targetMet ? (
              <span className="text-emerald-700 flex items-center gap-1">
                <Award className="w-3.5 h-3.5 text-emerald-600" /> Goal achieved (+{(actualPercentage - targetPercentage).toFixed(1)}%)
              </span>
            ) : (
              <span className="text-amber-700">
                {(targetPercentage - actualPercentage).toFixed(1)}% remaining to reach {targetPercentage}%
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="space-y-1.5 mb-6">
        <div className="flex justify-between text-xs font-semibold text-slate-600">
          <span>Progress toward {targetPercentage}% Giving Target</span>
          <span>
            {Math.min((actualPercentage / targetPercentage) * 100, 100).toFixed(0)}% Completed
          </span>
        </div>
        <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden border border-slate-200 p-0.5">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              targetMet
                ? 'bg-gradient-to-r from-emerald-500 to-teal-500'
                : 'bg-gradient-to-r from-amber-400 to-amber-500'
            }`}
            style={{ width: `${Math.min((actualPercentage / targetPercentage) * 100, 100)}%` }}
          />
        </div>
      </div>

      {/* Category Breakdown Chips */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 border-t border-amber-200/50">
        <div className="bg-amber-50/60 p-3 rounded-xl border border-amber-200/60">
          <div className="flex items-center gap-1.5 text-xs text-amber-800 font-semibold mb-1">
            <BookOpen className="w-3.5 h-3.5 text-amber-600" />
            <span>Student Education</span>
          </div>
          <div className="text-sm font-bold text-slate-900">
            ₨ {studentEduDonations.toLocaleString()}
          </div>
          <span className="text-[10px] text-slate-500">
            {totalDonationsPKR > 0 ? ((studentEduDonations / totalDonationsPKR) * 100).toFixed(0) : 0}% of charity
          </span>
        </div>

        <div className="bg-amber-50/60 p-3 rounded-xl border border-amber-200/60">
          <div className="flex items-center gap-1.5 text-xs text-amber-800 font-semibold mb-1">
            <Users className="w-3.5 h-3.5 text-amber-600" />
            <span>Clergy Stipends</span>
          </div>
          <div className="text-sm font-bold text-slate-900">
            ₨ {clergyDonations.toLocaleString()}
          </div>
          <span className="text-[10px] text-slate-500">
            {totalDonationsPKR > 0 ? ((clergyDonations / totalDonationsPKR) * 100).toFixed(0) : 0}% of charity
          </span>
        </div>

        <div className="bg-amber-50/60 p-3 rounded-xl border border-amber-200/60">
          <div className="flex items-center gap-1.5 text-xs text-amber-800 font-semibold mb-1">
            <Heart className="w-3.5 h-3.5 text-amber-600" />
            <span>Welfare & Roster</span>
          </div>
          <div className="text-sm font-bold text-slate-900">
            ₨ {welfareDonations.toLocaleString()}
          </div>
          <span className="text-[10px] text-slate-500">
            {totalDonationsPKR > 0 ? ((welfareDonations / totalDonationsPKR) * 100).toFixed(0) : 0}% of charity
          </span>
        </div>

        <div className="bg-amber-50/60 p-3 rounded-xl border border-amber-200/60">
          <div className="flex items-center gap-1.5 text-xs text-amber-800 font-semibold mb-1">
            <ShieldCheck className="w-3.5 h-3.5 text-amber-600" />
            <span>Other Sadaqah</span>
          </div>
          <div className="text-sm font-bold text-slate-900">
            ₨ {otherCharity.toLocaleString()}
          </div>
          <span className="text-[10px] text-slate-500">
            {totalDonationsPKR > 0 ? ((otherCharity / totalDonationsPKR) * 100).toFixed(0) : 0}% of charity
          </span>
        </div>
      </div>
    </div>
  );
};
