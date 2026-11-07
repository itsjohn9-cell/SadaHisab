#!/usr/bin/env node
/**
 * Sada Suite — Smart-Verify Engine
 * 
 * 4-Tier Common-Sense Verification Gate:
 *   Tier 0: Styling / Markdown / Docs / Comments (<0.1s, 0 tests)
 *   Tier 1: Single-App Internal Logic (local tsc/unit test only, no bridge tests)
 *   Tier 2: Bridge / Blueprint / Contract / Dictionary (fast verify-bridge.mjs parity check)
 *   Tier 3: Explicit Deploy / Full E2E (Playwright live browser click-through)
 */

import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '../../../../');
const DICTIONARY_PATH = path.join(ROOT_DIR, 'sada-dictionary.json');
const REGISTRY_PATH = path.join(ROOT_DIR, 'sada-registry.json');

const APP_MAP = {
  sadalink: {
    name: 'SadaLink',
    dir: 'SadaLink',
    typecheck: 'cd SadaLink/client && npx tsc --noEmit && cd ../server && npx tsc --noEmit',
  },
  sadaflow: {
    name: 'SadaFlow',
    dir: 'SadaFlow',
    typecheck: 'cd SadaFlow/client && npx tsc --noEmit',
  },
  sadahisaab: {
    name: 'SadaHisab',
    dir: 'SadaHisab',
    typecheck: 'cd SadaHisab && npx tsc --noEmit',
  },
};

const TIER0_EXTENSIONS = new Set([
  '.md', '.txt', '.css', '.scss', '.sass', '.less',
  '.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp', '.ico',
  '.gitignore', '.npmignore', '.prettierrc', '.editorconfig'
]);

function getModifiedFiles() {
  const files = new Set();
  const subdirs = ['', 'SadaLink', 'SadaFlow', 'SadaHisab'];

  for (const rel of subdirs) {
    const fullDir = path.join(ROOT_DIR, rel);
    if (!fs.existsSync(fullDir)) continue;
    try {
      const output = execSync('git status --porcelain', { cwd: fullDir, stdio: ['ignore', 'pipe', 'ignore'] }).toString();
      const lines = output.split('\n').filter(Boolean);
      for (const line of lines) {
        const filePath = line.substring(3).trim();
        const resolvedPath = rel ? path.join(rel, filePath) : filePath;
        files.add(resolvedPath);
      }
    } catch {
      // Not a git repo or no changes
    }
  }

  return Array.from(files);
}

function determineTier(fileList) {
  if (fileList.length === 0) {
    return { tier: 0, reason: 'No files modified' };
  }

  // Check if every file is cosmetic / documentation
  const allCosmetic = fileList.every(file => {
    const ext = path.extname(file).toLowerCase();
    const basename = path.basename(file).toLowerCase();
    return TIER0_EXTENSIONS.has(ext) || basename.startsWith('readme') || basename.startsWith('license');
  });

  if (allCosmetic) {
    return { tier: 0, reason: 'All modified files are documentation, styles, or assets.' };
  }

  // Check for Tier 2 modifications (bridge, dictionary, registry, or blueprints)
  const isTier2 = fileList.some(file => {
    const norm = file.replace(/\\/g, '/');
    if (norm.includes('sada-bridge.ts') ||
        norm.includes('sada-dictionary.json') ||
        norm.includes('sada-registry.json') ||
        norm.includes('liveBridgeSync.ts') ||
        norm.includes('SadaPassportLogin') ||
        norm.includes('SadaAppSwitcher') ||
        norm.includes('.agents/skills/sada-sync') ||
        norm.includes('.agents/rules')) {
      return true;
    }
    return false;
  });

  if (isTier2) {
    return { tier: 2, reason: 'Cross-app bridge adapter, dictionary, registry, or blueprint modified.' };
  }

  // Check which apps are affected
  const affectedApps = new Set();
  for (const file of fileList) {
    const norm = file.replace(/\\/g, '/');
    if (norm.startsWith('SadaLink/')) affectedApps.add('sadalink');
    else if (norm.startsWith('SadaFlow/')) affectedApps.add('sadaflow');
    else if (norm.startsWith('SadaHisab/')) affectedApps.add('sadahisaab');
  }

  if (affectedApps.size === 1) {
    const appKey = Array.from(affectedApps)[0];
    return { tier: 1, app: appKey, reason: `Local changes isolated strictly within ${APP_MAP[appKey].name}.` };
  }

  if (affectedApps.size > 1) {
    return { tier: 2, reason: `Changes span multiple applications (${Array.from(affectedApps).join(', ')}).` };
  }

  return { tier: 0, reason: 'Root configuration or non-code files modified.' };
}

function executeTier0(reason) {
  const start = Date.now();
  console.log(`\n⚡ Tier 0: Cosmetic/Doc change detected. Verification bypassed.`);
  console.log(`   Reason: ${reason}`);
  console.log(`   Tests run: 0 | Duration: ${(Date.now() - start)}ms\n`);
  return true;
}

function executeTier1(appKey, reason) {
  const start = Date.now();
  const app = APP_MAP[appKey] || APP_MAP.sadalink;
  console.log(`\n🔍 Tier 1: Single-app internal logic verification for [${app.name}].`);
  console.log(`   Reason: ${reason}`);
  console.log(`   Executing typecheck: "${app.typecheck}"...`);

  try {
    execSync(app.typecheck, { cwd: ROOT_DIR, stdio: 'inherit' });
    const dur = ((Date.now() - start) / 1000).toFixed(2);
    console.log(`\n✅ Tier 1 Passed: [${app.name}] typecheck succeeded in ${dur}s. No bridge tests required.\n`);
    return true;
  } catch (err) {
    console.error(`\n❌ Tier 1 Failed for [${app.name}]. Check TypeScript compilation errors above.\n`);
    return false;
  }
}

function executeTier2(reason) {
  const start = Date.now();
  console.log(`\n🌉 Tier 2: Bridge/Blueprint Contract & Schema Verification.`);
  console.log(`   Reason: ${reason}`);
  console.log(`   Running: node .agents/skills/sada-sync/scripts/verify-bridge.mjs...`);

  try {
    execSync('node .agents/skills/sada-sync/scripts/verify-bridge.mjs', { cwd: ROOT_DIR, stdio: 'inherit' });
    const dur = ((Date.now() - start) / 1000).toFixed(2);
    console.log(`\n✅ Tier 2 Passed: Bridge contract parity and registry integrity verified across Sada Suite in ${dur}s.\n`);
    return true;
  } catch (err) {
    console.error(`\n❌ Tier 2 Failed: Bridge contract parity verification failed.\n`);
    return false;
  }
}

function executeTier3(reason) {
  console.log(`\n🚀 Tier 3: Full Production End-to-End Headless Browser Verification.`);
  console.log(`   Reason: ${reason}`);
  console.log(`   Running: node .agents/skills/sada-sync/scripts/test-live-ui-browser.mjs...`);

  try {
    execSync('node .agents/skills/sada-sync/scripts/test-live-ui-browser.mjs', { cwd: ROOT_DIR, stdio: 'inherit' });
    console.log(`\n✅ Tier 3 Passed: Live UI production flow verified across all 3 apps.\n`);
    return true;
  } catch (err) {
    console.error(`\n❌ Tier 3 Failed: Live browser test encountered an assertion failure.\n`);
    return false;
  }
}

function main() {
  const args = process.argv.slice(2);
  let explicitTier = null;
  let explicitApp = null;
  let fileList = null;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--tier' && args[i + 1] !== undefined) {
      explicitTier = parseInt(args[i + 1], 10);
      i++;
    } else if (arg === '--deploy' || arg === '--go-live') {
      explicitTier = 3;
    } else if (arg === '--app' && args[i + 1]) {
      explicitApp = args[i + 1].toLowerCase();
      i++;
    } else if (arg === '--files' && args[i + 1]) {
      fileList = args[i + 1].split(',').map(s => s.trim());
      i++;
    }
  }

  if (explicitTier === 3) {
    const success = executeTier3('Explicit deploy / Tier 3 verification requested.');
    process.exit(success ? 0 : 1);
  }

  if (explicitTier === 2) {
    const success = executeTier2('Explicit Tier 2 verification requested.');
    process.exit(success ? 0 : 1);
  }

  if (explicitTier === 1) {
    const app = explicitApp || 'sadalink';
    const success = executeTier1(app, 'Explicit Tier 1 verification requested.');
    process.exit(success ? 0 : 1);
  }

  if (explicitTier === 0) {
    const success = executeTier0('Explicit Tier 0 verification requested.');
    process.exit(success ? 0 : 1);
  }

  // Automatic evaluation
  if (!fileList) {
    fileList = getModifiedFiles();
  }

  console.log(`\n--- Sada Suite Smart-Verify Gate ---`);
  console.log(`Files evaluated (${fileList.length}):`);
  if (fileList.length === 0) {
    console.log(`  (clean workspace)`);
  } else {
    fileList.slice(0, 10).forEach(f => console.log(`  • ${f}`));
    if (fileList.length > 10) console.log(`  ... and ${fileList.length - 10} more`);
  }

  const { tier, app, reason } = determineTier(fileList);

  let success = true;
  if (tier === 0) {
    success = executeTier0(reason);
  } else if (tier === 1) {
    success = executeTier1(app, reason);
  } else if (tier === 2) {
    success = executeTier2(reason);
  }

  process.exit(success ? 0 : 1);
}

main();

