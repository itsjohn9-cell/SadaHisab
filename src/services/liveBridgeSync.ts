/**
 * Live Bridge Sync Service for Sada Hisaab
 * Pulls encrypted packets (ADD_EXPENSE, ADD_INCOME) from SadaLink relay
 * and commits them directly into the local Dexie ledger.
 */

import { db, recalculateAllAccountBalances } from '../db/db';
import { Transaction, Currency } from '../types';
import { calculateBudgetForecast } from './budgetForecastEngine';
import { 
  pullPackets, 
  ackPackets, 
  pushPacket, 
  decryptPayload, 
  encryptPayload, 
  generateUUID, 
  sha256Hex, 
  deriveDeterministicMasterKey, 
  bridgeDb, 
  SadaPacket, 
  getActivePassportSession 
} from './sada-bridge';

let activeSyncInterval: any = null;

export async function processBridgePacket(packet: SadaPacket, masterKey: Uint8Array): Promise<boolean> {
  try {
    const payload = await decryptPayload(packet.encrypted_payload, packet.iv, masterKey);
    const today = new Date().toISOString().split('T')[0];

    // Handle batched items (e.g. from SadaFlow #hisaab slip note)
    if (Array.isArray(payload.items) && payload.items.length > 0) {
      const accounts = await db.accounts.toArray();
      for (let i = 0; i < payload.items.length; i++) {
        const item = payload.items[i];
        const amount = Number(item.amount) || 0;
        const currency = (item.currency || 'AED') as Currency;
        const defaultAccount = accounts.find((a) => a.currency === currency) || accounts[0];

        const tx: Transaction = {
          id: `${packet.idempotency_key}_item_${i}`,
          date: item.date || today,
          type: item.type === 'income' ? 'INCOME' : 'EXPENSE',
          amount,
          currency,
          convertedAmountPKR: amount,
          fxRateUsed: 1.0,
          category: item.category || 'Notes Slip',
          merchantOrRecipient: item.description || 'SadaFlow Slip',
          description: `Synced from FLOW: ${item.description || ''}`,
          status: 'CONFIRMED',
          sourceAccountId: defaultAccount?.id || 'cash_wallet',
          sourceChannel: 'MANUAL',
        };
        await db.transactions.put(tx);
      }
      await recalculateAllAccountBalances();
      broadcastBudgetSnapshot().catch(() => {});
      return true;
    }

    const amount = Number(payload.amount) || 0;
    const currency = (payload.currency || 'PKR') as Currency;
    const isIncome = packet.action === 'ADD_INCOME' || payload.type === 'income';

    // Find default cash account or first active account
    const accounts = await db.accounts.toArray();
    const defaultAccount = accounts.find((a) => a.currency === currency) || accounts[0];

    const transaction: Transaction = {
      id: packet.idempotency_key, // Enforces line-level deduplication
      date: payload.date || today,
      type: isIncome ? 'INCOME' : 'EXPENSE',
      amount,
      currency,
      convertedAmountPKR: amount, // Defaults 1:1, FX recalculator will normalize
      fxRateUsed: 1.0,
      category: payload.category || (isIncome ? 'Income' : 'General'),
      merchantOrRecipient: payload.description || payload.merchant || 'Sada Suite Bridge',
      description: `Synced from ${packet.source_app.toUpperCase()}: ${payload.description || ''}`,
      status: 'CONFIRMED',
      sourceAccountId: defaultAccount?.id || 'cash_wallet',
      sourceChannel: 'MANUAL',
    };

    // Commit to Dexie
    await db.transactions.put(transaction);
    await recalculateAllAccountBalances();
    return true;
  } catch (err) {
    console.warn('[liveBridgeSync] Failed to process packet:', err);
    return false;
  }
}

/**
 * Broadcasts latest budget, cash balance, and burn rate forecast to SadaFlow and suite apps
 */
export async function broadcastBudgetSnapshot(explicitSnapshot?: {
  totalBalancePKR?: number;
  totalAED?: number;
  totalUSD?: number;
  accountsCount?: number;
  dailyBurnRate?: number;
  projectedMonthEndSpend?: number;
  budgetStatus?: string;
}): Promise<void> {
  try {
    const session = getActivePassportSession();
    const identifier = session?.identifier || 'sadahisab_user';
    const uidHash = session?.sada_uid_hash || await sha256Hex(identifier);
    const masterKey = session?.master_key_raw || await deriveDeterministicMasterKey(identifier);

    let snapshotPayload = explicitSnapshot;
    if (!snapshotPayload) {
      const accounts = await db.accounts.toArray();
      const transactions = await db.transactions.toArray();
      const forecast = calculateBudgetForecast(transactions, 5000, 'AED');

      const aedAccount = accounts.find((a) => a.currency === 'AED');
      const pkrAccount = accounts.find((a) => a.currency === 'PKR');

      snapshotPayload = {
        totalAED: aedAccount?.currentBalance || 0,
        totalBalancePKR: pkrAccount?.currentBalance || 0,
        dailyBurnRate: forecast.dailyBurnRate,
        projectedMonthEndSpend: forecast.projectedMonthEndSpend,
        budgetStatus: forecast.status,
        accountsCount: accounts.length
      };
    }

    const payload = { ...snapshotPayload, receivedAt: Date.now() };
    localStorage.setItem('sada_hisaab_snapshot', JSON.stringify(payload));
    window.dispatchEvent(new CustomEvent('sada:hisaab_snapshot', { detail: payload }));

    const { ciphertext, iv } = await encryptPayload(payload, masterKey);
    await pushPacket({
      packet_id: generateUUID(),
      idempotency_key: `hisaab_budget_${Date.now()}`,
      sada_uid_hash: uidHash,
      source_app: 'sadahisaab',
      target_app: 'sadaflow',
      action: 'BUDGET_SNAPSHOT' as any,
      encrypted_payload: ciphertext,
      iv,
      created_at: Date.now(),
    });
  } catch (e) {
    console.warn('[liveBridgeSync] Failed to broadcast budget snapshot:', e);
  }
}

/**
 * Broadcasts updated live FX rate cache to SadaFlow and SadaLink
 */
export async function broadcastFXRates(rates: Record<string, number>): Promise<void> {
  try {
    const session = getActivePassportSession();
    const identifier = session?.identifier || 'sadahisab_user';
    const uidHash = session?.sada_uid_hash || await sha256Hex(identifier);
    const masterKey = session?.master_key_raw || await deriveDeterministicMasterKey(identifier);

    const { ciphertext, iv } = await encryptPayload({ rates, updatedAt: Date.now() }, masterKey);
    
    for (const target_app of ['sadaflow', 'sadalink'] as const) {
      await pushPacket({
        packet_id: generateUUID(),
        idempotency_key: `hisaab_fx_${target_app}_${Date.now()}`,
        sada_uid_hash: uidHash,
        source_app: 'sadahisaab',
        target_app,
        action: 'FX_RATES_SYNC',
        encrypted_payload: ciphertext,
        iv,
        created_at: Date.now(),
      });
    }
  } catch (e) {
    console.warn('[liveBridgeSync] Failed to broadcast FX rates:', e);
  }
}

export async function syncOnce(sada_uid_hash?: string, masterKey?: Uint8Array): Promise<number> {
  try {
    let uidHash = sada_uid_hash;
    let key = masterKey;

    if (!uidHash || !key) {
      const session = getActivePassportSession();
      if (session) {
        uidHash = session.sada_uid_hash;
        key = session.master_key_raw;
      }
    }

    // Strict security check: NEVER pull without a verified per-user identity and master key
    if (!uidHash || !key || uidHash === 'suite_global_sync') {
      return 0;
    }

    const packets = await pullPackets(uidHash, 'sadahisaab');
    if (!packets || packets.length === 0) return 0;

    const ackIds: string[] = [];
    for (const packet of packets) {
      const ok = await processBridgePacket(packet, key);
      if (ok) {
        ackIds.push(packet.packet_id);
      }
    }

    if (ackIds.length > 0) {
      await ackPackets(ackIds);
    }

    return ackIds.length;
  } catch (err) {
    console.warn('[liveBridgeSync] Sync error:', err);
    return 0;
  }
}

export function startLiveBridgeListener(sada_uid_hash?: string, masterKey?: Uint8Array, intervalMs = 15000): () => void {
  if (activeSyncInterval) clearInterval(activeSyncInterval);

  let uidHash = sada_uid_hash;
  let key = masterKey;

  if (!uidHash || !key) {
    const session = getActivePassportSession();
    if (session) {
      uidHash = session.sada_uid_hash;
      key = session.master_key_raw;
    }
  }

  if (!uidHash || !key || uidHash === 'suite_global_sync') {
    // Session not authenticated yet; listener will be triggered once SSO or login completes
    return () => {};
  }

  // Immediate pull
  syncOnce(uidHash, key);

  activeSyncInterval = setInterval(() => {
    syncOnce(uidHash, key);
  }, intervalMs);

  return () => {
    if (activeSyncInterval) {
      clearInterval(activeSyncInterval);
      activeSyncInterval = null;
    }
  };
}

