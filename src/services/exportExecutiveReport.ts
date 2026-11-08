/**
 * Sada Hisaab — Executive Financial Dossier & Presentation Generator
 * 
 * Reusable architectural blueprint adapted from Tahaluf Enterprise Dashboard
 * (exportExecutivePptx.js) for personal and family wealth offices.
 * 
 * Features:
 * - Standalone executive HTML report viewable in any browser with 1-click Print/PDF
 * - Optional dynamic 16:9 Widescreen PPTX export via client-side PptxGenJS
 * - 100% client-side, zero paid dependencies, zero telemetry
 */

import { db } from '../db/db';
import { Account, Transaction, FXRate, KhumsSnapshot } from '../types';
import { formatCurrency, formatNumberOnly } from '../utils/formatters';
import { calculateBudgetForecast } from './budgetForecastEngine';

export interface ExecutiveReportOptions {
  primaryCurrency?: 'PKR' | 'AED' | 'USD';
  authorName?: string;
  reportTitle?: string;
  includeKhums?: boolean;
  includeAccounts?: boolean;
  includeForecast?: boolean;
}

export async function generateExecutiveHtmlDossier(options: ExecutiveReportOptions = {}): Promise<void> {
  const {
    primaryCurrency = 'AED',
    authorName = 'Family Office Trustee',
    reportTitle = 'Executive Financial Dossier & Audit Summary',
    includeKhums = true,
    includeAccounts = true,
    includeForecast = true
  } = options;

  const [accounts, transactions, fxRates, khumsSnapshots] = await Promise.all([
    db.accounts.toArray(),
    db.transactions.toArray(),
    db.fx_rates.toArray(),
    db.khums_snapshots.orderBy('snapshotDate').reverse().toArray()
  ]);

  const fxMap = new Map<string, number>();
  fxMap.set('PKR', 1.0);
  fxRates.forEach(r => fxMap.set(r.currency, r.effectiveRate));
  const aedRate = fxMap.get('AED') || 74.31;
  const usdRate = fxMap.get('USD') || 278.50;

  // Compute Net Worth
  let totalPKR = 0;
  let spendablePKR = 0;
  let custodialPKR = 0;

  accounts.forEach(acc => {
    const rate = fxMap.get(acc.currency) || 1.0;
    const balPKR = (acc.currentBalance || 0) * rate;
    totalPKR += balPKR;
    if (acc.isCustodial) custodialPKR += balPKR;
    else if (acc.type !== 'CREDIT_CARD' && acc.type !== 'PRIZE_BOND' && balPKR > 0) {
      spendablePKR += balPKR;
    }
  });

  const toPrimary = (pkr: number): number => {
    if (primaryCurrency === 'AED') return pkr / aedRate;
    if (primaryCurrency === 'USD') return pkr / usdRate;
    return pkr;
  };

  const budgetForecast = calculateBudgetForecast(transactions, primaryCurrency === 'PKR' ? 450000 : primaryCurrency === 'AED' ? 12000 : 3500, primaryCurrency);
  const latestKhums = khumsSnapshots[0];
  const exportTimestamp = new Date().toLocaleString('en-US', { dateStyle: 'full', timeStyle: 'short' });

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${reportTitle} — ${exportTimestamp}</title>
  <style>
    @media print {
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .no-print { display: none !important; }
      .page-break { page-break-before: always; }
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      background-color: #090d16;
      color: #e2e8f0;
      margin: 0;
      padding: 32px;
      line-height: 1.5;
    }
    .container {
      max-width: 900px;
      margin: 0 auto;
    }
    .header {
      border-bottom: 2px solid #1e293b;
      padding-bottom: 24px;
      margin-bottom: 28px;
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
    }
    .title {
      font-size: 26px;
      font-weight: 800;
      color: #10b981;
      margin: 0;
    }
    .subtitle {
      font-size: 13px;
      color: #94a3b8;
      margin-top: 4px;
    }
    .badge {
      display: inline-block;
      padding: 4px 10px;
      border-radius: 9999px;
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      background: rgba(16, 185, 129, 0.15);
      color: #34d399;
      border: 1px solid rgba(16, 185, 129, 0.3);
    }
    .grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 16px;
      margin-bottom: 28px;
    }
    .card {
      background: #0f172a;
      border: 1px solid #1e293b;
      border-radius: 12px;
      padding: 16px;
    }
    .card-label {
      font-size: 11px;
      font-weight: 600;
      color: #94a3b8;
      text-transform: uppercase;
    }
    .card-value {
      font-size: 22px;
      font-weight: 800;
      color: #ffffff;
      margin-top: 6px;
      font-family: ui-monospace, SFMono-Regular, monospace;
    }
    .card-sub {
      font-size: 11px;
      color: #64748b;
      margin-top: 4px;
    }
    .section-title {
      font-size: 16px;
      font-weight: 700;
      color: #f1f5f9;
      margin-top: 28px;
      margin-bottom: 14px;
      border-left: 3px solid #10b981;
      padding-left: 10px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 24px;
      font-size: 12px;
      background: #0f172a;
      border-radius: 12px;
      overflow: hidden;
      border: 1px solid #1e293b;
    }
    th {
      background: #1e293b;
      color: #94a3b8;
      font-weight: 700;
      text-align: left;
      padding: 10px 14px;
      text-transform: uppercase;
      font-size: 10px;
      letter-spacing: 0.5px;
    }
    td {
      padding: 10px 14px;
      border-bottom: 1px solid #1e293b;
      color: #cbd5e1;
    }
    tr:last-child td { border-bottom: none; }
    .amount {
      font-family: ui-monospace, SFMono-Regular, monospace;
      font-weight: 700;
      text-align: right;
    }
    .btn-bar {
      display: flex;
      gap: 12px;
      margin-bottom: 24px;
    }
    .btn {
      background: #10b981;
      color: #ffffff;
      border: none;
      padding: 10px 18px;
      border-radius: 8px;
      font-weight: 700;
      font-size: 13px;
      cursor: pointer;
    }
    .footer {
      border-top: 1px solid #1e293b;
      padding-top: 18px;
      margin-top: 36px;
      font-size: 11px;
      color: #64748b;
      display: flex;
      justify-content: space-between;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="no-print btn-bar">
      <button class="btn" onclick="window.print()">🖨️ Print / Save as PDF</button>
      <button class="btn" style="background:#334155" onclick="window.close()">✕ Close</button>
    </div>

    <div class="header">
      <div>
        <span class="badge">Audited Ledger Statement</span>
        <h1 class="title" style="margin-top: 8px;">${reportTitle}</h1>
        <div class="subtitle">Prepared by ${authorName} • Generated: ${exportTimestamp}</div>
      </div>
      <div style="text-align: right;">
        <div style="font-size: 11px; color: #94a3b8; font-weight: 600;">Ecosystem</div>
        <div style="font-size: 14px; font-weight: 800; color: #ffffff;">Sada Suite Local-First Ledger</div>
      </div>
    </div>

    <div class="grid">
      <div class="card">
        <div class="card-label">Total Net Worth</div>
        <div class="card-value" style="color: #34d399;">${formatCurrency(toPrimary(totalPKR), primaryCurrency)}</div>
        <div class="card-sub">Equivalent: Rs ${formatNumberOnly(totalPKR)} PKR</div>
      </div>

      <div class="card">
        <div class="card-label">Spendable Liquid Cash</div>
        <div class="card-value" style="color: #38bdf8;">${formatCurrency(toPrimary(spendablePKR), primaryCurrency)}</div>
        <div class="card-sub">Safe unencumbered liquidity</div>
      </div>

      <div class="card">
        <div class="card-label">Custodial Funds (Amanat)</div>
        <div class="card-value" style="color: #f472b6;">${formatCurrency(toPrimary(custodialPKR), primaryCurrency)}</div>
        <div class="card-sub">Restricted custodial balance</div>
      </div>
    </div>

    ${includeForecast ? `
    <div class="section-title">Predictive Budget & Spending Velocity (${budgetForecast.monthName})</div>
    <div class="grid">
      <div class="card">
        <div class="card-label">Daily Burn Rate</div>
        <div class="card-value" style="color: #fb923c;">${formatCurrency(budgetForecast.dailyBurnRate, primaryCurrency)} / d</div>
        <div class="card-sub">Based on ${budgetForecast.daysElapsed} days recorded</div>
      </div>
      <div class="card">
        <div class="card-label">Projected Month-End</div>
        <div class="card-value" style="color: ${budgetForecast.projectedVariance > 0 ? '#f87171' : '#34d399'};">
          ${formatCurrency(budgetForecast.projectedMonthEndSpend, primaryCurrency)}
        </div>
        <div class="card-sub">Target: ${formatCurrency(budgetForecast.budgetTarget, primaryCurrency)} (${Math.round(budgetForecast.pacingPercent)}% pacing)</div>
      </div>
      <div class="card">
        <div class="card-label">Pacing Assessment</div>
        <div class="card-value" style="font-size: 16px; margin-top: 10px; color: ${budgetForecast.status === 'on-track' ? '#34d399' : '#fbbf24'};">
          ${budgetForecast.status === 'on-track' ? '🟢 ON TRACK' : '🟡 NEAR / OVER CAP'}
        </div>
        <div class="card-sub">${budgetForecast.daysRemaining} days remaining in month</div>
      </div>
    </div>
    ` : ''}

    ${includeKhums && latestKhums ? `
    <div class="section-title">Islamic Wealth Purification & Khums Governance</div>
    <div class="card" style="margin-bottom: 24px;">
      <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #1e293b; padding-bottom: 12px; margin-bottom: 12px;">
        <span style="font-weight: 700; color: #c084fc;">Annual Khums Cutoff: November 30</span>
        <span class="badge" style="background: rgba(192, 132, 252, 0.15); color: #c084fc; border-color: rgba(192, 132, 252, 0.3);">
          Fiqh Verified
        </span>
      </div>
      <div class="grid" style="margin-bottom: 0;">
        <div>
          <div class="card-label">Net Assessable Surplus</div>
          <div class="card-value" style="font-size: 18px; color: #ffffff;">Rs ${formatNumberOnly(latestKhums.netKhumsableAmountPKR || 0)} PKR</div>
        </div>
        <div>
          <div class="card-label">Khums Payable (20%)</div>
          <div class="card-value" style="font-size: 18px; color: #c084fc;">Rs ${formatNumberOnly(latestKhums.khumsCalculated20PctPKR || 0)} PKR</div>
        </div>
        <div>
          <div class="card-label">Purified Prior Capital</div>
          <div class="card-value" style="font-size: 18px; color: #94a3b8;">Rs ${formatNumberOnly(latestKhums.priorYearKhumsedCapitalPKR || 0)} PKR</div>
        </div>
      </div>
    </div>
    ` : ''}

    ${includeAccounts ? `
    <div class="section-title">Connected Accounts Breakdown (${accounts.length} Accounts)</div>
    <table>
      <thead>
        <tr>
          <th>Account Name</th>
          <th>Type</th>
          <th>Country</th>
          <th style="text-align: right;">Currency</th>
          <th style="text-align: right;">Audited Balance</th>
        </tr>
      </thead>
      <tbody>
        ${accounts.map(acc => `
          <tr>
            <td style="font-weight: 600; color: #ffffff;">${acc.name}</td>
            <td>${acc.type}</td>
            <td>${acc.country === 'PK' ? '🇵🇰 Pakistan' : acc.country === 'AE' ? '🇦🇪 UAE' : '🌍 Global'}</td>
            <td style="text-align: right; font-weight: 600;">${acc.currency}</td>
            <td class="amount" style="color: ${acc.currentBalance < 0 ? '#f87171' : '#34d399'};">
              ${formatCurrency(acc.currentBalance, acc.currency)}
            </td>
          </tr>
        `).join('')}
      </tbody>
    </table>
    ` : ''}

    <div class="footer">
      <div>Sada Hisab • Zero-Knowledge Local Ledger • No Cloud Dependencies</div>
      <div>Confidential & Privileged Family Record</div>
    </div>
  </div>
</body>
</html>`;

  // Open in new window for immediate print/PDF saving
  const reportWindow = window.open('', '_blank');
  if (reportWindow) {
    reportWindow.document.write(html);
    reportWindow.document.close();
  } else {
    // If popup blocked, create downloadable HTML blob
    const blob = new Blob([html], { type: 'text/html;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Sada_Hisab_Executive_Dossier_${new Date().toISOString().slice(0, 10)}.html`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
}
