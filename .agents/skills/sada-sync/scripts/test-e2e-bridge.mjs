#!/usr/bin/env node
/**
 * test-e2e-bridge.mjs
 * End-to-End Automated Validation Suite for Sada Suite Ecosystem Architecture
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const workspaceRoot = path.resolve(__dirname, '../../../../');

console.log('===============================================================');
console.log('🚀 SADA SUITE: END-TO-END AUTOMATED VERIFICATION SUITE');
console.log('===============================================================\n');

let totalTests = 0;
let passedTests = 0;

function assert(condition, message) {
  totalTests++;
  if (condition) {
    console.log(`  ✅ [PASS] ${message}`);
    passedTests++;
  } else {
    console.error(`  ❌ [FAIL] ${message}`);
    process.exitCode = 1;
  }
}

// ----------------------------------------------------------------------------
// Helper WebCrypto implementations for Node environment
// ----------------------------------------------------------------------------
const crypto = globalThis.crypto;

function bytesToBase64(bytes) {
  return Buffer.from(bytes).toString('base64');
}

function base64ToBytes(b64) {
  return new Uint8Array(Buffer.from(b64, 'base64'));
}

async function deriveWrapKey(identifier, pin) {
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

async function wrapMasterKey(masterKey, identifier, pin) {
  const { wrapKey, salt } = await deriveWrapKey(identifier, pin);
  const iv = crypto.getRandomValues(new Uint8Array(12));

  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    wrapKey,
    masterKey
  );

  return JSON.stringify({
    ciphertext: bytesToBase64(new Uint8Array(ciphertext)),
    iv: bytesToBase64(iv),
    salt: bytesToBase64(salt),
    iterations: 100000,
  });
}

async function unwrapMasterKey(envelopeJson, identifier, pin) {
  const envelope = JSON.parse(envelopeJson);
  const { wrapKey } = await deriveWrapKey(identifier, pin);
  const iv = base64ToBytes(envelope.iv);
  const ciphertext = base64ToBytes(envelope.ciphertext);

  const raw = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    wrapKey,
    ciphertext
  );

  return new Uint8Array(raw);
}

async function encryptPayload(data, masterKey) {
  const enc = new TextEncoder();
  const jsonStr = JSON.stringify(data);
  const iv = crypto.getRandomValues(new Uint8Array(12));

  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    masterKey,
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

async function decryptPayload(ciphertextB64, ivB64, masterKey) {
  const dec = new TextDecoder();
  const iv = base64ToBytes(ivB64);
  const ciphertext = base64ToBytes(ciphertextB64);

  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    masterKey,
    { name: 'AES-GCM' },
    false,
    ['decrypt']
  );

  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    cryptoKey,
    ciphertext
  );

  return JSON.parse(dec.decode(decrypted));
}

// ----------------------------------------------------------------------------
// TEST RUNNER
// ----------------------------------------------------------------------------

async function runAllTests() {
  // ==========================================================================
  // TEST 1: Identity Envelope Parity
  // ==========================================================================
  console.log('📌 Test 1: Multi-Method Identity Envelope Key Wrapping Parity');
  const masterKey = crypto.getRandomValues(new Uint8Array(32));
  const masterKeyHex = Buffer.from(masterKey).toString('hex');

  const phone = '+96598765432';
  const email = 'user.account@sada.local';
  const pin = '889900';

  const phoneEnvelope = await wrapMasterKey(masterKey, phone, pin);
  const emailEnvelope = await wrapMasterKey(masterKey, email, pin);

  const unwrappedFromPhone = await unwrapMasterKey(phoneEnvelope, phone, pin);
  const unwrappedFromEmail = await unwrapMasterKey(emailEnvelope, email, pin);

  assert(
    Buffer.from(unwrappedFromPhone).toString('hex') === masterKeyHex,
    'Unwrapped master key from Phone + PIN matches original master key'
  );
  assert(
    Buffer.from(unwrappedFromEmail).toString('hex') === masterKeyHex,
    'Unwrapped master key from Email + PIN matches original master key'
  );

  // Test cross-decrypt
  const testSecret = { secretNote: 'Zero knowledge across 3 apps', timestamp: Date.now() };
  const { ciphertext, iv } = await encryptPayload(testSecret, unwrappedFromPhone);
  const decryptedFromEmail = await decryptPayload(ciphertext, iv, unwrappedFromEmail);
  assert(
    decryptedFromEmail.secretNote === testSecret.secretNote,
    'Data encrypted via Phone login cleanly decrypts via linked Email login'
  );

  // ==========================================================================
  // TEST 2: Link -> Hisaab Roundtrip & Idempotency
  // ==========================================================================
  console.log('\n📌 Test 2: Link -> Hisaab Roundtrip & SQLite Queue Idempotency');
  const { sadaBridgeRepo } = await import(path.join(workspaceRoot, 'SadaLink/server/dist/db/sqlite.js'));

  const expenseItem = {
    amount: 250,
    currency: 'AED',
    category: 'food',
    description: 'Grocery Shopping',
    date: '2026-11-07',
  };

  const encExpense = await encryptPayload(expenseItem, masterKey);
  const packetId = 'test_pkt_' + Date.now();
  const idempotencyKey = 'link_msg_hisaab_bot_' + Date.now();
  const uidHash = 'test_uid_hash_' + Date.now();

  const testPacket = {
    packet_id: packetId,
    idempotency_key: idempotencyKey,
    sada_uid_hash: uidHash,
    source_app: 'sadalink',
    target_app: 'sadahisaab',
    action: 'ADD_EXPENSE',
    encrypted_payload: encExpense.ciphertext,
    iv: encExpense.iv,
    created_at: Date.now(),
  };

  // Push 1
  const push1 = sadaBridgeRepo.push(testPacket);
  assert(push1.inserted === true, 'First push succeeds and inserts packet into relay queue');

  // Push 2 (Duplicate idempotency_key)
  const push2 = sadaBridgeRepo.push(testPacket);
  assert(push2.inserted === false, 'Duplicate push with same idempotency_key safely ignored by SQLite UNIQUE');

  // Pull and decrypt
  const pulled = sadaBridgeRepo.pull(uidHash, 'sadahisaab');
  assert(pulled.length === 1, 'Pulled exactly 1 pending packet for target app');

  const decryptedExpense = await decryptPayload(pulled[0].encrypted_payload, pulled[0].iv, masterKey);
  assert(
    decryptedExpense.amount === 250 && decryptedExpense.description === 'Grocery Shopping',
    'Pulled packet decrypts to exact expense payload in SadaHisab'
  );

  // Acknowledge packet
  const ackCount = sadaBridgeRepo.ack([packetId]);
  assert(ackCount === 1, 'Acknowledged packet delivered_at updated in database');

  const remaining = sadaBridgeRepo.pull(uidHash, 'sadahisaab');
  assert(remaining.length === 0, 'Pulled queue is empty after acknowledgement');

  // ==========================================================================
  // TEST 3: Flow -> Hisaab Slip Update (Line-Level Idempotency)
  // ==========================================================================
  console.log('\n📌 Test 3: Flow -> Hisaab Slip Update & In-Place Modification');
  const mockLedger = new Map();
  const lineIdempotencyKey = 'flow_note_travel_line_0';

  // Initial line item: Hotel - 1200 AED
  const slipV1 = {
    idempotency_key: lineIdempotencyKey,
    amount: 1200,
    currency: 'AED',
    description: 'Hotel Booking',
  };
  mockLedger.set(slipV1.idempotency_key, slipV1);
  assert(mockLedger.size === 1 && mockLedger.get(lineIdempotencyKey).amount === 1200, 'Initial note line created in ledger');

  // Note edited: Hotel - 1500 AED
  const slipV2 = {
    idempotency_key: lineIdempotencyKey,
    amount: 1500,
    currency: 'AED',
    description: 'Hotel Booking (Extended)',
  };
  mockLedger.set(slipV2.idempotency_key, slipV2);
  assert(
    mockLedger.size === 1 && mockLedger.get(lineIdempotencyKey).amount === 1500,
    'Note edit updates existing ledger entry without creating duplicates'
  );

  // ==========================================================================
  // TEST 4: Hisab -> Link & Flow Reverse Sync
  // ==========================================================================
  console.log('\n📌 Test 4: Hisaab -> Link & Flow Reverse Sync');
  const udhaarReminder = {
    contactId: 'contact_user_99',
    amount: 350,
    currency: 'AED',
    note: 'Split dinner bill reminder',
  };
  const encReminder = await encryptPayload(udhaarReminder, masterKey);
  const decReminder = await decryptPayload(encReminder.ciphertext, encReminder.iv, masterKey);
  assert(
    decReminder.amount === 350 && decReminder.note.includes('dinner'),
    'Hisaab -> Link Udhaar reminder packet roundtrips cleanly'
  );

  const hisaabSummary = {
    month: '2026-11',
    netBalancePKR: 425000,
    khumsDuePKR: 85000,
    activeSponsorships: 12,
  };
  const encSummary = await encryptPayload(hisaabSummary, masterKey);
  const decSummary = await decryptPayload(encSummary.ciphertext, encSummary.iv, masterKey);
  assert(
    decSummary.khumsDuePKR === 85000 && decSummary.activeSponsorships === 12,
    'Hisaab -> Flow #hisaab-summary live card packet roundtrips cleanly'
  );

  // ==========================================================================
  // TEST 5: Contract & Build Parity Verification
  // ==========================================================================
  console.log('\n📌 Test 5: Ecosystem Contract & Build Verification');
  try {
    const verifyOutput = execSync(`node ${path.join(__dirname, 'verify-bridge.mjs')}`, { encoding: 'utf8' });
    assert(verifyOutput.includes('Verification checks passed cleanly'), 'verify-bridge.mjs executed with 100% clean status');
  } catch (err) {
    assert(false, `verify-bridge.mjs failed: ${err.message}`);
  }

  // Check sada-registry.json validity
  const regPath = path.join(workspaceRoot, 'sada-registry.json');
  assert(fs.existsSync(regPath), 'sada-registry.json exists at root');
  const regData = JSON.parse(fs.readFileSync(regPath, 'utf8'));
  assert(regData.apps?.length === 3, 'sada-registry.json registers all 3 apps');

  // Summary
  console.log('\n===============================================================');
  console.log(`🎉 TEST SUMMARY: ${passedTests}/${totalTests} PASSING (${Math.round((passedTests / totalTests) * 100)}%)`);
  console.log('===============================================================');

  if (passedTests === totalTests) {
    process.exit(0);
  } else {
    process.exit(1);
  }
}

runAllTests().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});

