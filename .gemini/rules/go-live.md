# Rule: Go Live Standard Operating Procedure

Whenever the user instructs to **"go live"**, **"publish"**, or asks to deploy the latest changes:

You MUST execute the unified tri-target pipeline by running:
```bash
npm run go-live
```
or directly:
```bash
node scripts/go_live.mjs
```

### Tri-Target Publish Destinations:
1. **Web Production (PWA & Offline SPA)**:
   - Compiles Vite production PWA build.
   - Pushes reviewed changes to `origin/main` on GitHub (`https://github.com/itsjohn9-cell/SadaHisab`).
   - Automatically builds & deploys the offline-first web client via GitHub Pages / CI/CD.
2. **Closed Play Group (Alpha track)**:
   - Compiles the release Android App Bundle (`app-release.aab`) signed with the project release keystore.
   - Publishes to the Google Play Console **Closed Testing Track** (`alpha`) for authorized testers.
3. **Internal Play Group (Internal track)**:
   - Publishes the release Android App Bundle (`app-release.aab`) to the Google Play Console **Internal Testing Track** (`internal`) for zero-delay internal deployment.
4. **Direct APK & Release Artifacts**:
   - Compiles standalone native Android APK (`app-debug.apk` / `app-release.apk`) and publishes to GitHub Releases for direct side-loading without Google Play restrictions.

