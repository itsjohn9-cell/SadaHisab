/**
 * Live Bridge Sync Service for Sada Hisaab
 * Pulls encrypted packets (ADD_EXPENSE, ADD_INCOME) from SadaLink relay
 * and commits them directly into the local Dexie ledger.
 */

import { db, recalculateAllAccountBalances } from '../db/db';
import { Transaction, Currency } from '../types';
import { pullPackets, ackPackets, decryptPayload, bridgeDb, SadaPacket } from './sada-bridge';

let activeSyncInterval: any = null;

export async function processBridgePacket(packet: SadaPacket, masterKey?: Uint8Array): Promise<boolean> {
  try {
    const payload = await decryptPayload(packet.encrypted_payload, packet.iv, masterKey);
    const today = new Date().toISOString().split('T')[0];

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

export async function syncOnce(sada_uid_hash?: string, masterKey?: Uint8Array): Promise<number> {
  try {
    // If no credentials passed, check cached identity in bridgeDb, otherwise default to suite_global_sync
    let uidHash = sada_uid_hash;
    let key = masterKey;

    if (!uidHash) {
      const identities = await bridgeDb.identities.toArray();
      if (identities.length > 0) {
        uidHash = identities[0].sada_uid_hash;
      } else {
        uidHash = 'suite_global_sync';
      }
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

  // Immediate pull
  syncOnce(sada_uid_hash, masterKey);

  activeSyncInterval = setInterval(() => {
    syncOnce(sada_uid_hash, masterKey);
  }, intervalMs);

  return () => {
    if (activeSyncInterval) {
      clearInterval(activeSyncInterval);
      activeSyncInterval = null;
    }
  };
}
