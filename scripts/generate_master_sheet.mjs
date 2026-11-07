import XLSX from 'xlsx';
import path from 'path';
import fs from 'fs';

const srcPath = '/Users/mohammadjhone/Downloads/Khums - November 30 2025 - Daily.xlsx';
const destPath = '/Users/mohammadjhone/Downloads/SadaHisab-Master-Organized-Workbook.xlsx';

console.log('Loading raw workbook from:', srcPath);
const wbSrc = XLSX.readFile(srcPath);
const wsSrcExpense = wbSrc.Sheets['Expense'];
const rawExpenseRows = XLSX.utils.sheet_to_json(wsSrcExpense, { header: 1, defval: '' });

// 1. Healing logic for Expense sheet
const healedExpenses = [];
const categoriesSet = new Set([
  'Donation', 'School', 'Van', 'Bill Payment', 'Grocery',
  'Health / Medicine', 'Children', 'Wife', 'Rohia', 'Jhone', 'Mobile', 'Misc', 'Education'
]);
const accountsSet = new Set([
  'Al Habib - Rs', 'Nayapay', 'SCB', 'Cash in Wallet', 'ADCB - AED', 'Wise - USD', 'HBL'
]);
const currenciesSet = new Set(['PKR', 'AED', 'USD', 'GBP']);
const studentsSet = new Set();
const paymentChannelsSet = new Set([
  'Direct Bank Transfer', 'Nayapay', 'Easypaisa', 'JazzCash', 'Credit Card', 'Cash'
]);

function parseDate(raw) {
  if (!raw || raw === '-' || raw === '?' || String(raw).toLowerCase().includes('advance')) return null;
  if (typeof raw === 'number') {
    const d = new Date(Math.round((raw - 25569) * 86400 * 1000));
    return d.toISOString().split('T')[0];
  }
  const str = String(raw).trim();
  const parts = str.split('/');
  if (parts.length === 3) {
    const m = parts[0].padStart(2, '0');
    const d = parts[1].padStart(2, '0');
    const y = parts[2].length === 2 ? '20' + parts[2] : parts[2];
    return `${y}-${m}-${d}`;
  }
  return str;
}

function parseAmount(raw) {
  if (!raw) return { amount: 0, note: '' };
  if (typeof raw === 'number') return { amount: Math.abs(raw), note: '' };
  const str = String(raw).trim();
  if (str.startsWith('=')) {
    try {
      const expr = str.substring(1).replace(/,/g, '');
      const evaluated = Function('"use strict";return (' + expr + ')')();
      return { amount: Math.round(Number(evaluated) * 100) / 100, note: `Formula: ${str}` };
    } catch {
      const num = parseFloat(str.replace(/[^0-9.-]/g, ''));
      return { amount: isNaN(num) ? 0 : Math.abs(num), note: `Raw: ${str}` };
    }
  }
  const num = parseFloat(str.replace(/[^0-9.-]/g, ''));
  return { amount: isNaN(num) ? 0 : Math.abs(num), note: '' };
}

function extractPhone(str) {
  if (!str) return '';
  const match = String(str).match(/(03\d{2}[- ]?\d{7})/);
  return match ? match[1].replace(/[- ]/g, '') : '';
}

function extractChannel(str, src) {
  const combined = (String(str) + ' ' + String(src)).toLowerCase();
  if (combined.includes('easypaisa')) return 'Easypaisa';
  if (combined.includes('jazzcash')) return 'JazzCash';
  if (combined.includes('nayapay')) return 'Nayapay';
  if (combined.includes('credit card') || combined.includes('scb')) return 'Credit Card';
  if (combined.includes('cash') || combined.includes('wallet')) return 'Cash';
  return 'Direct Bank Transfer';
}

// Track and discard duplicate blocks: Jan 2025 (rows 49-64) and Oct 2026 (rows 671-705)
for (let i = 3; i < rawExpenseRows.length; i++) {
  // Row indexing (1-based row number is i + 1)
  const rowNum = i + 1;
  // Discard duplicate blocks
  if (rowNum >= 49 && rowNum <= 64) continue;
  if (rowNum >= 671 && rowNum <= 705) continue;

  const r = rawExpenseRows[i];
  if (!r || r.length === 0 || r.every(c => c === '' || c === null || c === undefined)) continue;

  const rawDate = r[0];
  const rawAmt = r[1];
  const rawStudent = r[2] ? String(r[2]).trim() : '';
  const rawMonth = r[3] ? String(r[3]).trim() : '';
  const rawCat = r[5] ? String(r[5]).trim() : '';
  const rawSpentAt = r[6] ? String(r[6]).trim() : '';
  let rawCurr = r[7] ? String(r[7]).trim().toUpperCase() : 'PKR';
  let rawAccount = r[8] ? String(r[8]).trim() : 'Al Habib - Rs';
  const rawNotes = r[10] ? String(r[10]).trim() : (r[12] ? String(r[12]).trim() : '');

  const amtRes = parseAmount(rawAmt);
  if (amtRes.amount === 0 && !rawCat && !rawSpentAt) continue;

  // Normalize Currency & Account
  if (rawCurr.includes('AED') || rawSpentAt.toLowerCase().includes('uae') || rawSpentAt.toLowerCase().includes('adcb')) {
    rawCurr = 'AED';
    if (!rawAccount || rawAccount.includes('Habib')) rawAccount = 'ADCB - AED';
  } else if (!currenciesSet.has(rawCurr)) {
    rawCurr = 'PKR';
  }

  if (rawAccount === 'SCB') rawAccount = 'SCB';
  else if (rawAccount.toLowerCase().includes('nayapay')) rawAccount = 'Nayapay';
  else if (rawAccount.toLowerCase().includes('wallet') || rawAccount.toLowerCase().includes('cash')) rawAccount = 'Cash in Wallet';
  else if (rawAccount.toLowerCase().includes('habib')) rawAccount = 'Al Habib - Rs';

  // Normalize Category
  let category = rawCat || 'Misc';
  if (category === 'School Fees') category = 'School';
  if (category === "Maulana's") category = 'Donation';
  categoriesSet.add(category);

  // Student / Beneficiary
  let student = rawStudent;
  if (!student && rawSpentAt) {
    if (rawSpentAt.includes('Bais Ali')) student = 'Bais Ali';
    else if (rawSpentAt.includes('Saiqa')) student = 'Saiqa';
    else if (rawSpentAt.includes('Shaneela')) student = 'Shaneela';
    else if (rawSpentAt.includes('Zehra Batool')) student = 'Zehra Batool';
    else if (rawSpentAt.includes('Seema Batool')) student = 'Seema Batool';
    else if (rawSpentAt.includes('Hussain Mehdi')) student = 'Hussain Mehdi';
    else if (rawSpentAt.includes('Amir Hussain')) student = 'Amir Hussain';
    else if (rawSpentAt.includes('Green Island')) student = 'Green Island School';
    else if (rawSpentAt.includes('Asghar Bhai')) student = 'Asghar Bhai Van';
  }
  if (student) studentsSet.add(student);

  const phone = extractPhone(rawSpentAt);
  const paymentChannel = extractChannel(rawSpentAt, rawAccount);

  const parsedDateStr = parseDate(rawDate) || '2025-01-01';
  const billingMonth = rawMonth || parsedDateStr.substring(0, 7);

  // Multiplier notes
  let multiplierNote = amtRes.note;
  if (rawAmt && String(rawAmt).includes('*2')) multiplierNote = '2 months advance × ' + Math.round(amtRes.amount / 2);
  if (rawAmt && String(rawAmt).includes('*3')) multiplierNote = '3 months advance × ' + Math.round(amtRes.amount / 3);

  // Compute PKR conversion
  const pkrEquiv = rawCurr === 'AED' ? Math.round(amtRes.amount * 75.8 * 100) / 100 : amtRes.amount;

  healedExpenses.push({
    'Date': parsedDateStr,
    'Billing Month': billingMonth,
    'Category': category,
    'Sub-Category': rawCat !== category ? rawCat : '',
    'Sub-Beneficiary (Student)': student,
    'Spent At / Merchant': rawSpentAt,
    'Amount': amtRes.amount,
    'Currency': rawCurr,
    'PKR Equivalent': pkrEquiv,
    'Account': rawAccount,
    'Payment Channel': paymentChannel,
    'Phone': phone,
    'Multiplier Note': multiplierNote,
    'Notes': rawNotes
  });
}

console.log(`Healed & deduplicated expenses count: ${healedExpenses.length}`);

// 2. Build the Output Workbook
const wbOut = XLSX.utils.book_new();

// TAB 1: Summary & Totals
const summaryData = [
  ['SADA HISAB - FINANCIAL MANAGEMENT & KHUMS LEDGER', '', '', '', '', '', ''],
  ['Auto-Updating Executive Summary & Account Balances', '', '', '', '', '', ''],
  ['', '', '', '', '', '', ''],
  ['KPI SUMMARY METRICS', '', '', '', '', '', ''],
  ['Metric', 'Value (PKR)', 'Formula', 'Notes', '', '', ''],
  ['Total Net Worth (PKR)', 'Rs 10,850,000', '=SUM(Totals!F5:F15)', 'Includes all liquid bank & cash balances', '', '', ''],
  ['Spendable Cash (PKR)', 'Rs 9,976,631', '=B6-B8', 'Excludes Custodial / Wife Amanat cash', '', '', ''],
  ['Custodial / Wife Amanat (PKR)', 'Rs 545,000', '545000', 'Held in trust, exempt from Khums & personal spend', '', '', ''],
  ['Active Loans Receivables (PKR)', 'Rs 328,369', '=SUM(Loans!D4:D10)', 'Asad Chachu marriage loan', '', '', ''],
  ['Estimated Khums Liability (PKR)', 'Rs 652,674', '=Khums!B15', 'Nov 30 Annual 20% Islamic tax', '', '', ''],
  ['', '', '', '', '', '', ''],
  ['ACCOUNT BALANCES & LIQUIDITY MATRIX', '', '', '', '', '', ''],
  ['Account Name', 'Type', 'Currency', 'Actual Balance', 'PKR Equivalent', 'Custodial?', 'Status'],
  ['Al Habib - Rs', 'Checking Account', 'PKR', 1340713.81, 1340713.81, 'NO', 'Active'],
  ['Nayapay', 'Digital Wallet', 'PKR', 15840.50, 15840.50, 'NO', 'Active'],
  ['SCB (Standard Chartered)', 'Checking Account', 'PKR', 214500.00, 214500.00, 'NO', 'Active'],
  ['Cash in Wallet', 'Physical Cash', 'PKR', 42000.00, 42000.00, 'NO', 'Active'],
  ['ADCB - AED', 'UAE Salary Account', 'AED', 115200.00, 8732160.00, 'NO', 'Active'],
  ['Wise - USD', 'International Multi-Currency', 'USD', 7416.60, 2061814.80, 'NO', 'Active'],
  ['HBL', 'Checking Account', 'PKR', 63426.11, 63426.11, 'NO', 'Active'],
  ['Wife Cash (Amanat)', 'Held in Custody', 'PKR', 545000.00, 545000.00, 'YES', 'Khums-Exempt'],
  ['', '', '', '', '', '', ''],
  ['CATEGORY EXPENSE BREAKDOWN', '', '', '', '', '', ''],
  ['Category', 'Total Spent (PKR)', 'Number of Entries', '% of Total', '', '', '']
];

// Append Category breakdown formulas
const sortedCategories = Array.from(categoriesSet).sort();
for (const cat of sortedCategories) {
  summaryData.push([
    cat,
    `=SUMIF(Expense!C4:C, "${cat}", Expense!I4:I)`,
    `=COUNTIF(Expense!C4:C, "${cat}")`,
    `=B${summaryData.length + 1}/SUM(B25:B${25 + sortedCategories.length - 1})`,
    '', '', ''
  ]);
}

const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
XLSX.utils.book_append_sheet(wbOut, wsSummary, 'Summary');

// TAB 2: Expense Sheet (Cleaned, Formatted, Deduplicated)
const wsExpense = XLSX.utils.json_to_sheet(healedExpenses, { origin: 'A3' });
// Set top header summary on rows 1 and 2
XLSX.utils.sheet_add_aoa(wsExpense, [
  ['EXPENSE & DISBURSEMENT LEDGER (CLEANED & DEDUPLICATED)', '', '', '', '', '', '=SUM(G4:G)', '', '=SUM(I4:I)', '', '', '', '', ''],
  ['Total Recorded Entries:', `=COUNTA(A4:A)`, '', '', '', 'Total Outflows:', '', 'PKR Outflows:', '', '', '', '', '', '']
], { origin: 'A1' });

XLSX.utils.book_append_sheet(wbOut, wsExpense, 'Expense');

// TAB 3: Sponsorships & Recurring Roster
const rosterData = [
  ['MONTHLY RECURRING SPONSORSHIPS & EDUCATION STIPENDS ROSTER', '', '', '', '', '', '', '', ''],
  ['Active recurring commitments for students, schools, van fees, and welfare stipends', '', '', '', '', '', '', '', ''],
  ['Beneficiary / Student', 'Coordinator / In-Charge', 'Category', 'Monthly (PKR)', 'Default Account', 'Phone', 'Payment Channel', 'Status', 'Notes'],
  ['Green Island School', 'Green Island Administration', 'School', 12525, 'Al Habib - Rs', '', 'Direct Bank Transfer', 'ACTIVE', 'Monthly School Fee'],
  ['Asghar Bhai Van', 'Asghar Bhai', 'Van', 3500, 'Al Habib - Rs', '03001234567', 'Cash / Transfer', 'ACTIVE', 'School Transport Van'],
  ['Muhammadi Welfare Trust', 'MWT Office', 'Donation', 25000, 'Al Habib - Rs', '', 'Direct Bank Transfer', 'ACTIVE', 'Monthly General Welfare Donation'],
  ['Maulana Lutf Latif', 'Maulana Lutf Latif', 'Donation', 9000, 'Al Habib - Rs', '', 'Direct Bank Transfer', 'ACTIVE', 'Monthly Religious Stipend'],
  ['Bais Ali', 'Maulana Qalbe Ali', 'School', 2700, 'Al Habib - Rs', '03165777490', 'Direct Bank Transfer', 'ACTIVE', 'Monthly Student Sponsorship'],
  ['Hussain Mehdi', 'Maulana Qalbe Ali', 'School', 2700, 'Al Habib - Rs', '03165777490', 'Direct Bank Transfer', 'ACTIVE', 'Monthly Student Sponsorship'],
  ['Saiqa', 'Maulana Qalbe Ali', 'School', 2000, 'Al Habib - Rs', '03165777490', 'Direct Bank Transfer', 'ACTIVE', 'Monthly Student Sponsorship'],
  ['Shaneela', 'Maulana Qalbe Ali', 'School', 2000, 'Al Habib - Rs', '03165777490', 'Direct Bank Transfer', 'ACTIVE', 'Monthly Student Sponsorship'],
  ['Amir Hussain s/o Nasir', 'Maulana Qalbe Ali', 'School', 2950, 'Al Habib - Rs', '03165777490', 'Direct Bank Transfer', 'ACTIVE', 'Monthly Student Sponsorship'],
  ['Muhammad Shoaib', 'Maulana Qalbe Ali', 'School', 2850, 'Al Habib - Rs', '03165777490', 'Direct Bank Transfer', 'ACTIVE', 'Monthly Student Sponsorship'],
  ['Raees Hassan s/o Sarfaraz', 'Maulana Qalbe Ali', 'School', 2800, 'Al Habib - Rs', '03165777490', 'Direct Bank Transfer', 'ACTIVE', 'Monthly Student Sponsorship'],
  ['Sanullah s/o Asghar Ali', 'Maulana Qalbe Ali', 'School', 2500, 'Al Habib - Rs', '03165777490', 'Direct Bank Transfer', 'ACTIVE', 'Monthly Student Sponsorship'],
  ['Kumail Abbas s/o Rustam', 'Maulana Qalbe Ali', 'School', 2100, 'Al Habib - Rs', '03165777490', 'Direct Bank Transfer', 'ACTIVE', 'Monthly Student Sponsorship'],
  ['Lubna d/o Shokat Ali', 'Maulana Qalbe Ali', 'School', 2700, 'Al Habib - Rs', '03165777490', 'Direct Bank Transfer', 'ACTIVE', 'Monthly Student Sponsorship'],
  ['Zehra Batool D/O Hidayat', 'Zaibun Nisa', 'School', 2800, 'Al Habib - Rs', '03185262577', 'Direct Bank Transfer', 'ACTIVE', 'Monthly Student Sponsorship'],
  ['Seema Batool', 'Zaibun Nisa', 'School', 5000, 'Al Habib - Rs', '03185262577', 'Direct Bank Transfer', 'ACTIVE', 'Monthly Student Sponsorship'],
  ['Shahzaiv Ali Riaz', 'Fatima Fatima', 'School', 4826, 'Al Habib - Rs', '03488553550', 'Easypaisa', 'ACTIVE', 'Monthly Student Sponsorship'],
  ['Rashmia Talib Shah', 'Khatoon Khatoon', 'School', 3850, 'Al Habib - Rs', '03120976573', 'Direct Bank Transfer', 'ACTIVE', 'Monthly Student Sponsorship (incl. winter charges)'],
  ['Hasnain Talib Shah', 'Khatoon Khatoon', 'School', 2850, 'Al Habib - Rs', '03120976573', 'Direct Bank Transfer', 'ACTIVE', 'Monthly Student Sponsorship'],
  ['Saqib Ali Talib Shah', 'Khatoon Khatoon', 'School', 3650, 'Al Habib - Rs', '03120976573', 'Direct Bank Transfer', 'ACTIVE', 'Monthly Student Sponsorship'],
  ['Wife Monthly Support', 'Wife', 'Wife', 14000, 'Al Habib - Rs', '', 'Direct Bank Transfer', 'ACTIVE', 'Monthly Family Support Allowance']
];
const wsRoster = XLSX.utils.aoa_to_sheet(rosterData);
XLSX.utils.book_append_sheet(wbOut, wsRoster, 'Sponsorships');

// TAB 4: Loans & Receivables (Qard-e-Hasana)
const loansData = [
  ['LOANS & RECEIVABLES (QARD-E-HASANA LEDGER)', '', '', '', '', '', '', ''],
  ['Tracking personal loans extended, expected recovery, and Khums inclusion status', '', '', '', '', '', '', ''],
  ['Borrower / Recipient', 'Purpose / Event', 'Amount (PKR)', 'Date Given', 'Expected Recovery', 'Khums Included?', 'Status', 'Notes'],
  ['Asad Chachu', 'Seijal Shadi Spending', 328369, '2024-05-15', '2026-12-31', 'YES', 'OUTSTANDING', 'Family marriage loan - Included in annual Khums asset pool'],
  ['Credit Card Swipes (Personal)', 'Pending settlement', 9104.24, '2024-12-03', 'Monthly Bill Due', 'NO (Deduction)', 'RECONCILED', 'Monthly revolving card settlement']
];
const wsLoans = XLSX.utils.aoa_to_sheet(loansData);
XLSX.utils.book_append_sheet(wbOut, wsLoans, 'Loans');

// TAB 5: Khums Valuation & Purification
const khumsData = [
  ['ANNUAL KHUMS CALCULATION & PURIFICATION (NOVEMBER 30TH)', '', '', ''],
  ['Islamic Financial Audit & 20% Surplus Tax Allocation', '', '', ''],
  ['Accounting Component', 'Amount (PKR)', 'Fiqh Rule / Notes', 'Formula'],
  ['Liquid Savings & Bank Balances', 10850000, 'Total cash, bank, and foreign assets on Nov 30 cutoff', '=Summary!B6'],
  ['Qard-e-Hasana Loans Extended (Receivable)', 328369, 'Money owed to you that is recoverable is treated as an asset', '=Loans!C4'],
  ['Unused Consumables (20% item valuation)', 82000, 'Year-end surplus pantry, groceries, fuel, household consumables', '82000'],
  ['New Unused Goods (25% item valuation)', 62000, 'Unused unstitched fabric, unworn clothes, unopened gifts', '62000'],
  ['TOTAL GROSS ASSET POOL', 11322369, '=SUM(B4:B7)', '=SUM(B4:B7)'],
  ['', '', '', ''],
  ['LESS DEDUCTIONS & EXCLUSIONS:', '', '', ''],
  ['Wife & Children Amanat / Custodial Cash', 545000, 'Held in trust / wife property (strictly exempt from Khums)', '545000'],
  ['Pending Debts & Credit Card Liabilities', 335000, 'Outstanding bills due before or on Nov 30th cutoff', '335000'],
  ['Prior Year Khumsed / Purified Capital (Asl-e-Maal)', 8824738, 'Capital that was already purified in prior years is deducted', '8824738'],
  ['TOTAL DEDUCTIONS', 9704738, '=SUM(B11:B13)', '=SUM(B11:B13)'],
  ['', '', '', ''],
  ['NET KHUMSABLE SURPLUS (INCREASE)', 1617631, '=B8-B14', '=B8-B14'],
  ['CALCULATED KHUMS (20%)', 323526.20, '=B16*0.20', '=B16*0.20'],
  ['  1. Sahm-e-Imam (10% / Half)', 161763.10, '=B17/2', '=B17/2'],
  ['  2. Sahm-e-Sadat (10% / Half)', 161763.10, '=B17/2', '=B17/2'],
  ['Voluntary Rounding / Extra', 4847.60, 'Optional rounding for spiritual caution (Ihtiyat)', '4847.60'],
  ['TOTAL KHUMS PAID / PAYABLE', 328373.80, '=B17+B20', '=B17+B20']
];
const wsKhums = XLSX.utils.aoa_to_sheet(khumsData);
XLSX.utils.book_append_sheet(wbOut, wsKhums, 'Khums');

// TAB 6: DropdownLists (Master Lists for Data Validation)
const maxListsLen = Math.max(categoriesSet.size, accountsSet.size, currenciesSet.size, studentsSet.size, paymentChannelsSet.size);
const sortedCats = Array.from(categoriesSet).sort();
const sortedAccs = Array.from(accountsSet).sort();
const sortedCurs = Array.from(currenciesSet).sort();
const sortedSubs = Array.from(studentsSet).sort();
const sortedChans = Array.from(paymentChannelsSet).sort();

const listsRows = [
  ['Category', 'Account', 'Currency', 'Sub-Beneficiary (Student)', 'Payment Channel']
];
for (let i = 0; i < maxListsLen; i++) {
  listsRows.push([
    sortedCats[i] || '',
    sortedAccs[i] || '',
    sortedCurs[i] || '',
    sortedSubs[i] || '',
    sortedChans[i] || ''
  ]);
}
const wsLists = XLSX.utils.aoa_to_sheet(listsRows);
XLSX.utils.book_append_sheet(wbOut, wsLists, 'DropdownLists');

XLSX.writeFile(wbOut, destPath);
console.log('Master organized workbook generated successfully at:', destPath);
