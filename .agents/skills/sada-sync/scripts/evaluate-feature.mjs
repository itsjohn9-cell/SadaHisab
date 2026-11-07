#!/usr/bin/env node
/**
 * Sada Suite Architectural Dictionary & Feature Evaluation Engine
 * Evaluates feature proposals, diffs, or project additions against /projects/sada-dictionary.json
 *
 * Usage:
 *   node evaluate-feature.mjs <target_app> "<feature_description_or_path>"
 *   node evaluate-feature.mjs --json <target_app> "<feature_description>"
 */

import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const DICTIONARY_PATH = resolve(__dirname, '../../../../sada-dictionary.json');

function loadDictionary() {
  if (!existsSync(DICTIONARY_PATH)) {
    console.error(`❌ Missing architectural dictionary at ${DICTIONARY_PATH}`);
    process.exit(1);
  }
  return JSON.parse(readFileSync(DICTIONARY_PATH, 'utf-8'));
}

export function evaluateFeature(targetAppId, featureInput) {
  const dictionary = loadDictionary();
  const normalizedAppId = targetAppId?.toLowerCase().replace(/[-_]/g, '');
  const appConfig = dictionary.apps[normalizedAppId];

  if (!appConfig) {
    return {
      valid: false,
      error: `Unknown app ID "${targetAppId}". Known apps: ${Object.keys(dictionary.apps).join(', ')}`,
    };
  }

  let featureText = featureInput;
  if (existsSync(featureInput)) {
    try {
      featureText = readFileSync(featureInput, 'utf-8');
    } catch {}
  }
  const textLower = featureText.toLowerCase();

  // 1. Boundary Fit Analysis
  const boundaryViolations = [];
  const boundaries = appConfig.immutable_boundaries || [];

  for (const boundary of boundaries) {
    const boundaryLower = boundary.toLowerCase();
    if (boundaryLower.includes('ledger') && (textLower.includes('double-entry') || textLower.includes('general ledger') || textLower.includes('khums calculation'))) {
      if (normalizedAppId !== 'sadahisaab') {
        boundaryViolations.push(`Violates boundary: "${boundary}" (Heavy financial ledger logic belongs in Sada Hisaab)`);
      }
    }
    if (boundaryLower.includes('chat') && (textLower.includes('group messaging') || textLower.includes('chat room') || textLower.includes('direct message thread'))) {
      if (normalizedAppId !== 'sadalink') {
        boundaryViolations.push(`Violates boundary: "${boundary}" (Real-time conversational messaging belongs in Sada Link)`);
      }
    }
    if (boundaryLower.includes('note organizer') && textLower.includes('rich-text note workspace')) {
      if (normalizedAppId !== 'sadaflow') {
        boundaryViolations.push(`Violates boundary: "${boundary}" (Dedicated note workspaces belong in Sada Flow)`);
      }
    }
    if (boundaryLower.includes('zero vanity bloat') && (textLower.includes('social feed') || textLower.includes('story status') || textLower.includes('animated stickers'))) {
      boundaryViolations.push(`Violates boundary: "${boundary}" (Vanity social bloat rejected)`);
    }
  }

  // 2. Cross-App Capability Match
  const universalKeywords = ['crypto', 'webcrypto', 'aes-gcm', 'pbkdf2', 'hkdf', 'passkey', 'biometric', 'outbox', 'dexie', 'theme', 'sso', 'switcher'];
  const isUniversalCandidate = universalKeywords.some(kw => textLower.includes(kw));

  const producesBridgeEvents = [];
  const consumesBridgeEvents = [];

  // Check sibling relationships
  for (const [siblingId, siblingConfig] of Object.entries(dictionary.apps)) {
    if (siblingId === normalizedAppId) continue;

    // Check if what this feature produces is consumed by sibling
    for (const produces of appConfig.produces || []) {
      if ((siblingConfig.consumes || []).includes(produces)) {
        if (textLower.includes(produces.replace(/_/g, ' ')) || textLower.includes(produces.split('_')[0])) {
          producesBridgeEvents.push({ sibling: siblingConfig.name, event: produces });
        }
      }
    }

    // Check if feature consumes what sibling produces
    for (const consumes of appConfig.consumes || []) {
      if ((siblingConfig.produces || []).includes(consumes)) {
        if (textLower.includes(consumes.replace(/_/g, ' ')) || textLower.includes(consumes.split('_')[0])) {
          consumesBridgeEvents.push({ sibling: siblingConfig.name, event: consumes });
        }
      }
    }
  }

  // 3. Category Classification
  let category;
  let categoryLabel;
  let score = 100;

  if (boundaryViolations.length > 0) {
    category = 'VIOLATION';
    categoryLabel = '❌ Boundary Violation (Anti-Pattern)';
    score = 25;
  } else if (isUniversalCandidate) {
    category = 'UNIVERSAL_UTILITY';
    categoryLabel = '[A] Universal Utility';
    score = 95;
  } else if (producesBridgeEvents.length > 0 || consumesBridgeEvents.length > 0) {
    category = 'PRODUCER_CONSUMER_BRIDGE';
    categoryLabel = '[B] Producer/Consumer Bridge';
    score = 90;
  } else {
    category = 'STRICT_LOCAL';
    categoryLabel = '[C] Strict Local Feature';
    score = 85;
  }

  // 4. Recommendation Formulation
  let recommendation;
  if (category === 'UNIVERSAL_UTILITY') {
    recommendation = `Port core logic to all apps via /sada-sync execute. Do not duplicate UI; extract into shared service pattern.`;
  } else if (category === 'PRODUCER_CONSUMER_BRIDGE') {
    const targets = [...new Set(producesBridgeEvents.map(p => p.sibling))].join(', ') || 'Sibling App';
    recommendation = `Wire into sada-bridge.ts adapter for encrypted transmission to ${targets}. Keep UI isolated in ${appConfig.name}.`;
  } else if (category === 'STRICT_LOCAL') {
    recommendation = `Keep 100% isolated inside ${appConfig.name}. Do not pollute sibling codebases or bridge contracts.`;
  } else {
    recommendation = `Reject or redesign: re-route the heavy subsystem into its canonical host app instead of bloating ${appConfig.name}.`;
  }

  return {
    valid: true,
    target_app: appConfig.name,
    target_app_id: normalizedAppId,
    score,
    category,
    category_label: categoryLabel,
    boundary_fit: boundaryViolations.length === 0 ? 'PASS' : 'FAIL',
    boundary_violations: boundaryViolations,
    bridge_matches: {
      produces: producesBridgeEvents,
      consumes: consumesBridgeEvents,
    },
    recommendation,
  };
}

// CLI Execution Support
const args = process.argv.slice(2);
const isJson = args.includes('--json');
const filteredArgs = args.filter(a => a !== '--json');

if (filteredArgs.length >= 2) {
  const [appId, ...featParts] = filteredArgs;
  const result = evaluateFeature(appId, featParts.join(' '));

  if (isJson) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    console.log('\n=================================================================');
    console.log('📐 SADA SUITE ARCHITECTURAL EVALUATION & DICTIONARY ENGINE');
    console.log('=================================================================\n');
    console.log(`🎯 Target App    : ${result.target_app} (${result.target_app_id})`);
    console.log(`📊 Score         : ${result.score}/100 [Boundary Fit: ${result.boundary_fit}]`);
    console.log(`🏷️  Category      : ${result.category_label}`);
    console.log(`💡 Recommendation: ${result.recommendation}\n`);

    if (result.boundary_violations && result.boundary_violations.length > 0) {
      console.log('⚠️  Boundary Violations Detected:');
      result.boundary_violations.forEach(v => console.log(`   - ${v}`));
      console.log('');
    }

    if (result.bridge_matches && (result.bridge_matches.produces.length > 0 || result.bridge_matches.consumes.length > 0)) {
      console.log('🔗 Bridge Interconnect Opportunities:');
      result.bridge_matches.produces.forEach(p => console.log(`   - Produces [${p.event}] consumed by ${p.sibling}`));
      result.bridge_matches.consumes.forEach(c => console.log(`   - Consumes [${c.event}] produced by ${c.sibling}`));
      console.log('');
    }
    console.log('=================================================================\n');
  }
}

