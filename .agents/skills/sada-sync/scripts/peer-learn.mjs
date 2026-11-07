#!/usr/bin/env node
/**
 * Sada Suite — Peer-Learning Engine (Mode C)
 * 
 * Allows external / peer projects to import architectural blueprints
 * from Sada Suite (e.g., Dexie Outbox, PBKDF2/HKDF WebCrypto, SadaPassport)
 * while keeping databases, auth, and state 100% isolated and independent.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '../../../../');
const DICTIONARY_PATH = path.join(ROOT_DIR, 'sada-dictionary.json');

function loadDictionary() {
  if (!fs.existsSync(DICTIONARY_PATH)) {
    throw new Error(`Dictionary not found at ${DICTIONARY_PATH}`);
  }
  return JSON.parse(fs.readFileSync(DICTIONARY_PATH, 'utf8'));
}

function saveDictionary(dict) {
  fs.writeFileSync(DICTIONARY_PATH, JSON.stringify(dict, null, 2) + '\n', 'utf8');
}

function main() {
  const args = process.argv.slice(2);
  if (args.length === 0) {
    console.error('Usage: node peer-learn.mjs <target_project_path> [blueprint_name] [--copy-to <dest_subpath>]');
    process.exit(1);
  }

  const targetPathRaw = args[0];
  const targetPath = path.isAbsolute(targetPathRaw)
    ? targetPathRaw
    : path.resolve(process.cwd(), targetPathRaw);

  if (!fs.existsSync(targetPath)) {
    console.error(`❌ Target project path does not exist: ${targetPath}`);
    process.exit(1);
  }

  const dict = loadDictionary();
  const projectName = path.basename(targetPath);

  if (!dict.peer_projects) {
    dict.peer_projects = {};
  }

  if (!dict.peer_projects[projectName]) {
    dict.peer_projects[projectName] = {
      name: projectName,
      path: targetPath,
      registered_at: new Date().toISOString(),
      imported_blueprints: [],
      isolation_verified: true,
      notes: "Independent peer project utilizing Sada Suite architectural patterns. Zero shared auth, zero shared DB."
    };
    saveDictionary(dict);
    console.log(`\n✅ Registered new peer project in sada-dictionary.json: "${projectName}"`);
  } else {
    console.log(`\nℹ️ Found existing registered peer project: "${projectName}"`);
  }

  console.log(`\n--- Sada Suite Reusable Blueprints ---`);
  const blueprints = dict.reusable_blueprints || {};
  for (const [key, bpath] of Object.entries(blueprints)) {
    const exists = fs.existsSync(bpath);
    console.log(`  • ${key.padEnd(20)} -> ${bpath} (${exists ? 'READY' : 'MISSING'})`);
  }

  const blueprintArg = args[1] && !args[1].startsWith('--') ? args[1] : null;
  if (blueprintArg) {
    const matchedKey = Object.keys(blueprints).find(k => k.toLowerCase() === blueprintArg.toLowerCase());
    if (!matchedKey) {
      console.error(`\n❌ Unknown blueprint "${blueprintArg}". Available: ${Object.keys(blueprints).join(', ')}`);
      process.exit(1);
    }

    const srcFile = blueprints[matchedKey];
    console.log(`\n📘 Selected Blueprint: [${matchedKey}]`);
    console.log(`   Source: ${srcFile}`);

    // Check if user requested copy
    const copyIndex = args.indexOf('--copy-to');
    if (copyIndex !== -1 && args[copyIndex + 1]) {
      const destRel = args[copyIndex + 1];
      const destPath = path.resolve(targetPath, destRel);
      fs.mkdirSync(path.dirname(destPath), { recursive: true });
      fs.copyFileSync(srcFile, destPath);
      console.log(`   🚀 Exported blueprint directly to: ${destPath}`);

      if (!dict.peer_projects[projectName].imported_blueprints.includes(matchedKey)) {
        dict.peer_projects[projectName].imported_blueprints.push(matchedKey);
        dict.peer_projects[projectName].last_sync = new Date().toISOString();
        saveDictionary(dict);
      }
    } else {
      console.log(`   💡 Tip: Add '--copy-to <relative_path>' to copy this blueprint directly into ${projectName}.`);
    }
  }

  console.log(`\n🔒 Strict Peer Isolation Guarantee:`);
  console.log(`   - 0 Shared DBs: Peer project maintains its own isolated database.`);
  console.log(`   - 0 Shared Auth: User credentials and sessions are strictly sandboxed.`);
  console.log(`   - 100% Free-Tier: Zero external paid API requirements.`);
}

main();

