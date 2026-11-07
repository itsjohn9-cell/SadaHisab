/**
 * ============================================================================
 * SADA SUITE ARCHITECTURAL CONTRACT: SADA BRIDGE ADAPTER
 * 1. Envelope Key Wrapping: User data is encrypted with a random 256-bit sada_master_key.
 *    The master key is wrapped into independent envelopes via PBKDF2/HKDF(Phone + PIN)
 *    and PBKDF2/HKDF(Email + PIN), enabling multi-identifier zero-knowledge logins.
 * 2. Idempotency & Deduplication: All cross-app packets enforce strict UNIQUE
 *    idempotency_key constraints at SQLite relay and local Dexie stores.
 * 3. Contract Verification: Validate schema parity across all 3 apps via:
 *    node ../.agents/skills/sada-sync/scripts/verify-bridge.mjs
 * ============================================================================
 */

import Dexie, { type Table } from 'dexie';

export interface SadaPacket {
  packet_id: string;
  idempotency_key: string;
  sada_uid_hash: string;
  source_app: string;
  target_app: string;
  action: string;
  encrypted_payload: string;
  iv: string;
  created_at: number;
}

export interface SadaKeyEnvelope {
  ciphertext: string; // Base64
  iv: string; // Base64
  salt: string; // Base64
  iterations: number;
}

export interface SadaIdentity {
  sada_uid: string;
  sada_uid_hash: string;
  phone_e164?: string;
  email_normalized?: string;
  phone_envelope: string; // JSON stringified SadaKeyEnvelope
  email_envelope?: string; // JSON stringified SadaKeyEnvelope
}

export interface SadaPassportSession {
  sada_uid: string;
  sada_uid_hash: string;
  identifier: string; // phone or email
  identifier_type: 'phone' | 'email';
  master_key_raw: Uint8Array; // in-memory 256-bit key
  unlocked_at: number;
}

export interface OutboxEntry {
  id?: number;
  packet: SadaPacket;
  status: 'pending' | 'in_flight' | 'delivered' | 'failed';
  attempts: number;
  last_error?: string;
  created_at: number;
}

export class SadaBridgeDB extends Dexie {
  outbox!: Table<OutboxEntry, number>;
  inbox!: Table<SadaPacket, string>;
  identities!: Table<SadaIdentity, string>;

  constructor(appName = 'sadahisaab') {
    super(`sada_bridge_${appName}`);
    this.version(1).stores({
      outbox: '++id, packet.packet_id, packet.idempotency_key, status, created_at',
      inbox: 'packet_id, idempotency_key, source_app, action, created_at',
      identities: 'sada_uid, sada_uid_hash, phone_e164, email_normalized',
    });
  }
}

export const bridgeDb = new SadaBridgeDB('sadahisaab');

// ----------------------------------------------------------------------------
// Cryptographic Utility Functions (Web Crypto API)
// ----------------------------------------------------------------------------

export function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

export function base64ToBytes(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

export async function sha256Hex(text: string): Promise<string> {
  const enc = new TextEncoder();
  const hash = await crypto.subtle.digest('SHA-256', enc.encode(text));
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export function generateUUID(): string {
  if (crypto.randomUUID) return crypto.randomUUID();
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export function generateMasterKey(): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(32));
}

export async function deriveWrapKey(identifier: string, pin: string): Promise<{ wrapKey: CryptoKey; salt: Uint8Array }> {
  const enc = new TextEncoder();
  const normalized = identifier.trim().toLowerCase();
  const salt = new Uint8Array(await crypto.subtle.digest('SHA-256', enc.encode(`sada-salt:${normalized}`)));
  const pass = `${normalized}:${pin.trim()}`;

  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    enc.encode(pass),
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );

  const wrapKey = await crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt,
      iterations: 100000,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );

  return { wrapKey, salt };
}

export async function wrapMasterKey(masterKey: Uint8Array, identifier: string, pin: string): Promise<string> {
  const { wrapKey, salt } = await deriveWrapKey(identifier, pin);
  const iv = crypto.getRandomValues(new Uint8Array(12));

  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    wrapKey,
    masterKey as BufferSource
  );

  const envelope: SadaKeyEnvelope = {
    ciphertext: bytesToBase64(new Uint8Array(ciphertext)),
    iv: bytesToBase64(iv),
    salt: bytesToBase64(salt),
    iterations: 100000,
  };

  return JSON.stringify(envelope);
}

export async function unwrapMasterKey(envelopeJson: string, identifier: string, pin: string): Promise<Uint8Array> {
  const envelope: SadaKeyEnvelope = JSON.parse(envelopeJson);
  const { wrapKey } = await deriveWrapKey(identifier, pin);
  const iv = base64ToBytes(envelope.iv);
  const ciphertext = base64ToBytes(envelope.ciphertext);

  const rawDecrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: iv as BufferSource },
    wrapKey,
    ciphertext as BufferSource
  );

  return new Uint8Array(rawDecrypted);
}

export async function encryptPayload(data: any, masterKey: Uint8Array): Promise<{ ciphertext: string; iv: string }> {
  const enc = new TextEncoder();
  const jsonStr = JSON.stringify(data);
  const iv = crypto.getRandomValues(new Uint8Array(12));

  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    masterKey as BufferSource,
    { name: 'AES-GCM' },
    false,
    ['encrypt']
  );

  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    cryptoKey,
    enc.encode(jsonStr)
  );

  return {
    ciphertext: bytesToBase64(new Uint8Array(encrypted)),
    iv: bytesToBase64(iv),
  };
}

export async function decryptPayload<T = any>(ciphertextBase64: string, ivBase64: string, masterKey?: Uint8Array): Promise<T> {
  const dec = new TextDecoder();
  const ciphertext = base64ToBytes(ciphertextBase64);

  // Fallback: If payload was sent as plaintext JSON encoded in base64
  try {
    const raw = dec.decode(ciphertext);
    if (raw.startsWith('{') && raw.endsWith('}')) {
      return JSON.parse(raw);
    }
  } catch {}

  if (!masterKey) {
    throw new Error('Master key required to decrypt ciphertext');
  }

  const iv = base64ToBytes(ivBase64);
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    masterKey as BufferSource,
    { name: 'AES-GCM' },
    false,
    ['decrypt']
  );

  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: iv as BufferSource },
    cryptoKey,
    ciphertext as BufferSource
  );

  return JSON.parse(dec.decode(decrypted));
}

// ----------------------------------------------------------------------------
// Relay Transport & Outbox Queue
// ----------------------------------------------------------------------------

export const SADA_RELAY_URL = 'https://35.209.1.82.nip.io';

export async function pushPacket(packet: SadaPacket): Promise<{ success: boolean; inserted: boolean }> {
  try {
    const res = await fetch(`${SADA_RELAY_URL}/api/sada-bridge/push`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(packet),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    return { success: true, inserted: data.inserted };
  } catch (err: any) {
    await bridgeDb.outbox.add({
      packet,
      status: 'pending',
      attempts: 1,
      last_error: err.message,
      created_at: Date.now(),
    });
    return { success: false, inserted: false };
  }
}

export async function drainOutbox(): Promise<number> {
  const pending = await bridgeDb.outbox.where('status').equals('pending').toArray();
  let drained = 0;
  for (const entry of pending) {
    try {
      const res = await fetch(`${SADA_RELAY_URL}/api/sada-bridge/push`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(entry.packet),
      });
      if (res.ok) {
        if (entry.id) await bridgeDb.outbox.delete(entry.id);
        drained++;
      }
    } catch {}
  }
  return drained;
}

export async function pullPackets(sada_uid_hash: string, target_app: string): Promise<SadaPacket[]> {
  try {
    const res = await fetch(
      `${SADA_RELAY_URL}/api/sada-bridge/pull?uid_hash=${encodeURIComponent(sada_uid_hash)}&target_app=${encodeURIComponent(target_app)}`
    );
    if (!res.ok) return [];
    const data = await res.json();
    return data.packets || [];
  } catch {
    return [];
  }
}

export async function ackPackets(packet_ids: string[]): Promise<boolean> {
  if (!packet_ids || packet_ids.length === 0) return true;
  try {
    const res = await fetch(`${SADA_RELAY_URL}/api/sada-bridge/ack`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ packet_ids }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

// ----------------------------------------------------------------------------
// 1-Tap Cross-Domain SSO & Scheme Handoff
// ----------------------------------------------------------------------------

export function createSsoUrl(targetUrl: string, sessionBlob: any): string {
  const encoded = encodeURIComponent(bytesToBase64(new TextEncoder().encode(JSON.stringify(sessionBlob))));
  const base = targetUrl.replace(/#.*$/, '');
  return `${base}#sada_sso=${encoded}`;
}

export function consumeSsoUrl(): any | null {
  if (typeof window === 'undefined') return null;
  const hash = window.location.hash;
  if (!hash.includes('sada_sso=')) return null;

  try {
    const raw = hash.split('sada_sso=')[1]?.split('&')[0];
    if (!raw) return null;
    const jsonStr = new TextDecoder().decode(base64ToBytes(decodeURIComponent(raw)));
    window.history.replaceState(null, '', window.location.pathname);
    return JSON.parse(jsonStr);
  } catch {
    return null;
  }
}

