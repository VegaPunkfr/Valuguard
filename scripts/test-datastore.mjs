// Test runtime du DataStore TTL cache + dedup guard (J7 - cockpit merge Tier S)
// Objectif : prouver 2 invariants
//   (1) dedup — 3 appels rapprochés au MEME fetchPeople({q:'test'}) = 1 seul fetch reseau
//   (2) TTL expiré — 1er fetch, wait > ttl, 2eme fetch = 2 fetchs reseau distincts
//
// Approche : recon-api.js est un ES module cote client (utilise window.*).
// On simule window/document/fetch en Node avant d'import dynamique du module.

import { pathToFileURL } from 'url';
import path from 'path';

const ROOT = 'C:/Users/edith/Desktop/Ghost-tax/Claude';

// ─── Stubs globaux (avant import module) ────────────────────────
let fetchCallCount = 0;
const fetchLog = [];

globalThis.fetch = async (url, opts) => {
  fetchCallCount++;
  fetchLog.push({ url, method: opts?.method || 'GET', at: Date.now() });
  // Simuler latence reseau realiste (10ms)
  await new Promise((r) => setTimeout(r, 10));
  return {
    ok: true,
    json: async () => ({ data: [{ id: 'stub-1', q: url.includes('q=') ? 'match' : 'nomatch' }] }),
  };
};

// Minimal window + document stubs
globalThis.window = {
  apiHeaders: () => ({ 'Content-Type': 'application/json', 'x-command-key': 'test-key' }),
  addEventListener: () => {},
};
globalThis.document = {
  addEventListener: () => {},
  hidden: false,
};

// ─── Import dynamique du module (ES module natif via file:// URL) ──
const modulePath = path.join(ROOT, 'public/cockpit/recon-api.js').replace(/\\/g, '/');
const moduleUrl = pathToFileURL(modulePath).href;

console.log('[SETUP] Importing', moduleUrl);
const api = await import(moduleUrl);
console.log('[SETUP] Module loaded. Exports:', Object.keys(api).filter(k => typeof api[k] === 'function').slice(0, 5).join(', '), '...');

// ══════════════════════════════════════════════════════════════════
// TEST 1 — Dedup guard : 3 appels rapprochés = 1 seul fetch
// ══════════════════════════════════════════════════════════════════
console.log('\n═══ TEST 1 — DEDUP GUARD ═══');
fetchCallCount = 0; fetchLog.length = 0;
api.store?.invalidate?.(); // si expose

const t0 = Date.now();
// Lancer 3 appels EN MEME TEMPS (pas await un-par-un)
const [r1, r2, r3] = await Promise.all([
  api.fetchPeople({ q: 'test', limit: 50 }),
  api.fetchPeople({ q: 'test', limit: 50 }),
  api.fetchPeople({ q: 'test', limit: 50 }),
]);
const dedupDuration = Date.now() - t0;

console.log('[TEST1] fetchCallCount:', fetchCallCount, '(attendu: 1)');
console.log('[TEST1] duration:', dedupDuration, 'ms');
console.log('[TEST1] r1===r2 (meme ref):', r1 === r2, '| r2===r3:', r2 === r3);
console.log('[TEST1] r1.data.length:', Array.isArray(r1?.data) ? r1.data.length : 'N/A');
console.log('[TEST1] fetchLog:', JSON.stringify(fetchLog.map(x => ({ url: x.url.slice(0, 80), method: x.method })), null, 2));

const test1Pass = fetchCallCount === 1;
console.log('[TEST1] RESULT:', test1Pass ? 'PASS' : 'FAIL');

// ══════════════════════════════════════════════════════════════════
// TEST 2 — TTL expiration : fetch + attente > TTL + re-fetch = 2 fetchs
// ══════════════════════════════════════════════════════════════════
// TTL de fetchPeople = 30000ms (30s). Pour un test runtime rapide on utilise
// directement createDataStore avec un TTL court (500ms), puis on valide que la
// logique guard() expire bien.
console.log('\n═══ TEST 2 — TTL EXPIRATION (via createDataStore, TTL=500ms) ═══');
fetchCallCount = 0; fetchLog.length = 0;

const shortStore = api.createDataStore({ ttl: 500, dedup: true });

let localFetchCount = 0;
const localFetcher = async () => {
  localFetchCount++;
  await new Promise((r) => setTimeout(r, 5));
  return { data: [{ id: 'short', count: localFetchCount }] };
};

// 1er appel : cold → fetch
const a1 = await shortStore.guard('k1', localFetcher, { ttl: 500 });
console.log('[TEST2] 1er fetch:', JSON.stringify(a1), '| localFetchCount=', localFetchCount);

// 2eme appel IMMEDIAT : cache frais → pas de fetch
const a2 = await shortStore.guard('k1', localFetcher, { ttl: 500 });
console.log('[TEST2] 2e fetch (cache frais):', JSON.stringify(a2), '| localFetchCount=', localFetchCount);

// Attendre > TTL (500ms)
console.log('[TEST2] Waiting 600ms for TTL expiration...');
await new Promise((r) => setTimeout(r, 600));

// 3eme appel : cache expire → re-fetch
const a3 = await shortStore.guard('k1', localFetcher, { ttl: 500 });
console.log('[TEST2] 3e fetch (apres expiration):', JSON.stringify(a3), '| localFetchCount=', localFetchCount);

const test2Pass = localFetchCount === 2 && a3.data[0].count === 2;
console.log('[TEST2] localFetchCount=', localFetchCount, '(attendu: 2)');
console.log('[TEST2] RESULT:', test2Pass ? 'PASS' : 'FAIL');

// ══════════════════════════════════════════════════════════════════
// TEST 3 — Bonus : mutation invalide le cache people
// ══════════════════════════════════════════════════════════════════
console.log('\n═══ TEST 3 — MUTATION INVALIDATION (updateOpsState → people cache clear) ═══');
fetchCallCount = 0; fetchLog.length = 0;

// Seed du cache avec un fetchPeople
await api.fetchPeople({ q: 'zzz', limit: 10 });
console.log('[TEST3] Apres fetch initial, fetchCallCount=', fetchCallCount, '(attendu: 1)');

// Re-fetch immediat : doit hit le cache
await api.fetchPeople({ q: 'zzz', limit: 10 });
console.log('[TEST3] Apres re-fetch immediat, fetchCallCount=', fetchCallCount, '(attendu: toujours 1)');

// Mutation
await api.updateOpsState('entity-xyz', { current_status: 'contacted' });
console.log('[TEST3] Apres updateOpsState, fetchCallCount=', fetchCallCount, '(attendu: 2 = 1 initial + 1 mutation POST)');

// Nouveau fetchPeople : cache invalide, donc re-fetch
await api.fetchPeople({ q: 'zzz', limit: 10 });
console.log('[TEST3] Apres re-fetch post-mutation, fetchCallCount=', fetchCallCount, '(attendu: 3)');

const test3Pass = fetchCallCount === 3;
console.log('[TEST3] RESULT:', test3Pass ? 'PASS' : 'FAIL');

// ══════════════════════════════════════════════════════════════════
// VERDICT FINAL
// ══════════════════════════════════════════════════════════════════
console.log('\n═══ VERDICT ═══');
console.log('TEST1 (dedup):', test1Pass ? 'PASS' : 'FAIL');
console.log('TEST2 (TTL):  ', test2Pass ? 'PASS' : 'FAIL');
console.log('TEST3 (inval):', test3Pass ? 'PASS' : 'FAIL');
const allPass = test1Pass && test2Pass && test3Pass;
console.log('OVERALL:', allPass ? 'PASS' : 'FAIL');
process.exit(allPass ? 0 : 1);
