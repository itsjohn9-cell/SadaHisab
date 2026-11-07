# Sada Hisab — Subfolder AI Directives

> **Sada Suite Member Notice**:
> This app is part of the multi-app **Sada Suite**.
> Keep standalone functionality 100% intact and independently runnable.
> Isolate all cross-app logic strictly inside `src/services/sada-bridge.ts`.
> Read `../AGENTS.md` and `../sada-registry.json` before modifying Auth, Theme, or Bridge schemas.
> Never introduce paid APIs or cloud databases; respect the 100% Free-Tier Law.
> Cross-app data exchange conforms to the typed `SadaPacket` protocol.
> Use `node ../.agents/skills/sada-sync/scripts/verify-bridge.mjs` to test contract parity.
> Local ledger records are 100% private and encrypted with Dexie.js.

---

# Sada Hisab - Agent Operational Guidelines

## "Go Live" Command Trigger
Whenever the user instructs to **"go live"**, **"publish"**, or asks to deploy the latest changes:
Execute the unified tri-target pipeline by running:
```bash
npm run go-live
```
or directly:
```bash
node scripts/go_live.mjs
```

### Tri-Target Publish Destinations:
1. **Web Production**:
   - Pushes to GitHub repository `origin/main` (`https://github.com/itsjohn9-cell/SadaHisab`).
   - Deploys the production PWA to GitHub Pages (`https://itsjohn9-cell.github.io/SadaHisab/`).
2. **Closed Play Group (Alpha track)**:
   - Builds Signed Android App Bundle (`app-release.aab`).
   - Publishes to Google Play Console Closed Testing track (`alpha`).
3. **Internal Play Group (Internal track)**:
   - Publishes the Signed Android App Bundle (`app-release.aab`) to Google Play Console Internal Testing track (`internal`).
4. **Direct APK Download**:
   - Compiles native Android APK and attaches to GitHub Releases.
