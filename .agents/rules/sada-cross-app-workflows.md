---
trigger: model_decision
description: "Load when implementing cross-app linking, Hisaab Chat commands, SadaFlow #hisaab slips, CORS relay, or porting features between SadaLink, SadaFlow, and Sada Hisaab."
---

# Sada Suite: Cross-Application Workflows, Bi-Directional Links & Relay Hub

## 1. Zero-Cost Relay Hub (`@SadaLink/server/src`)

The persistent VM server at `https://35.209.1.82.nip.io` acts as the encrypted relay host for the entire ecosystem.

### Database Tables in `@SadaLink/server/src/db/sqlite.ts`
1. **`sada_bridge_queue`**:
   ```sql
   CREATE TABLE IF NOT EXISTS sada_bridge_queue (
     packet_id TEXT PRIMARY KEY,
     idempotency_key TEXT UNIQUE NOT NULL,
     sada_uid_hash TEXT NOT NULL,
     source_app TEXT NOT NULL,
     target_app TEXT NOT NULL,
     action TEXT NOT NULL,
     encrypted_payload TEXT NOT NULL,
     iv TEXT NOT NULL,
     created_at INTEGER NOT NULL,
     delivered_at INTEGER DEFAULT NULL
   );
   CREATE INDEX IF NOT EXISTS idx_bridge_uid_target ON sada_bridge_queue(sada_uid_hash, target_app, delivered_at);
   ```

2. **`sada_identities`**:
   ```sql
   CREATE TABLE IF NOT EXISTS sada_identities (
     sada_uid TEXT PRIMARY KEY,
     sada_uid_hash TEXT UNIQUE NOT NULL,
     phone_e164 TEXT UNIQUE,
     email_normalized TEXT UNIQUE,
     phone_envelope TEXT NOT NULL,
     email_envelope TEXT,
     created_at INTEGER NOT NULL,
     updated_at INTEGER NOT NULL
   );
   CREATE INDEX IF NOT EXISTS idx_identity_phone ON sada_identities(phone_e164);
   CREATE INDEX IF NOT EXISTS idx_identity_email ON sada_identities(email_normalized);
   ```

### Dynamic CORS & Socket.io
- The server dynamically reads `sada-registry.json` at startup (and watches for changes) to whitelist all app URLs and local dev ports in CORS.
- Socket.io room: `sada_bridge:<sada_uid_hash>`.

---

## 2. Complete Bi-Directional Workflows

### A. SadaLink ➔ SadaHisab ("Hisaab Bot")
- A pinned self-chat `self_hisaab_ledger` in SadaLink parses shorthand messages:
  - `-450 Carrefour #grocery` ➔ Encrypted `ADD_EXPENSE` packet
  - `+5000 Salary #income` ➔ Encrypted `ADD_INCOME` packet
- Offline outbox queues in Dexie; automatically flushes upon network reconnection.
- SadaHisab pulls/receives via Socket.io or HTTP poll, decrypts, and commits to Dexie `transactions`.

### B. SadaFlow ➔ SadaHisab (`#hisaab` Slips)
- Notes in SadaFlow tagged `#hisaab` parse items like:
  ```text
  - Hotel - 1200 AED
  - Metro - 50 AED
  ```
- Deterministic idempotency key: `flow_note_${noteId}_line_${lineIndex}`.
- Updates to note lines edit the transaction in SadaHisab instead of creating duplicates.

### C. SadaHisab ➔ SadaLink ("1-Tap Udhaar / Split Reminder")
- On any transaction or loan record in SadaHisab, click **"Share to SadaLink Contact"**.
- Emits a `SHARE_CHAT` packet with formatted bill/split details.
- SadaLink drops the reminder card directly into the selected contact thread.

### D. SadaHisab ➔ SadaFlow ("Live Budget & Khums Pin")
- When balance or Khums recalculates in SadaHisab, it dispatches a `#hisaab-summary` packet.
- SadaFlow displays or updates a pinned card in the user's dashboard with real-time budget status.

### E. SadaLink 🔀 SadaFlow
- 1-tap "Save Message to SadaFlow" in SadaLink.
- 1-tap "Drop Note to SadaLink" in SadaFlow.
- Native Android and PWA `manifest.json` `share_target` support for OS-level sharing.

### F. Group Bill Split & Settlement in SadaLink ➔ Sada Hisaab
- Open attachment modal in SadaLink chat &rarr; **"Split Bill / Udhaar"** (`BillSplitModal.tsx`).
- Enter total amount, currency (AED, PKR, USD, EUR, etc.), description, and toggle group members.
- Dispatches an encrypted `ADD_EXPENSE` packet to Sada Hisaab committing the user's personal share to the ledger, and renders an itemized debt card directly in the chat stream with 1-tap settlement.

### G. Suite-Wide FX Rates Sync (Sada Hisaab ➔ SadaLink & SadaFlow)
- Sada Hisaab broadcasts `FX_RATES_SYNC` whenever live exchange rates refresh.
- SadaLink and SadaFlow cache rates in `localStorage` (`sada_fx_rates_cache`) to provide instant offline currency conversions without rate-limit issues.

### H. Native Voice Dictation
- Supported via browser-native Web Speech API in both Sada Hisaab (`VoiceLoggerModal.tsx`) and SadaFlow (`NotesView.tsx` microphone action bar), requiring 0 paid transcription APIs.
