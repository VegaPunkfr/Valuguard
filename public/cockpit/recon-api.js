// Recon Ledger API Client — matches /api/command/recon-ledger route
// J7 (2026-04-18) — Augmenté avec DataStore TTL cache + dedup guard.
//   Source V4 : public/cockpit-v4.html L1357-1441
//   Objectif : éviter N+1 fetch lors des tab switch + dédupliquer les double-clics.
//   Les signatures publiques historiques (fetchPeople, fetchPersonDetail, fetchOpsStates,
//   updateOpsState, logAction, ingestApolloResults, etc.) sont préservées à l'identique
//   et bénéficient désormais d'un cache TTL + stale-while-revalidate + invalidation sur
//   mutation. Zéro breaking change pour recon-ledger.js / recon-state.js.
//
// Usage direct de l'utility cache (optionnel, pour code externe) :
//   import { createDataStore } from './recon-api.js';
//   const store = createDataStore({ ttl: 30000 });
//   await store.guard('my-key', fetcher, { ttl: 60000 });

const BASE = '/api/command/recon-ledger';

// ══════════════════════════════════════════════════════════════════
// DataStore — TTL cache + dedup guard + stale-while-revalidate
// Clone du contrat V4 L1357-1441, en ES module propre.
// ══════════════════════════════════════════════════════════════════

export function createDataStore({ ttl: defaultTtl = 30000, dedup = true, debug = false } = {}) {
  // cache : Map<key, {data, at, ttl}>  — réponse + âge + durée de vie
  // inflight : Map<key, Promise>        — fetch en cours (dedup)
  const cache = new Map();
  const inflight = new Map();
  const listeners = new Set();

  function emit() {
    listeners.forEach((fn) => { try { fn(); } catch (_) { /* noop */ } });
  }

  function log(msg, ...rest) {
    if (debug) console.log('[DataStore] ' + msg, ...rest);
  }

  function isFresh(key) {
    const e = cache.get(key);
    return !!(e && e.at && (Date.now() - e.at < e.ttl));
  }

  function age(key) {
    const e = cache.get(key);
    return e && e.at ? Date.now() - e.at : Infinity;
  }

  function get(key) {
    const e = cache.get(key);
    return e ? e.data : undefined;
  }

  function set(key, data, ttl) {
    cache.set(key, { data, at: Date.now(), ttl: ttl || defaultTtl });
    emit();
  }

  function invalidate(key) {
    if (key == null) { cache.clear(); }
    else if (key instanceof RegExp) {
      for (const k of Array.from(cache.keys())) { if (key.test(k)) cache.delete(k); }
    } else if (Array.isArray(key)) {
      key.forEach((k) => cache.delete(k));
    } else {
      cache.delete(key);
    }
    emit();
  }

  // guard(key, fetcher, {ttl, force}) — retourne la donnée (fresh ou fraîchement fetchée).
  //   - si cache frais et !force → retourne data immédiatement
  //   - si fetch en cours → attend et retourne la data partagée (dedup)
  //   - sinon lance fetch, stocke promise inflight pour dedup, set() au succès
  async function guard(key, fetcher, opts = {}) {
    const useTtl = opts.ttl || defaultTtl;
    const force = !!opts.force;

    // Cache hit frais → retour immédiat
    if (!force && isFresh(key)) {
      log(`skip key=${key} age=${age(key)}ms`);
      return get(key);
    }

    // Dedup : un fetch identique est déjà en vol
    if (dedup && inflight.has(key)) {
      log(`dedup key=${key}`);
      return inflight.get(key);
    }

    const reason = force ? 'force' : (cache.has(key) ? 'stale' : 'cold');
    log(`fetch key=${key} reason=${reason}`);

    const p = Promise.resolve().then(() => fetcher());
    inflight.set(key, p);
    try {
      const data = await p;
      set(key, data, useTtl);
      return data;
    } finally {
      inflight.delete(key);
    }
  }

  function onChange(cb) {
    listeners.add(cb);
    return () => listeners.delete(cb);
  }

  // Revalidation douce (stale-while-revalidate) : pour chaque clé expirée qu'on
  // a déjà fetch au moins une fois, on relance la fonction associée en arrière-plan.
  // Utilisé par les hooks visibilitychange / focus / online.
  const revalidators = new Map(); // key → fetcher à rappeler
  function registerRevalidator(key, fetcher, opts = {}) {
    revalidators.set(key, { fetcher, opts });
  }

  async function softRevalidate(reason = 'manual') {
    log(`softRevalidate reason=${reason}`);
    const jobs = [];
    for (const [key, { fetcher, opts }] of revalidators) {
      if (!isFresh(key)) {
        jobs.push(
          guard(key, fetcher, { ...opts, force: true }).catch((e) => {
            log(`revalidate failed key=${key}`, e);
          })
        );
      }
    }
    await Promise.all(jobs);
  }

  return {
    cache, inflight,
    isFresh, age, get, set, invalidate,
    guard, onChange,
    registerRevalidator, softRevalidate,
  };
}

// Instance partagée pour ce module — 30s TTL par défaut
const store = createDataStore({ ttl: 30000, dedup: true });

// Installation des hooks browser (idempotent, côté navigateur uniquement)
if (typeof window !== 'undefined' && typeof document !== 'undefined' && !window.__reconApiHooksInstalled) {
  window.__reconApiHooksInstalled = true;
  document.addEventListener('visibilitychange', () => { if (!document.hidden) store.softRevalidate('visibility'); });
  window.addEventListener('focus', () => store.softRevalidate('focus'));
  window.addEventListener('online', () => store.softRevalidate('online'));
}

// ══════════════════════════════════════════════════════════════════
// Low-level fetch helper (inchangé vs V6 original)
// ══════════════════════════════════════════════════════════════════

async function api(params, method = 'GET', body = null) {
  try {
    const opts = { method, headers: window.apiHeaders() };
    if (body) opts.body = JSON.stringify(body);
    const url = method === 'GET' ? `${BASE}?${new URLSearchParams(params)}` : BASE;
    const res = await fetch(url, opts);
    if (!res.ok) return { error: `${res.status} ${res.statusText}` };
    return await res.json();
  } catch (e) {
    return { error: e.message };
  }
}

// ══════════════════════════════════════════════════════════════════
// Cache key helpers — un pattern stable par endpoint
// ══════════════════════════════════════════════════════════════════
function keyPeople({ limit = 50, offset = 0, q = '', status = '' } = {}) {
  return `people:${limit}:${offset}:${q}:${status}`;
}
function keyPersonDetail(id) { return `person_detail:${id}`; }
function keyOpsStates({ limit = 50, offset = 0, status = '' } = {}) {
  return `ops:${limit}:${offset}:${status}`;
}
function keyCompanies({ limit = 50, offset = 0, q = '' } = {}) {
  return `companies:${limit}:${offset}:${q}`;
}
function keySessions({ limit = 50, offset = 0 } = {}) {
  return `sessions:${limit}:${offset}`;
}
function keySessionDetail(id) { return `session_detail:${id}`; }
function keyActionQueue({ limit = 50 } = {}) { return `action_queue:${limit}`; }
function keyActions(entityId, { limit = 20 } = {}) { return `actions:${entityId}:${limit}`; }
function keyRelationships(entityId) { return `relationships:${entityId}`; }
function keyPatterns({ limit = 100 } = {}) { return `patterns:${limit}`; }
function keyEntitySessionsAll() { return 'entity_sessions_all'; }
function keyActionsAll({ limit = 50, offset = 0 } = {}) { return `actions_all:${limit}:${offset}`; }
function keyCounts() { return 'counts'; }

// Invalidation groupée après mutation — regex patterns pour matching souple
const INVALIDATE_ON_OPS_MUTATION = [/^people:/, /^person_detail:/, /^ops:/, /^action_queue:/, /^counts$/];
const INVALIDATE_ON_LOG_ACTION   = [/^actions:/, /^actions_all:/, /^counts$/];
const INVALIDATE_ON_INGEST       = [/^people:/, /^companies:/, /^sessions:/, /^ops:/, /^counts$/, /^entity_sessions_all$/];

function invalidatePatterns(patterns) {
  patterns.forEach((re) => store.invalidate(re));
}

// ══════════════════════════════════════════════════════════════════
// Public API — signatures inchangées, wrappées dans store.guard()
// ══════════════════════════════════════════════════════════════════

// Sessions
export async function fetchSessions({ limit = 50, offset = 0 } = {}) {
  return store.guard(keySessions({ limit, offset }), () => api({ type: 'sessions', limit, offset }), { ttl: 30000 });
}

export async function fetchSessionDetail(sessionId) {
  return store.guard(keySessionDetail(sessionId), () => api({ type: 'session_detail', session_id: sessionId }), { ttl: 60000 });
}

// People — TTL 30s (V4 contract)
export async function fetchPeople({ limit = 50, offset = 0, q = '', status = '' } = {}) {
  const key = keyPeople({ limit, offset, q, status });
  return store.guard(key, () => {
    const params = { type: 'people', limit, offset };
    if (q) params.q = q;
    if (status) params.status = status;
    return api(params);
  }, { ttl: 30000 });
}

export async function fetchPersonDetail(personId) {
  return store.guard(keyPersonDetail(personId), () => api({ type: 'person_detail', entity_id: personId }), { ttl: 60000 });
}

// Companies
export async function fetchCompanies({ limit = 50, offset = 0, q = '' } = {}) {
  const key = keyCompanies({ limit, offset, q });
  return store.guard(key, () => {
    const params = { type: 'companies', limit, offset };
    if (q) params.q = q;
    return api(params);
  }, { ttl: 30000 });
}

// Ops State — TTL 15s (état changeant rapidement)
export async function fetchOpsStates({ limit = 50, offset = 0, status = '' } = {}) {
  const key = keyOpsStates({ limit, offset, status });
  return store.guard(key, () => {
    const params = { type: 'ops', limit, offset };
    if (status) params.status = status;
    return api(params);
  }, { ttl: 15000 });
}

export async function fetchActionQueue({ limit = 50 } = {}) {
  return store.guard(keyActionQueue({ limit }), () => api({ type: 'ops_actionable', limit }), { ttl: 15000 });
}

// MUTATION — pas de cache, invalide les caches impactés
export async function updateOpsState(entityId, updates) {
  const res = await api({}, 'POST', { action: 'update_ops', entity_id: entityId, updates });
  invalidatePatterns(INVALIDATE_ON_OPS_MUTATION);
  // Invalider aussi le détail personne spécifiquement
  store.invalidate(keyPersonDetail(entityId));
  return res;
}

// Actions
export async function fetchActions(entityId, { limit = 20 } = {}) {
  return store.guard(keyActions(entityId, { limit }), () => api({ type: 'actions', entity_id: entityId, limit }), { ttl: 30000 });
}

// MUTATION — pas de cache
export async function logAction(entityType, entityId, actionType, actionData = {}) {
  const res = await api({}, 'POST', { action: 'log_action', entity_type: entityType, entity_id: entityId, action_type: actionType, action_data: actionData });
  invalidatePatterns(INVALIDATE_ON_LOG_ACTION);
  store.invalidate(keyActions(entityId, { limit: 20 }));
  return res;
}

// Relationships
export async function fetchRelationships(entityId) {
  return store.guard(keyRelationships(entityId), () => api({ type: 'relationships', entity_id: entityId }), { ttl: 60000 });
}

// Patterns
export async function fetchPatterns({ limit = 100 } = {}) {
  return store.guard(keyPatterns({ limit }), () => api({ type: 'patterns', limit }), { ttl: 60000 });
}

// MUTATION — ingest, invalide largement
export async function ingestApolloResults(session, results) {
  const res = await api({}, 'POST', { action: 'ingest', session, results });
  invalidatePatterns(INVALIDATE_ON_INGEST);
  return res;
}

// Entity-session junction
export async function fetchEntitySessionsAll() {
  return store.guard(keyEntitySessionsAll(), () => api({ type: 'entity_sessions_all' }), { ttl: 60000 });
}

// All actions
export async function fetchActionsAll({ limit = 50, offset = 0 } = {}) {
  return store.guard(keyActionsAll({ limit, offset }), () => api({ type: 'actions_all', limit, offset }), { ttl: 30000 });
}

// Global counts
export async function fetchCounts() {
  return store.guard(keyCounts(), () => api({ type: 'counts' }), { ttl: 30000 });
}

// Health — pas de cache (veut du temps réel pour diagnostic)
export async function fetchHealth() {
  try {
    const res = await fetch(`${BASE}/health`, { headers: window.apiHeaders() });
    if (!res.ok) return { error: `${res.status}` };
    return await res.json();
  } catch (e) {
    return { error: e.message };
  }
}

// ══════════════════════════════════════════════════════════════════
// Expose au global pour le monolithe V6 (appels via window.reconApi)
// ══════════════════════════════════════════════════════════════════
if (typeof window !== 'undefined') {
  window.reconApi = {
    // Data store instance + factory
    store,
    createDataStore,
    // Fetchs
    fetchSessions, fetchSessionDetail,
    fetchPeople, fetchPersonDetail,
    fetchCompanies,
    fetchOpsStates, fetchActionQueue,
    fetchActions, fetchActionsAll,
    fetchRelationships, fetchPatterns,
    fetchEntitySessionsAll, fetchCounts, fetchHealth,
    // Mutations
    updateOpsState, logAction, ingestApolloResults,
  };
}
