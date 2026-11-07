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
 * This provides dynamic dropdowns, auto-filters, auto-adding missing items, and 2-way sync.
 */
export function getAppsScriptSnippet(): string {
  return `/**
 * =========================================================================
 * Sada Hisab - Master Executive Google Sheet & Automation Engine
 * =========================================================================
 * 
 * Instructions:
 * 1. Open your Google Sheet: https://docs.google.com/spreadsheets/d/1UybhQ6dyrudvKTqgGF7yXy2Y8m6XILTNRJus5r-leUQ
 * 2. If you imported "SadaHisab-Master-Organized-Workbook.xlsx" (File > Import > Upload > "Replace spreadsheet"),
 *    run "setupDropdownsAndFilters" to activate dynamic dropdowns and auto-filters.
 * 3. Any new Category, Account, Currency, or Student you type in "Expense" will automatically
 *    be remembered and added to your "DropdownLists" tab!
 */

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('⚡ Sada Hisab Hub')
    .addItem('🔄 Refresh Dropdowns, Validations & Auto-Filters', 'setupDropdownsAndFilters')
    .addItem('✨ Clean & Format Expense Ledger', 'formatExpenseLedger')
    .addToUi();
}

/**
 * Sets up the DropdownLists tab, Data Validation dropdowns, Row 3 freeze, and Auto-Filters
 */
function setupDropdownsAndFilters() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var expenseSheet = ss.getSheetByName('Expense');
  if (!expenseSheet) {
    try {
      SpreadsheetApp.getUi().alert('Please ensure your "Expense" sheet exists first. Tip: Import "SadaHisab-Master-Organized-Workbook.xlsx" via File > Import.');
    } catch(e) {}
    return;
  }
  
  // 1. Create or get DropdownLists sheet
  var listSheet = ss.getSheetByName('DropdownLists');
  if (!listSheet) {
    listSheet = ss.insertSheet('DropdownLists');
  }
  
  // Master lists
  var defaultCats = ["Bill Payment","Children","Donation","Education","Grocery","Health / Medicine","Jhone","Misc","Mobile","Rohia","School","Van","Wife"];
  var defaultAccs = ["ADCB - AED","Al Habib - Rs","Cash in Wallet","HBL","Nayapay","PKR","SCB","Wise - USD"];
  var defaultCurs = ["AED","GBP","PKR","USD"];
  var defaultSubs = ["Aiza d/o Shokat Ali","Amir Hussain s/o Nasir Hussain","August","Azra Batool  D/O Hidayat Ali","Bais Ali","Hussain Mehdi","Kumail Abbas s/o Rustam Ali","Lubna d/o Shokat Ali","Maulana's","Muhammad Shoaib s/o Ali Madad","Raees Hassan s/o Sarfaraz Ali","Saiqa","Sanullah s/o Asghar Ali","Shaneela","Zehra Batool D/O Hidayat Ali"];
  var defaultChans = ["Direct Bank Transfer","Cash","Credit Card","Easypaisa","JazzCash","Nayapay","Online Banking"];

  // Read existing lists if present
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
  
  // In the Master 14-Column Expense sheet:
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

  formatExpenseLedger();

  try {
    SpreadsheetApp.getUi().alert('🎉 Success! Master Dropdowns (Category, Account, Currency, Student, Channel) and Auto-Filters are active on Row 3!');
  } catch(e) {}
}

/**
 * Applies executive styling to the Expense Ledger
 */
function formatExpenseLedger() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName('Expense');
  if (!sheet) return;

  var lastRow = sheet.getLastRow();
  if (lastRow < 3) return;

  // Header Row 3
  sheet.getRange(3, 1, 1, 14)
    .setBackground('#0f172a')
    .setFontColor('#f8fafc')
    .setFontWeight('bold');

  // Amount columns formatting: Col 7 (Amount) & Col 9 (PKR Equivalent)
  sheet.getRange(4, 7, lastRow - 3, 1).setNumberFormat('#,##0.00');
  sheet.getRange(4, 9, lastRow - 3, 1).setNumberFormat('#,##0.00');
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
