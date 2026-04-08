// Recon Ledger — Main Orchestrator ES Module
import * as api from './recon-api.js';
import * as sm from './recon-state.js';
import * as ui from './recon-components.js';
import * as u from './recon-utils.js';

// Normalize Supabase canonical_* fields to short names for components
function normPerson(p) {
  if (!p) return p;
  return { ...p,
    name: p.canonical_name || p.name || '',
    email: p.canonical_email || p.email || '',
    title: p.canonical_title || p.title || '',
    company: p.canonical_company || p.company || '',
    country: p.canonical_country || p.country || '',
    city: p.canonical_city || p.city || '',
    linkedin: p.canonical_linkedin || p.linkedin || '',
    email_status: p.email_status || 'unknown',
  };
}

let _container = null;
let _searchTimer = null;

let S = {
  tab: 'tape',
  sessions: [], people: [], companies: [],
  thesis: [],
  triggers: [],
  benchmarks: [],
  ops: {},
  selectedId: null,
  expanded: new Set(),
  filters: { status: '', country: '', freshness: '', hasEmail: null, q: '' },
  sort: { field: 'last_seen_at', dir: 'desc' },
  page: { offset: 0, limit: 50, more: true },
  loading: false
};

// ── Helpers ──────────────────────────────────────────────────────

function el(id) { return document.getElementById(id); }

function setLoading(on) {
  S.loading = on;
  const list = el('rl-list');
  if (on && list) {
    list.innerHTML = '<div style="padding:40px;text-align:center;color:var(--t3);font:500 13px var(--body)">Chargement...</div>';
  }
}

function sortedBy(arr, field, dir) {
  const m = dir === 'desc' ? -1 : 1;
  return [...arr].sort((a, b) => {
    const va = a[field] ?? '';
    const vb = b[field] ?? '';
    if (va < vb) return -1 * m;
    if (va > vb) return 1 * m;
    return 0;
  });
}

function applyClientFilters(items) {
  let out = items;
  const f = S.filters;
  if (f.status) out = out.filter(p => (S.ops[p.id]?.status || 'discovered') === f.status);
  if (f.country) out = out.filter(p => (p.country || '').toLowerCase().includes(f.country.toLowerCase()));
  if (f.freshness) {
    out = out.filter(p => {
      const fr = u.freshness(p.last_seen_at);
      return fr.grade === f.freshness;
    });
  }
  if (f.hasEmail === true) out = out.filter(p => !!p.email);
  if (f.hasEmail === false) out = out.filter(p => !p.email);
  return out;
}

function computeStats() {
  const total = S.people.length;
  const withEmail = S.people.filter(p => !!p.email).length;
  const actionable = S.people.filter(p => {
    const ops = S.ops[p.id];
    return ops && ops.actionable_now;
  }).length;
  const byStatus = {};
  S.people.forEach(p => {
    const st = S.ops[p.id]?.status || 'discovered';
    byStatus[st] = (byStatus[st] || 0) + 1;
  });
  return { total, withEmail, actionable, byStatus, sessions: S.sessions.length };
}

// ── Layout ───────────────────────────────────────────────────────

function renderShell() {
  _container.innerHTML = `
    <div id="rl-stats" style="display:flex;gap:12px;padding:10px 16px;border-bottom:1px solid var(--bd);flex-wrap:wrap"></div>
    <div id="rl-tabs" style="display:flex;gap:0;border-bottom:1px solid var(--bd);padding:0 16px">
      <button class="rl-tab rl-tab--active" onclick="window.recon.switchTab('tape')" data-tab="tape" style="padding:8px 16px;background:none;border:none;border-bottom:2px solid var(--bronze);color:var(--t1);font:600 12px var(--body);cursor:pointer;text-transform:uppercase;letter-spacing:.5px">Tape</button>
      <button class="rl-tab" onclick="window.recon.switchTab('entities')" data-tab="entities" style="padding:8px 16px;background:none;border:none;border-bottom:2px solid transparent;color:var(--t3);font:600 12px var(--body);cursor:pointer;text-transform:uppercase;letter-spacing:.5px">Entities</button>
      <button class="rl-tab" onclick="window.recon.switchTab('queue')" data-tab="queue" style="padding:8px 16px;background:none;border:none;border-bottom:2px solid transparent;color:var(--t3);font:600 12px var(--body);cursor:pointer;text-transform:uppercase;letter-spacing:.5px">Queue</button>
      <button class="rl-tab" onclick="window.recon.switchTab('patterns')" data-tab="patterns" style="padding:8px 16px;background:none;border:none;border-bottom:2px solid transparent;color:var(--t3);font:600 12px var(--body);cursor:pointer;text-transform:uppercase;letter-spacing:.5px">Patterns</button>
      <button class="rl-tab" onclick="window.recon.switchTab('thesis')" data-tab="thesis" style="padding:8px 16px;background:none;border:none;border-bottom:2px solid transparent;color:var(--t3);font:600 12px var(--body);cursor:pointer;text-transform:uppercase;letter-spacing:.5px">Thesis</button>
      <button class="rl-tab" onclick="window.recon.switchTab('committee')" data-tab="committee" style="padding:8px 16px;background:none;border:none;border-bottom:2px solid transparent;color:var(--t3);font:600 12px var(--body);cursor:pointer;text-transform:uppercase;letter-spacing:.5px">Committee</button>
      <button class="rl-tab" onclick="window.recon.switchTab('allocator')" data-tab="allocator" style="padding:8px 16px;background:none;border:none;border-bottom:2px solid transparent;color:var(--t3);font:600 12px var(--body);cursor:pointer;text-transform:uppercase;letter-spacing:.5px">Allocator</button>
      <button class="rl-tab" onclick="window.recon.switchTab('benchmarks')" data-tab="benchmarks" style="padding:8px 16px;background:none;border:none;border-bottom:2px solid transparent;color:var(--t3);font:600 12px var(--body);cursor:pointer;text-transform:uppercase;letter-spacing:.5px">Benchmarks</button>
    </div>
    <div id="rl-toolbar" style="display:flex;gap:8px;padding:8px 16px;align-items:center;border-bottom:1px solid var(--bd);flex-wrap:wrap">
      <input id="rl-search" type="text" placeholder="Rechercher..." oninput="window.recon.search(this.value)" style="flex:1;min-width:180px;padding:5px 10px;background:var(--graphite);border:1px solid var(--bd);border-radius:4px;color:var(--t1);font:400 12px var(--body);outline:none">
      <select id="rl-filter-status" onchange="window.recon.applyFilter('status',this.value)" style="padding:5px 8px;background:var(--graphite);border:1px solid var(--bd);border-radius:4px;color:var(--t2);font:400 11px var(--body);outline:none">
        <option value="">Tous statuts</option>
        ${sm.STATES.map(s => `<option value="${s}">${u.statusLabel(s)}</option>`).join('')}
      </select>
      <select id="rl-filter-country" onchange="window.recon.applyFilter('country',this.value)" style="padding:5px 8px;background:var(--graphite);border:1px solid var(--bd);border-radius:4px;color:var(--t2);font:400 11px var(--body);outline:none">
        <option value="">Tous pays</option>
        <option value="germany">DE</option>
        <option value="united states">US</option>
        <option value="united kingdom">UK</option>
        <option value="netherlands">NL</option>
        <option value="switzerland">CH</option>
        <option value="austria">AT</option>
        <option value="france">FR</option>
      </select>
      <select id="rl-filter-freshness" onchange="window.recon.applyFilter('freshness',this.value)" style="padding:5px 8px;background:var(--graphite);border:1px solid var(--bd);border-radius:4px;color:var(--t2);font:400 11px var(--body);outline:none">
        <option value="">Fraicheur</option>
        <option value="fresh">Fresh (&lt;7j)</option>
        <option value="warm">Warm (7-30j)</option>
        <option value="aging">Aging (30-90j)</option>
        <option value="stale">Stale (90j+)</option>
      </select>
      <select id="rl-filter-email" onchange="window.recon.applyFilter('hasEmail',this.value)" style="padding:5px 8px;background:var(--graphite);border:1px solid var(--bd);border-radius:4px;color:var(--t2);font:400 11px var(--body);outline:none">
        <option value="">Email?</option>
        <option value="yes">Avec email</option>
        <option value="no">Sans email</option>
      </select>
      <button onclick="window.recon.clearFilters()" style="padding:5px 10px;background:none;border:1px solid var(--bd);border-radius:4px;color:var(--t3);font:500 11px var(--body);cursor:pointer" title="Reset filtres">\u2715</button>
      <button onclick="window.recon.refresh()" style="padding:5px 10px;background:var(--bronze-lo);border:1px solid var(--bdf);border-radius:4px;color:var(--bronze-hi);font:600 11px var(--body);cursor:pointer">\u21BB</button>
    </div>
    <div style="display:flex;flex:1;overflow:hidden">
      <div id="rl-list" style="flex:1;overflow-y:auto"></div>
      <div id="rl-detail" style="width:380px;overflow-y:auto;border-left:1px solid var(--bd);display:none"></div>
    </div>`;
}

// ── Stats bar ────────────────────────────────────────────────────

function renderStats() {
  const stats = computeStats();
  const statEl = el('rl-stats');
  if (!statEl) return;
  const pill = (label, val, color) =>
    `<div style="display:flex;align-items:center;gap:5px;padding:3px 10px;background:${color}15;border:1px solid ${color}30;border-radius:4px;font:500 11px var(--mono)">
      <span style="color:var(--t3)">${label}</span>
      <span style="color:${color};font-weight:700">${val}</span>
    </div>`;
  statEl.innerHTML =
    pill('Entites', stats.total, 'var(--t1)') +
    pill('Sessions', stats.sessions, 'var(--blue)') +
    pill('Emails', stats.withEmail, 'var(--cyan)') +
    pill('Actionable', stats.actionable, 'var(--green)') +
    Object.entries(stats.byStatus)
      .filter(([, v]) => v > 0)
      .map(([k, v]) => pill(u.statusLabel(k), v, u.statusColor(k)))
      .join('');
}

// ── Tab rendering ────────────────────────────────────────────────

function updateTabButtons() {
  const tabs = _container.querySelectorAll('[data-tab]');
  tabs.forEach(btn => {
    const isActive = btn.dataset.tab === S.tab;
    btn.style.borderBottomColor = isActive ? 'var(--bronze)' : 'transparent';
    btn.style.color = isActive ? 'var(--t1)' : 'var(--t3)';
  });
}

function renderCurrentTab() {
  switch (S.tab) {
    case 'tape': renderTape(); break;
    case 'entities': renderEntities(); break;
    case 'queue': renderQueue(); break;
    case 'patterns': renderPatterns(); break;
    case 'thesis': renderThesisBoard(); break;
    case 'committee': renderCommitteeBuilder(); break;
    case 'allocator': renderTriggerAllocator(); break;
    case 'benchmarks': renderBenchmarkDashboard(); break;
  }
}

// ── TAPE tab ─────────────────────────────────────────────────────

function renderTape() {
  const list = el('rl-list');
  if (!list) return;
  if (S.sessions.length === 0) {
    list.innerHTML = '<div style="padding:40px;text-align:center;color:var(--t3);font:400 13px var(--body)">Aucune session enregistree. Lancez un scan Apollo pour commencer.</div>';
    return;
  }
  const sorted = sortedBy(S.sessions, S.sort.field === 'last_seen_at' ? 'created_at' : S.sort.field, S.sort.dir);
  list.innerHTML = sorted.map((sess, i) => {
    const expanded = S.expanded.has(i);
    return ui.renderSessionCard(sess, i, expanded);
  }).join('') + renderLoadMoreBtn();
}

// ── ENTITIES tab ─────────────────────────────────────────────────

function renderEntities() {
  const list = el('rl-list');
  if (!list) return;
  let filtered = applyClientFilters(S.people);
  filtered = sortedBy(filtered, S.sort.field, S.sort.dir);
  if (filtered.length === 0) {
    list.innerHTML = '<div style="padding:40px;text-align:center;color:var(--t3);font:400 13px var(--body)">Aucune entite trouvee avec ces filtres.</div>';
    return;
  }
  const rows = filtered.map(p => {
    const ops = S.ops[p.id] || {};
    const priority = sm.calculatePriority(p, ops);
    const fresh = u.freshness(p.last_seen_at);
    return ui.renderPersonRow(p, ops, priority, fresh);
  }).join('');
  list.innerHTML = '<div style="padding:8px 16px">' + rows + '</div>' + renderLoadMoreBtn();
}

// ── QUEUE tab ────────────────────────────────────────────────────

function renderQueue() {
  const list = el('rl-list');
  if (!list) return;
  const actionable = sm.filterActionable(S.people, S.ops);
  const scored = actionable.map(p => {
    const ops = S.ops[p.id] || {};
    const priority = sm.calculatePriority(p, ops);
    return { person: p, ops, priority };
  }).sort((a, b) => b.priority - a.priority);
  if (scored.length === 0) {
    list.innerHTML = '<div style="padding:40px;text-align:center;color:var(--t3);font:400 13px var(--body)">Aucune action en attente. Toutes les entites sont a jour.</div>';
    return;
  }
  list.innerHTML = '<div style="padding:8px 16px">' +
    scored.map(({ person, ops, priority }) => ui.renderActionQueueRow(person, ops, priority)).join('') +
    '</div>';
}

// ── PATTERNS tab ─────────────────────────────────────────────────

function renderPatterns() {
  const list = el('rl-list');
  if (!list) return;
  if (S.sessions.length === 0) {
    list.innerHTML = '<div style="padding:40px;text-align:center;color:var(--t3);font:400 13px var(--body)">Pas assez de donnees pour afficher les patterns.</div>';
    return;
  }
  // Calculate yield per session
  const sessData = S.sessions.map(sess => {
    const people = S.people.filter(p => p.session_id === sess.id || (sess.id && p.discovery_session_id === sess.id));
    const withEmail = people.filter(p => !!p.email).length;
    const contacted = people.filter(p => {
      const ops = S.ops[p.id];
      return ops && ['contacted','replied','nurturing','qualified','closed'].includes(ops.current_status);
    }).length;
    const replied = people.filter(p => {
      const ops = S.ops[p.id];
      return ops && ['replied','nurturing','qualified','closed'].includes(ops.current_status);
    }).length;
    return {
      session: sess,
      total: people.length,
      withEmail,
      contacted,
      replied,
      yield: people.length > 0 ? Math.round((withEmail / people.length) * 100) : 0,
      conversionRate: contacted > 0 ? Math.round((replied / contacted) * 100) : 0
    };
  });
  list.innerHTML = '<div style="padding:8px 16px">' +
    sessData.map(d => ui.renderPatternCard(d)).join('') +
    '</div>';
}

// ── THESIS BOARD ────────────────────────────────────────────────
function renderThesisBoard() {
  const list = el('rl-list');
  if (!list) return;
  const thesis = S.thesis || [];
  if (!thesis.length) { list.innerHTML = '<div style="padding:40px;text-align:center;color:var(--t3);font:400 13px var(--body)">Aucune thesis. Les thesis se créent automatiquement quand une company est vue 2+ fois.</div>'; return; }

  // Sort: actionable first, then composite desc
  const sorted = [...thesis].sort((a,b) => {
    const aAct = ['draft','validated','active'].includes(a.thesis_status) ? 1 : 0;
    const bAct = ['draft','validated','active'].includes(b.thesis_status) ? 1 : 0;
    if (aAct !== bAct) return bAct - aAct;
    return (b.composite_score||0) - (a.composite_score||0);
  });

  const s = v => window.sanitize(v ?? '');
  list.innerHTML = `
    <div style="display:grid;grid-template-columns:1.5fr 1fr 50px 50px 50px 50px 80px 1.8fr 80px;gap:0;padding:4px 8px;font:700 9px var(--mono);color:var(--t3);letter-spacing:.08em;text-transform:uppercase;border-bottom:1px solid var(--bd)">
      <span>Company</span><span>Signal</span><span>P</span><span>C</span><span>A</span><span>Σ</span><span>Committee</span><span>Next Move</span><span>Status</span>
    </div>
    ${sorted.map(t => {
      const pCol = (t.account_pressure_score||0) > 50 ? 'var(--red)' : (t.account_pressure_score||0) > 25 ? 'var(--gold)' : 'var(--t3)';
      const cCol = (t.committee_completeness_score||0) > 50 ? 'var(--green)' : (t.committee_completeness_score||0) > 25 ? 'var(--gold)' : 'var(--t3)';
      const aCol = (t.activation_readiness_score||0) > 50 ? 'var(--cyan)' : (t.activation_readiness_score||0) > 25 ? 'var(--gold)' : 'var(--t3)';
      const sCol = (t.composite_score||0) > 70 ? 'var(--green)' : (t.composite_score||0) > 40 ? 'var(--gold)' : 'var(--t3)';
      const covBadge = t.committee_coverage === 'complete' ? '🟢' : t.committee_coverage === 'partial' ? '🟡' : '🔴';
      const statusCol = t.thesis_status === 'active' ? 'var(--green)' : t.thesis_status === 'validated' ? 'var(--cyan)' : 'var(--t3)';
      return `<div style="display:grid;grid-template-columns:1.5fr 1fr 50px 50px 50px 50px 80px 1.8fr 80px;gap:0;padding:8px;border-bottom:1px solid rgba(255,255,255,.03);align-items:center;cursor:pointer" onclick="window.recon.selectThesis('${s(t.company_domain)}')">
        <div>
          <div style="font:600 12px var(--body);color:var(--t1)">${s(t.company_domain)}</div>
          <div style="font:400 9px var(--mono);color:var(--t4)">${t.contact_count||0} contacts · ${t.enriched_contact_count||0} enrichis</div>
        </div>
        <div style="font:400 10px var(--mono);color:var(--t2)">${s(t.primary_signal||'—')}</div>
        <div style="font:700 12px var(--mono);color:${pCol}">${t.account_pressure_score||0}</div>
        <div style="font:700 12px var(--mono);color:${cCol}">${t.committee_completeness_score||0}</div>
        <div style="font:700 12px var(--mono);color:${aCol}">${t.activation_readiness_score||0}</div>
        <div style="font:800 12px var(--mono);color:${sCol}">${t.composite_score||0}</div>
        <div style="font:400 10px var(--mono)">${covBadge} ${s(t.committee_coverage||'none')}</div>
        <div style="font:400 10px var(--body);color:var(--t2)">${s(t.recommended_next_move||'—')}</div>
        <div style="font:700 9px var(--mono);color:${statusCol};letter-spacing:.06em;text-transform:uppercase">${s(t.thesis_status||'draft')}</div>
      </div>`;
    }).join('')}`;
}

// ── COMMITTEE BUILDER ───────────────────────────────────────────
function renderCommitteeBuilder() {
  const list = el('rl-list');
  if (!list) return;
  const thesis = S.thesis || [];
  if (!thesis.length) { list.innerHTML = '<div style="padding:40px;text-align:center;color:var(--t3);font:400 13px var(--body)">Aucune company avec thesis.</div>'; return; }

  const s = v => window.sanitize(v ?? '');
  list.innerHTML = `
    <div style="display:grid;grid-template-columns:1.5fr 1fr 1fr 1fr 60px 60px 80px;gap:0;padding:4px 8px;font:700 9px var(--mono);color:var(--t3);letter-spacing:.08em;text-transform:uppercase;border-bottom:1px solid var(--bd)">
      <span>Company</span><span>CFO</span><span>CIO/CTO</span><span>Procurement</span><span>Total</span><span>Enriched</span><span>Coverage</span>
    </div>
    ${thesis.map(t => {
      const committee = t.target_committee || [];
      const findRole = (pattern) => committee.find(c => pattern.test(c.title || ''));
      const cfo = findRole(/cfo|chief financial|vp finance|finance director|head of finance/i);
      const cio = findRole(/cio|cto|chief technology|chief information|vp it|vp engineering|head of it/i);
      const proc = findRole(/procurement|purchasing|sourcing|vendor/i);
      const roleCell = (person) => {
        if (!person) return '<span style="color:var(--red);font:400 10px var(--mono)">— manquant</span>';
        const dot = person.enriched ? '<span style="color:var(--green)">●</span>' : '<span style="color:var(--t4)">○</span>';
        return `<span style="font:400 10px var(--mono);color:var(--t1)">${dot} ${s(person.name||'?')}</span>`;
      };
      const covBadge = t.committee_coverage === 'complete' ? '🟢 complete' : t.committee_coverage === 'partial' ? '🟡 partial' : '🔴 none';
      return `<div style="display:grid;grid-template-columns:1.5fr 1fr 1fr 1fr 60px 60px 80px;gap:0;padding:10px 8px;border-bottom:1px solid rgba(255,255,255,.03);align-items:center">
        <div style="font:600 12px var(--body);color:var(--t1)">${s(t.company_domain)}</div>
        ${roleCell(cfo)}
        ${roleCell(cio)}
        ${roleCell(proc)}
        <div style="font:700 12px var(--mono);color:var(--t1);text-align:center">${t.contact_count||0}</div>
        <div style="font:700 12px var(--mono);color:${(t.enriched_contact_count||0)>0?'var(--green)':'var(--t4)'};text-align:center">${t.enriched_contact_count||0}</div>
        <div style="font:400 10px var(--mono)">${covBadge}</div>
      </div>`;
    }).join('')}`;
}

// ── TRIGGER ALLOCATOR ───────────────────────────────────────────
function renderTriggerAllocator() {
  const list = el('rl-list');
  if (!list) return;
  const triggers = S.triggers || [];
  if (!triggers.length) { list.innerHTML = '<div style="padding:40px;text-align:center;color:var(--t3);font:400 13px var(--body)">Aucun trigger en attente. Les triggers se créent quand un prospect atteint les seuils de warmth.</div>'; return; }

  const sorted = [...triggers].sort((a,b) => (b.expected_value||0) - (a.expected_value||0));
  const topEV = sorted[0]?.expected_value || 0;
  const s = v => window.sanitize(v ?? '');

  list.innerHTML = `
    <div style="padding:8px 12px;font:400 11px var(--body);color:var(--t3);border-bottom:1px solid var(--bd)">
      ${triggers.length} trigger${triggers.length>1?'s':''} en attente · Crédits estimés: ${triggers.reduce((a,t)=>a+(t.estimated_credits||1),0)}
    </div>
    ${sorted.map((t,i) => {
      const isTop = (t.expected_value||0) >= topEV * 0.8;
      const evColor = isTop ? 'var(--green)' : (t.expected_value||0) > 30 ? 'var(--gold)' : 'var(--t3)';
      const betterExists = i > 0 && sorted[0].expected_value > t.expected_value * 1.5;
      return `<div style="padding:12px;margin:4px 8px;background:var(--graphite);border:1px solid ${isTop?'hsla(155,100%,39%,.15)':'var(--bd)'};border-radius:6px">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
          <div>
            <span style="font:700 12px var(--body);color:var(--t1)">${s(t.trigger_reason)}</span>
            <span style="font:400 10px var(--mono);color:var(--t3);margin-left:8px">${s(t.trigger_type)}</span>
          </div>
          <div style="display:flex;gap:6px;align-items:center">
            <span style="font:800 14px var(--mono);color:${evColor}">EV ${Math.round(t.expected_value||0)}</span>
            <span style="font:400 9px var(--mono);color:var(--t4)">${t.estimated_credits||1} cr.</span>
          </div>
        </div>
        <div style="display:flex;gap:12px;font:400 10px var(--mono);color:var(--t2);margin-bottom:8px">
          <span>P:<b style="color:var(--t1)">${t.account_pressure||0}</b></span>
          <span>C:<b style="color:var(--t1)">${t.committee_completeness||0}</b></span>
          <span>A:<b style="color:var(--t1)">${t.activation_readiness||0}</b></span>
          <span>Σ:<b style="color:var(--t1)">${t.composite_score||0}</b></span>
        </div>
        ${betterExists ? '<div style="font:400 9px var(--mono);color:var(--gold);margin-bottom:6px">⚠ Meilleur usage possible — trigger #1 a un EV '+Math.round(sorted[0].expected_value)+' vs '+Math.round(t.expected_value)+'</div>' : ''}
        <div style="display:flex;gap:6px">
          <button onclick="window.recon.approveTrigger('${t.id}')" style="padding:4px 12px;background:hsla(155,100%,39%,.1);border:1px solid hsla(155,100%,39%,.2);border-radius:4px;color:var(--green);font:700 10px var(--mono);cursor:pointer">Approuver</button>
          <button onclick="window.recon.rejectTrigger('${t.id}')" style="padding:4px 12px;background:transparent;border:1px solid var(--bd);border-radius:4px;color:var(--t3);font:400 10px var(--mono);cursor:pointer">Rejeter</button>
        </div>
      </div>`;
    }).join('')}`;
}

// ── BENCHMARK DASHBOARD ─────────────────────────────────────────
function renderBenchmarkDashboard() {
  const list = el('rl-list');
  if (!list) return;
  const benchmarks = S.benchmarks || [];
  if (!benchmarks.length) { list.innerHTML = '<div style="padding:40px;text-align:center;color:var(--t3);font:400 13px var(--body)">Aucun benchmark calculé. Les benchmarks se construisent au fil des recherches Apollo (min 3 companies par segment).</div>'; return; }

  const s = v => window.sanitize(v ?? '');
  const confColor = c => c === 'publishable' ? 'var(--green)' : c === 'defensible' ? 'var(--cyan)' : c === 'indicative' ? 'var(--gold)' : 'var(--t4)';

  list.innerHTML = `
    <div style="display:grid;grid-template-columns:1.2fr 1fr 60px 80px 60px 60px 60px 100px;gap:0;padding:4px 8px;font:700 9px var(--mono);color:var(--t3);letter-spacing:.08em;text-transform:uppercase;border-bottom:1px solid var(--bd)">
      <span>Segment</span><span>Metric</span><span>N</span><span>Confidence</span><span>P25</span><span>Median</span><span>P75</span><span>Usage</span>
    </div>
    ${benchmarks.map(b => {
      const cc = confColor(b.confidence_level);
      const usable = b.confidence_level === 'defensible' || b.confidence_level === 'publishable';
      return `<div style="display:grid;grid-template-columns:1.2fr 1fr 60px 80px 60px 60px 60px 100px;gap:0;padding:8px;border-bottom:1px solid rgba(255,255,255,.03);align-items:center">
        <div style="font:500 11px var(--body);color:var(--t1)">${s(b.segment_key)}</div>
        <div style="font:400 10px var(--mono);color:var(--t2)">${s(b.metric_name)}</div>
        <div style="font:700 12px var(--mono);color:var(--t1);text-align:center">${b.sample_size}</div>
        <div style="font:700 9px var(--mono);color:${cc};letter-spacing:.06em;text-transform:uppercase">${s(b.confidence_level)}</div>
        <div style="font:400 11px var(--mono);color:var(--t2);text-align:center">${b.p25_val ?? '—'}</div>
        <div style="font:700 11px var(--mono);color:var(--t1);text-align:center">${b.median_val ?? '—'}</div>
        <div style="font:400 11px var(--mono);color:var(--t2);text-align:center">${b.p75_val ?? '—'}</div>
        <div style="font:400 9px var(--mono);color:${usable?'var(--green)':'var(--t4)'}">${usable?'✓ Client-ready':'⊘ Interne seul'}</div>
      </div>`;
    }).join('')}`;
}

// ── Load more button ─────────────────────────────────────────────

function renderLoadMoreBtn() {
  if (!S.page.more) return '';
  return `<div style="padding:12px 16px;text-align:center">
    <button onclick="window.recon.loadMore()" style="padding:6px 20px;background:var(--steel);border:1px solid var(--bd);border-radius:4px;color:var(--t2);font:500 11px var(--body);cursor:pointer">Charger plus</button>
  </div>`;
}

// ── Detail panel ─────────────────────────────────────────────────

async function showDetail(personId) {
  S.selectedId = personId;
  const detailEl = el('rl-detail');
  if (!detailEl) return;
  detailEl.style.display = 'block';
  detailEl.innerHTML = '<div style="padding:20px;text-align:center;color:var(--t3)">Chargement...</div>';

  const personRes = await api.fetchPersonDetail(personId);

  if (personRes.error) {
    detailEl.innerHTML = `<div style="padding:20px;color:var(--red)">Erreur: ${window.sanitize(personRes.error)}</div>`;
    return;
  }

  const person = normPerson(personRes.person || {});
  const actions = personRes.actions || [];
  const ops = personRes.ops || S.ops[personId] || {};
  if (ops.entity_id) S.ops[ops.entity_id] = ops;
  const nextStates = sm.getNextStates(ops.current_status || 'discovered');
  const priority = sm.calculatePriority(person, ops, actions);
  const fresh = u.freshness(person.last_seen_at);

  detailEl.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;padding:12px 16px;border-bottom:1px solid var(--bd)">
      <span style="font:600 13px var(--body);color:var(--t1)">Detail</span>
      <button onclick="window.recon.closeDetail()" style="background:none;border:none;color:var(--t3);font-size:16px;cursor:pointer;padding:2px 6px">\u2715</button>
    </div>
    ${ui.renderPersonDetail(person, ops, actions, priority, fresh, nextStates)}`;
}

function hideDetail() {
  S.selectedId = null;
  const detailEl = el('rl-detail');
  if (detailEl) {
    detailEl.style.display = 'none';
    detailEl.innerHTML = '';
  }
}

// ── Data loading ─────────────────────────────────────────────────

async function loadInitial() {
  setLoading(true);
  const [sessRes, peopleRes, opsRes] = await Promise.all([
    api.fetchSessions({ limit: S.page.limit }),
    api.fetchPeople({ limit: S.page.limit }),
    api.fetchOpsStates({ limit: 100 })
  ]);

  S.sessions = sessRes.data || [];
  S.people = (peopleRes.data || []).map(normPerson);
  const opsArr = opsRes.data || [];
  opsArr.forEach(o => { if (o.entity_id) S.ops[o.entity_id] = o; });
  if (!Array.isArray(S.sessions)) S.sessions = [];
  if (!Array.isArray(S.people)) S.people = [];
  S.page.more = S.people.length >= S.page.limit || S.sessions.length >= S.page.limit;

  setLoading(false);
  renderStats();
  renderCurrentTab();
}

async function loadTabData(tab) {
  setLoading(true);
  S.page.offset = 0;
  S.page.more = true;

  switch (tab) {
    case 'tape': {
      const res = await api.fetchSessions({ limit: S.page.limit });
      S.sessions = res.data || [];
      if (!Array.isArray(S.sessions)) S.sessions = [];
      S.page.more = S.sessions.length >= S.page.limit;
      break;
    }
    case 'entities': {
      const [res, opsRes] = await Promise.all([
        api.fetchPeople({ limit: S.page.limit, q: S.filters.q || '', status: S.filters.status || '' }),
        api.fetchOpsStates({ limit: 100 })
      ]);
      S.people = (res.data || []).map(normPerson);
      if (!Array.isArray(S.people)) S.people = [];
      const opsArr = opsRes.data || [];
      opsArr.forEach(o => { if (o.entity_id) S.ops[o.entity_id] = o; });
      S.page.more = S.people.length >= S.page.limit;
      break;
    }
    case 'queue': {
      const res = await api.fetchActionQueue({ limit: S.page.limit });
      const queueOps = res.data || [];
      if (Array.isArray(queueOps)) {
        queueOps.forEach(o => { if (o.entity_id) S.ops[o.entity_id] = o; });
      }
      break;
    }
    case 'patterns': {
      if (S.sessions.length === 0) {
        const res = await api.fetchSessions({ limit: 100 });
        S.sessions = res.data || [];
        if (!Array.isArray(S.sessions)) S.sessions = [];
      }
      break;
    }
    case 'thesis': {
      const res = await api.fetchThesis ? await api.fetchThesis() : await fetch('/api/command/recon-ledger?type=thesis&limit=50', { headers: window.apiHeaders() }).then(r=>r.json());
      S.thesis = res.data || [];
      break;
    }
    case 'committee': {
      const res = await fetch('/api/command/recon-ledger?type=thesis&limit=50', { headers: window.apiHeaders() }).then(r=>r.json());
      S.thesis = res.data || [];
      break;
    }
    case 'allocator': {
      const res = await fetch('/api/command/recon-ledger?type=triggers&pending=true&limit=50', { headers: window.apiHeaders() }).then(r=>r.json());
      S.triggers = res.data || [];
      break;
    }
    case 'benchmarks': {
      const res = await fetch('/api/command/recon-ledger?type=benchmarks&limit=50', { headers: window.apiHeaders() }).then(r=>r.json());
      S.benchmarks = res.data || [];
      break;
    }
  }

  setLoading(false);
  renderStats();
  renderCurrentTab();
}

async function loadMore() {
  if (S.loading || !S.page.more) return;
  S.page.offset += S.page.limit;
  const list = el('rl-list');
  const prevScroll = list ? list.scrollTop : 0;

  S.loading = true;

  if (S.tab === 'tape') {
    const res = await api.fetchSessions({ limit: S.page.limit, offset: S.page.offset });
    const arr = res.data || [];
    S.sessions = S.sessions.concat(arr);
    S.page.more = arr.length >= S.page.limit;
  } else if (S.tab === 'entities') {
    const res = await api.fetchPeople({ limit: S.page.limit, offset: S.page.offset, q: S.filters.q || '', status: S.filters.status || '' });
    const arr = (res.data || []).map(normPerson);
    S.people = S.people.concat(arr);
    S.page.more = arr.length >= S.page.limit;
  }

  S.loading = false;
  renderCurrentTab();

  // Preserve scroll for loadMore
  if (list) list.scrollTop = prevScroll;
}

// ── Action handlers ──────────────────────────────────────────────

async function changeStatus(id, newStatus) {
  const current = S.ops[id]?.current_status || 'discovered';
  if (!sm.canTransition(current, newStatus)) return;
  const res = await api.updateOpsState(id, { current_status: newStatus });
  if (!res.error) {
    S.ops[id] = { ...S.ops[id], current_status: newStatus, previous_status: current, status_changed_at: new Date().toISOString() };
    renderStats();
    renderCurrentTab();
    if (S.selectedId === id) showDetail(id);
  }
}

async function injectToCampaign(id) {
  const person = S.people.find(p => p.id === id);
  if (!person) return;
  const res = await api.logAction('person', id, 'injected_to_campaign', {
    email: person.email || '',
    name: person.name || '',
    company: person.company_name || '',
    injected_at: new Date().toISOString()
  });
  if (!res.error) {
    await changeStatus(id, 'contacted');
  }
}

async function markRevisit(id, days) {
  const dueAt = new Date(Date.now() + days * 86400000).toISOString();
  const res = await api.updateOpsState(id, {
    next_action: 'revisit',
    next_action_due_at: dueAt,
    actionable_now: false
  });
  if (!res.error) {
    S.ops[id] = { ...S.ops[id], next_action: 'revisit', next_action_due_at: dueAt, actionable_now: false };
    renderCurrentTab();
    if (S.selectedId === id) showDetail(id);
  }
}

async function addNote(id) {
  const note = prompt('Note:');
  if (!note || !note.trim()) return;
  await api.logAction('person', id, 'note', { text: note.trim() });
  if (S.selectedId === id) showDetail(id);
}

async function addTag(id, tag) {
  if (!tag) {
    tag = prompt('Tag:');
    if (!tag || !tag.trim()) return;
  }
  const current = S.ops[id]?.tags || [];
  if (current.includes(tag.trim())) return;
  const newTags = [...current, tag.trim()];
  const res = await api.updateOpsState(id, { tags: newTags });
  if (!res.error) {
    S.ops[id] = { ...S.ops[id], tags: newTags };
    if (S.selectedId === id) showDetail(id);
  }
}

// ── window.recon namespace ───────────────────────────────────────

function bindHandlers() {
  window.recon = {
    switchTab(t) {
      if (t === S.tab) return;
      S.tab = t;
      S.expanded.clear();
      updateTabButtons();
      loadTabData(t);
    },

    expandSession(i) {
      if (S.expanded.has(i)) S.expanded.delete(i);
      else S.expanded.add(i);
      renderTape();
    },

    selectEntity(id) {
      showDetail(id);
    },

    closeDetail() {
      hideDetail();
    },

    changeStatus(id, newStatus) {
      changeStatus(id, newStatus);
    },

    injectToCampaign(id) {
      injectToCampaign(id);
    },

    markRevisit(id, days) {
      markRevisit(id, days);
    },

    addNote(id) {
      addNote(id);
    },

    addTag(id, tag) {
      addTag(id, tag);
    },

    applyFilter(key, val) {
      if (key === 'hasEmail') {
        S.filters.hasEmail = val === 'yes' ? true : val === 'no' ? false : null;
      } else {
        S.filters[key] = val;
      }
      S.page.offset = 0;
      S.page.more = true;
      if (S.tab === 'entities' || S.tab === 'queue') {
        loadTabData(S.tab);
      } else {
        renderCurrentTab();
      }
    },

    clearFilters() {
      S.filters = { status: '', country: '', freshness: '', hasEmail: null, q: '' };
      const searchEl = el('rl-search');
      if (searchEl) searchEl.value = '';
      const selects = _container.querySelectorAll('#rl-toolbar select');
      selects.forEach(s => { s.selectedIndex = 0; });
      S.page.offset = 0;
      S.page.more = true;
      loadTabData(S.tab);
    },

    search(q) {
      clearTimeout(_searchTimer);
      _searchTimer = setTimeout(() => {
        S.filters.q = q.trim();
        S.page.offset = 0;
        S.page.more = true;
        loadTabData(S.tab);
      }, 300);
    },

    loadMore() {
      loadMore();
    },

    refresh() {
      S.page.offset = 0;
      S.page.more = true;
      S.expanded.clear();
      loadTabData(S.tab);
    },

    selectThesis(domain) {
      // For now, just log — future: open thesis detail panel
      console.log('Thesis selected:', domain);
    },
    approveTrigger(triggerId) {
      fetch('/api/command/recon-ledger', {
        method: 'POST',
        headers: window.apiHeaders(),
        body: JSON.stringify({ action: 'approve_trigger', trigger_id: triggerId })
      }).then(r => r.json()).then(res => {
        if (res.error) { alert('Gate: ' + res.error); return; }
        alert('Trigger approuvé');
        loadTabData('allocator').then(() => { setLoading(false); renderCurrentTab(); });
      });
    },
    rejectTrigger(triggerId) {
      const reason = prompt('Raison du rejet (optionnel):') || 'Operator decision';
      fetch('/api/command/recon-ledger', {
        method: 'POST',
        headers: window.apiHeaders(),
        body: JSON.stringify({ action: 'reject_trigger', trigger_id: triggerId, reason })
      }).then(r => r.json()).then(() => {
        loadTabData('allocator').then(() => { setLoading(false); renderCurrentTab(); });
      });
    }
  };
}

// ── Public init ──────────────────────────────────────────────────

export function init(containerEl) {
  _container = containerEl;
  _container.style.display = 'flex';
  _container.style.flexDirection = 'column';
  _container.style.height = '100%';
  _container.style.overflow = 'hidden';

  renderShell();
  bindHandlers();
  loadInitial();
}
