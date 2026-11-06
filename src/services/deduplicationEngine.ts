import { db } from '../db/db';
import { Transaction, PotentialDuplicateMatch, Currency, TransactionType } from '../types';
import { bytesToHex } from './cryptoSecurity';

// Normalize string for hash computation
function normalizeStr(str?: string): string {
  if (!str) return '';
  return str.toLowerCase().replace(/[^a-z0-9]/g, '');
}

// Tier 1: Compute Exact Deterministic Fingerprint (SHA-256)
export async function computeTransactionDedupeHash(
  date: string,
  amount: number,
  currency: Currency,
  sourceAccountId?: string,
  merchantOrRecipient?: string
): Promise<string> {
  const normDate = date.trim();
  const normAmount = (Math.round(amount * 100) / 100).toFixed(2);
  const normCurrency = currency.toUpperCase();
  const normAccount = normalizeStr(sourceAccountId);
  const normMerchant = normalizeStr(merchantOrRecipient);

  const rawFingerprint = `${normDate}|${normAmount}|${normCurrency}|${normAccount}|${normMerchant}`;
  const enc = new TextEncoder();
  const digestBuffer = await window.crypto.subtle.digest('SHA-256', enc.encode(rawFingerprint));
  return bytesToHex(new Uint8Array(digestBuffer));
}

// Tier 1 Check: Find exact deterministic duplicate
export async function checkExactDuplicate(
  date: string,
  amount: number,
  currency: Currency,
  sourceAccountId?: string,
  merchantOrRecipient?: string
): Promise<Transaction | null> {
  const hash = await computeTransactionDedupeHash(date, amount, currency, sourceAccountId, merchantOrRecipient);
  const match = await db.transactions.where('dedupeHash').equals(hash).first();
  if (match) return match;

  // Fallback check against fields directly
  const normAmount = Math.round(amount * 100) / 100;
  const candidates = await db.transactions
    .where('date')
    .equals(date)
    .filter(t => t.currency === currency && Math.abs(t.amount - normAmount) < 0.01 && normalizeStr(t.merchantOrRecipient) === normalizeStr(merchantOrRecipient))
    .toArray();

  return candidates.length > 0 ? candidates[0] : null;
}

// Tier 2: Cross-Channel Fuzzy Collision Detector (±2 Days Window)
export async function checkFuzzyDuplicate(
  date: string,
  amount: number,
  currency: Currency
): Promise<PotentialDuplicateMatch | null> {
  const targetDate = new Date(date).getTime();
  const twoDaysMs = 2 * 24 * 60 * 60 * 1000;
  const targetAmount = Math.round(amount * 100) / 100;

  // Fetch transactions around date range
  const allTxs = await db.transactions.toArray();
  for (const existing of allTxs) {
    const exDate = new Date(existing.date).getTime();
    const diffMs = Math.abs(targetDate - exDate);
    const diffDays = Math.round(diffMs / (24 * 60 * 60 * 1000));

    if (diffMs <= twoDaysMs) {
      // Check exact currency match
      if (existing.currency === currency) {
        const amtDiff = Math.abs(existing.amount - targetAmount);
        const percentDiff = targetAmount > 0 ? (amtDiff / targetAmount) * 100 : 0;

        if (percentDiff <= 1.5) { // Within 1.5% variance or exact
          return {
            existingTransaction: existing,
            incomingTransaction: { date, amount, currency },
            matchReason: amtDiff < 0.01 
              ? `Exact amount (${currency} ${targetAmount}) found ${diffDays === 0 ? 'on the same day' : `${diffDays} day(s) apart`}`
              : `Amount within 1.5% variance (${currency} ${existing.amount} vs ${targetAmount})`,
            dateDiffDays: diffDays,
            amountDiffPercent: Math.round(percentDiff * 10) / 10
          };
        }
      }
    }
  }

  return null;
}

// Tier 2: Merge Incoming Receipt / Image / Notes into Existing Transaction
export async function mergeWithExistingTransaction(
  existingId: string,
  incomingData: {
    receiptThumbnail?: string;
    receiptBlobId?: string;
    extraNote?: string;
  }
): Promise<void> {
  const existing = await db.transactions.get(existingId);
  if (!existing) return;

  const notes = existing.healingNotes || [];
  if (incomingData.extraNote) {
    notes.push(`[Merged Scanned Receipt]: ${incomingData.extraNote}`);
  }

  await db.transactions.update(existingId, {
    receiptThumbnail: incomingData.receiptThumbnail || existing.receiptThumbnail,
    receiptBlobId: incomingData.receiptBlobId || existing.receiptBlobId,
    healingNotes: notes
  });
}

// Tier 3: Transfer & Credit Card Double-Count Guard
export async function linkOrPreventDoubleCountTransfer(
  tx: Partial<Transaction>
): Promise<{ isLinked: boolean; linkedId?: string; guardMessage?: string }> {
  if (tx.type !== 'TRANSFER' && tx.type !== 'CREDIT_CARD_PAYMENT') {
    return { isLinked: false };
  }

  const targetDate = new Date(tx.date || '').getTime();
  const twoDaysMs = 2 * 24 * 60 * 60 * 1000;
  const targetAmt = tx.amount || 0;

  // Search for an opposing transfer with same amount in adjacent accounts
  const candidates = await db.transactions
    .where('type')
    .equals(tx.type)
    .toArray();

  for (const existing of candidates) {
    const exDate = new Date(existing.date).getTime();
    if (Math.abs(targetDate - exDate) <= twoDaysMs && Math.abs(existing.amount - targetAmt) < 0.05) {
      if (existing.sourceAccountId === tx.destinationAccountId || existing.destinationAccountId === tx.sourceAccountId) {
        return {
          isLinked: true,
          linkedId: existing.id,
          guardMessage: `Detected matching reciprocal transfer (${existing.merchantOrRecipient}). Linked automatically to prevent double-counting!`
        };
      }
    }
  }

  return { isLinked: false };
}
