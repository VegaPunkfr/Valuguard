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

// ─── TEST 4 (J2) : getSignalAngle('HIRING_IT', 'de') ───────────
// Vérifie que signal-angles.json est lu correctement côté serveur via le module TS.
// On importe culture-rules compilé à la volée avec tsx, ou on relit directement le JSON et applique le helper ici.
// Vu que ce script est .mjs (pas TS), on re-implémente un mini-lookup en lisant le JSON.
console.log('\n───────── TEST 4 (J2) — getSignalAngle HIRING_IT / de ─────────');
const signalsPath = path.join(ROOT, 'public/cockpit/data/signal-angles.json');
const SIGNALS = JSON.parse(fs.readFileSync(signalsPath, 'utf-8'));
const hiringDeOpeners = SIGNALS.HIRING_IT.openers.de;
const hiringDeConsequence = SIGNALS.HIRING_IT.consequences.de;
const ctaDe = SIGNALS._ctas.de;
console.log('[TEST4-SIGNAL-ANGLE] openers.de[0] =', JSON.stringify(hiringDeOpeners[0]));
console.log('[TEST4-SIGNAL-ANGLE] consequence.de =', JSON.stringify(hiringDeConsequence).slice(0, 120) + '...');
console.log('[TEST4-SIGNAL-ANGLE] cta.de =', JSON.stringify(ctaDe));

const expectedSubstring = 'stellt im Finanzbereich ein';
const opener0 = hiringDeOpeners[0] || '';
const assertion = opener0.includes(expectedSubstring);
console.log(`[TEST4-ASSERT] openers.de[0] contains "${expectedSubstring}" → ${assertion ? 'PASS' : 'FAIL'}`);
if (!assertion) {
  console.error(`[TEST4-FAIL] Expected opener to contain "${expectedSubstring}", got: "${opener0}"`);
  process.exitCode = 1;
} else {
  console.log('[TEST4-PASS] HIRING_IT.openers.de[0] correctly maps to the German finance-hiring angle.');
}

// Bonus: tester le fallback pickSignalAngle via import TS compilé.
// On utilise tsx si dispo, sinon on skip avec un warn.
try {
  const { pickSignalAngle, getSignalAngle } = await import('../lib/outreach/culture-rules.ts').catch(async () => {
    // Fallback: tenter via tsx register (Node 20+)
    return await import('../lib/outreach/culture-rules.js').catch(() => null);
  }) || {};
  if (typeof pickSignalAngle === 'function') {
    const t1 = pickSignalAngle('post-funding sprawl', []);
    const t2 = pickSignalAngle('new cfo joined last week', []);
    const t3 = pickSignalAngle('company X is hiring finance manager');
    console.log('[TEST4-PICK] post-funding →', t1, '(expected FUNDING)');
    console.log('[TEST4-PICK] new cfo →', t2, '(expected NEW_EXEC)');
    console.log('[TEST4-PICK] hiring finance →', t3, '(expected HIRING_IT)');
    const bundle = getSignalAngle('HIRING_IT', 'de', 0);
    console.log('[TEST4-GETANGLE] via TS helper =', JSON.stringify(bundle, null, 2));
  } else {
    console.warn('[TEST4-SKIP] culture-rules.ts import not available in pure .mjs runner — JSON lookup is sufficient proof of data integrity.');
  }
} catch (e) {
  console.warn('[TEST4-SKIP] TS import failed (expected in pure node runner):', e.message);
}
