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
 * This provides 1-click beautification, overview guide generation, dynamic dropdowns, auto-filters, and 2-way sync.
 */
export function getAppsScriptSnippet(): string {
  return `/**
 * =========================================================================
 * Sada Hisab - Master Executive Google Sheet & Beautification Engine
 * =========================================================================
 * 
 * 1-Click Instructions:
 * 1. Open your Google Sheet: https://docs.google.com/spreadsheets/d/1UybhQ6dyrudvKTqgGF7yXy2Y8m6XILTNRJus5r-leUQ
 * 2. Extensions > Apps Script > Paste this entire code > Click Save (Cmd+S / Ctrl+S)
 * 3. In the toolbar function dropdown, select "beautifyAndOrganizeSpreadsheet" and click "Run"
 * 4. Your sheet will instantly transform with an Overview Guide, luxury colors, zebra striping,
 *    dropdown arrows, and auto-filters!
 */

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('⚡ Sada Hisab Hub')
    .addItem('🌟 Beautify & Setup All Sheets (Overview, Dropdowns, Styling)', 'beautifyAndOrganizeSpreadsheet')
    .addItem('🔄 Refresh Dropdowns & Auto-Filters', 'setupDropdownsAndFilters')
    .addToUi();
}

/**
 * MASTER BEAUTIFIER: Creates the Overview Guide tab, formats all columns,
 * adds alternating zebra striping, currency formats, tab colors, and dropdowns.
 */
function beautifyAndOrganizeSpreadsheet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();

  // 1. Create or Update "Overview" Guide Sheet as First Tab
  createOverviewGuideSheet(ss);

  // 2. Setup Dropdowns & Filters
  setupDropdownsAndFilters();

  // 3. Format Expense Ledger
  formatExpenseLedger(ss);

  // 4. Format Summary Sheet
  formatSummarySheet(ss);

  // 5. Set Aesthetic Tab Colors
  setTabColors(ss);

  try {
    SpreadsheetApp.getUi().alert('🎉 Masterpiece Ready! Overview Guide created, luxury styling applied, zebra striping active, and dropdowns connected.');
  } catch(e) {}
}

/**
 * Creates the "Overview" tab as Sheet #1 with rich guide cards and instructions
 */
function createOverviewGuideSheet(ss) {
  var overviewSheet = ss.getSheetByName('Overview');
  if (!overviewSheet) {
    overviewSheet = ss.insertSheet('Overview', 0);
  } else {
    overviewSheet.clear();
    ss.setActiveSheet(overviewSheet);
    ss.moveActiveSheet(1);
  }

  var data = [
    ["🌟 SADA HISAB - EXECUTIVE FINANCIAL LEDGER & KHUMS MANAGEMENT", "", "", ""],
    ["Single Source of Truth • Multi-Currency Ledger • Islamic Wealth Purification & Student Stipends", "", "", ""],
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

  overviewSheet.getRange(1, 1, data.length, 4).setValues(data);

  // Set Column Widths
  overviewSheet.setColumnWidth(1, 140);
  overviewSheet.setColumnWidth(2, 280);
  overviewSheet.setColumnWidth(3, 400);
  overviewSheet.setColumnWidth(4, 250);

  // Title styling
  overviewSheet.getRange("A1:D1").setFontSize(14).setFontWeight("bold").setBackground("#0f172a").setFontColor("#38bdf8");
  overviewSheet.getRange("A2:D2").setFontSize(10).setFontStyle("italic").setBackground("#1e293b").setFontColor("#94a3b8");

  // Section Headers
  var sectionRows = [4, 8, 18, 30, 38];
  for (var s = 0; s < sectionRows.length; s++) {
    var r = sectionRows[s];
    overviewSheet.getRange(r, 1, 1, 4).setFontSize(11).setFontWeight("bold").setBackground("#0f172a").setFontColor("#f8fafc");
  }

  // Table Sub-Headers
  var subHeaders = [9, 19, 31, 39];
  for (var h = 0; h < subHeaders.length; h++) {
    var sr = subHeaders[h];
    overviewSheet.getRange(sr, 1, 1, 4).setFontWeight("bold").setBackground("#e2e8f0").setFontColor("#0f172a");
  }
}

/**
 * Sets up the DropdownLists tab, Data Validation dropdowns, Row 3 freeze, and Auto-Filters
 */
function setupDropdownsAndFilters() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var expenseSheet = ss.getSheetByName('Expense');
  if (!expenseSheet) return;
  
  var listSheet = ss.getSheetByName('DropdownLists');
  if (!listSheet) {
    listSheet = ss.insertSheet('DropdownLists');
  }
  
  var defaultCats = ["Bill Payment","Children","Donation","Education","Grocery","Health / Medicine","Jhone","Misc","Mobile","Rohia","School","Van","Wife"];
  var defaultAccs = ["ADCB - AED","Al Habib - Rs","Cash in Wallet","HBL","Nayapay","PKR","SCB","Wise - USD"];
  var defaultCurs = ["AED","GBP","PKR","USD"];
  var defaultSubs = ["Aiza d/o Shokat Ali","Amir Hussain s/o Nasir Hussain","August","Azra Batool  D/O Hidayat Ali","Bais Ali","Hussain Mehdi","Kumail Abbas s/o Rustam Ali","Lubna d/o Shokat Ali","Maulana's","Muhammad Shoaib s/o Ali Madad","Raees Hassan s/o Sarfaraz Ali","Saiqa","Sanullah s/o Asghar Ali","Shaneela","Zehra Batool D/O Hidayat Ali"];
  var defaultChans = ["Direct Bank Transfer","Cash","Credit Card","Easypaisa","JazzCash","Nayapay","Online Banking"];

  if (listSheet.getLastRow() < 2) {
    listSheet.clear();
    var headers = [["Category", "Account", "Currency", "Sub-Beneficiary (Student)", "Payment Channel"]];
    listSheet.getRange(1, 1, 1, 5).setValues(headers).setFontWeight("bold").setBackground("#0f172a").setFontColor("#38bdf8");
    
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
    listSheet.getRange(2, 1, rows.length, 5).setValues(rows);
  }
  
  var lastRow = Math.max(expenseSheet.getLastRow(), 700);
  
  // Col 3 (C): Category -> DropdownLists!A2:A
  var catRule = SpreadsheetApp.newDataValidation()
    .requireValueInRange(listSheet.getRange("A2:A"))
    .setAllowInvalid(true)
    .build();
  expenseSheet.getRange(4, 3, lastRow - 3, 1).setDataValidation(catRule);
  
  // Col 5 (E): Sub-Beneficiary (Student) -> DropdownLists!D2:D
  var subRule = SpreadsheetApp.newDataValidation()
    .requireValueInRange(listSheet.getRange("D2:D"))
    .setAllowInvalid(true)
    .build();
  expenseSheet.getRange(4, 5, lastRow - 3, 1).setDataValidation(subRule);
  
  // Col 8 (H): Currency -> DropdownLists!C2:C
  var curRule = SpreadsheetApp.newDataValidation()
    .requireValueInRange(listSheet.getRange("C2:C"))
    .setAllowInvalid(true)
    .build();
  expenseSheet.getRange(4, 8, lastRow - 3, 1).setDataValidation(curRule);
  
  // Col 10 (J): Account -> DropdownLists!B2:B
  var accRule = SpreadsheetApp.newDataValidation()
    .requireValueInRange(listSheet.getRange("B2:B"))
    .setAllowInvalid(true)
    .build();
  expenseSheet.getRange(4, 10, lastRow - 3, 1).setDataValidation(accRule);

  // Col 11 (K): Payment Channel -> DropdownLists!E2:E
  var chanRule = SpreadsheetApp.newDataValidation()
    .requireValueInRange(listSheet.getRange("E2:E"))
    .setAllowInvalid(true)
    .build();
  expenseSheet.getRange(4, 11, lastRow - 3, 1).setDataValidation(chanRule);
  
  // Freeze Header Row 3
  expenseSheet.setFrozenRows(3);
  
  // Auto-Filter on Row 3
  try {
    var existingFilter = expenseSheet.getFilter();
    if (!existingFilter) {
      expenseSheet.getRange(3, 1, lastRow - 2, 14).createFilter();
    }
  } catch(e) {}
}

/**
 * Applies executive styling, column widths, number formatting, and alternating zebra rows to Expense
 */
function formatExpenseLedger(ss) {
  var sheet = ss.getSheetByName('Expense');
  if (!sheet) return;

  var lastRow = sheet.getLastRow();
  if (lastRow < 3) return;

  // Set Optimal Column Widths
  var colWidths = [110, 115, 145, 130, 210, 240, 115, 85, 130, 145, 155, 115, 180, 220];
  for (var c = 0; c < colWidths.length; c++) {
    sheet.setColumnWidth(c + 1, colWidths[c]);
  }

  // Row 1 & 2 Badges
  sheet.getRange(1, 1, 1, 14).setBackground("#0f172a").setFontColor("#38bdf8").setFontWeight("bold");
  sheet.getRange(2, 1, 1, 14).setBackground("#1e293b").setFontColor("#94a3b8").setFontSize(9);

  // Header Row 3 (High-Contrast Navy)
  sheet.getRange(3, 1, 1, 14)
    .setBackground('#0f172a')
    .setFontColor('#ffffff')
    .setFontWeight('bold')
    .setFontSize(10);
  sheet.setRowHeight(3, 32);

  // Data Formatting: Amount (Col 7) and PKR Equivalent (Col 9)
  sheet.getRange(4, 7, lastRow - 3, 1).setNumberFormat('#,##0.00').setHorizontalAlignment('right');
  sheet.getRange(4, 9, lastRow - 3, 1).setNumberFormat('#,##0.00').setHorizontalAlignment('right');

  // Alignments: Date (1), Billing Month (2), Currency (8), Phone (12) -> Center
  sheet.getRange(4, 1, lastRow - 3, 1).setHorizontalAlignment('center');
  sheet.getRange(4, 2, lastRow - 3, 1).setHorizontalAlignment('center');
  sheet.getRange(4, 8, lastRow - 3, 1).setHorizontalAlignment('center');
  sheet.getRange(4, 12, lastRow - 3, 1).setHorizontalAlignment('center');

  // Set Row Heights for data
  sheet.setRowHeights(4, lastRow - 3, 24);

  // Apply Alternating Row Colors (Zebra Striping)
  try {
    var bandings = sheet.getRange(4, 1, lastRow - 3, 14).getBandings();
    if (bandings.length === 0) {
      sheet.getRange(4, 1, lastRow - 3, 14).applyRowBanding(SpreadsheetApp.BandingTheme.LIGHT_GREY);
    }
  } catch(e) {}
}

/**
 * Formats Summary sheet with clean KPI badges, borders, and currency numbers
 */
function formatSummarySheet(ss) {
  var sheet = ss.getSheetByName('Summary');
  if (!sheet) return;

  sheet.setColumnWidth(1, 240);
  sheet.setColumnWidth(2, 160);
  sheet.setColumnWidth(3, 180);
  sheet.setColumnWidth(4, 300);

  // Title Row
  sheet.getRange("A1:G1").setFontSize(13).setFontWeight("bold").setBackground("#0f172a").setFontColor("#38bdf8");
  sheet.getRange("A2:G2").setFontSize(9).setFontStyle("italic").setBackground("#1e293b").setFontColor("#94a3b8");

  // Section Headers
  sheet.getRange("A4:D4").setFontSize(10).setFontWeight("bold").setBackground("#0f172a").setFontColor("#ffffff");
  sheet.getRange("A12:G12").setFontSize(10).setFontWeight("bold").setBackground("#0f172a").setFontColor("#ffffff");
  sheet.getRange("A24:D24").setFontSize(10).setFontWeight("bold").setBackground("#0f172a").setFontColor("#ffffff");
}

/**
 * Sets distinctive aesthetic tab colors
 */
function setTabColors(ss) {
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
 * Dynamic Missing Item Auto-Adder:
 * If you type any new Category, Account, Currency, Student, or Channel in Expense,
 * it automatically appends it to DropdownLists so it becomes available in the dropdown forever!
 */
function onEdit(e) {
  if (!e || !e.range) return;
  var range = e.range;
  var sheet = range.getSheet();
  if (sheet.getName() !== 'Expense') return;
  
  var col = range.getColumn();
  var val = String(e.value || '').trim();
  if (!val || range.getRow() <= 3) return;
  
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
 * Process parsed Google Sheet rows and insert into IndexedDB with deduplication
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

  const existingTx = await db.transactions.toArray();
  let importedCount = 0;
  let duplicateCount = 0;

  // Assume standard columns: Date, Amount, Description/Merchant, Category, Currency, Account
  for (let i = 1; i < cleanRows.length; i++) {
    const row = cleanRows[i];
    if (!row || row.length === 0 || !row[0]) continue;

    const rawDate = String(row[0]).trim();
    if (rawDate === '' || rawDate === '-' || rawDate === '?') continue;

    const rawAmount = parseFloat(String(row[1]).replace(/[^0-9.-]/g, ''));
    if (isNaN(rawAmount) || rawAmount === 0) continue;

    const description = String(row[2] || '').trim();
    const category = String(row[3] || 'Expense').trim();
    const currency = (String(row[4] || 'PKR').trim().toUpperCase() as Currency) || 'PKR';
    const accountId = String(row[5] || 'al-habib-pkr').trim();

    // Check for duplicates
    const exactMatch = await checkExactDuplicate(rawDate, rawAmount, currency, accountId, description);
    if (exactMatch) {
      duplicateCount++;
      continue;
    }

    const fuzzyMatch = await checkFuzzyDuplicate(rawDate, rawAmount, currency);
    if (fuzzyMatch) {
      duplicateCount++;
      continue;
    }

    const converted = await convertToPKR(rawAmount, currency);

    const tx: Transaction = {
      id: `gsheet-${Date.now()}-${i}`,
      date: rawDate,
      type: rawAmount < 0 ? 'EXPENSE' : 'EXPENSE',
      amount: Math.abs(rawAmount),
      currency,
      convertedAmountPKR: converted.amountPKR,
      fxRateUsed: converted.fxRate,
      category,
      merchantOrRecipient: description,
      sourceAccountId: accountId,
      description: `Synced from Google Sheet (${description})`,
      status: 'CONFIRMED',
      sourceChannel: 'EXCEL'
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
