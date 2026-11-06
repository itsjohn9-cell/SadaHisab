import React, { useState, useEffect, useMemo } from 'react';
import { db } from '../db/db';
import { Transaction, Account } from '../types';
import { DonationAnalyticsCard } from './DonationAnalyticsCard';
import * as XLSX from 'xlsx';
import {
  FileText,
  Download,
  Printer,
  Calendar,
  Filter,
  TrendingUp,
  TrendingDown,
  DollarSign,
  PieChart as PieChartIcon,
  BarChart3,
  Layers,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

export const AdvancedReportsView: React.FC = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [periodType, setPeriodType] = useState<'KHUMS_YEAR' | 'CALENDAR_YEAR' | 'CUSTOM'>('KHUMS_YEAR');
  const [baseCurrency, setBaseCurrency] = useState<'PKR' | 'AED'>('PKR');
  
  // Custom Date range state
  const currentYear = new Date().getFullYear();
  const [startDate, setStartDate] = useState<string>(`${currentYear - 1}-12-01`);
  const [endDate, setEndDate] = useState<string>(`${currentYear}-11-30`);

  const pkrToAedRate = 1 / 76.5; // conversion factor

  useEffect(() => {
    const load = async () => {
      const [txs, accs] = await Promise.all([
        db.transactions.toArray(),
        db.accounts.toArray(),
      ]);
      setTransactions(txs);
      setAccounts(accs);
    };
    load();
  }, []);

  // Update dates when period type changes
  const handlePeriodChange = (type: 'KHUMS_YEAR' | 'CALENDAR_YEAR' | 'CUSTOM') => {
    setPeriodType(type);
    const yr = new Date().getFullYear();
    if (type === 'KHUMS_YEAR') {
      setStartDate(`${yr - 1}-12-01`);
      setEndDate(`${yr}-11-30`);
    } else if (type === 'CALENDAR_YEAR') {
      setStartDate(`${yr}-01-01`);
      setEndDate(`${yr}-12-31`);
    }
  };

  // Filtered transactions for the selected range
  const periodTxs = useMemo(() => {
    return transactions.filter(t => {
      if (!t.date) return false;
      return t.date >= startDate && t.date <= endDate;
    });
  }, [transactions, startDate, endDate]);

  // Aggregate cash flow
  const {
    totalInflowPKR,
    totalOutflowPKR,
    netSavingsPKR,
    categoryTotals,
    monthlyBreakdown,
  } = useMemo(() => {
    let inflow = 0;
    let outflow = 0;
    const catMap: Record<string, number> = {};
    const monthMap: Record<string, { month: string; income: number; expense: number }> = {};

    for (const t of periodTxs) {
      const amountPKR = t.convertedAmountPKR || (t.currency === 'AED' ? t.amount * 76.5 : t.currency === 'USD' ? t.amount * 280 : t.amount);
      const mStr = t.date ? t.date.substring(0, 7) : 'Unknown';

      if (!monthMap[mStr]) {
        monthMap[mStr] = { month: mStr, income: 0, expense: 0 };
      }

      if (t.type === 'INCOME') {
        inflow += amountPKR;
        monthMap[mStr].income += amountPKR;
      } else if (t.type === 'EXPENSE' || t.type === 'CREDIT_CARD_SWIPE') {
        outflow += amountPKR;
        monthMap[mStr].expense += amountPKR;

        const cat = t.category || 'Other';
        catMap[cat] = (catMap[cat] || 0) + amountPKR;
      }
    }

    const sortedMonths = Object.values(monthMap).sort((a, b) => a.month.localeCompare(b.month));

    return {
      totalInflowPKR: inflow,
      totalOutflowPKR: outflow,
      netSavingsPKR: inflow - outflow,
      categoryTotals: catMap,
      monthlyBreakdown: sortedMonths,
    };
  }, [periodTxs]);

  // Convert values based on base currency
  const formatAmount = (pkrAmount: number) => {
    if (baseCurrency === 'AED') {
      return `AED ${(pkrAmount * pkrToAedRate).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
    }
    return `₨ ${pkrAmount.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
  };

  // Pie chart data
  const pieColors = ['#0d9488', '#0284c7', '#f59e0b', '#e11d48', '#8b5cf6', '#10b981', '#64748b', '#ec4899', '#6366f1'];
  const pieData = Object.entries(categoryTotals)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([name, value]) => ({
      name,
      value: baseCurrency === 'AED' ? Math.round(value * pkrToAedRate) : Math.round(value),
    }));

  const handlePrint = () => {
    window.print();
  };

  const handleExportExcel = () => {
    const wb = XLSX.utils.book_new();

    // Tab 1: Executive Summary
    const summaryData = [
      ['SADA HISAB - ADVANCED FINANCIAL REPORT'],
      ['Generated On', new Date().toLocaleString()],
      ['Report Period', `${startDate} to ${endDate}`],
      ['Period Mode', periodType],
      ['Base Currency', baseCurrency],
      [],
      ['METRIC', 'AMOUNT (PKR)', 'AMOUNT (AED)'],
      ['Total Gross Inflows', totalInflowPKR, totalInflowPKR * pkrToAedRate],
      ['Total Operational Outflows', totalOutflowPKR, totalOutflowPKR * pkrToAedRate],
      ['Net Surplus / Savings', netSavingsPKR, netSavingsPKR * pkrToAedRate],
      ['Savings Rate', totalInflowPKR > 0 ? `${((netSavingsPKR / totalInflowPKR) * 100).toFixed(1)}%` : '0%'],
    ];
    const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(wb, wsSummary, 'Executive Summary');

    // Tab 2: Categorized Spending
    const catData = [
      ['Category', 'Total Outflow (PKR)', 'Total Outflow (AED)', '% of Outflows'],
      ...Object.entries(categoryTotals)
        .sort((a, b) => b[1] - a[1])
        .map(([cat, val]) => [
          cat,
          val,
          val * pkrToAedRate,
          totalOutflowPKR > 0 ? `${((val / totalOutflowPKR) * 100).toFixed(1)}%` : '0%',
        ]),
    ];
    const wsCat = XLSX.utils.aoa_to_sheet(catData);
    XLSX.utils.book_append_sheet(wb, wsCat, 'Spending By Category');

    // Tab 3: Detailed Ledger Rows
    const txHeaders = ['Date', 'Type', 'Merchant / Recipient', 'Category', 'SubCategory', 'Original Amount', 'Currency', 'PKR Equivalent', 'Description'];
    const txRows = periodTxs.map(t => [
      t.date,
      t.type,
      t.merchantOrRecipient,
      t.category,
      t.subCategory || '',
      t.amount,
      t.currency,
      t.convertedAmountPKR || t.amount,
      t.description || '',
    ]);
    const wsTxs = XLSX.utils.aoa_to_sheet([txHeaders, ...txRows]);
    XLSX.utils.book_append_sheet(wb, wsTxs, 'Transactions Log');

    // Tab 4: Account Status
    const accHeaders = ['Account Name', 'Type', 'Currency', 'Current Balance', 'Custodial Funds'];
    const accRows = accounts.map(a => [
      a.name,
      a.type,
      a.currency,
      a.currentBalance || 0,
      a.isCustodial ? 'Yes' : 'No',
    ]);
    const wsAccs = XLSX.utils.aoa_to_sheet([accHeaders, ...accRows]);
    XLSX.utils.book_append_sheet(wb, wsAccs, 'Accounts Balance');

    XLSX.writeFile(wb, `Sada_Hisab_Report_${startDate}_to_${endDate}.xlsx`);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16 print:p-0 print:m-0">
      {/* Header & Controls */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4 print:hidden">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <FileText className="w-6 h-6 text-teal-700" />
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Advanced Financial Reports & Analytics
            </h1>
          </div>
          <p className="text-xs text-slate-500">
            Audit-grade cash flows, multi-period fiscal boundaries, charity ratio analysis, and printable statements.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Base Currency Toggle */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-semibold">
            <button
              onClick={() => setBaseCurrency('PKR')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                baseCurrency === 'PKR' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              PKR (₨)
            </button>
            <button
              onClick={() => setBaseCurrency('AED')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                baseCurrency === 'AED' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              AED (Dh)
            </button>
          </div>

          <button
            onClick={handlePrint}
            className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors"
          >
            <Printer className="w-4 h-4" />
            Print / PDF
          </button>

          <button
            onClick={handleExportExcel}
            className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm"
          >
            <Download className="w-4 h-4" />
            Export Multi-Tab Excel (.xlsx)
          </button>
        </div>
      </div>

      {/* Period Selection Bar */}
      <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/80 flex flex-col md:flex-row md:items-center justify-between gap-4 print:hidden">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-slate-500" />
          <span className="text-xs font-bold text-slate-700">Fiscal Period:</span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => handlePeriodChange('KHUMS_YEAR')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                periodType === 'KHUMS_YEAR'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
              }`}
            >
              Khums Year (Dec 1 – Nov 30)
            </button>
            <button
              onClick={() => handlePeriodChange('CALENDAR_YEAR')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                periodType === 'CALENDAR_YEAR'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
              }`}
            >
              Calendar Year (Jan 1 – Dec 31)
            </button>
            <button
              onClick={() => handlePeriodChange('CUSTOM')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                periodType === 'CUSTOM'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
              }`}
            >
              Custom Range
            </button>
          </div>
        </div>

        {/* Date Inputs */}
        <div className="flex items-center gap-2 text-xs">
          <input
            type="date"
            value={startDate}
            onChange={e => {
              setStartDate(e.target.value);
              setPeriodType('CUSTOM');
            }}
            className="px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-slate-700 font-medium"
          />
          <span className="text-slate-400 font-semibold">to</span>
          <input
            type="date"
            value={endDate}
            onChange={e => {
              setEndDate(e.target.value);
              setPeriodType('CUSTOM');
            }}
            className="px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-slate-700 font-medium"
          />
        </div>
      </div>

      {/* Printable Report Header (visible only on print) */}
      <div className="hidden print:block mb-6 border-b pb-4">
        <h1 className="text-2xl font-black text-slate-900">SADA HISAB — FINANCIAL AUDIT & CASH FLOW REPORT</h1>
        <p className="text-xs text-slate-500 mt-1">
          Period: {startDate} to {endDate} ({periodType}) | Base: {baseCurrency} | Generated: {new Date().toLocaleDateString()}
        </p>
      </div>

      {/* Top Embedded Sadaqah % Tracker */}
      <DonationAnalyticsCard startDate={startDate} endDate={endDate} />

      {/* Executive KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider">Gross Inflow</span>
            <div className="p-1.5 bg-emerald-50 rounded-lg text-emerald-600">
              <ArrowUpRight className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900">
            {formatAmount(totalInflowPKR)}
          </div>
          <span className="text-[11px] text-slate-400 mt-1 block">Income & collections</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider">Total Outflow</span>
            <div className="p-1.5 bg-rose-50 rounded-lg text-rose-600">
              <ArrowDownRight className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900">
            {formatAmount(totalOutflowPKR)}
          </div>
          <span className="text-[11px] text-slate-400 mt-1 block">Operational expenses & charity</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider">Net Cash Flow</span>
            <div className={`p-1.5 rounded-lg ${netSavingsPKR >= 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className={`text-2xl font-black ${netSavingsPKR >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
            {formatAmount(netSavingsPKR)}
          </div>
          <span className="text-[11px] text-slate-400 mt-1 block">Net surplus for Khums & assets</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider">Savings Rate</span>
            <div className="p-1.5 bg-teal-50 rounded-lg text-teal-600">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-teal-700">
            {totalInflowPKR > 0 ? `${((netSavingsPKR / totalInflowPKR) * 100).toFixed(1)}%` : '0%'}
          </div>
          <span className="text-[11px] text-slate-400 mt-1 block">Retained surplus ratio</span>
        </div>
      </div>

      {/* Visual Analytics Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 print:hidden">
        {/* Monthly Trend Chart */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <h3 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-teal-600" />
            Monthly Cash Inflow vs Outflow
          </h3>
          <div className="h-64 w-full">
            {monthlyBreakdown.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyBreakdown}>
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip
                    formatter={(val: number) =>
                      baseCurrency === 'AED'
                        ? `AED ${Math.round(val * pkrToAedRate).toLocaleString()}`
                        : `₨ ${Math.round(val).toLocaleString()}`
                    }
                  />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey="income" name="Inflow" fill="#0d9488" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="expense" name="Outflow" fill="#f43f5e" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-slate-400">
                No monthly transactions recorded in this period.
              </div>
            )}
          </div>
        </div>

        {/* Category Breakdown Pie Chart */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <h3 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
            <PieChartIcon className="w-4 h-4 text-teal-600" />
            Outflow Breakdown by Category
          </h3>
          <div className="h-64 w-full">
            {pieData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    labelLine={false}
                  >
                    {pieData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={pieColors[index % pieColors.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(val: number) =>
                      baseCurrency === 'AED' ? `AED ${val.toLocaleString()}` : `₨ ${val.toLocaleString()}`
                    }
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-slate-400">
                No expenses logged in this period.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Spending Breakdown Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Layers className="w-4 h-4 text-teal-600" />
            Spending Breakdown by Category
          </h3>
          <span className="text-xs text-slate-400 font-medium">
            {Object.keys(categoryTotals).length} categories active
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 uppercase font-semibold border-b border-slate-200">
              <tr>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3 text-right">PKR Equivalent</th>
                <th className="px-4 py-3 text-right">AED Equivalent</th>
                <th className="px-4 py-3 text-right">% of Total Spending</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {Object.entries(categoryTotals)
                .sort((a, b) => b[1] - a[1])
                .map(([category, amountPKR]) => {
                  const pct = totalOutflowPKR > 0 ? (amountPKR / totalOutflowPKR) * 100 : 0;
                  return (
                    <tr key={category} className="hover:bg-slate-50/70 transition-colors">
                      <td className="px-4 py-3 font-semibold text-slate-900">{category}</td>
                      <td className="px-4 py-3 text-right font-mono font-medium">
                        ₨ {amountPKR.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-slate-500">
                        AED {(amountPKR * pkrToAedRate).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <div className="w-16 bg-slate-100 rounded-full h-1.5 hidden sm:block">
                            <div className="bg-teal-600 h-1.5 rounded-full" style={{ width: `${pct}%` }} />
                          </div>
                          <span className="font-bold text-slate-800">{pct.toFixed(1)}%</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
