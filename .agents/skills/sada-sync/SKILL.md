---
name: sada-sync
description: "Synchronizes shared contracts, theme tokens, and bridge adapters across SadaLink, SadaFlow, and Sada Hisaab using the Architectural Dictionary."
---

# `sada-sync`: Sada Suite Synchronization & Architectural Engine

Use this skill whenever:
- Evaluating new features, modules, or proposals across the Sada Suite (`sada-dictionary.json`).
- Adding, updating, or reviewing cross-app bridge capabilities (`sada-bridge.ts`).
- Modifying the `SadaPacket` schema or cryptographic derivation algorithms.
- Aligning dark theme tokens, PWA manifests, or native `share_target` configurations across the apps.
- Porting a feature, utility, or contract from one Sada application to another without architectural bloat.

---

## 1. Fast-Path Canonical Reference Map

Never perform unbounded workspace file searches. Always reference applications directly via their canonical paths:

| App Alias | Root Path | Client Source | Server Source / Backend |
| :--- | :--- | :--- | :--- |
| `@SadaLink` | `SadaLink/` | `SadaLink/client/src/` | `SadaLink/server/src/` (Express, Socket.io, SQLite WAL) |
| `@SadaFlow` | `SadaFlow/` | `SadaFlow/client/src/` | `SadaFlow/server/src/` (Node.js, WebSockets, Auth/Pairing) |
| `@SadaHisab` | `SadaHisab/` | `SadaHisab/src/` | *Local-First Client Only* (Dexie IndexedDB) |

Architectural Truth: `/projects/sada-dictionary.json` & `/projects/sada-registry.json`.

---

## 2. Architectural Modes of `/sada-sync`

The `/sada-sync` workflow operates in two distinct, sequential phases:

### Mode A: `/sada-sync analyze <app_id> "<feature_description_or_path>"`

Before writing or copying any code, run the evaluation engine against `sada-dictionary.json`:
```bash
node .agents/skills/sada-sync/scripts/evaluate-feature.mjs <app_id> "<feature_description_or_path>"
```

The engine performs 3 automated evaluations:

1. **Boundary Fit Check**:
   - Compares the proposed logic against the target app's `immutable_boundaries`.
   - *Example*: Reject heavy double-entry ledgers inside SadaLink or SadaFlow. Reject chat threads or vanity social feeds inside Sada Hisaab.

2. **Cross-App Value Classification**:
   - **`[A] Universal Utility`** (Score: 95+): Cryptographic primitives, Dexie outbox queues, theme tokens, biometric passkeys, or SSO switchers.
     *Action*: Port core logic to all apps. Keep UI extracted into modular components.
   - **`[B] Producer/Consumer Bridge`** (Score: 90+): A capability in one app that emits data another app needs (e.g. an expense slip parser in Flow producing Hisaab ledger transactions; an udhaar loan reminder in Hisaab sending a SadaLink message).
     *Action*: Wire the lightweight contract via `sada-bridge.ts`. **DO NOT** duplicate or port the entire UI across apps.
   - **`[C] Strict Local Feature`** (Score: 85+): Domain-specific UI, tailored data visualizations, internal room workflows, or voice logger modals.
     *Action*: Keep 100% isolated to the target app.

3. **Pre-Implementation Scored Recommendation Table**:
   Output the structured evaluation table to the user before modifying code:

| Metric | Evaluation Result |
| :--- | :--- |
| **Target App** | `<AppName>` |
| **Architectural Category** | `[A] Universal Utility` \| `[B] Producer/Consumer Bridge` \| `[C] Strict Local Feature` |
| **Boundary Fit** | `PASS` (0 violations) or `FAIL` (flags boundary) |
| **Compatibility Score** | `XX / 100` |
| **Recommended Action** | *Port to all / Wire bridge contract only / Keep 100% local* |

---

### Mode B: `/sada-sync execute`

Once the feature has passed evaluation and the user has approved the approach:

1. **Update Capability Cache**:
   - Register any new exportable capability in `/projects/sada-dictionary.json` under the producing app's `capabilities[]` and `capability_cache`.

2. **Deploy Bridge & Contract Adapters**:
   - Generate or update `sada-bridge.ts` in each affected app using the canonical paths.
   - Strictly enforce:
     * Real `AES-256-GCM` encryption with 12-byte random IV.
     * Per-user unique `sada_uid_hash` routing (zero shared static buckets).
     * `#sada_sso=` session key encapsulation on app jumps.

3. **Execute 4-Tier Smart Verification**:
   - Run the common-sense verification gate to avoid slow/heavy browser tests when only local logic or docs changed:
     ```bash
     node .agents/skills/sada-sync/scripts/smart-verify.mjs
     ```
   - **Tier 0** (Styles/Docs/Markdown): 0 tests, <0.1s.
   - **Tier 1** (Single-App Internal Logic): Local typecheck/unit test only.
   - **Tier 2** (Bridge/Blueprint/Contract): Contract parity verification via `verify-bridge.mjs`.
   - **Tier 3** (Explicit Deploy / "Go Live"): Full Playwright headless browser E2E (`smart-verify.mjs --deploy`).

4. **Sync Cloud Brain & Google Doc Webhook**:
   - Whenever dictionary, registry, blueprints, or contracts are modified, synchronize physical mirrors and post markdown to the Google Doc Apps Script Webhook:
     ```bash
     node .agents/skills/sada-sync/scripts/sync-cloud-brain.mjs
     ```

5. **Build & Deploy**:
   - Rebuild clients and push to `origin main` across `@SadaLink`, `@SadaFlow`, and `@SadaHisab`.

---

### Mode C: `/sada-sync peer-learn <target_project_path> [blueprint_name]`

Use this mode when an independent peer project on macOS (e.g. `karachi-runner/` or any external workspace) wants to import proven architectural patterns (`reusable_blueprints`) from the Sada Suite without sharing databases or auth credentials.

```bash
# Register peer project and view available blueprints
node .agents/skills/sada-sync/scripts/peer-learn.mjs <target_project_path>

# Inspect specific blueprint
node .agents/skills/sada-sync/scripts/peer-learn.mjs <target_project_path> <blueprint_name>

# Export blueprint directly to target subpath
node .agents/skills/sada-sync/scripts/peer-learn.mjs <target_project_path> <blueprint_name> --copy-to <dest_relative_path>
```

#### Peer Isolation Laws:
1. **0 Shared DBs**: The peer project maintains its own isolated database instance.
2. **0 Shared Auth**: Credentials, sessions, and encryption keys are strictly sandboxed.
3. **100% Free-Tier**: Reusable blueprints rely entirely on browser-native APIs (IndexedDB/WebCrypto/PWA) and zero paid dependencies.
4. **Dictionary Audit**: The peer project is registered under `"peer_projects"` in `/projects/sada-dictionary.json` for provenance tracking.
