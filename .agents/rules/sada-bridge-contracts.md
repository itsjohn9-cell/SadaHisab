---
trigger: glob
globs: "**/sada-bridge*, **/manifest.json, **/SADA_ECOSYSTEM.md, **/sada-registry.json"
---

# Sada Suite: Shared Bridge Contracts, Envelope Key Wrapping & Dynamic Registry

## 1. Unified Multi-Method "Sada Passport" Auth & Envelope Key Wrapping
The Sada Suite uses zero-knowledge hardware-capable client-side encryption. Rather than deriving data encryption keys directly from the login string, it uses **Envelope Key Wrapping**:

### Cryptographic Structure
1. **Canonical User Identity**:
   - `sada_uid`: UUIDv4 or SHA-256 hash identifying the user.
   - `sada_master_key`: Cryptographically random 256-bit AES-GCM key (`window.crypto.getRandomValues(new Uint8Array(32))`). This master key decrypts all user notes, ledger slips, and bridge envelopes.
2. **Key Wrapping Envelopes**:
   - **Primary (Phone + 6-digit PIN)**:
     `K_phone = PBKDF2(phone_e164 + ":" + pin, salt: sha256(phone_e164), iter: 100000)`
     `envelope_phone = AES_GCM_ENCRYPT(sada_master_key, key: K_phone)`
   - **Secondary Linked (Email + 6-digit PIN)**:
     `K_email = PBKDF2(email_normalized + ":" + pin, salt: sha256(email_normalized), iter: 100000)`
     `envelope_email = AES_GCM_ENCRYPT(sada_master_key, key: K_email)`
   - **Biometric Unlock (WebAuthn / Passkey PRF or Capacitor Biometrics)**:
     Hardware keystore or WebAuthn PRF unrolls a hardware-backed local master key cache, enabling 0.2s offline unlock.
3. **Public Routing Identity**:
   - `sada_uid_hash`: SHA-256 of `sada_uid`. Public routing token sent to `@SadaLink/server/src` relay.
4. **Envelope Storage & Sync**:
   - Envelopes are stored in `@SadaLink/server/src` SQLite table `sada_identities` and mirrored in local Dexie stores.
   - Either identity (phone or email) successfully decrypts the identical underlying `sada_master_key`.

---

## 2. Dynamic Registry Integration (`sada-registry.json`)

Do NOT hardcode app unions like `'link' | 'flow' | 'hisaab'` in static types. 
Apps dynamically query `sada-registry.json` for:
- Registered app identifiers (`id: string`)
- Production URLs and custom schemes (`customScheme: string`, e.g. `sadalink://`, `sadaflow://`, `sadahisaab://`)
- CORS origins whitelist
- Capabilities (`capabilities: string[]`)

### `SadaPacket` Protocol Interface

```typescript
export interface SadaPacket {
  /** UUIDv4 uniquely identifying this envelope */
  packet_id: string;

  /**
   * Deterministic client-generated idempotency key.
   * Format: `${source_app}_${entity_id}_${version_or_hash}`
   * Enforces UNIQUE constraint at SQLite relay and local Dexie tables to eliminate duplicates.
   */
  idempotency_key: string;

  /** SHA-256 routing hash of user identity. Used by relay to direct packets. */
  sada_uid_hash: string;

  /** Originating application id (from sada-registry.json) */
  source_app: string;

  /** Destination application id (from sada-registry.json) */
  target_app: string;

  /** Target domain action requested */
  action: string;

  /**
   * AES-GCM ciphertext in base64.
   * Encrypted with user's `sada_master_key`.
   */
  encrypted_payload: string;

  /** 12-byte initialization vector in base64 */
  iv: string;

  /** Unix epoch timestamp in milliseconds */
  created_at: number;
}
```

---

## 3. Cross-App 1-Tap SSO Handoff

When navigating between apps, transfer the session via:
1. **Web**: URL hash fragment `#sada_sso=<encrypted_session_blob>` (never query parameters `?`).
   - The fragment is never transmitted over HTTP or logged in server/proxy logs.
   - On target app load, it extracts `window.location.hash`, unwraps session state, saves to local Dexie, and clears the hash with `window.history.replaceState`.
2. **Capacitor Android**: Custom scheme URL (`sadalink://`, `sadaflow://`, `sadahisaab://`) with deep-link payload.

---

## 4. Canonical Case-Sensitive File Pointers

- SadaLink Client: `@SadaLink/client/src/services/sada-bridge.ts`
- SadaLink Server: `@SadaLink/server/src/db/sqlite.ts`
- SadaFlow Client: `@SadaFlow/client/src/services/sada-bridge.ts`
- SadaFlow Server: `@SadaFlow/server/src/`
- Sada Hisaab: `@SadaHisab/src/services/sada-bridge.ts`
