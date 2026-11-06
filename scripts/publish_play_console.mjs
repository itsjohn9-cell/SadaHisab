#!/usr/bin/env node
/**
 * Sada Hisab - Google Play Console Auto-Publisher
 * 
 * Automatically publishes the release Android App Bundle (AAB) to:
 *   1. Closed Play Group (track: 'alpha')
 *   2. Internal Play Group (track: 'internal')
 */

import fs from 'fs';
import path from 'path';
import { google } from 'googleapis';

const PACKAGE_NAME = 'com.sadacash.ledger';
const DEFAULT_AAB_PATH = path.resolve('android/app/build/outputs/bundle/release/app-release.aab');

const POSSIBLE_KEY_PATHS = [
  process.env.GOOGLE_PLAY_SERVICE_ACCOUNT_KEY,
  path.resolve(process.env.HOME || '', '.karachi-runner-keys/play-service-account.json'),
  path.resolve(process.env.HOME || '', '.config/play-service-account.json'),
  path.resolve('play-service-account.json')
].filter(Boolean);

const args = process.argv.slice(2);
let tracks = ['alpha', 'internal'];
let isDraft = false;
let aabPath = DEFAULT_AAB_PATH;

args.forEach(arg => {
  if (arg.startsWith('--tracks=')) tracks = arg.split('=')[1].split(',').map(t => t.trim()).filter(Boolean);
  else if (arg.startsWith('--track=')) tracks = arg.split('=')[1].split(',').map(t => t.trim()).filter(Boolean);
  else if (arg === '--draft') isDraft = true;
  else if (arg.startsWith('--aab=')) aabPath = path.resolve(arg.split('=')[1]);
});

const TRACK_LABELS = {
  internal: 'Internal Play Group (track: internal)',
  alpha: 'Closed Play Group (track: alpha)',
  beta: 'Open Testing (track: beta)',
  production: 'Production (track: production)'
};

console.log('====================================================');
console.log('       SADA CASH - GOOGLE PLAY AUTO-PUBLISHER       ');
console.log('====================================================');
console.log(`📦 Package ID   : ${PACKAGE_NAME}`);
console.log(`🎯 Target Tracks: ${tracks.map(t => TRACK_LABELS[t] || t).join(' & ')}`);
console.log(`📁 Bundle Path  : ${aabPath}`);

let authClient = null;
let keyFileFound = null;

for (const candidate of POSSIBLE_KEY_PATHS) {
  if (fs.existsSync(candidate)) {
    keyFileFound = candidate;
    break;
  }
}

if (!keyFileFound && process.env.GOOGLE_PLAY_SERVICE_ACCOUNT_JSON) {
  try {
    const raw = process.env.GOOGLE_PLAY_SERVICE_ACCOUNT_JSON;
    const jsonStr = raw.startsWith('{') ? raw : Buffer.from(raw, 'base64').toString('utf8');
    const credentials = JSON.parse(jsonStr);
    authClient = new google.auth.GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/androidpublisher']
    });
    console.log('🔑 Authentication: Using GOOGLE_PLAY_SERVICE_ACCOUNT_JSON environment variable.');
  } catch (err) {
    console.error('❌ Failed to parse GOOGLE_PLAY_SERVICE_ACCOUNT_JSON:', err.message);
  }
} else if (keyFileFound) {
  console.log(`🔑 Authentication: Using Service Account key from:\n   ${keyFileFound}`);
  authClient = new google.auth.GoogleAuth({
    keyFile: keyFileFound,
    scopes: ['https://www.googleapis.com/auth/androidpublisher']
  });
}

if (!authClient) {
  console.warn('\n⚠️ Play Console service account credentials not found.');
  console.warn('Place service account key at ~/.karachi-runner-keys/play-service-account.json or set GOOGLE_PLAY_SERVICE_ACCOUNT_KEY.');
  process.exit(0);
}

if (!fs.existsSync(aabPath)) {
  console.error(`\n❌ Android App Bundle (.aab) not found at: ${aabPath}`);
  console.error('Run "npm run apk:bundle" or "./gradlew bundleRelease" first.\n');
  process.exit(1);
}

const fileSizeMb = (fs.statSync(aabPath).size / (1024 * 1024)).toFixed(2);
console.log(`📊 Release AAB Size: ${fileSizeMb} MB`);

async function publish() {
  const play = google.androidpublisher({ version: 'v3', auth: authClient });
  let editId = null;

  try {
    console.log('\n🚀 [1/5] Initializing Play Console Edit session...');
    const editRes = await play.edits.insert({
      packageName: PACKAGE_NAME
    });
    editId = editRes.data.id;
    console.log(`✔ Edit Session Created: [${editId}]`);

    console.log(`🚀 [2/5] Uploading ${fileSizeMb} MB App Bundle to Play Console...`);
    const uploadRes = await play.edits.bundles.upload({
      packageName: PACKAGE_NAME,
      editId,
      media: {
        mimeType: 'application/octet-stream',
        body: fs.createReadStream(aabPath)
      }
    });

    const versionCode = uploadRes.data.versionCode;
    console.log(`✔ Upload complete! Bundle Version Code: ${versionCode}`);

    // Parse version from package.json
    const pkg = JSON.parse(fs.readFileSync(path.resolve('package.json'), 'utf8'));
    const versionName = pkg.version || '1.0.0';

    console.log(`🚀 [3/5] Assigning Version Code ${versionCode} (${versionName}) to tracks: [${tracks.join(', ')}]...`);
    const releaseStatus = isDraft ? 'draft' : 'completed';
    const releaseNotes = [
      {
        language: 'en-US',
        text: `Release ${versionName}: Production release of Sada Cash - Multi-Currency Cash, Sponsorship & Khums Accounting Suite.`
      }
    ];

    for (const t of tracks) {
      await play.edits.tracks.update({
        packageName: PACKAGE_NAME,
        editId,
        track: t,
        requestBody: {
          track: t,
          releases: [
            {
              name: `v${versionName} (${versionCode})`,
              versionCodes: [versionCode.toString()],
              status: releaseStatus,
              releaseNotes
            }
          ]
        }
      });
      console.log(`✔ Track [${t}] updated successfully (${releaseStatus}).`);
    }

    console.log('🚀 [4/5] Validating Play Console Edit transaction...');
    await play.edits.validate({
      packageName: PACKAGE_NAME,
      editId
    });
    console.log('✔ Validation passed without errors.');

    console.log('🚀 [5/5] Committing release to Google Play...');
    await play.edits.commit({
      packageName: PACKAGE_NAME,
      editId
    });

    console.log('\n====================================================');
    console.log('🎉 PUBLISHED TO GOOGLE PLAY CONSOLE SUCCESSFULLY!   ');
    console.log('====================================================');
    console.log(`App Name    : Sada Cash`);
    console.log(`Package ID  : ${PACKAGE_NAME}`);
    console.log(`Tracks      : ${tracks.map(t => TRACK_LABELS[t] || t).join(', ')}`);
    console.log(`Status      : ${releaseStatus.toUpperCase()}`);
    console.log(`Console URL : https://play.google.com/console/u/0/developers/app/releases/overview?appId=${PACKAGE_NAME}`);
    console.log('====================================================\n');
  } catch (error) {
    console.warn('\n⚠️ Google Play Console Notice:');
    const errMsg = error.response?.data?.error?.message || error.message || String(error);
    console.warn(`Reason: ${errMsg}`);
    if (errMsg.includes('not found') || errMsg.includes('Package not found')) {
      console.warn(`ℹ️ The package "${PACKAGE_NAME}" hasn't been initially registered in Play Console yet or is pending initial first-bundle upload.`);
      console.warn(`👉 The signed bundle is generated and ready at:\n   ${aabPath}`);
    }
  }
}

publish();
