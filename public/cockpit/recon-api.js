// Recon Ledger API Client — ES Module
const BASE = '/api/command/recon-ledger';

async function api(endpoint, method = 'GET', body = null) {
  try {
    const opts = { method, headers: window.apiHeaders() };
    if (body) opts.body = JSON.stringify(body);
    const res = await fetch(`${BASE}${endpoint}`, opts);
    if (!res.ok) return { error: `${res.status} ${res.statusText}` };
    return await res.json();
  } catch (e) {
    return { error: e.message };
  }
}

// Sessions
export async function fetchSessions({ limit = 50, offset = 0, intent = '' } = {}) {
  const params = new URLSearchParams({ limit, offset, ...(intent && { intent }) });
  return api(`/sessions?${params}`);
}

export async function fetchSessionDetail(sessionId) {
  return api(`/sessions/${sessionId}`);
}

export async function logSession(session, results) {
  return api('/sessions', 'POST', { session, results });
}

// People
export async function fetchPeople({ limit = 50, offset = 0, q = '', status = '', sortBy = 'last_seen_at' } = {}) {
  const params = new URLSearchParams({ limit, offset, sort_by: sortBy, ...(q && { q }), ...(status && { status }) });
  return api(`/people?${params}`);
}

export async function fetchPersonDetail(personId) {
  return api(`/people/${personId}`);
}

export async function upsertPerson(personData) {
  return api('/people', 'PUT', personData);
}

// Companies
export async function fetchCompanies({ limit = 50, offset = 0, q = '' } = {}) {
  const params = new URLSearchParams({ limit, offset, ...(q && { q }) });
  return api(`/companies?${params}`);
}

export async function upsertCompany(companyData) {
  return api('/companies', 'PUT', companyData);
}

// Actions
export async function logAction(entityType, entityId, actionType, actionData = {}) {
  return api('/actions', 'POST', { entity_type: entityType, entity_id: entityId, action_type: actionType, action_data: actionData });
}

export async function fetchActions(entityId, { limit = 20 } = {}) {
  const params = new URLSearchParams({ limit });
  return api(`/actions/${entityId}?${params}`);
}

// Ops State
export async function fetchOpsState(entityId) {
  return api(`/ops-state/${entityId}`);
}

export async function updateOpsState(entityId, updates) {
  return api(`/ops-state/${entityId}`, 'PATCH', updates);
}

export async function fetchActionQueue({ status = '', actionable = true, limit = 50 } = {}) {
  const params = new URLSearchParams({ limit, actionable, ...(status && { status }) });
  return api(`/action-queue?${params}`);
}

// Pattern Intelligence
export async function fetchSessionPerformance({ limit = 20 } = {}) {
  const params = new URLSearchParams({ limit });
  return api(`/analytics/session-performance?${params}`);
}

export async function fetchPatternInsights() {
  return api('/analytics/pattern-insights');
}

// Bulk — main entry point for Apollo ingestion
export async function ingestApolloResults(session, results) {
  if (!results || !Array.isArray(results) || results.length === 0) {
    return { error: 'No results to ingest' };
  }

  // 1. Create session record
  const sessionRes = await logSession(session, results);
  if (sessionRes.error) return sessionRes;
  const sessionId = sessionRes.session_id || sessionRes.id;

  let peopleProcessed = 0;
  let companiesProcessed = 0;
  const seenCompanies = new Set();

  for (const result of results) {
    // 2. Upsert company (dedup by domain)
    const companyDomain = result.organization?.primary_domain || result.company_domain || '';
    const companyName = result.organization?.name || result.company || '';
    const companyKey = companyDomain || companyName.toLowerCase().replace(/\s+/g, '-');

    if (companyKey && !seenCompanies.has(companyKey)) {
      seenCompanies.add(companyKey);
      const companyRes = await upsertCompany({
        domain: companyDomain,
        name: companyName,
        industry: result.organization?.industry || '',
        employee_count: result.organization?.estimated_num_employees || null,
        country: result.organization?.country || result.country || '',
        city: result.organization?.city || result.city || '',
        linkedin_url: result.organization?.linkedin_url || '',
        session_id: sessionId,
        raw: result.organization || {}
      });
      if (!companyRes.error) companiesProcessed++;
    }

    // 3. Upsert person (dedup by email or name+company)
    const personRes = await upsertPerson({
      email: result.email || '',
      first_name: result.first_name || '',
      last_name: result.last_name || '',
      name: result.name || `${result.first_name || ''} ${result.last_name || ''}`.trim(),
      title: result.title || '',
      headline: result.headline || '',
      linkedin_url: result.linkedin_url || '',
      phone: result.phone_number || result.sanitized_phone || '',
      company_domain: companyDomain,
      company_name: companyName,
      city: result.city || '',
      country: result.country || '',
      seniority: result.seniority || '',
      departments: result.departments || [],
      session_id: sessionId,
      raw: result
    });

    if (!personRes.error) {
      peopleProcessed++;
      const personId = personRes.person_id || personRes.id;

      // 4. Create initial ops_state for new entities
      if (personRes.created) {
        await updateOpsState(personId, {
          status: 'discovered',
          actionable_now: true,
          next_action: 'review',
          discovery_session_id: sessionId
        });
      }

      // 5. Log discovery action
      await logAction('person', personId, 'discovered', {
        session_id: sessionId,
        source: session.source || 'apollo',
        intent: session.intent || ''
      });
    }
  }

  return { session_id: sessionId, people_processed: peopleProcessed, companies_processed: companiesProcessed };
}
