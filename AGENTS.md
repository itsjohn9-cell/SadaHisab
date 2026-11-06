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

## Architecture Highlights
- **100% Local-First & Zero-Trust**: All financial ledger records, sponsorships, and Khums calculations are stored in local IndexedDB (Dexie). No external tracking servers.
- **Multi-Currency Support**: PKR, AED, USD, GBP, SAR, MYR, IQD with manual or user-triggered FX sync.
- **Triple Deployment Targets**: Web/PWA, Native Android Capacitor, and Desktop PWA from a single codebase.
