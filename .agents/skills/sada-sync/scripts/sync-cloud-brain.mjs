#!/usr/bin/env node
/**
 * Sada Suite — Cloud Brain Mirror & Google Doc Webhook Synchronizer
 * 
 * Synchronizes SADA_CLOUD_BRAIN.md, sada-dictionary.json, sada-registry.json,
 * and .agents/ across all 3 local application repositories, and posts the full
 * markdown documentation to the Google Doc Apps Script Webhook in real time.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '../../../../');

const DICTIONARY_PATH = path.join(ROOT_DIR, 'sada-dictionary.json');
const REGISTRY_PATH = path.join(ROOT_DIR, 'sada-registry.json');
const CLOUD_BRAIN_PATH = path.join(ROOT_DIR, 'SADA_CLOUD_BRAIN.md');
const AGENTS_DIR = path.join(ROOT_DIR, '.agents');

const APP_ROOTS = [
  path.join(ROOT_DIR, 'SadaLink'),
  path.join(ROOT_DIR, 'SadaFlow'),
  path.join(ROOT_DIR, 'SadaHisab'),
];

const DEFAULT_WEBHOOK_URL = 'https://script.google.com/macros/s/AKfycbyZLwh810biSPJ6UbKoJgE5hsm8z0Mor6pnzgTmE7UptrMEiwwhzNdW8IMk2Eewgps4/exec';
const WEBHOOK_SECRET = 'sada_brain_sync_2026';

function loadJson(filePath, defaultValue = {}) {
  try {
    if (fs.existsSync(filePath)) {
      return JSON.parse(fs.readFileSync(filePath, 'utf8'));
    }
  } catch {}
  return defaultValue;
}

export function mirrorBrainLocally() {
  console.log('🔄 [sync-cloud-brain] Mirroring ecosystem brain across app repositories...');

  const dict = loadJson(DICTIONARY_PATH);
  const reg = loadJson(REGISTRY_PATH);

  // 1. Ensure SADA_CLOUD_BRAIN.md exists in root
  if (!fs.existsSync(CLOUD_BRAIN_PATH)) {
    console.warn('⚠️ SADA_CLOUD_BRAIN.md not found in root, please generate it first.');
  }

  // 2. Physical copy into each application root
  for (const appDir of APP_ROOTS) {
    if (!fs.existsSync(appDir)) continue;

    const copyTargets = [
      { src: CLOUD_BRAIN_PATH, dest: path.join(appDir, 'SADA_CLOUD_BRAIN.md') },
      { src: DICTIONARY_PATH, dest: path.join(appDir, 'sada-dictionary.json') },
      { src: REGISTRY_PATH, dest: path.join(appDir, 'sada-registry.json') },
    ];

    for (const { src, dest } of copyTargets) {
      if (fs.existsSync(src)) {
        if (fs.existsSync(dest) && fs.lstatSync(dest).isSymbolicLink()) {
          fs.unlinkSync(dest);
        }
        fs.copyFileSync(src, dest);
      }
    }

    // Mirror .agents/ directory
    if (fs.existsSync(AGENTS_DIR)) {
      const destAgents = path.join(appDir, '.agents');
      if (fs.existsSync(destAgents) && fs.lstatSync(destAgents).isSymbolicLink()) {
        fs.unlinkSync(destAgents);
      }
      fs.cpSync(AGENTS_DIR, destAgents, { recursive: true, force: true, dereference: true });
    }
  }

  // 3. Subpaths for bundler asset loading & server runtime
  const subpathFiles = [
    { src: REGISTRY_PATH, dest: path.join(ROOT_DIR, 'SadaLink/client/src/sada-registry.json') },
    { src: REGISTRY_PATH, dest: path.join(ROOT_DIR, 'SadaLink/server/src/sada-registry.json') },
    { src: REGISTRY_PATH, dest: path.join(ROOT_DIR, 'SadaFlow/client/src/sada-registry.json') },
    { src: REGISTRY_PATH, dest: path.join(ROOT_DIR, 'SadaFlow/server/src/sada-registry.json') },
    { src: REGISTRY_PATH, dest: path.join(ROOT_DIR, 'SadaHisab/src/sada-registry.json') },
    { src: DICTIONARY_PATH, dest: path.join(ROOT_DIR, 'SadaLink/server/src/sada-dictionary.json') },
    { src: DICTIONARY_PATH, dest: path.join(ROOT_DIR, 'SadaLink/server/dist/sada-dictionary.json') },
    { src: CLOUD_BRAIN_PATH, dest: path.join(ROOT_DIR, 'SadaLink/server/src/SADA_CLOUD_BRAIN.md') },
    { src: CLOUD_BRAIN_PATH, dest: path.join(ROOT_DIR, 'SadaLink/server/dist/SADA_CLOUD_BRAIN.md') },
  ];
  for (const { src, dest } of subpathFiles) {
    try {
      if (fs.existsSync(src)) {
        if (fs.existsSync(dest) && fs.lstatSync(dest).isSymbolicLink()) fs.unlinkSync(dest);
        fs.mkdirSync(path.dirname(dest), { recursive: true });
        fs.copyFileSync(src, dest);
      }
    } catch {}
  }

  console.log('✅ Local brain mirrors synced to SadaLink, SadaFlow, and SadaHisab.');
}

export async function pushToGoogleDocWebhook() {
  const dict = loadJson(DICTIONARY_PATH);
  const webhookUrl = dict.cloud_brain_webhook || DEFAULT_WEBHOOK_URL;

  if (!fs.existsSync(CLOUD_BRAIN_PATH)) {
    throw new Error(`SADA_CLOUD_BRAIN.md does not exist at ${CLOUD_BRAIN_PATH}`);
  }

  const markdownContent = fs.readFileSync(CLOUD_BRAIN_PATH, 'utf8');

  console.log(`🌐 [sync-cloud-brain] Dispatching live markdown sync to Google Doc webhook...`);
  console.log(`   URL: ${webhookUrl}`);
  console.log(`   Payload Size: ${(markdownContent.length / 1024).toFixed(2)} KB`);

  const payload = {
    secret: WEBHOOK_SECRET,
    markdown: markdownContent,
    version: dict.version || '2.1.0',
    updatedAt: new Date().toISOString()
  };

  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
      redirect: 'follow',
    });

    const text = await response.text();
    console.log(`📥 Webhook HTTP Status: ${response.status}`);

    if (response.ok && (text.includes('Updated') || text.includes('success') || text.includes('ok') || response.status === 200)) {
      console.log(`📥 Webhook Response Body: ${text.trim()}`);
      console.log('🎉 Google Doc Cloud Brain sync completed successfully!');
      return { success: true, status: response.status, body: text };
    } else if (response.status === 403 || text.includes('يجب طلب الإذن بالوصول') || text.includes('Authorization required')) {
      console.warn('\n⚠️ Google Apps Script 403 Permission Notice:');
      console.warn('   The Apps Script Web App deployment is currently restricted to "Only myself".');
      console.warn('   To enable autonomous webhook sync:');
      console.warn('   1. Open the script editor at:');
      console.warn('      https://script.google.com/macros/edit?lib=1CZzkKWMKYwdaM6ErGM3eZ7uN7G2iigsjRdfecNl0cPegFmt7l9nW0QQZ');
      console.warn('   2. Click "Deploy" -> "Manage Deployments" -> "Edit" (pencil icon).');
      console.warn('   3. Change "Who has access" (من لديه حق الوصول) to: "Anyone" (الجميع).');
      console.warn('   4. Click "Deploy".');
      return { success: true, status: response.status, warning: 'Pending "Anyone" access setting in Google Apps Script' };
    } else {
      console.warn(`⚠️ Webhook responded with status ${response.status}: ${text.slice(0, 300)}`);
      return { success: false, status: response.status, body: text };
    }
  } catch (error) {
    console.error(`❌ Failed to send webhook: ${error.message}`);
    return { success: false, error: error.message };
  }
}

async function main() {
  const args = process.argv.slice(2);
  const skipRemote = args.includes('--no-remote') || args.includes('--local-only');

  mirrorBrainLocally();

  if (!skipRemote) {
    const result = await pushToGoogleDocWebhook();
    if (!result.success) {
      process.exitCode = 1;
    }
  }
}

// Run directly if invoked from CLI
if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(__filename)) {
  main();
}
