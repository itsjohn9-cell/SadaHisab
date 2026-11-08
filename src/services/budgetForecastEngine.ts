/**
 * Sada Hisaab — Predictive Budget Variance & Burn Rate Forecasting Engine
 * 
 * Reusable architectural blueprint adapted from Tahaluf Enterprise Dashboard
 * (budgetReconciliation.mjs & metricIntegrity.mjs) for local-first personal/business finance.
 * 
 * Features:
 * - Mathematical zero-division safety and NaN immunity
 * - Daily burn rate tracking
 * - Month-end predictive expense forecasting
 * - Category-level overspend detection
 */

import { Transaction } from '../types';

export interface BudgetForecastSummary {
  monthName: string;
  daysElapsed: number;
  daysTotal: number;
  daysRemaining: number;
  totalSpentSoFar: number;
  dailyBurnRate: number;
  projectedMonthEndSpend: number;
  budgetTarget: number;
  projectedVariance: number; // positive = over budget, negative = under budget
  pacingPercent: number; // (spentSoFar / budgetTarget) * 100
  status: 'on-track' | 'near-budget' | 'over-budget' | 'unbudgeted';
  categoryPacing: {
    category: string;
    spent: number;
    dailyRate: number;
    projected: number;
  }[];
}

/**
 * Safely parse numeric amounts without throwing NaN or division-by-zero.
 */
export function safeNumeric(val: unknown): number {
  if (val === null || val === undefined || val === '') return 0;
  if (typeof val === 'number') return Number.isNaN(val) ? 0 : val;
  const cleaned = String(val).replace(/[^\d.-]/g, '').trim();
  const parsed = parseFloat(cleaned);
  return Number.isNaN(parsed) ? 0 : parsed;
}

/**
 * Calculates predictive budget forecast and pacing metrics.
 */
export function calculateBudgetForecast(
  transactions: Transaction[],
  budgetTarget: number = 0,
  targetCurrency: string = 'AED',
  referenceDate: Date = new Date()
): BudgetForecastSummary {
  const currentYear = referenceDate.getFullYear();
  const currentMonth = referenceDate.getMonth(); // 0-indexed
  const currentDate = referenceDate.getDate();

  // Days in month
  const daysTotal = new Date(currentYear, currentMonth + 1, 0).getDate();
  const daysElapsed = Math.max(1, Math.min(currentDate, daysTotal));
  const daysRemaining = Math.max(0, daysTotal - daysElapsed);

  // Month formatting
  const monthName = referenceDate.toLocaleString('default', { month: 'long', year: 'numeric' });

  // Filter transactions for current month & currency (or expenses)
  const categorySpendMap = new Map<string, number>();
  let totalSpentSoFar = 0;

  for (const tx of transactions) {
    if (tx.type !== 'EXPENSE') continue;
    if (tx.currency && tx.currency !== targetCurrency) continue;

    const txDate = new Date(tx.date);
    if (
      txDate.getFullYear() === currentYear &&
      txDate.getMonth() === currentMonth
    ) {
      const amount = safeNumeric(tx.amount);
      totalSpentSoFar += amount;

      const cat = tx.category || 'General';
      categorySpendMap.set(cat, (categorySpendMap.get(cat) || 0) + amount);
    }
  }

  // Daily burn rate & month-end projection
  const dailyBurnRate = Math.round((totalSpentSoFar / daysElapsed) * 100) / 100;
  const projectedMonthEndSpend = Math.round((dailyBurnRate * daysTotal) * 100) / 100;
  const validBudget = safeNumeric(budgetTarget);
  const projectedVariance = validBudget > 0 ? Math.round((projectedMonthEndSpend - validBudget) * 100) / 100 : 0;
  const pacingPercent = validBudget > 0 ? Math.round((totalSpentSoFar / validBudget) * 1000) / 10 : 0;

  let status: 'on-track' | 'near-budget' | 'over-budget' | 'unbudgeted' = 'unbudgeted';
  if (validBudget > 0) {
    if (projectedMonthEndSpend > validBudget * 1.02) {
      status = 'over-budget';
    } else if (projectedMonthEndSpend >= validBudget * 0.90) {
      status = 'near-budget';
    } else {
      status = 'on-track';
    }
  }

  // Category breakdowns
  const categoryPacing = Array.from(categorySpendMap.entries())
    .map(([category, spent]) => {
      const catRate = Math.round((spent / daysElapsed) * 100) / 100;
      return {
        category,
        spent: Math.round(spent * 100) / 100,
        dailyRate: catRate,
        projected: Math.round((catRate * daysTotal) * 100) / 100
      };
    })
    .sort((a, b) => b.spent - a.spent);

  return {
    monthName,
    daysElapsed,
    daysTotal,
    daysRemaining,
    totalSpentSoFar: Math.round(totalSpentSoFar * 100) / 100,
    dailyBurnRate,
    projectedMonthEndSpend,
    budgetTarget: validBudget,
    projectedVariance,
    pacingPercent,
    status,
    categoryPacing
  };
}
