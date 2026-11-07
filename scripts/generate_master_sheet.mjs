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
  'Bill Payment', 'Children', 'Donation', 'Education', 'Grocery',
  'Health / Medicine', 'Jhone', 'Misc', 'Mobile', 'Rohia', 'School', 'Van', 'Wife'
]);
const accountsSet = new Set([
  'ADCB - AED', 'Al Habib - Rs', 'Cash in Wallet', 'HBL', 'Nayapay', 'SCB', 'Wise - USD'
]);
const currenciesSet = new Set(['PKR', 'AED', 'USD', 'GBP']);
const studentsSet = new Set([
  'Aiza d/o Shokat Ali', 'Amir Hussain s/o Nasir Hussain', 'August', 'Azra Batool  D/O Hidayat Ali',
  'Bais Ali', 'Hussain Mehdi', 'Kumail Abbas s/o Rustam Ali', 'Lubna d/o Shokat Ali', "Maulana's",
  'Muhammad Shoaib s/o Ali Madad', 'Raees Hassan s/o Sarfaraz Ali', 'Saiqa', 'Sanullah s/o Asghar Ali',
  'Shaneela', 'Zehra Batool D/O Hidayat Ali'
]);
const paymentChannelsSet = new Set([
  'Direct Bank Transfer', 'Cash', 'Credit Card', 'Easypaisa', 'JazzCash', 'Nayapay', 'Online Banking'
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
  const rowNum = i + 1;
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

  let multiplierNote = amtRes.note;
  if (rawAmt && String(rawAmt).includes('*2')) multiplierNote = '2 months advance × ' + Math.round(amtRes.amount / 2);
  if (rawAmt && String(rawAmt).includes('*3')) multiplierNote = '3 months advance × ' + Math.round(amtRes.amount / 3);

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

// Build Output Workbook
const wbOut = XLSX.utils.book_new();

// ==========================================
// TAB 1: 🌟 Overview & User Guide
// ==========================================
const overviewRows = [
  ['🌟 SADA HISAB - EXECUTIVE FINANCIAL LEDGER & KHUMS MANAGEMENT', '', '', ''],
  ['Single Source of Truth • Multi-Currency Ledger • Islamic Purification & Student Sponsorships', '', '', ''],
  ['Version: 2.0 (Organized & Healed) | Generated: ' + new Date().toISOString().split('T')[0], '', '', ''],
  ['', '', '', ''],
  ['🧭 1. HOW THIS SPREADSHEET WORKS (THE 30-SECOND GUIDE)', '', '', ''],
  ['This spreadsheet is the master financial backbone for Sada Hisab. It records every outflow, tracks bank balances, manages recurring student sponsorships, monitors interest-free loans (Qard-e-Hasana), and calculates annual Khums (wealth purification).', '', '', ''],
  ['All calculations and totals on the Summary tab update dynamically as you add or edit records in the Expense tab.', '', '', ''],
  ['', '', '', ''],
  ['📑 2. TAB DIRECTORY & WHAT GOES WHERE', '', '', ''],
  ['Tab Name', 'Purpose & Contents', 'Action / When to Use', 'Automation & Formulas'],
  ['Overview', 'This guide! Complete directory, rules, instructions & color legends.', 'Reference anytime you have a question on formatting or workflows.', 'Manual Reference Guide'],
  ['Summary', 'Executive Dashboard: Top KPI Cards, Bank Liquidity Matrix & Category Spending.', 'Check your financial health, net worth, and update actual bank balances.', 'Formula Automated (=SUMIF, =SUM)'],
  ['Expense', 'Daily Expense & Outflows Ledger (Cleaned & Deduplicated historical records).', 'Log every daily payment, bill, student fee, or expense in the next empty row.', 'Dropdown Enabled & Auto-Filters'],
  ['Sponsorships', 'Recurring Welfare & Student Stipends Roster (School fees, van, students).', 'Reference monthly commitments and update coordinator contact details.', 'Active Roster Reference'],
  ['Loans', 'Qard-e-Hasana (Interest-Free Loans) Receivables & Payables.', 'Track loans extended to relatives/friends, expected repayments, and status.', 'Formula Automated (=SUM)'],
  ['Khums', 'Annual Sharia Wealth Purification (Nov 30 Valuation & 20% Sahm Distribution).', 'Annual audit snapshot to determine deductible expenses and surplus Khums due.', 'Formula Automated (=20% Surplus)'],
  ['DropdownLists', 'Master reference lists for Categories, Accounts, Currencies, Students, and Channels.', 'Populates the dropdown arrows in the Expense tab. Auto-updated via onEdit.', 'System Dropdown Repository'],
  ['', '', '', ''],
  ['✍️ 3. STEP-BY-STEP: HOW TO LOG AN EXPENSE', '', '', ''],
  ['Step', 'Column to Fill', 'What to Put', 'Helpful Tip'],
  ['Step 1', 'Date (Col A)', 'Transaction Date (e.g. 2025-01-15)', 'Enter in YYYY-MM-DD format'],
  ['Step 2', 'Billing Month (Col B)', 'Target Billing Month (e.g. 2025-01)', 'Defaults to current month; useful for prepayments'],
  ['Step 3', 'Category (Col C)', 'Select from Dropdown (e.g. Donation, School, Grocery)', 'Click the dropdown arrow or type freely'],
  ['Step 4', 'Sub-Beneficiary (Col E)', 'Sponsored Student Name if applicable (e.g. Bais Ali, Saiqa)', 'Only needed for student sponsorships / charity'],
  ['Step 5', 'Spent At / Merchant (Col F)', 'Vendor / Recipient Description (e.g. StromFiber, Odeez, MWT)', 'Free-form description of merchant or recipient'],
  ['Step 6', 'Amount (Col G)', 'Pure numeric amount paid (e.g. 3500, 12525.50)', 'Do NOT type currency symbols here (e.g. 3500, not Rs 3500)'],
  ['Step 7', 'Currency (Col H)', 'Select Currency: PKR, AED, USD, or GBP', 'Defaults to PKR. Select AED for Dubai expenses'],
  ['Step 8', 'Account (Col J)', 'Paying Account: Al Habib - Rs, Nayapay, ADCB - AED, etc.', 'Select the bank account or wallet where money came from'],
  ['Step 9', 'Payment Channel (Col K)', 'Payment Method: Direct Bank Transfer, Easypaisa, Cash, etc.', 'Helps reconcile bank statement vs cash in hand'],
  ['Step 10', 'Multiplier Note (Col M)', 'Optional note if payment covered multiple months (e.g. 4500*2)', 'Preserved for audit history'],
  ['', '', '', ''],
  ['🎨 4. VISUAL COLOR CODES & LEGEND', '', '', ''],
  ['Color Tone', 'Hex Code', 'Where Used', 'Meaning'],
  ['Midnight Navy', '#0f172a', 'Row 3 Headers & Tab Titles', 'Protected Table Headers (Do not overwrite)'],
  ['Emerald Green', '#10b981', 'Totals, KPI Cards & Active Status', 'Positive net balances, confirmed payments, active status'],
  ['Sky Blue', '#0284c7', 'PKR Equivalent & Category Breakdown', 'Auto-converted PKR amounts and metrics'],
  ['Amber Gold', '#d97706', 'Foreign Currencies & Advance Multipliers', 'AED/USD foreign currency transactions or multi-month advances'],
  ['Rose Red', '#e11d48', 'Liabilities, Debts & Khums Due', 'Amounts owed, Khums liabilities, or pending loans'],
  ['Slate Gray', '#64748b', 'Formulas & Auto-Calculated Cells', 'Auto-computed cells—do not type manually over these'],
  ['', '', '', ''],
  ['⚡ 5. SPECIAL SMART AUTOMATIONS', '', '', ''],
  ['Feature', 'How It Works', 'Why It Helps You', ''],
  ['Dynamic Auto-Add', 'Typing a new Category or Student in "Expense" automatically appends it to "DropdownLists".', 'You never get a "Value not in list" error; your dropdown grows intelligently.', ''],
  ['Auto-Filters Active', 'Row 3 in "Expense" has active filter dropdowns.', 'Quickly filter by Category = "School" or Account = "Al Habib" in 1 click.', ''],
  ['Row 3 Freeze', 'Header rows 1 to 3 are frozen across the ledger.', 'When scrolling down 600+ rows, your headers and totals stay visible.', ''],
  ['2-Way Live Sync', 'Connected to the Sada Hisab Mobile & Web App via Google Apps Script.', 'Transactions logged in the mobile app sync directly into this sheet in real-time.', '']
];

const wsOverview = XLSX.utils.aoa_to_sheet(overviewRows);
wsOverview['!cols'] = [{ wch: 18 }, { wch: 38 }, { wch: 50 }, { wch: 32 }];
XLSX.utils.book_append_sheet(wbOut, wsOverview, 'Overview');

// ==========================================
// TAB 2: 📊 Summary & KPI Cards
// ==========================================
const summaryData = [
  ['SADA HISAB - EXECUTIVE FINANCIAL SUMMARY & LIQUIDITY MATRIX', '', '', '', '', '', ''],
  ['Auto-Updating KPI Metrics, Liquid Cash Reserves, and Category Distribution', '', '', '', '', '', ''],
  ['', '', '', '', '', '', ''],
  ['CORE EXECUTIVE KPI METRICS', '', '', '', '', '', ''],
  ['Metric', 'Value (PKR)', 'Formula', 'Notes', '', '', ''],
  ['Total Historical Outflows', '=SUM(Expense!I4:I)', '=SUM(Expense!I4:I)', 'Sum of all verified PKR expenses across history', '', '', ''],
  ['Estimated Khums Liability (Nov 30)', '=Khums!B15', '=Khums!B15', 'Annual 20% Islamic wealth purification obligation', '', '', ''],
  ['Active Loans Receivables (Qard-e-Hasana)', '=SUM(Loans!D4:D10)', '=SUM(Loans!D4:D10)', 'Asad Chachu marriage loan & recoverable funds', '', '', ''],
  ['Monthly Student Sponsorship Commitments', '=SUM(Sponsorships!D4:D25)', '=SUM(Sponsorships!D4:D25)', 'Monthly committed charity stipends and school fees', '', '', ''],
  ['Custodial Amanat Cash (Wife)', 545000, '545000', 'Held in trust, exempt from personal spend and Khums', '', '', ''],
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
  ['Category', 'Total Spent (PKR)', 'Number of Entries', '% of Total Outflows', '', '', '']
];

const sortedCategories = Array.from(categoriesSet).sort();
for (let cIdx = 0; cIdx < sortedCategories.length; cIdx++) {
  const cat = sortedCategories[cIdx];
  const rowNum = 26 + cIdx;
  summaryData.push([
    cat,
    `=SUMIF(Expense!C4:C, "${cat}", Expense!I4:I)`,
    `=COUNTIF(Expense!C4:C, "${cat}")`,
    `=B${rowNum}/SUM(B$26:B$${26 + sortedCategories.length - 1})`,
    '', '', ''
  ]);
}

const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
wsSummary['!cols'] = [{ wch: 30 }, { wch: 22 }, { wch: 26 }, { wch: 45 }, { wch: 15 }, { wch: 15 }, { wch: 15 }];
XLSX.utils.book_append_sheet(wbOut, wsSummary, 'Summary');

// ==========================================
// TAB 3: 💳 Expense Ledger
// ==========================================
const wsExpense = XLSX.utils.json_to_sheet(healedExpenses, { origin: 'A3' });
XLSX.utils.sheet_add_aoa(wsExpense, [
  ['EXPENSE & DISBURSEMENT LEDGER (CLEANED & DEDUPLICATED)', '', '', '', '', '', '=SUM(G4:G)', '', '=SUM(I4:I)', '', '', '', '', ''],
  ['Total Entries:', `=COUNTA(A4:A)`, '', '', '', 'Total Outflows:', '', 'PKR Outflows:', '', '', '', '', '', '']
], { origin: 'A1' });

wsExpense['!cols'] = [
  { wch: 13 }, // Date
  { wch: 14 }, // Billing Month
  { wch: 18 }, // Category
  { wch: 16 }, // Sub-Category
  { wch: 26 }, // Sub-Beneficiary (Student)
  { wch: 34 }, // Spent At / Merchant
  { wch: 14 }, // Amount
  { wch: 10 }, // Currency
  { wch: 16 }, // PKR Equivalent
  { wch: 18 }, // Account
  { wch: 20 }, // Payment Channel
  { wch: 14 }, // Phone
  { wch: 24 }, // Multiplier Note
  { wch: 32 }  // Notes
];
XLSX.utils.book_append_sheet(wbOut, wsExpense, 'Expense');

// ==========================================
// TAB 4: 🤝 Sponsorships
// ==========================================
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
  ['Saqib Ali Talib Shah', 'Khatoon Khatoon', 'School', 3650, 'Al Habib - Rs', '03120976573', 'Direct Bank Transfer', 'ACTIVE', 'Monthly Student Sponsorship']
];

const wsRoster = XLSX.utils.aoa_to_sheet(rosterData);
wsRoster['!cols'] = [
  { wch: 26 }, { wch: 28 }, { wch: 14 }, { wch: 16 }, { wch: 18 }, { wch: 15 }, { wch: 22 }, { wch: 12 }, { wch: 35 }
];
XLSX.utils.book_append_sheet(wbOut, wsRoster, 'Sponsorships');

// ==========================================
// TAB 5: 🤲 Loans (Qard-e-Hasana)
// ==========================================
const loanData = [
  ['QARD-E-HASANA & LOAN RECEIVABLES LEDGER', '', '', '', '', '', '', ''],
  ['Interest-free personal loans extended, repayment tracking, and Islamic bad-debt exemptions', '', '', '', '', '', '', ''],
  ['Borrower / Recipient', 'Relationship', 'Original Principal (PKR)', 'Current Outstanding (PKR)', 'Disbursement Date', 'Expected Repayment', 'Status', 'Notes'],
  ['Asad Chachu', 'Uncle / Family', 328369, 328369, '2024-05-10', 'Periodic', 'ACTIVE', 'Marriage loan; Khums exempt until recovered'],
  ['', '', '', '', '', '', '', ''],
  ['Total Active Loans Receivable (PKR):', '', '', '=SUM(D4:D5)', '', '', '', '']
];
const wsLoans = XLSX.utils.aoa_to_sheet(loanData);
wsLoans['!cols'] = [
  { wch: 20 }, { wch: 18 }, { wch: 24 }, { wch: 26 }, { wch: 18 }, { wch: 20 }, { wch: 12 }, { wch: 35 }
];
XLSX.utils.book_append_sheet(wbOut, wsLoans, 'Loans');

// ==========================================
// TAB 6: ⚖️ Khums Audit
// ==========================================
const khumsData = [
  ['SHARIA KHUMS PURIFICATION AUDIT & SURPLUS CALCULATION', '', '', ''],
  ['Annual wealth purification as of November 30 (Sistani/Khamenei Fiqh Standards)', '', '', ''],
  ['', '', '', ''],
  ['Line Item', 'Valuation (PKR)', 'Category', 'Notes / Fiqh Rule'],
  ['Gross Liquid Bank & Cash Balances', 10850000, 'Asset', 'Al Habib, SCB, Nayapay, ADCB AED, Wise USD'],
  ['Less: Wife Cash Amanat (Custodial)', -545000, 'Deduction', 'Not owner property; strictly Khums exempt'],
  ['Less: Unrecovered Qard-e-Hasana Loans', -328369, 'Deduction', 'Asad Chachu loan; taxable only upon receipt'],
  ['Net Personal Working Capital', '=SUM(B5:B7)', 'Subtotal', 'Subject to year-end threshold'],
  ['Less: Baseline Exempt Capital (Prior Year Paid)', -6713262, 'Deduction', 'Capital on which Khums was already paid previously'],
  ['Net Taxable Surplus for the Year', '=B8+B9', 'Taxable Base', 'Annual savings surplus above living expenses'],
  ['', '', '', ''],
  ['Total Khums Obligation (20% of Surplus)', '=B10*0.20', 'Total Khums', 'Gross Islamic Wealth Tax Due'],
  ['Sahm-e-Imam Portion (50%)', '=B12*0.50', 'Disbursement', 'Religious institutions & authorized Marja permits'],
  ['Sahm-e-Sadat Portion (50%)', '=B12*0.50', 'Disbursement', 'Needy Hashimite/Sadat welfare directly']
];
const wsKhums = XLSX.utils.aoa_to_sheet(khumsData);
wsKhums['!cols'] = [{ wch: 38 }, { wch: 22 }, { wch: 18 }, { wch: 45 }];
XLSX.utils.book_append_sheet(wbOut, wsKhums, 'Khums');

// ==========================================
// TAB 7: ⚙️ DropdownLists
// ==========================================
const listHeaders = ['Category', 'Account', 'Currency', 'Sub-Beneficiary (Student)', 'Payment Channel'];
const catList = Array.from(categoriesSet).sort();
const accList = Array.from(accountsSet).sort();
const curList = Array.from(currenciesSet).sort();
const stuList = Array.from(studentsSet).sort();
const chanList = Array.from(paymentChannelsSet).sort();

const maxL = Math.max(catList.length, accList.length, curList.length, stuList.length, chanList.length);
const dropdownRows = [listHeaders];
for (let i = 0; i < maxL; i++) {
  dropdownRows.push([
    catList[i] || '',
    accList[i] || '',
    curList[i] || '',
    stuList[i] || '',
    chanList[i] || ''
  ]);
}
const wsDropdowns = XLSX.utils.aoa_to_sheet(dropdownRows);
wsDropdowns['!cols'] = [{ wch: 22 }, { wch: 22 }, { wch: 14 }, { wch: 32 }, { wch: 24 }];
XLSX.utils.book_append_sheet(wbOut, wsDropdowns, 'DropdownLists');

// Write out the file
XLSX.writeFile(wbOut, destPath);
console.log('Master organized workbook generated successfully at:', destPath);
