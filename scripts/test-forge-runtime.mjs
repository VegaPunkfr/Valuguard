// Test runtime du module message-forge.js (vanilla JS cote client)
// Objectif : prouver que qualityGate() marche pour les 3 scenarios (placeholder, AI blacklist, clean)
import fs from 'fs';
import path from 'path';

const ROOT = 'C:/Users/edith/Desktop/Ghost-tax/Claude';

// Stub fetch qui lit les JSON depuis disk
globalThis.fetch = async (url) => {
  // url est typiquement "/cockpit/data/xxx.json"
  const fullPath = path.join(ROOT, 'public', url).replace(/\\/g, '/');
  const text = fs.readFileSync(fullPath, 'utf-8');
  return {
    ok: true,
    json: async () => JSON.parse(text),
  };
};
globalThis.window = {};

// Charger le script : il expose window.MessageForge via IIFE
const forgePath = path.join(ROOT, 'public/cockpit/modules/message-forge.js');
const code = fs.readFileSync(forgePath, 'utf-8');
// Wrap dans une fonction pour exécuter le script dans le contexte global
eval(code);

await window.MessageForge.ready;
console.log('[READY] MessageForge loaded, data fetched.');
console.log('[READY] AI_BLACKLIST entries:', (await fetch('/cockpit/data/ai-blacklist.json')).json ? 'loaded' : 'missing');

// ─── TEST 1 : placeholder non résolu ─────────────────────────
const r1 = window.MessageForge.qualityGate(
  'Sujet test xyz',
  "Bonjour {{firstName}}, TestCo montre des signes de restructuration. Ça vaut un coup d'œil ?",
  { co: 'TestCo', contact: { name: 'Test User', email: 'test@test.com' }, lang: 'fr', market: 'FR' },
  'strict'
);
console.log('[TEST1-PLACEHOLDER]', JSON.stringify(r1, null, 2));

// ─── TEST 2 : AI blacklist phrase ─────────────────────────
const r2 = window.MessageForge.qualityGate(
  'Quick question',
  "Hope you are well — I wanted to reach out about TestCo and your hiring plans. You have been running Stripe lately. Worth a look from your side? I have seen companies like yours leak €200K+ annually.",
  { co: 'TestCo', contact: { name: 'Test User', email: 'test@test.com' }, lang: 'en', market: 'US' },
  'strict'
);
console.log('[TEST2-AIBLACKLIST]', JSON.stringify(r2, null, 2));

// ─── TEST 3 : message propre ~50 mots ─────────────────────────
const r3 = window.MessageForge.qualityGate(
  'TestCo — restructuring',
  "Jane — TestCo is restructuring. I've seen companies like yours leak €200K+ annually from orphaned SaaS licenses. I can run a diagnostic in 48h — £490. Worth a look?\n\nP.S. — Saw you are running Salesforce and Stripe. That combo has known overlap.",
  { co: 'TestCo', contact: { name: 'Jane Doe', email: 'jane@testco.com' }, lang: 'en', market: 'UK', industry: 'fintech', exp: '€200K–€500K', tech: ['Salesforce','Stripe'] },
  'strict'
);
console.log('[TEST3-CLEAN]', JSON.stringify(r3, null, 2));
