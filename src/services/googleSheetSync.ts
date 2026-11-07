/**
 * Google Sheet Two-Way Live Sync Service for Sada Hisab
 *
 * Linked Sheet: https://docs.google.com/spreadsheets/d/1UybhQ6dyrudvKTqgGF7yXy2Y8m6XILTNRJus5r-leUQ
 */

import { db, recalculateAllAccountBalances } from '../db/db';
import { Transaction, Account, Sponsorship, LoanRecord, KhumsSnapshot, Currency, TransactionType } from '../types';
import { checkExactDuplicate, checkFuzzyDuplicate } from './deduplicationEngine';
import { convertToPKR } from './fxService';

export const DEFAULT_SHEET_ID = '1UybhQ6dyrudvKTqgGF7yXy2Y8m6XILTNRJus5r-leUQ';
export const DEFAULT_SHEET_URL = `https://docs.google.com/spreadsheets/d/${DEFAULT_SHEET_ID}/edit`;
export const DEFAULT_APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzeslSOrs58SfuOfgrIM43mmJH-OA4ufBtcHMs-dBuJIMn1s9FkwRoCp23_IiV7VWbiHg/exec';

export interface GoogleSheetSyncConfig {
  sheetId: string;
  sheetUrl: string;
  appsScriptWebAppUrl?: string;
  lastSyncTimestamp?: string;
  syncStatus: 'IDLE' | 'SYNCING' | 'SUCCESS' | 'ERROR';
  lastSyncMessage?: string;
}

const STORAGE_KEY = 'sada_hisab_google_sheet_config';

export function getGoogleSheetConfig(): GoogleSheetSyncConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (!parsed.appsScriptWebAppUrl) {
        parsed.appsScriptWebAppUrl = DEFAULT_APPS_SCRIPT_URL;
      }
      return parsed;
    }
  } catch {}
  return {
    sheetId: DEFAULT_SHEET_ID,
    sheetUrl: DEFAULT_SHEET_URL,
    appsScriptWebAppUrl: DEFAULT_APPS_SCRIPT_URL,
    syncStatus: 'IDLE'
  };
}

export function saveGoogleSheetConfig(config: Partial<GoogleSheetSyncConfig>): GoogleSheetSyncConfig {
  const current = getGoogleSheetConfig();
  const updated = { ...current, ...config };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  return updated;
}

/**
 * Generates the clean Google Apps Script code to paste inside Google Sheets (Extensions > Apps Script).
 * This provides 1-click modern overhaul, tab purging, executive design system, dynamic dropdowns, and 2-way sync.
 */
export function getAppsScriptSnippet(): string {
  return `/**
 * =========================================================================
 * Sada Hisab - Modern Executive Google Sheet Overhaul & Automation Engine
 * =========================================================================
 * 
 * Instructions:
 * 1. Open your Google Sheet: https://docs.google.com/spreadsheets/d/1UybhQ6dyrudvKTqgGF7yXy2Y8m6XILTNRJus5r-leUQ
 * 2. Click Extensions > Apps Script
 * 3. Select All (Cmd+A / Ctrl+A), delete, and paste this entire script
 * 4. Click Save (Cmd+S / Ctrl+S)
 * 5. In the toolbar function dropdown, select "modernizeAndBeautifyEntireWorkbook" and click "Run"
 * 6. Grant authorization when prompted.
 * 7. Enjoy your brand new modern executive spreadsheet!
 */

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('⚡ Sada Hisab Hub')
    .addItem('🚀 Overhaul & Beautify Entire Workbook (Modern Lookout)', 'modernizeAndBeautifyEntireWorkbook')
    .addItem('🔄 Refresh Dropdowns & Auto-Filters', 'setupDropdownsAndFilters')
    .addToUi();
}

/**
 * MASTER OVERHAUL:
 * 1. Purges all old cluttered legacy tabs (Credit Card, Transferred, Income, Foreign, Totals, Backups).
 * 2. Modernizes & beautifies all 7 core tabs with a sleek modern fintech lookout (Stripe/Mercury style).
 * 3. Formats fonts, row heights, zebra striping, currency numbers, and borders.
 * 4. Sets up dynamic dropdowns and auto-filters.
 */
function modernizeAndBeautifyEntireWorkbook() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();

  // Step 1: Remove old legacy & backup clutter tabs
  purgeLegacyClutterSheets(ss);

  // Step 2: Build or Modernize Tab 1: "Overview" Guide
  buildModernOverviewTab(ss);

  // Step 3: Build or Modernize Tab 2: "Summary" Dashboard
  buildModernSummaryTab(ss);

  // Step 4: Modernize Tab 3: "Expense" Ledger
  modernizeExpenseLedger(ss);

  // Step 5: Build or Modernize Tab 4: "Sponsorships"
  buildModernSponsorshipsTab(ss);

  // Step 6: Build or Modernize Tab 5: "Loans"
  buildModernLoansTab(ss);

  // Step 7: Build or Modernize Tab 6: "Khums"
  buildModernKhumsTab(ss);

  // Step 8: Build or Modernize Tab 7: "DropdownLists"
  buildModernDropdownListsTab(ss);

  // Step 9: Reorder tabs in pristine executive sequence
  reorderTabs(ss);

  // Step 10: Apply vibrant modern tab colors
  applyModernTabColors(ss);

  // Step 11: Connect dynamic dropdown data validation and auto-filters
  setupDropdownsAndFilters();

  SpreadsheetApp.getUi().alert('🎉 Overhaul Complete! Cluttered tabs removed, modern executive lookout applied across all 7 tabs, and dropdowns active!');
}

/**
 * Purges old clutter tabs from raw imports
 */
function purgeLegacyClutterSheets(ss) {
  var legacyNames = ["Credit Card (Loan)", "Transferred", "Income", "Foreign", "Totals", "Credit Card"];
  for (var i = 0; i < legacyNames.length; i++) {
    var sh = ss.getSheetByName(legacyNames[i]);
    if (sh && ss.getSheets().length > 1) {
      try { ss.deleteSheet(sh); } catch(e) {}
    }
  }

  var sheets = ss.getSheets();
  for (var j = 0; j < sheets.length; j++) {
    var name = sheets[j].getName();
    if ((name.includes("_backup_") || name.includes("Copy of") || name.includes("Sheet1")) && ss.getSheets().length > 1) {
      try { ss.deleteSheet(sheets[j]); } catch(e) {}
    }
  }
}

/**
 * Tab 1: Overview & Guide
 */
function buildModernOverviewTab(ss) {
  var sh = ss.getSheetByName('Overview');
  if (!sh) sh = ss.insertSheet('Overview', 0);
  sh.clear();

  var content = [
    ["🌟 SADA HISAB - EXECUTIVE FINANCIAL LEDGER & KHUMS MANAGEMENT", "", "", ""],
    ["Modern Single Source of Truth • Multi-Currency Ledger • Islamic Purification & Student Sponsorships", "", "", ""],
    ["", "", "", ""],
    ["🧭 1. HOW THIS SPREADSHEET WORKS (THE 30-SECOND GUIDE)", "", "", ""],
    ["This spreadsheet is your central financial hub. It records all daily expenses, summarizes liquid bank balances, manages recurring student welfare sponsorships, monitors interest-free loans (Qard-e-Hasana), and calculates annual Khums.", "", "", ""],
    ["All totals and breakdowns on the Summary tab update dynamically as you add or edit rows in the Expense tab.", "", "", ""],
    ["", "", "", ""],
    ["📑 2. TAB DIRECTORY & WHAT GOES WHERE", "", "", ""],
    ["Tab Name", "Purpose & Contents", "Action / When to Use", "Automation & Formulas"],
    ["Overview", "This guide! Complete directory, rules, instructions & color legend.", "Reference anytime you have a question on formatting or workflows.", "Manual Reference Guide"],
    ["Summary", "Executive Dashboard: Top KPI Cards, Bank Liquidity Matrix & Category Spending.", "Check financial health, net worth, and update actual bank balances.", "Formula Automated (=SUMIF, =SUM)"],
    ["Expense", "Daily Expense & Outflows Ledger (Cleaned & Deduplicated historical records).", "Log every daily payment, bill, student fee, or expense in the next empty row.", "Dropdown Enabled & Auto-Filters"],
    ["Sponsorships", "Recurring Welfare & Student Stipends Roster (School fees, van, students).", "Reference monthly commitments and update coordinator contact details.", "Active Roster Reference"],
    ["Loans", "Qard-e-Hasana (Interest-Free Loans) Receivables & Payables.", "Track loans extended to relatives/friends, expected repayments, and status.", "Formula Automated (=SUM)"],
    ["Khums", "Annual Sharia Wealth Purification (Nov 30 Valuation & 20% Sahm Distribution).", "Annual audit snapshot to determine deductible expenses and surplus Khums due.", "Formula Automated (=20% Surplus)"],
    ["DropdownLists", "Master reference lists for Categories, Accounts, Currencies, Students, and Channels.", "Populates the dropdown arrows in the Expense tab. Auto-updated via onEdit.", "System Dropdown Repository"],
    ["", "", "", ""],
    ["✍️ 3. STEP-BY-STEP: HOW TO LOG AN EXPENSE", "", "", ""],
    ["Step", "Column to Fill", "What to Put", "Helpful Tip"],
    ["Step 1", "Date (Col A)", "Transaction Date (e.g. 2025-01-15)", "Enter in YYYY-MM-DD format"],
    ["Step 2", "Billing Month (Col B)", "Target Billing Month (e.g. 2025-01)", "Defaults to current month; useful for prepayments"],
    ["Step 3", "Category (Col C)", "Select from Dropdown (e.g. Donation, School, Grocery)", "Click the dropdown arrow or type freely"],
    ["Step 4", "Sub-Beneficiary (Col E)", "Sponsored Student Name if applicable (e.g. Bais Ali, Saiqa)", "Only needed for student sponsorships / charity"],
    ["Step 5", "Spent At / Merchant (Col F)", "Vendor / Recipient Description (e.g. StromFiber, Odeez, MWT)", "Free-form description of merchant or recipient"],
    ["Step 6", "Amount (Col G)", "Pure numeric amount paid (e.g. 3500, 12525.50)", "Do NOT type currency symbols here (e.g. 3500, not Rs 3500)"],
    ["Step 7", "Currency (Col H)", "Select Currency: PKR, AED, USD, or GBP", "Defaults to PKR. Select AED for Dubai expenses"],
    ["Step 8", "Account (Col J)", "Paying Account: Al Habib - Rs, Nayapay, ADCB - AED, etc.", "Select the bank account or wallet where money came from"],
    ["Step 9", "Payment Channel (Col K)", "Payment Method: Direct Bank Transfer, Easypaisa, Cash, etc.", "Helps reconcile bank statement vs cash in hand"],
    ["Step 10", "Multiplier Note (Col M)", "Optional note if payment covered multiple months (e.g. 4500*2)", "Preserved for audit history"],
    ["", "", "", ""],
    ["🎨 4. VISUAL COLOR CODES & LEGEND", "", "", ""],
    ["Color Tone", "Hex Code", "Where Used", "Meaning"],
    ["Midnight Navy", "#0f172a", "Row 3 Headers & Tab Titles", "Protected Table Headers (Do not overwrite)"],
    ["Emerald Green", "#10b981", "Totals, KPI Cards & Active Status", "Positive net balances, confirmed payments, active status"],
    ["Sky Blue", "#0284c7", "PKR Equivalent & Category Breakdown", "Auto-converted PKR amounts and metrics"],
    ["Amber Gold", "#d97706", "Foreign Currencies & Advance Multipliers", "AED/USD foreign currency transactions or multi-month advances"],
    ["Rose Red", "#e11d48", "Liabilities, Debts & Khums Due", "Amounts owed, Khums liabilities, or pending loans"],
    ["Slate Gray", "#64748b", "Formulas & Auto-Calculated Cells", "Auto-computed cells—do not type manually over these"],
    ["", "", "", ""],
    ["⚡ 5. SPECIAL SMART AUTOMATIONS", "", "", ""],
    ["Feature", "How It Works", "Why It Helps You", ""],
    ["Dynamic Auto-Add", "Typing a new Category or Student in 'Expense' automatically appends it to 'DropdownLists'.", "You never get a 'Value not in list' error; your dropdown grows intelligently.", ""],
    ["Auto-Filters Active", "Row 3 in 'Expense' has active filter dropdowns.", "Quickly filter by Category = 'School' or Account = 'Al Habib' in 1 click.", ""],
    ["Row 3 Freeze", "Header rows 1 to 3 are frozen across the ledger.", "When scrolling down 600+ rows, your headers and totals stay visible.", ""],
    ["2-Way Live Sync", "Connected to the Sada Hisab Mobile & Web App via Google Apps Script.", "Transactions logged in the mobile app sync directly into this sheet in real-time.", ""]
  ];

  sh.getRange(1, 1, content.length, 4).setValues(content);

  sh.setColumnWidth(1, 140);
  sh.setColumnWidth(2, 280);
  sh.setColumnWidth(3, 420);
  sh.setColumnWidth(4, 260);

  sh.getRange("A1:D1").setFontSize(14).setFontWeight("bold").setBackground("#0f172a").setFontColor("#38bdf8");
  sh.getRange("A2:D2").setFontSize(10).setFontStyle("italic").setBackground("#1e293b").setFontColor("#94a3b8");

  var sectionRows = [4, 8, 18, 30, 38];
  for (var s = 0; s < sectionRows.length; s++) {
    sh.getRange(sectionRows[s], 1, 1, 4).setFontSize(11).setFontWeight("bold").setBackground("#0f172a").setFontColor("#f8fafc");
  }

  var subHeaders = [9, 19, 31, 39];
  for (var h = 0; h < subHeaders.length; h++) {
    sh.getRange(subHeaders[h], 1, 1, 4).setFontWeight("bold").setBackground("#e2e8f0").setFontColor("#0f172a");
  }
}

/**
 * Tab 2: Modern Executive Summary
 */
function buildModernSummaryTab(ss) {
  var sh = ss.getSheetByName('Summary');
  if (!sh) sh = ss.insertSheet('Summary', 1);
  sh.clear();

  var data = [
    ["SADA HISAB - EXECUTIVE FINANCIAL DASHBOARD & LIQUIDITY MATRIX", "", "", "", "", "", ""],
    ["Real-Time Financial Health, Liquid Reserves, and Automated Category Spend Distribution", "", "", "", "", "", ""],
    ["", "", "", "", "", "", ""],
    ["CORE EXECUTIVE KPI METRICS", "", "", "", "", "", ""],
    ["Metric", "Value (PKR)", "Formula", "Notes", "", "", ""],
    ["Total Historical Outflows", "=SUM(Expense!I:I)", "=SUM(Expense!I:I)", "Sum of all verified PKR expenses across history", "", "", ""],
    ["Total Transactions Recorded", "=COUNTA(Expense!A:A)-1", "=COUNTA(Expense!A:A)-1", "Total verified expense rows in ledger", "", "", ""],
    ["Estimated Khums Liability (Nov 30)", "=Khums!B12", "=Khums!B12", "Annual 20% Islamic wealth purification obligation", "", "", ""],
    ["Active Loans Receivables (Qard-e-Hasana)", "=SUM(Loans!D4:D10)", "=SUM(Loans!D4:D10)", "Asad Chachu marriage loan & recoverable funds", "", "", ""],
    ["Monthly Student Sponsorship Commitments", "=SUM(Sponsorships!D4:D25)", "=SUM(Sponsorships!D4:D25)", "Monthly committed charity stipends and school fees", "", "", ""],
    ["Custodial Amanat Cash (Wife)", 545000, "545000", "Held in trust, exempt from personal spend and Khums", "", "", ""],
    ["", "", "", "", "", "", ""],
    ["ACCOUNT BALANCES & LIQUIDITY MATRIX", "", "", "", "", "", ""],
    ["Account Name", "Account Type", "Currency", "Actual Balance", "PKR Equivalent", "Custodial?", "Status"],
    ["Al Habib - Rs", "Checking Account", "PKR", 1340713.81, 1340713.81, "NO", "ACTIVE"],
    ["Nayapay", "Digital Wallet", "PKR", 15840.50, 15840.50, "NO", "ACTIVE"],
    ["SCB (Standard Chartered)", "Checking Account", "PKR", 214500.00, 214500.00, "NO", "ACTIVE"],
    ["Cash in Wallet", "Physical Cash", "PKR", 42000.00, 42000.00, "NO", "ACTIVE"],
    ["ADCB - AED", "UAE Salary Account", "AED", 115200.00, 8732160.00, "NO", "ACTIVE"],
    ["Wise - USD", "International Multi-Currency", "USD", 7416.60, 2061814.80, "NO", "ACTIVE"],
    ["HBL", "Checking Account", "PKR", 63426.11, 63426.11, "NO", "ACTIVE"],
    ["Wife Cash (Amanat)", "Held in Custody", "PKR", 545000.00, 545000.00, "YES", "KHUMS-EXEMPT"],
    ["", "", "", "", "", "", ""],
    ["CATEGORY EXPENSE BREAKDOWN (AUTO-CALCULATED)", "", "", "", "", "", ""],
    ["Category", "Total Spent (PKR)", "Number of Entries", "% of Total Outflows", "", "", ""]
  ];

  var categories = ["Bill Payment","Children","Donation","Education","Grocery","Health / Medicine","Jhone","Misc","Mobile","Rohia","School","Van","Wife"];
  for (var c = 0; c < categories.length; c++) {
    var rowNum = 26 + c;
    data.push([
      categories[c],
      '=SUMIF(Expense!C:C, "' + categories[c] + '", Expense!I:I)',
      '=COUNTIF(Expense!C:C, "' + categories[c] + '")',
      '=IF(B$6>0, B' + rowNum + '/B$6, 0)',
      "", "", ""
    ]);
  }

  sh.getRange(1, 1, data.length, 7).setValues(data);
  sh.setColumnWidth(1, 250);
  sh.setColumnWidth(2, 170);
  sh.setColumnWidth(3, 180);
  sh.setColumnWidth(4, 320);
  sh.setColumnWidth(5, 150);
  sh.setColumnWidth(6, 120);
  sh.setColumnWidth(7, 130);

  sh.getRange("A1:G1").setFontSize(13).setFontWeight("bold").setBackground("#0f172a").setFontColor("#38bdf8");
  sh.getRange("A2:G2").setFontSize(9).setFontStyle("italic").setBackground("#1e293b").setFontColor("#94a3b8");
  sh.getRange("A4:D4").setFontSize(10).setFontWeight("bold").setBackground("#0f172a").setFontColor("#ffffff");
  sh.getRange("A5:D5").setFontWeight("bold").setBackground("#e2e8f0").setFontColor("#0f172a");

  sh.getRange("A13:G13").setFontSize(10).setFontWeight("bold").setBackground("#0f172a").setFontColor("#ffffff");
  sh.getRange("A14:G14").setFontWeight("bold").setBackground("#e2e8f0").setFontColor("#0f172a");

  sh.getRange("A24:D24").setFontSize(10).setFontWeight("bold").setBackground("#0f172a").setFontColor("#ffffff");
  sh.getRange("A25:D25").setFontWeight("bold").setBackground("#e2e8f0").setFontColor("#0f172a");

  sh.getRange("B6:B11").setNumberFormat('#,##0.00').setFontWeight("bold");
  sh.getRange("D15:E22").setNumberFormat('#,##0.00');
  sh.getRange("B26:B38").setNumberFormat('#,##0.00');
  sh.getRange("D26:D38").setNumberFormat('0.0%');
}

/**
 * Tab 3: Modern Expense Ledger (Header on Row 1 for Flawless Native Filters)
 */
function modernizeExpenseLedger(ss) {
  var sheet = ss.getSheetByName('Expense');
  if (!sheet) return;
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return;

  // If old title/banner rows exist on rows 1 and 2, remove them so true Header is on Row 1
  var r1Val = String(sheet.getRange(1, 1).getValue() || '').trim().toLowerCase();
  var r2Val = String(sheet.getRange(2, 1).getValue() || '').trim().toLowerCase();
  var r3Val = String(sheet.getRange(3, 1).getValue() || '').trim().toLowerCase();

  if (r3Val === 'date' && (r1Val.includes('ledger') || r1Val.includes('expense') || r2Val.includes('total'))) {
    sheet.deleteRows(1, 2);
    lastRow = sheet.getLastRow();
  } else if (r2Val === 'date' && (r1Val.includes('ledger') || r1Val.includes('expense'))) {
    sheet.deleteRow(1);
    lastRow = sheet.getLastRow();
  }

  // Row 1 Header definition
  var headers = [
    ["Date", "Billing Month", "Category", "Sub-Category", "Sub-Beneficiary (Student)", "Spent At / Merchant", "Amount", "Currency", "PKR Equivalent", "Account", "Payment Channel", "Phone", "Multiplier Note", "Notes"]
  ];
  sheet.getRange(1, 1, 1, 14).setValues(headers);

  // Set Optimal Column Widths
  var colWidths = [115, 120, 145, 130, 220, 240, 125, 90, 135, 150, 160, 120, 180, 220];
  for (var c = 0; c < colWidths.length; c++) {
    sheet.setColumnWidth(c + 1, colWidths[c]);
  }

  // Header Row 1 (Midnight Navy)
  sheet.getRange(1, 1, 1, 14)
    .setBackground('#0f172a')
    .setFontColor('#ffffff')
    .setFontWeight('bold')
    .setFontSize(10);
  sheet.setRowHeight(1, 34);

  // Freeze Header Row 1
  sheet.setFrozenRows(1);

  // Reset filter directly on Row 1
  try {
    var oldFilter = sheet.getFilter();
    if (oldFilter) oldFilter.remove();
  } catch(e) {}

  try {
    sheet.getRange(1, 1, Math.max(lastRow, 2), 14).createFilter();
  } catch(e) {}

  // Data Formatting on Rows 2 to lastRow
  if (lastRow >= 2) {
    sheet.getRange(2, 7, lastRow - 1, 1).setNumberFormat('#,##0.00').setHorizontalAlignment('right');
    sheet.getRange(2, 9, lastRow - 1, 1).setNumberFormat('#,##0.00').setHorizontalAlignment('right');

    sheet.getRange(2, 1, lastRow - 1, 1).setHorizontalAlignment('center');
    sheet.getRange(2, 2, lastRow - 1, 1).setHorizontalAlignment('center');
    sheet.getRange(2, 8, lastRow - 1, 1).setHorizontalAlignment('center');
    sheet.getRange(2, 12, lastRow - 1, 1).setHorizontalAlignment('center');

    sheet.setRowHeights(2, lastRow - 1, 25);

    try {
      var bandings = sheet.getRange(2, 1, lastRow - 1, 14).getBandings();
      for (var b = 0; b < bandings.length; b++) {
        bandings[b].remove();
      }
      sheet.getRange(2, 1, lastRow - 1, 14).applyRowBanding(SpreadsheetApp.BandingTheme.LIGHT_GREY);
    } catch(e) {}
  }
}

/**
 * Tab 4: Modern Sponsorships Tab
 */
function buildModernSponsorshipsTab(ss) {
  var sh = ss.getSheetByName('Sponsorships');
  if (!sh) sh = ss.insertSheet('Sponsorships', 3);
  sh.clear();

  var data = [
    ["MONTHLY RECURRING SPONSORSHIPS & EDUCATION STIPENDS ROSTER", "", "", "", "", "", "", "", ""],
    ["Active recurring commitments for students, schools, transport van fees, and welfare stipends", "", "", "", "", "", "", "", ""],
    ["Beneficiary / Student", "Coordinator / In-Charge", "Category", "Monthly (PKR)", "Default Account", "Phone", "Payment Channel", "Status", "Notes"],
    ["Green Island School", "Green Island Administration", "School", 12525, "Al Habib - Rs", "", "Direct Bank Transfer", "ACTIVE", "Monthly School Fee"],
    ["Asghar Bhai Van", "Asghar Bhai", "Van", 3500, "Al Habib - Rs", "03001234567", "Cash / Transfer", "ACTIVE", "School Transport Van"],
    ["Muhammadi Welfare Trust", "MWT Office", "Donation", 25000, "Al Habib - Rs", "", "Direct Bank Transfer", "ACTIVE", "Monthly General Welfare Donation"],
    ["Maulana Lutf Latif", "Maulana Lutf Latif", "Donation", 9000, "Al Habib - Rs", "", "Direct Bank Transfer", "ACTIVE", "Monthly Religious Stipend"],
    ["Bais Ali", "Maulana Qalbe Ali", "School", 2700, "Al Habib - Rs", "03165777490", "Direct Bank Transfer", "ACTIVE", "Monthly Student Sponsorship"],
    ["Hussain Mehdi", "Maulana Qalbe Ali", "School", 2700, "Al Habib - Rs", "03165777490", "Direct Bank Transfer", "ACTIVE", "Monthly Student Sponsorship"],
    ["Saiqa", "Maulana Qalbe Ali", "School", 2000, "Al Habib - Rs", "03165777490", "Direct Bank Transfer", "ACTIVE", "Monthly Student Sponsorship"],
    ["Shaneela", "Maulana Qalbe Ali", "School", 2000, "Al Habib - Rs", "03165777490", "Direct Bank Transfer", "ACTIVE", "Monthly Student Sponsorship"],
    ["Amir Hussain s/o Nasir", "Maulana Qalbe Ali", "School", 2950, "Al Habib - Rs", "03165777490", "Direct Bank Transfer", "ACTIVE", "Monthly Student Sponsorship"],
    ["Muhammad Shoaib", "Maulana Qalbe Ali", "School", 2850, "Al Habib - Rs", "03165777490", "Direct Bank Transfer", "ACTIVE", "Monthly Student Sponsorship"],
    ["Raees Hassan s/o Sarfaraz", "Maulana Qalbe Ali", "School", 2800, "Al Habib - Rs", "03165777490", "Direct Bank Transfer", "ACTIVE", "Monthly Student Sponsorship"],
    ["Sanullah s/o Asghar Ali", "Maulana Qalbe Ali", "School", 2500, "Al Habib - Rs", "03165777490", "Direct Bank Transfer", "ACTIVE", "Monthly Student Sponsorship"],
    ["Kumail Abbas s/o Rustam", "Maulana Qalbe Ali", "School", 2100, "Al Habib - Rs", "03165777490", "Direct Bank Transfer", "ACTIVE", "Monthly Student Sponsorship"],
    ["Lubna d/o Shokat Ali", "Maulana Qalbe Ali", "School", 2700, "Al Habib - Rs", "03165777490", "Direct Bank Transfer", "ACTIVE", "Monthly Student Sponsorship"],
    ["Zehra Batool D/O Hidayat", "Zaibun Nisa", "School", 2800, "Al Habib - Rs", "03185262577", "Direct Bank Transfer", "ACTIVE", "Monthly Student Sponsorship"],
    ["Seema Batool", "Zaibun Nisa", "School", 5000, "Al Habib - Rs", "03185262577", "Direct Bank Transfer", "ACTIVE", "Monthly Student Sponsorship"],
    ["Shahzaiv Ali Riaz", "Fatima Fatima", "School", 4826, "Al Habib - Rs", "03488553550", "Easypaisa", "ACTIVE", "Monthly Student Sponsorship"],
    ["Rashmia Talib Shah", "Khatoon Khatoon", "School", 3850, "Al Habib - Rs", "03120976573", "Direct Bank Transfer", "ACTIVE", "Monthly Student Sponsorship (incl. winter charges)"],
    ["Hasnain Talib Shah", "Khatoon Khatoon", "School", 2850, "Al Habib - Rs", "03120976573", "Direct Bank Transfer", "ACTIVE", "Monthly Student Sponsorship"],
    ["Saqib Ali Talib Shah", "Khatoon Khatoon", "School", 3650, "Al Habib - Rs", "03120976573", "Direct Bank Transfer", "ACTIVE", "Monthly Student Sponsorship"]
  ];

  sh.getRange(1, 1, data.length, 9).setValues(data);

  var widths = [220, 220, 120, 130, 150, 130, 180, 100, 280];
  for (var w = 0; w < widths.length; w++) {
    sh.setColumnWidth(w + 1, widths[w]);
  }

  sh.getRange("A1:I1").setFontSize(13).setFontWeight("bold").setBackground("#0f172a").setFontColor("#38bdf8");
  sh.getRange("A2:I2").setFontSize(9).setFontStyle("italic").setBackground("#1e293b").setFontColor("#94a3b8");
  sh.getRange("A3:I3").setFontSize(10).setFontWeight("bold").setBackground("#0f172a").setFontColor("#ffffff");
  sh.setRowHeight(3, 30);

  sh.getRange(4, 4, data.length - 3, 1).setNumberFormat('#,##0.00').setHorizontalAlignment('right');
  sh.getRange(4, 6, data.length - 3, 1).setHorizontalAlignment('center');
  sh.getRange(4, 8, data.length - 3, 1).setHorizontalAlignment('center');

  try {
    sh.getRange(4, 1, data.length - 3, 9).applyRowBanding(SpreadsheetApp.BandingTheme.LIGHT_GREY);
  } catch(e) {}
}

/**
 * Tab 5: Modern Loans (Qard-e-Hasana) Tab
 */
function buildModernLoansTab(ss) {
  var sh = ss.getSheetByName('Loans');
  if (!sh) sh = ss.insertSheet('Loans', 4);
  sh.clear();

  var data = [
    ["QARD-E-HASANA & LOAN RECEIVABLES LEDGER", "", "", "", "", "", "", ""],
    ["Interest-free personal loans extended, repayment tracking, and Islamic bad-debt exemptions", "", "", "", "", "", "", ""],
    ["Borrower / Recipient", "Relationship", "Original Principal (PKR)", "Current Outstanding (PKR)", "Disbursement Date", "Expected Repayment", "Status", "Notes"],
    ["Asad Chachu", "Uncle / Family", 328369, 328369, "2024-05-10", "Periodic", "ACTIVE", "Marriage loan; Khums exempt until recovered"],
    ["", "", "", "", "", "", "", ""],
    ["Total Active Loans Receivable (PKR):", "", "", "=SUM(D4:D5)", "", "", "", ""]
  ];

  sh.getRange(1, 1, data.length, 8).setValues(data);

  var widths = [180, 160, 200, 210, 150, 160, 110, 300];
  for (var w = 0; w < widths.length; w++) {
    sh.setColumnWidth(w + 1, widths[w]);
  }

  sh.getRange("A1:H1").setFontSize(13).setFontWeight("bold").setBackground("#0f172a").setFontColor("#38bdf8");
  sh.getRange("A2:H2").setFontSize(9).setFontStyle("italic").setBackground("#1e293b").setFontColor("#94a3b8");
  sh.getRange("A3:H3").setFontSize(10).setFontWeight("bold").setBackground("#0f172a").setFontColor("#ffffff");
  sh.setRowHeight(3, 30);

  sh.getRange("C4:D6").setNumberFormat('#,##0.00').setHorizontalAlignment('right');
  sh.getRange("A6:D6").setFontWeight("bold");
}

/**
 * Tab 6: Modern Khums Purification Tab
 */
function buildModernKhumsTab(ss) {
  var sh = ss.getSheetByName('Khums');
  if (!sh) sh = ss.insertSheet('Khums', 5);
  sh.clear();

  var data = [
    ["SHARIA KHUMS PURIFICATION AUDIT & SURPLUS CALCULATION", "", "", ""],
    ["Annual wealth purification as of November 30 (Sistani/Khamenei Fiqh Standards)", "", "", ""],
    ["", "", "", ""],
    ["Line Item Description", "Valuation (PKR)", "Classification", "Notes / Sharia Fiqh Basis"],
    ["Gross Liquid Bank & Cash Balances", 10850000, "Asset", "Al Habib, SCB, Nayapay, ADCB AED, Wise USD"],
    ["Less: Wife Cash Amanat (Custodial)", -545000, "Deduction", "Not owner property; strictly Khums exempt"],
    ["Less: Unrecovered Qard-e-Hasana Loans", -328369, "Deduction", "Asad Chachu loan; taxable only upon receipt"],
    ["Net Personal Working Capital", "=SUM(B5:B7)", "Subtotal", "Subject to year-end threshold"],
    ["Less: Baseline Exempt Capital (Prior Year Paid)", -6713262, "Deduction", "Capital on which Khums was already paid previously"],
    ["Net Taxable Surplus for the Year", "=B8+B9", "Taxable Base", "Annual savings surplus above living expenses"],
    ["", "", "", ""],
    ["Total Khums Obligation (20% of Surplus)", "=B10*0.20", "Total Khums", "Gross Islamic Wealth Tax Due"],
    ["Sahm-e-Imam Portion (50%)", "=B12*0.50", "Disbursement", "Religious institutions & authorized Marja permits"],
    ["Sahm-e-Sadat Portion (50%)", "=B12*0.50", "Disbursement", "Needy Hashimite/Sadat welfare directly"]
  ];

  sh.getRange(1, 1, data.length, 4).setValues(data);

  sh.setColumnWidth(1, 350);
  sh.setColumnWidth(2, 180);
  sh.setColumnWidth(3, 160);
  sh.setColumnWidth(4, 380);

  sh.getRange("A1:D1").setFontSize(13).setFontWeight("bold").setBackground("#0f172a").setFontColor("#38bdf8");
  sh.getRange("A2:D2").setFontSize(9).setFontStyle("italic").setBackground("#1e293b").setFontColor("#94a3b8");
  sh.getRange("A4:D4").setFontSize(10).setFontWeight("bold").setBackground("#0f172a").setFontColor("#ffffff");
  sh.setRowHeight(4, 30);

  sh.getRange("B5:B14").setNumberFormat('#,##0.00').setHorizontalAlignment('right');
  sh.getRange("A12:D12").setFontWeight("bold").setBackground("#ecfdf5");
}

/**
 * Tab 7: DropdownLists
 */
function buildModernDropdownListsTab(ss) {
  var sh = ss.getSheetByName('DropdownLists');
  if (!sh) sh = ss.insertSheet('DropdownLists', 6);
  sh.clear();

  var defaultCats = ["Bill Payment","Children","Donation","Education","Grocery","Health / Medicine","Jhone","Misc","Mobile","Rohia","School","Van","Wife"];
  var defaultAccs = ["ADCB - AED","Al Habib - Rs","Cash in Wallet","HBL","Nayapay","PKR","SCB","Wise - USD"];
  var defaultCurs = ["AED","GBP","PKR","USD"];
  var defaultSubs = ["Aiza d/o Shokat Ali","Amir Hussain s/o Nasir Hussain","August","Azra Batool  D/O Hidayat Ali","Bais Ali","Hussain Mehdi","Kumail Abbas s/o Rustam Ali","Lubna d/o Shokat Ali","Maulana's","Muhammad Shoaib s/o Ali Madad","Raees Hassan s/o Sarfaraz Ali","Saiqa","Sanullah s/o Asghar Ali","Shaneela","Zehra Batool D/O Hidayat Ali"];
  var defaultChans = ["Direct Bank Transfer","Cash","Credit Card","Easypaisa","JazzCash","Nayapay","Online Banking"];

  var headers = [["Category", "Account", "Currency", "Sub-Beneficiary (Student)", "Payment Channel"]];
  sh.getRange(1, 1, 1, 5).setValues(headers).setFontWeight("bold").setBackground("#0f172a").setFontColor("#38bdf8");

  var maxLen = Math.max(defaultCats.length, defaultAccs.length, defaultCurs.length, defaultSubs.length, defaultChans.length);
  var rows = [];
  for (var i = 0; i < maxLen; i++) {
    rows.push([
      defaultCats[i] || "",
      defaultAccs[i] || "",
      defaultCurs[i] || "",
      defaultSubs[i] || "",
      defaultChans[i] || ""
    ]);
  }
  sh.getRange(2, 1, rows.length, 5).setValues(rows);

  var widths = [180, 180, 110, 240, 180];
  for (var w = 0; w < widths.length; w++) {
    sh.setColumnWidth(w + 1, widths[w]);
  }
}

/**
 * Reorders tabs into pristine sequence
 */
function reorderTabs(ss) {
  var order = ["Overview", "Summary", "Expense", "Sponsorships", "Loans", "Khums", "DropdownLists"];
  for (var i = 0; i < order.length; i++) {
    var sh = ss.getSheetByName(order[i]);
    if (sh) {
      ss.setActiveSheet(sh);
      ss.moveActiveSheet(i + 1);
    }
  }
}

/**
 * Sets modern aesthetic tab colors
 */
function applyModernTabColors(ss) {
  var colors = {
    'Overview': '#10b981',      // Emerald
    'Summary': '#2563eb',       // Blue
    'Expense': '#475569',       // Slate
    'Sponsorships': '#9333ea',   // Purple
    'Loans': '#d97706',          // Amber
    'Khums': '#0d9488',          // Teal
    'DropdownLists': '#64748b'   // Gray
  };

  for (var name in colors) {
    var sh = ss.getSheetByName(name);
    if (sh) {
      try { sh.setTabColor(colors[name]); } catch(e) {}
    }
  }
}

/**
 * Sets up dynamic dropdowns and auto-filters
 */
function setupDropdownsAndFilters() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var expenseSheet = ss.getSheetByName('Expense');
  var listSheet = ss.getSheetByName('DropdownLists');
  if (!expenseSheet || !listSheet) return;

  var lastRow = Math.max(expenseSheet.getLastRow(), 700);

  // Category -> Col C
  expenseSheet.getRange(2, 3, lastRow - 1, 1).setDataValidation(
    SpreadsheetApp.newDataValidation().requireValueInRange(listSheet.getRange("A2:A")).setAllowInvalid(true).build()
  );
  // Student -> Col E
  expenseSheet.getRange(2, 5, lastRow - 1, 1).setDataValidation(
    SpreadsheetApp.newDataValidation().requireValueInRange(listSheet.getRange("D2:D")).setAllowInvalid(true).build()
  );
  // Currency -> Col H
  expenseSheet.getRange(2, 8, lastRow - 1, 1).setDataValidation(
    SpreadsheetApp.newDataValidation().requireValueInRange(listSheet.getRange("C2:C")).setAllowInvalid(true).build()
  );
  // Account -> Col J
  expenseSheet.getRange(2, 10, lastRow - 1, 1).setDataValidation(
    SpreadsheetApp.newDataValidation().requireValueInRange(listSheet.getRange("B2:B")).setAllowInvalid(true).build()
  );
  // Payment Channel -> Col K
  expenseSheet.getRange(2, 11, lastRow - 1, 1).setDataValidation(
    SpreadsheetApp.newDataValidation().requireValueInRange(listSheet.getRange("E2:E")).setAllowInvalid(true).build()
  );

  expenseSheet.setFrozenRows(1);
  try {
    if (!expenseSheet.getFilter()) {
      expenseSheet.getRange(1, 1, lastRow, 14).createFilter();
    }
  } catch(e) {}
}

/**
 * Dynamic Missing Item Auto-Adder
 */
function onEdit(e) {
  if (!e || !e.range) return;
  var range = e.range;
  var sheet = range.getSheet();
  if (sheet.getName() !== 'Expense') return;

  var col = range.getColumn();
  var val = String(e.value || '').trim();
  if (!val || range.getRow() <= 1) return;

  var ss = e.source || SpreadsheetApp.getActiveSpreadsheet();
  var listSheet = ss.getSheetByName('DropdownLists');
  if (!listSheet) return;

  var listCol = 0;
  if (col === 3) listCol = 1;       // Category -> DropdownLists Col A
  else if (col === 10) listCol = 2; // Account -> DropdownLists Col B
  else if (col === 8) listCol = 3;  // Currency -> DropdownLists Col C
  else if (col === 5) listCol = 4;  // Sub-Beneficiary -> DropdownLists Col D
  else if (col === 11) listCol = 5; // Payment Channel -> DropdownLists Col E

  if (listCol > 0) {
    var lastR = Math.max(listSheet.getLastRow(), 1);
    var vals = listSheet.getRange(2, listCol, lastR, 1).getValues().flat().map(function(item) {
      return String(item || '').trim().toLowerCase();
    });
    if (vals.indexOf(val.toLowerCase()) === -1) {
      var nextEmptyRow = listSheet.getLastRow() + 1;
      listSheet.getRange(nextEmptyRow, listCol).setValue(val);
    }
  }
}

/**
 * 2-Way Sync: Pull from Google Sheet into Sada Hisab
 */
function doGet(e) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName("Expense") || ss.getSheets()[0];
  var data = sheet.getDataRange().getValues();
  
  return ContentService.createTextOutput(JSON.stringify({
    status: "success",
    rows: data,
    timestamp: new Date().toISOString()
  })).setMimeType(ContentService.MimeType.JSON);
}

/**
 * 2-Way Sync: Push new transaction from Sada Hisab into Google Sheet
 */
function doPost(e) {
  try {
    var payload = JSON.parse(e.postData.contents);
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName("Expense") || ss.getSheets()[0];
    
    if (payload.action === "ADD_TRANSACTION" && payload.row) {
      sheet.appendRow(payload.row);
    } else if (payload.action === "APPEND_ROWS" && payload.rows) {
      for (var i = 0; i < payload.rows.length; i++) {
        sheet.appendRow(payload.rows[i]);
      }
    }
    
    return ContentService.createTextOutput(JSON.stringify({
      status: "success",
      message: "Row appended successfully."
    })).setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({
      status: "error",
      error: err.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}`;
}

/**
 * Pull latest transactions from Google Sheet using published CSV or GViz endpoint or Apps Script Web App
 */
export async function pullFromGoogleSheet(sheetName: string = 'Expense'): Promise<{
  success: boolean;
  importedCount: number;
  duplicateCount: number;
  message: string;
}> {
  const config = getGoogleSheetConfig();
  const sheetId = config.sheetId || DEFAULT_SHEET_ID;

  let csvText = '';

  // 1. If user has configured an Apps Script Web App URL, query it directly
  if (config.appsScriptWebAppUrl && config.appsScriptWebAppUrl.trim().length > 0) {
    try {
      const res = await fetch(`${config.appsScriptWebAppUrl}?sheet=${encodeURIComponent(sheetName)}`);
      if (res.ok) {
        const json = await res.json();
        if (json.rows && Array.isArray(json.rows)) {
          return await processGoogleSheetRows(json.rows);
        }
      }
    } catch (e) {
      console.warn('Apps script fetch failed, falling back to GViz/CSV...', e);
    }
  }

  // 2. Query Google Visualization / CSV endpoint
  const candidateUrls = [
    `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(sheetName)}`,
    `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&sheet=${encodeURIComponent(sheetName)}`
  ];

  let fetched = false;
  for (const url of candidateUrls) {
    try {
      const res = await fetch(url);
      if (res.ok) {
        const text = await res.text();
        if (!text.includes('<!DOCTYPE html>') && text.includes(',')) {
          csvText = text;
          fetched = true;
          break;
        }
      }
    } catch {}
  }

  if (!fetched || !csvText) {
    return {
      success: false,
      importedCount: 0,
      duplicateCount: 0,
      message: `Google Sheet is private. Open the Google Sheet > File > Share > "Publish to web" (CSV), or paste the Apps Script Web App URL in settings.`
    };
  }

  const rows = parseCSVToArray(csvText);
  return await processGoogleSheetRows(rows);
}

/**
 * Process parsed Google Sheet rows with intelligent dynamic header detection and insert into IndexedDB
 */
async function processGoogleSheetRows(rows: any[][]): Promise<{
  success: boolean;
  importedCount: number;
  duplicateCount: number;
  message: string;
}> {
  const cleanRows = rows.filter(r => r && Array.isArray(r) && r.some(c => String(c ?? '').trim().length > 0));

  if (cleanRows.length < 2) {
    return {
      success: true,
      importedCount: 0,
      duplicateCount: 0,
      message: 'Connected to Google Sheet successfully! The sheet is currently fresh or has only headers.'
    };
  }

  // Scan first 6 rows to locate true header row
  let headerRowIdx = -1;
  const colMap = {
    date: -1,
    billingMonth: -1,
    category: -1,
    subCategory: -1,
    subBeneficiary: -1,
    merchant: -1,
    amount: -1,
    currency: -1,
    pkrAmount: -1,
    account: -1,
    channel: -1,
    phone: -1,
    multiplierNote: -1,
    notes: -1
  };

  for (let r = 0; r < Math.min(cleanRows.length, 6); r++) {
    const row = cleanRows[r].map(c => String(c || '').trim().toLowerCase());
    const dateIdx = row.findIndex(c => c === 'date' || c === 'last updated' || c.includes('date'));
    const amtIdx = row.findIndex(c => c === 'amount' || c === 'amount (conv)');
    const catIdx = row.findIndex(c => c === 'category');

    if (dateIdx !== -1 && (amtIdx !== -1 || catIdx !== -1)) {
      headerRowIdx = r;
      colMap.date = dateIdx;
      colMap.billingMonth = row.findIndex(c => c === 'billing month' || c === 'month');
      colMap.category = catIdx;
      colMap.subCategory = row.findIndex(c => c === 'sub-category');
      colMap.subBeneficiary = row.findIndex(c => c.includes('beneficiary') || c.includes('student'));
      colMap.merchant = row.findIndex(c => c.includes('spent at') || c.includes('merchant') || c === 'desc.' || c.includes('description'));
      colMap.amount = amtIdx !== -1 ? amtIdx : 6;
      colMap.currency = row.findIndex(c => c === 'currency');
      colMap.pkrAmount = row.findIndex(c => c.includes('pkr') || c.includes('conv'));
      colMap.account = row.findIndex(c => c.includes('account') || c.includes('income source') || c.includes('source'));
      colMap.channel = row.findIndex(c => c.includes('channel') || c.includes('payment'));
      colMap.phone = row.findIndex(c => c.includes('phone') || c.includes('mobile'));
      colMap.multiplierNote = row.findIndex(c => c.includes('multiplier'));
      colMap.notes = row.findIndex(c => c.includes('note') || c.includes('comment') || c.includes('desc'));
      break;
    }
  }

  // Fallback defaults for standard 14-column ledger
  if (headerRowIdx === -1) {
    headerRowIdx = 0;
    colMap.date = 0;
    colMap.billingMonth = 1;
    colMap.category = 2;
    colMap.subCategory = 3;
    colMap.subBeneficiary = 4;
    colMap.merchant = 5;
    colMap.amount = 6;
    colMap.currency = 7;
    colMap.pkrAmount = 8;
    colMap.account = 9;
    colMap.channel = 10;
    colMap.phone = 11;
    colMap.multiplierNote = 12;
    colMap.notes = 13;
  }

  const existingTx = await db.transactions.toArray();
  const accounts = await db.accounts.toArray();
  let importedCount = 0;
  let duplicateCount = 0;

  for (let i = headerRowIdx + 1; i < cleanRows.length; i++) {
    const row = cleanRows[i];
    if (!row || row.length === 0) continue;

    const rawDateStr = colMap.date !== -1 && row[colMap.date] !== undefined ? String(row[colMap.date]).trim() : '';
    if (!rawDateStr || rawDateStr === '-' || rawDateStr === '?' || rawDateStr.toLowerCase().includes('total') || rawDateStr.toLowerCase().includes('ledger')) {
      continue;
    }

    // Clean date
    let date = rawDateStr;
    if (date.includes('T')) date = date.split('T')[0];

    // Clean amount
    const rawAmtVal = colMap.amount !== -1 && row[colMap.amount] !== undefined ? row[colMap.amount] : 0;
    let amount = 0;
    if (typeof rawAmtVal === 'number') {
      amount = Math.abs(rawAmtVal);
    } else {
      const parsedNum = parseFloat(String(rawAmtVal).replace(/[^0-9.-]/g, ''));
      amount = isNaN(parsedNum) ? 0 : Math.abs(parsedNum);
    }

    if (amount === 0) continue;

    // Currency
    let currency: Currency = 'PKR';
    if (colMap.currency !== -1 && row[colMap.currency]) {
      const cStr = String(row[colMap.currency]).trim().toUpperCase();
      if (cStr.includes('AED')) currency = 'AED';
      else if (cStr.includes('USD')) currency = 'USD';
      else if (cStr.includes('GBP')) currency = 'GBP';
    }

    // Category & Merchant
    const category = colMap.category !== -1 && row[colMap.category] ? String(row[colMap.category]).trim() : 'Misc';
    const subBeneficiary = colMap.subBeneficiary !== -1 && row[colMap.subBeneficiary] ? String(row[colMap.subBeneficiary]).trim() : '';
    const merchant = colMap.merchant !== -1 && row[colMap.merchant] ? String(row[colMap.merchant]).trim() : (subBeneficiary || category);
    const billingMonth = colMap.billingMonth !== -1 && row[colMap.billingMonth] ? String(row[colMap.billingMonth]).trim() : date.substring(0, 7);
    const paymentChannel = colMap.channel !== -1 && row[colMap.channel] ? String(row[colMap.channel]).trim() : 'Direct Bank Transfer';
    const phone = colMap.phone !== -1 && row[colMap.phone] ? String(row[colMap.phone]).trim() : '';
    const notes = colMap.notes !== -1 && row[colMap.notes] ? String(row[colMap.notes]).trim() : '';
    const rawAccountName = colMap.account !== -1 && row[colMap.account] ? String(row[colMap.account]).trim() : 'Al Habib - Rs';

    const accountId = mapAccountNameToId(rawAccountName, accounts, currency);

    // Deduplication check
    const exactMatch = await checkExactDuplicate(date, amount, currency, accountId, merchant);
    if (exactMatch) {
      duplicateCount++;
      continue;
    }

    const fuzzyMatch = await checkFuzzyDuplicate(date, amount, currency);
    if (fuzzyMatch) {
      duplicateCount++;
      continue;
    }

    const converted = await convertToPKR(amount, currency);

    const tx: Transaction = {
      id: `gsheet-${Date.now()}-${i}-${Math.random().toString(36).substring(2, 6)}`,
      date,
      billingMonth,
      type: 'EXPENSE',
      amount,
      currency,
      convertedAmountPKR: converted.amountPKR,
      fxRateUsed: converted.fxRate,
      category,
      subCategory: subBeneficiary,
      subBeneficiary,
      merchantOrRecipient: merchant,
      sourceAccountId: accountId,
      sourceChannel: 'EXCEL',
      paymentChannel,
      beneficiaryPhone: phone,
      description: notes || `Synced from Google Sheet (${merchant})`,
      status: 'CONFIRMED'
    };

    await db.transactions.add(tx);
    existingTx.push(tx);
    importedCount++;
  }

  await recalculateAllAccountBalances();

  saveGoogleSheetConfig({
    lastSyncTimestamp: new Date().toISOString(),
    syncStatus: 'SUCCESS',
    lastSyncMessage: `Imported ${importedCount} transactions (${duplicateCount} existing ignored).`
  });

  return {
    success: true,
    importedCount,
    duplicateCount,
    message: `Successfully synced with Google Sheet: ${importedCount} imported, ${duplicateCount} duplicates protected.`
  };
}

function mapAccountNameToId(name: string, accounts: Account[], currency: Currency): string {
  const norm = name.toLowerCase();
  if (norm.includes('habib')) return 'al-habib-pkr';
  if (norm.includes('nayapay')) return 'nayapay-pkr';
  if (norm.includes('scb') || norm.includes('standard chartered')) return 'scb-pkr';
  if (norm.includes('wallet') || norm.includes('cash')) return 'cash-pkr';
  if (norm.includes('adcb')) return 'adcb-aed';
  if (norm.includes('wise')) return 'wise-usd';
  if (norm.includes('hbl')) return 'hbl-pkr';

  const match = accounts.find(a => a.name.toLowerCase() === norm || a.id.toLowerCase() === norm);
  if (match) return match.id;

  const curMatch = accounts.find(a => a.currency === currency);
  return curMatch ? curMatch.id : 'al-habib-pkr';
}

/**
 * Simple CSV parser helper
 */
function parseCSVToArray(text: string): string[][] {
  const lines = text.split(/\r?\n/).filter(line => line.trim().length > 0);
  return lines.map(line => {
    const result = [];
    let cur = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (c === '"') {
        inQuotes = !inQuotes;
      } else if (c === ',' && !inQuotes) {
        result.push(cur.trim());
        cur = '';
      } else {
        cur += c;
      }
    }
    result.push(cur.trim());
    return result;
  });
}
