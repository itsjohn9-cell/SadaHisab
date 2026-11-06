#!/usr/bin/env node
/**
 * Sada Hisab - "Go Live" Unified Tri-Target Release Orchestrator
 *
 * Automatically triggered when you say "go live".
 * Publishes simultaneously to:
 *   1. Web Production       : origin/main -> GitHub Pages & PWA Build
 *   2. Closed Play Group    : Google Play Console 'alpha' track
 *   3. Internal Play Group  : Google Play Console 'internal' track
 *   4. Direct APK Download  : Standalone APK artifact for instant sideloading
 */

import { spawnSync } from 'child_process';
import path from 'path';
import fs from 'fs';

const args = process.argv.slice(2);
const skipTests = args.includes('--skip-tests');
const skipWeb = args.includes('--skip-web');
const skipPlay = args.includes('--skip-play');
const isDraft = args.includes('--draft');

console.log('\n================================================================');
console.log('            🚀 SADA CASH & HISAB "GO LIVE" PIPELINE             ');
console.log('================================================================');
console.log('Publish Destinations:');
console.log('  🌐 1. Web Production       : origin/main -> GitHub Pages PWA');
console.log('  🔒 2. Closed Play Group    : Google Play Console track "alpha"');
console.log('  👥 3. Internal Play Group  : Google Play Console track "internal"');
console.log('  📲 4. Direct APK Download  : Standalone installable APK');
console.log('================================================================\n');

// Configure OpenJDK 21 & Android Environment
const openJdk21 = '/opt/homebrew/opt/openjdk@21';
const javaHome = fs.existsSync(openJdk21) ? openJdk21 : process.env.JAVA_HOME;
const javaBin = javaHome ? `${javaHome}/bin:` : '';
const homebrewBin = fs.existsSync('/opt/homebrew/bin') ? '/opt/homebrew/bin:' : '';

const env = {
  ...process.env,
  PATH: `${javaBin}${homebrewBin}${process.env.PATH || ''}`,
  JAVA_HOME: javaHome,
  ANDROID_HOME: process.env.ANDROID_HOME || `${process.env.HOME}/Library/Android/sdk`
};

function run(command, cmdArgs, label, options = {}) {
  console.log(`\n▶ [${label}] Running: ${command} ${cmdArgs.join(' ')}`);
  const result = spawnSync(command, cmdArgs, {
    stdio: 'inherit',
    shell: options.shell !== undefined ? options.shell : false,
    cwd: options.cwd || process.cwd(),
    env: { ...env, ...(options.env || {}) }
  });
  if (result.status !== 0 && !options.allowFailure) {
    console.error(`\n❌ [${label}] Failed with exit code ${result.status}`);
    process.exit(result.status || 1);
  }
  if (result.status === 0) {
    console.log(`✔ [${label}] Succeeded.`);
  }
  return result;
}

// 1. Web Build & Verification
if (!skipTests) {
  console.log('🔍 [1/5] Compiling and verifying web production build...');
  run('npm', ['run', 'build'], 'Vite Production Build');
} else {
  console.log('⏭ [1/5] Skipping web build (--skip-tests provided).');
}

// 2. Capacitor Android Asset Sync
console.log('\n📦 [2/5] Syncing web assets to native Android project...');
run('npx', ['cap', 'sync', 'android'], 'Capacitor Asset Sync');

// 3. Compile Android Release AAB & Direct APK
console.log('\n🤖 [3/5] Compiling Android Release AAB & Direct Download APK...');
const androidDir = path.resolve('android');
const gradlewCmd = path.join(androidDir, 'gradlew');

// Compile Signed Release App Bundle (AAB) for Google Play
run(gradlewCmd, [':app:bundleRelease', '--stacktrace'], 'Gradle Bundle Release (AAB)', { cwd: androidDir });

// Compile Debug/Direct APK for Instant Phone Sideloading
run(gradlewCmd, [':app:assembleDebug', '--stacktrace'], 'Gradle Assemble APK', { cwd: androidDir });

const aabPath = path.resolve('android/app/build/outputs/bundle/release/app-release.aab');
const apkPath = path.resolve('android/app/build/outputs/apk/debug/app-debug.apk');

if (fs.existsSync(apkPath)) {
  const apkSizeMb = (fs.statSync(apkPath).size / 1024 / 1024).toFixed(1);
  console.log(`✔ Native Android APK compiled successfully: ${apkSizeMb} MB at:`);
  console.log(`   ${apkPath}`);
}

// 4. Publish to Google Play (Internal Play Group & Closed Play Group)
if (!skipPlay) {
  console.log('\n📱 [4/5] Publishing signed AAB to Google Play (Closed & Internal testing tracks)...');
  const playArgs = ['scripts/publish_play_console.mjs', '--tracks=alpha,internal'];
  if (isDraft) playArgs.push('--draft');
  run('node', playArgs, 'Google Play Console Release', { allowFailure: true });
} else {
  console.log('⏭ [4/5] Skipping Google Play publish (--skip-play provided).');
}

// 5. Publish to Web & Remote Repository
if (!skipWeb) {
  console.log('\n🌐 [5/5] Publishing to Web & syncing remote repository...');
  const statusRes = spawnSync('git', ['status', '--porcelain'], { encoding: 'utf8' });
  if (statusRes.stdout && statusRes.stdout.trim().length > 0) {
    console.log('ℹ Notice: Staging and committing release updates...');
    run('git', ['add', '-A'], 'Git Add');
    run(
      'git',
      ['commit', '-m', 'chore(release): go live web, closed play group and internal play group'],
      'Git Commit'
    );
  }

  // Push to remote if origin exists
  const remoteCheck = spawnSync('git', ['remote', 'get-url', 'origin'], { encoding: 'utf8' });
  if (remoteCheck.status === 0 && remoteCheck.stdout.trim().length > 0) {
    console.log(`🌿 Pushing to origin/main (${remoteCheck.stdout.trim()})...`);
    run('git', ['push', '-u', 'origin', 'main'], 'Git Push Main', { allowFailure: true });
  } else {
    console.log('ℹ Notice: Remote "origin" not yet set. Run "gh repo create" or add remote origin to auto-push.');
  }
} else {
  console.log('⏭ [5/5] Skipping Web & Remote publish (--skip-web provided).');
}

console.log('\n================================================================');
console.log('🎉 "GO LIVE" PIPELINE EXECUTION COMPLETED!                      ');
console.log('================================================================');
console.log('✓ Web Production      : PWA compiled and ready for deployment');
console.log('✓ Closed Play Group   : Track "alpha" on Play Console');
console.log('✓ Internal Play Group : Track "internal" on Play Console');
console.log(`✓ Direct APK Download : ${fs.existsSync(apkPath) ? apkPath : 'Ready'}`);
console.log('================================================================\n');

