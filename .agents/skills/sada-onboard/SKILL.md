---
name: sada-onboard
description: "Onboards a new application folder into the Sada Suite ecosystem: registers in sada-registry.json, injects sada-bridge.ts, SadaPassportLogin, and configures Dexie outbox."
---

# `sada-onboard`: Automated App Onboarding Skill for Sada Suite

Use this skill when introducing a new app folder (e.g. `SadaDrive`, `SadaPay`, etc.) into `/Users/mohammadjhone/Projects`.

## Onboarding Procedure

When the user runs `/sada-onboard <AppName>` (or asks to onboard an app):

### Step 1: Registry Entry (`sada-registry.json`)
Read `sada-registry.json` and append the new app entry:
```json
{
  "id": "sada<name>",
  "name": "<AppName>",
  "folder": "<AppFolder>",
  "canonicalClient": "@<AppFolder>/src",
  "canonicalServer": "@<AppFolder>/server/src",
  "localPort": 5175,
  "serverPort": null,
  "prodUrl": "https://<app>.example.com",
  "customScheme": "sada<name>://",
  "accentColor": "#...",
  "theme": "...",
  "capabilities": ["sada-passport"]
}
```

### Step 2: Inject Bridge Adapter
Copy or generate `<AppFolder>/src/services/sada-bridge.ts` using the standardized Envelope Key Wrapping template and `SadaPacket` protocol.

### Step 3: Inject Sada Passport & App Switcher
Place `<SadaPassportLogin />` and `<SadaAppSwitcher />` in `<AppFolder>/src/components/`, adopting the `#020617` Slate Dark canvas with the app's accent color.

### Step 4: Outbox Setup (Dexie.js)
Ensure Dexie.js is installed in `<AppFolder>` and create an offline outbox table `sada_outbox` for resilient store-and-forward sync.

### Step 5: Update Canonical Map & Test
Add the canonical path aliases to `AGENTS.md` and `GEMINI.md`, then run:
```bash
node .agents/skills/sada-sync/scripts/verify-bridge.mjs
```

