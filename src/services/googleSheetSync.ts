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
    if (raw) return JSON.parse(raw);
  } catch {}
  return {
    sheetId: DEFAULT_SHEET_ID,
    sheetUrl: DEFAULT_SHEET_URL,
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
 * This creates a 100% private zero-cloud-setup HTTP endpoint to read and write rows.
 */
export function getAppsScriptSnippet(): string {
  return `/**
 * Sada Hisab - Secure Google Apps Script 2-Way Sync Bridge
 * Paste this in your Google Sheet: Extensions > Apps Script > Deploy as Web App.
 */

function doGet(e) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName("Expense") || ss.getSheets()[0];
  var data = sheet.getDataRange().getValues();
  
  return ContentService.createTextOutput(JSON.stringify({
    success: true,
    sheetName: sheet.getName(),
    rows: data,
    timestamp: new Date().toISOString()
  })).setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  try {
    var payload = JSON.parse(e.postData.contents);
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName(payload.sheetName || "Expense");
    if (!sheet) sheet = ss.insertSheet(payload.sheetName || "Expense");
    
    if (payload.action === "APPEND_ROWS" && payload.rows) {
      for (var i = 0; i < payload.rows.length; i++) {
        sheet.appendRow(payload.rows[i]);
      }
    }
    
    return ContentService.createTextOutput(JSON.stringify({
      success: true,
      message: "Synced " + (payload.rows ? payload.rows.length : 0) + " rows successfully."
    })).setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
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
  if (rows.length < 2) {
    return {
      success: true,
      importedCount: 0,
      duplicateCount: 0,
      message: 'Google Sheet appears empty or has only a header row.'
    };
  }

  const existingTx = await db.transactions.toArray();
  let importedCount = 0;
  let duplicateCount = 0;

  // Assume standard columns: Date, Amount, Description/Merchant, Category, Currency, Account
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
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
