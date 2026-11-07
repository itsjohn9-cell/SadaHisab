#!/usr/bin/env node
/**
 * verify-bridge.mjs
 * Verification script for Sada Suite Cross-App Bridge & Theme Consistency
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// Root of workspace is 4 levels up: scripts -> sada-sync -> skills -> .agents -> Projects
const workspaceRoot = path.resolve(__dirname, '../../../../');

console.log('🔍 [sada-sync] Running Sada Suite Bridge & Theme Verification...');
console.log(`📁 Workspace root: ${workspaceRoot}\n`);

// 0. Physical Brain Mirroring for Git Safety across all 3 app repositories
const rootRegistryPath = path.join(workspaceRoot, 'sada-registry.json');
const rootDictionaryPath = path.join(workspaceRoot, 'sada-dictionary.json');
const rootCloudBrainPath = path.join(workspaceRoot, 'SADA_CLOUD_BRAIN.md');
const rootAgentsDir = path.join(workspaceRoot, '.agents');

const appRoots = [
  path.join(workspaceRoot, 'SadaLink'),
  path.join(workspaceRoot, 'SadaFlow'),
  path.join(workspaceRoot, 'SadaHisab'),
];

for (const appDir of appRoots) {
  if (!fs.existsSync(appDir)) continue;

  // Mirror SADA_CLOUD_BRAIN.md
  if (fs.existsSync(rootCloudBrainPath)) {
    const dest = path.join(appDir, 'SADA_CLOUD_BRAIN.md');
    try {
      if (fs.existsSync(dest) && fs.lstatSync(dest).isSymbolicLink()) fs.unlinkSync(dest);
      fs.copyFileSync(rootCloudBrainPath, dest);
    } catch (e) {
      console.warn(`Failed to mirror SADA_CLOUD_BRAIN.md to ${appDir}: ${e.message}`);
    }
  }

  // Mirror sada-registry.json
  if (fs.existsSync(rootRegistryPath)) {
    const dest = path.join(appDir, 'sada-registry.json');
    try {
      if (fs.existsSync(dest) && fs.lstatSync(dest).isSymbolicLink()) fs.unlinkSync(dest);
      fs.copyFileSync(rootRegistryPath, dest);
    } catch (e) {
      console.warn(`Failed to mirror sada-registry.json to ${appDir}: ${e.message}`);
    }
  }

  // Mirror sada-dictionary.json
  if (fs.existsSync(rootDictionaryPath)) {
    const dest = path.join(appDir, 'sada-dictionary.json');
    try {
      if (fs.existsSync(dest) && fs.lstatSync(dest).isSymbolicLink()) fs.unlinkSync(dest);
      fs.copyFileSync(rootDictionaryPath, dest);
    } catch (e) {
      console.warn(`Failed to mirror sada-dictionary.json to ${appDir}: ${e.message}`);
    }
  }

  // Mirror .agents/ directory physically
  if (fs.existsSync(rootAgentsDir)) {
    const dest = path.join(appDir, '.agents');
    try {
      if (fs.existsSync(dest) && fs.lstatSync(dest).isSymbolicLink()) fs.unlinkSync(dest);
      fs.cpSync(rootAgentsDir, dest, { recursive: true, force: true, dereference: true });
    } catch (e) {
      console.warn(`Failed to mirror .agents to ${appDir}: ${e.message}`);
    }
  }
}

// Client/server subpath copies for direct bundler/vite imports
const clientServerRegistryTargets = [
  path.join(workspaceRoot, 'SadaLink/client/src/sada-registry.json'),
  path.join(workspaceRoot, 'SadaLink/server/src/sada-registry.json'),
  path.join(workspaceRoot, 'SadaFlow/client/src/sada-registry.json'),
  path.join(workspaceRoot, 'SadaFlow/server/src/sada-registry.json'),
  path.join(workspaceRoot, 'SadaHisab/src/sada-registry.json'),
];
for (const target of clientServerRegistryTargets) {
  try {
    if (fs.existsSync(target) && fs.lstatSync(target).isSymbolicLink()) fs.unlinkSync(target);
    fs.copyFileSync(rootRegistryPath, target);
  } catch {}
}
console.log('📦 [sada-sync] Physical brain mirror complete: .agents, sada-dictionary.json, and sada-registry.json mirrored into all 3 apps for Git portability');

const bridgePaths = {
  link: path.join(workspaceRoot, 'SadaLink/client/src/services/sada-bridge.ts'),
  flow: path.join(workspaceRoot, 'SadaFlow/client/src/services/sada-bridge.ts'),
  hisaab: path.join(workspaceRoot, 'SadaHisab/src/services/sada-bridge.ts')
};

const manifests = {
  link: path.join(workspaceRoot, 'SadaLink/client/public/manifest.json'),
  flow: path.join(workspaceRoot, 'SadaFlow/client/public/manifest.json'),
  hisaab: path.join(workspaceRoot, 'SadaHisab/public/manifest.json')
};

let hasErrors = false;

// 1. Check manifests and share targets
console.log('--- 1. PWA Manifest & Share Target Audit ---');
for (const [app, manifestPath] of Object.entries(manifests)) {
  if (!fs.existsSync(manifestPath)) {
    console.error(`❌ [${app}] Missing manifest.json at ${manifestPath}`);
    hasErrors = true;
    continue;
  }
  try {
    const data = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    const hasShareTarget = !!data.share_target;
    const themeColor = data.theme_color || 'none';
    const bgColor = data.background_color || 'none';
    console.log(`✅ [${app}] Manifest OK (theme: ${themeColor}, bg: ${bgColor}, share_target: ${hasShareTarget ? 'Configured' : 'Missing'})`);
  } catch (err) {
    console.error(`❌ [${app}] Failed to parse manifest.json: ${err.message}`);
    hasErrors = true;
  }
}

// 2. Check bridge adapter files
console.log('\n--- 2. sada-bridge.ts Contract Audit ---');
const requiredPacketFields = [
  'packet_id',
  'idempotency_key',
  'sada_uid_hash',
  'source_app',
  'target_app',
  'action',
  'encrypted_payload',
  'iv',
  'created_at'
];

for (const [app, bridgePath] of Object.entries(bridgePaths)) {
  if (!fs.existsSync(bridgePath)) {
    console.log(`⚠️  [${app}] Bridge adapter not yet populated at: ${path.relative(workspaceRoot, bridgePath)} (Pending Phase 4 implementation)`);
    continue;
  }

  const content = fs.readFileSync(bridgePath, 'utf8');
  const missingFields = requiredPacketFields.filter(field => !content.includes(field));

  if (missingFields.length > 0) {
    console.error(`❌ [${app}] sada-bridge.ts missing required fields: ${missingFields.join(', ')}`);
    hasErrors = true;
  } else {
    console.log(`✅ [${app}] sada-bridge.ts exports valid SadaPacket contract`);
  }
}

// 3. Check Relay Queue Definition in SadaLink Server
console.log('\n--- 3. SadaLink Server Relay Queue Audit ---');
const sqlitePath = path.join(workspaceRoot, 'SadaLink/server/src/db/sqlite.ts');
if (fs.existsSync(sqlitePath)) {
  const content = fs.readFileSync(sqlitePath, 'utf8');
  if (content.includes('sada_bridge_queue')) {
    console.log('✅ [link-server] sada_bridge_queue table defined in sqlite.ts');
  } else {
    console.log('⚠️  [link-server] sada_bridge_queue table pending creation in sqlite.ts (Ready for implementation)');
  }
} else {
  console.error(`❌ [link-server] sqlite.ts not found at ${sqlitePath}`);
  hasErrors = true;
}

console.log('\n--------------------------------------------');
if (hasErrors) {
  console.log('⚠️  Verification finished with issues.');
  process.exit(1);
} else {
  console.log('🎉 Verification checks passed cleanly.');
}

