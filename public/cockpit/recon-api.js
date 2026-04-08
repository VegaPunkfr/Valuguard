// Recon Ledger API Client — matches /api/command/recon-ledger route
const BASE = '/api/command/recon-ledger';

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

// Sessions
export async function fetchSessions({ limit = 50, offset = 0 } = {}) {
  return api({ type: 'sessions', limit, offset });
}

export async function fetchSessionDetail(sessionId) {
  return api({ type: 'session_detail', session_id: sessionId });
}

// People
export async function fetchPeople({ limit = 50, offset = 0, q = '', status = '' } = {}) {
  const params = { type: 'people', limit, offset };
  if (q) params.q = q;
  if (status) params.status = status;
  return api(params);
}

export async function fetchPersonDetail(personId) {
  return api({ type: 'person_detail', entity_id: personId });
}

// Companies
export async function fetchCompanies({ limit = 50, offset = 0, q = '' } = {}) {
  const params = { type: 'companies', limit, offset };
  if (q) params.q = q;
  return api(params);
}

// Ops State
export async function fetchOpsStates({ limit = 50, offset = 0, status = '' } = {}) {
  const params = { type: 'ops', limit, offset };
  if (status) params.status = status;
  return api(params);
}

export async function fetchActionQueue({ limit = 50 } = {}) {
  return api({ type: 'ops_actionable', limit });
}

export async function updateOpsState(entityId, updates) {
  return api({}, 'POST', { action: 'update_ops', entity_id: entityId, updates });
}

// Actions
export async function fetchActions(entityId, { limit = 20 } = {}) {
  return api({ type: 'actions', entity_id: entityId, limit });
}

export async function logAction(entityType, entityId, actionType, actionData = {}) {
  return api({}, 'POST', { action: 'log_action', entity_type: entityType, entity_id: entityId, action_type: actionType, action_data: actionData });
}

// Relationships
export async function fetchRelationships(entityId) {
  return api({ type: 'relationships', entity_id: entityId });
}

// Patterns
export async function fetchPatterns({ limit = 100 } = {}) {
  return api({ type: 'patterns', limit });
}

// Ingest — main entry point
export async function ingestApolloResults(session, results) {
  return api({}, 'POST', { action: 'ingest', session, results });
}

// Health
export async function fetchHealth() {
  try {
    const res = await fetch(`${BASE}/health`, { headers: window.apiHeaders() });
    if (!res.ok) return { error: `${res.status}` };
    return await res.json();
  } catch (e) {
    return { error: e.message };
  }
}
