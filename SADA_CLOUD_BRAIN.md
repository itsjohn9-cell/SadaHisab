# 🧠 Sada Suite — Cloud Brain & Architectural Manifesto (v2.2)

> **Autonomous Ecosystem Specification & Reusable Blueprint Vault**  
> *Last Synced:* 2026-11-08  
> *Relay Host:* `https://35.209.1.82.nip.io` | *Webhook Sync:* Google Apps Script Cloud Webhook

---

## 1. Ecosystem Overview & Production Topology

The **Sada Suite** is a decoupled, local-first, zero-paid-dependency ecosystem of progressive web and native mobile applications. Each application operates 100% independently with its own database and hosting provider, exchanging encrypted payloads exclusively via client-side WebCrypto and a lightweight transit relay.

| Application | Production URL | Play Console Track | Direct APK Download | Primary Storage | Core Mission |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **SadaLink** | `https://35.209.1.82.nip.io/` | `com.sadalink.app` (v1.2.0, Code 21) | [sadalink.apk](https://35.209.1.82.nip.io/download/sadalink.apk) | SQLite WAL (Server) + Dexie (Client) | Real-time messaging, contact-based P2P communication, action triggers |
| **SadaFlow** | `https://sadaflow.onrender.com/` | `app.sadaflow.sadaflow` (v1.2.2, Code 23) | [sadaflow.apk](https://35.209.1.82.nip.io/download/sadaflow.apk) | Dexie IndexedDB (Local-First) + E2EE | Frictionless clip capture, notes workspace, scratchpad slips |
| **Sada Hisaab** | `https://itsjohn9-cell.github.io/SadaHisab/` | `sada.hisab` (v1.0.2, Code 9) | [sadahisab.apk](https://35.209.1.82.nip.io/download/sadahisab.apk) | Dexie IndexedDB (Local-First Ledger) | Financial ledger, double-entry math, khums calculations, zero vanity |

### Invariant Laws:
1. **100% Free-Tier Law**: 0 paid APIs, 0 paid cloud DBs, 0 paid authentication services.
2. **Strict Standalone Decoupling**: Any application can be built, tested, and run without sister apps running.
3. **Decoupled Data Stores**: Internal databases are never directly linked. Cross-app data flows strictly through the typed `SadaPacket` envelope encrypted with AES-256-GCM.
4. **Zero-Knowledge Envelope Security**: Data at rest and in transit remains client-encrypted. The server relay only sees ciphertext and ephemeral recipient hashes.

---

## 2. Canonical Case-Sensitive Workspace Path Map

```
@SadaLink/client/src  ->  SadaLink/client/src/
@SadaLink/server/src  ->  SadaLink/server/src/
@SadaFlow/client/src  ->  SadaFlow/client/src/
@SadaFlow/server/src  ->  SadaFlow/server/src/
@SadaHisab/src        ->  SadaHisab/src/
```

---

## 3. Dynamic App Registry (`sada-registry.json`)

```json
{
  "$schema": "sada-registry-v1",
  "version": "1.0.0",
  "updatedAt": "2026-11-07T05:00:00Z",
  "apps": [
    {
      "id": "sadalink",
      "name": "SadaLink",
      "tagline": "Real-time communication & secure messaging",
      "localPort": 5173,
      "prodUrl": "https://35.209.1.82.nip.io",
      "customScheme": "sadalink://",
      "accentColor": "#00A884",
      "capabilities": [
        "realtime_socket",
        "chat_messaging",
        "action_parser",
        "media_transfer"
      ]
    },
    {
      "id": "sadaflow",
      "name": "SadaFlow",
      "tagline": "E2EE clipboard, notes & workspace scratchpad",
      "localPort": 5174,
      "prodUrl": "https://sadaflow.onrender.com",
      "customScheme": "sadaflow://",
      "accentColor": "#4f46e5",
      "capabilities": [
        "e2ee_workspace",
        "slip_parser",
        "dexie_outbox",
        "fast_scratchpad"
      ]
    },
    {
      "id": "sadahisaab",
      "name": "Sada Hisaab",
      "tagline": "Personal & business offline-first ledger",
      "localPort": 5175,
      "prodUrl": "https://itsjohn9-cell.github.io/SadaHisab",
      "customScheme": "sadahisaab://",
      "accentColor": "#059669",
      "capabilities": [
        "double_entry_math",
        "local_dexie_vault",
        "khums_calc",
        "audit_trail"
      ]
    }
  ]
}
```

---

## 4. Architectural Dictionary & Capability Cache (`sada-dictionary.json` v2.1)

```json
{
  "$schema": "sada-ecosystem-v2.1",
  "version": "2.1.0",
  "cloud_brain_webhook": "https://script.google.com/macros/s/AKfycbyZLwh810biSPJ6UbKoJgE5hsm8z0Mor6pnzgTmE7UptrMEiwwhzNdW8IMk2Eewgps4/exec",
  "apps": {
    "sadalink": {
      "name": "Sada Link",
      "root_path": "SadaLink",
      "core_mission": "Real-time communication, contact-based messaging, and lightweight action triggers",
      "immutable_boundaries": [
        "Must not become a full ledger or note organizer",
        "Chat-first UX"
      ],
      "capabilities": [
        "realtime_socket",
        "e164_contacts",
        "action_bot_parser",
        "push_notifications"
      ],
      "consumes": [
        "ledger_reminders",
        "shared_notes"
      ],
      "produces": [
        "expense_commands",
        "income_commands",
        "chat_clips"
      ],
      "file_index_cache": {
        "bridge_adapter": "client/src/services/sada-bridge.ts",
        "auth_gate": "client/src/components/auth/AuthGate.tsx",
        "db_store": "client/src/db/localDb.ts",
        "outbox": "client/src/services/sada-bridge.ts",
        "theme_config": "client/tailwind.config.js"
      }
    },
    "sadaflow": {
      "name": "Sada Flow",
      "root_path": "SadaFlow",
      "core_mission": "Frictionless capture, E2EE clipboard, note workspaces, and scratchpad slips",
      "immutable_boundaries": [
        "Must not become a chat client or transactional double-entry ledger"
      ],
      "capabilities": [
        "e2ee_workspace",
        "slip_parser",
        "dexie_outbox",
        "fast_scratchpad"
      ],
      "consumes": [
        "chat_bookmarks",
        "budget_summaries"
      ],
      "produces": [
        "parsed_hisaab_slips",
        "shared_clips"
      ],
      "file_index_cache": {
        "bridge_adapter": "client/src/services/sada-bridge.ts",
        "auth_gate": "client/src/components/AuthGate.tsx",
        "db_store": "client/src/services/storage.ts",
        "outbox": "client/src/services/outbox.ts",
        "theme_config": "client/tailwind.config.js"
      }
    },
    "sadahisaab": {
      "name": "Sada Hisaab",
      "root_path": "SadaHisab",
      "core_mission": "Personal & business ledger, income/expense tracking, accounts, and khums obligations",
      "immutable_boundaries": [
        "Must remain 100% focused on financial integrity, offline accounting, zero vanity bloat"
      ],
      "capabilities": [
        "double_entry_math",
        "local_dexie_vault",
        "khums_calc",
        "audit_trail"
      ],
      "consumes": [
        "expense_packets",
        "income_packets"
      ],
      "produces": [
        "ledger_cards",
        "budget_snapshots",
        "udhaar_reminders"
      ],
      "file_index_cache": {
        "bridge_adapter": "src/services/sada-bridge.ts",
        "auth_gate": "src/components/SadaPassportLogin.tsx",
        "db_store": "src/db/db.ts",
        "outbox": "src/services/sada-bridge.ts",
        "theme_config": "tailwind.config.js"
      }
    }
  },
  "reusable_blueprints": {
    "PBKDF2/HKDF": "SadaHisab/src/services/sada-bridge.ts",
    "Dexie_Outbox": "SadaFlow/client/src/services/outbox.ts",
    "SadaPassportLogin": "SadaLink/client/src/components/SadaPassportLogin.tsx",
    "SadaAppSwitcher": "SadaLink/client/src/components/SadaAppSwitcher.tsx",
    "SadaHisaabBudgetWidget": "SadaFlow/client/src/components/SadaHisaabBudgetWidget.tsx",
    "LiveBridgeSync": "SadaHisab/src/services/liveBridgeSync.ts",
    "SQLite_WAL_Relay": "SadaLink/server/src/db/sqlite.ts",
    "PWA_ShareTarget": "SadaLink/client/public/manifest.json",
    "BillSplitModal": "SadaLink/client/src/components/chat/BillSplitModal.tsx",
    "VoiceLoggerModal": "SadaHisab/src/components/VoiceLoggerModal.tsx"
  },
  "peer_projects": {
    "karachi-runner": {
      "name": "karachi-runner",
      "registered_at": "2026-11-07T08:25:22.394Z",
      "imported_blueprints": [],
      "isolation_verified": true
    }
  }
}
```

---

## 5. Cross-App Bridge Protocol & Cryptographic Specification

### Typed Envelope Contract (`SadaPacket`)
All cross-app data packets conform to the following JSON structure:

```typescript
export interface SadaPacket {
  packet_id: string;               // UUID v4
  idempotency_key: string;         // Unique deterministic key to prevent duplicate processing
  sada_uid_hash: string;           // SHA-256 hash of user master identity (routing key)
  source_app: string;              // "sadalink" | "sadaflow" | "sadahisaab"
  target_app: string;              // "sadalink" | "sadaflow" | "sadahisaab"
  action: 'EXPENSE_RECORD' | 'INCOME_RECORD' | 'SAVE_NOTE' | 'SHARE_CLIP' | 'REMINDER';
  encrypted_payload: string;       // AES-256-GCM ciphertext (Base64)
  iv: string;                      // 12-byte random initialization vector (Base64)
  created_at: number;              // Milliseconds timestamp
  version: '2.1';
}
```

### Encryption & Key Derivation (WebCrypto)
1. **Identity Normalization**: E.164 Phone (`+971501234567`) or lowercase Email.
2. **Master Key**: Generated as a random 256-bit AES-GCM CryptoKey per session.
3. **Key Wrapping**: Wrapped using PBKDF2 (100,000 iterations of SHA-256) derived from Identity + 6-digit PIN.
4. **Transit Routing**: `sada_uid_hash = SHA-256(identity + ":" + pin)`. The relay server only knows `sada_uid_hash` for queueing; ciphertext can only be decrypted by the client possessing the unwrapped key.
5. **1-Tap SSO Jump**: Crossing apps via `<SadaAppSwitcher />` constructs a URL fragment:
   `https://target-app.com/#sada_sso=<Base64URL(JSON({ uid_hash, wrapped_key, iv, salt }))>`
   The target app extracts and clears the fragment immediately on boot via `window.history.replaceState()`.

---

## 6. Reusable Blueprints Catalog

### Blueprint 1: PBKDF2/HKDF + AES-256-GCM Cryptographic Primitives
- **Reference Path**: `SadaHisab/src/services/sada-bridge.ts`
- **Capabilities**: Browser-native WebCrypto key derivation, envelope encryption/decryption, zero external libraries.

### Blueprint 2: Dexie Outbox Queue & Offline Sync
- **Reference Path**: `SadaFlow/client/src/services/outbox.ts`
- **Capabilities**: IndexedDB persistent outbox queue with exponential backoff retry, idempotency deduplication, and network status listeners (`window.addEventListener('online', ...)`).

### Blueprint 3: SadaPassportLogin Unified Component
- **Reference Path**: `SadaLink/client/src/components/SadaPassportLogin.tsx`
- **Capabilities**: Phone Number primary input + 6-Digit PIN, optional Email link, WebAuthn biometrics, zero external auth SDKs.

### Blueprint 4: SadaAppSwitcher Component
- **Reference Path**: `SadaLink/client/src/components/SadaAppSwitcher.tsx`
- **Capabilities**: Dynamic app switcher reading from `sada-registry.json`, seamless cross-app 1-tap jump via encrypted URL fragment.

### Blueprint 5: SQLite WAL Server Relay Queue
- **Reference Path**: `SadaLink/server/src/db/sqlite.ts`
- **Capabilities**: Ephemeral packet storage with automated 7-day TTL cleanup, per-user `uid_hash` indexed polling, and atomic acknowledge (`DELETE /api/sada-bridge/ack`).

### Blueprint 6: PWA Share Target & Manifest Standards
- **Reference Path**: `SadaLink/client/public/manifest.json`
- **Capabilities**: Native OS share sheet integration (`share_target`) for text, URLs, and incoming transaction clips.

---

## 7. Verification Engine & Test Gate (`smart-verify.mjs`)

To prevent slow, heavy browser tests on routine edits, the ecosystem enforces a **4-Tier Gate**:

| Tier | Scope | Trigger Criteria | Executed Action | Duration |
| :--- | :--- | :--- | :--- | :--- |
| **Tier 0** | Cosmetic / Docs | Only `.md`, `.css`, comments, assets modified | Bypasses all tests | `< 15ms` |
| **Tier 1** | Single-App Local | Logic modified strictly inside 1 app (no bridge/registry touch) | Local `tsc --noEmit` or unit tests only | `~3.5s` |
| **Tier 2** | Bridge / Blueprints | `sada-bridge.ts`, `sada-registry.json`, or blueprints modified | Parity check via `verify-bridge.mjs` | `~100ms` |
| **Tier 3** | Full Deploy | Explicit `--deploy`, `--tier 3`, or production release | Playwright headless browser E2E test suite | `~45s` |

---

## 8. Mode A, B, C Operational Guide

- **Mode A: Architectural Evaluation**
  ```bash
  node .agents/skills/sada-sync/scripts/evaluate-feature.mjs <app_id> "<proposal>"
  ```
- **Mode B: Smart Verification & Sync**
  ```bash
  node .agents/skills/sada-sync/scripts/smart-verify.mjs
  ```
- **Mode C: Peer-Learning (External Projects)**
  ```bash
  node .agents/skills/sada-sync/scripts/peer-learn.mjs <target_project_path> [blueprint_name]
  ```
- **Cloud Brain Mirror & Google Doc Sync**
  ```bash
  node .agents/skills/sada-sync/scripts/sync-cloud-brain.mjs
  ```

