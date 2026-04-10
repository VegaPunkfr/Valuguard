// Recon Ledger Components — ES Module
// Pure render functions returning HTML strings for the cockpit Recon Ledger.

import { fmtDate, fmtDateShort, fmtRelative, statusColor, statusLabel, countryFlag, techBadge, truncate, priorityBadge } from './recon-utils.js';
import { getNextStates } from './recon-state.js';

const s = (v) => window.sanitize(v ?? '');

const STATUS_COLORS = {
  discovered:  'var(--t3)',
  reviewed:    'var(--blue)',
  shortlisted: 'var(--gold)',
  contacted:   'var(--cyan)',
  replied:     'var(--green)',
  nurturing:   'var(--violet)',
  deferred:    'var(--t4)',
  qualified:   'var(--gold)',
  closed:      'var(--green)',
  suppressed:  'var(--red)'
};

function dot(color, size = 6) {
  return `<span style="display:inline-block;width:${size}px;height:${size}px;border-radius:50%;background:${color};flex-shrink:0"></span>`;
}

function badge(text, color, bg) {
  if (!text) return '';
  return `<span style="display:inline-block;padding:1px 5px;border-radius:3px;font:600 9px var(--mono);color:${color};background:${bg};letter-spacing:.3px;white-space:nowrap">${s(text)}</span>`;
}

function emailDot(email) {
  if (!email) return dot('var(--t4)', 5);
  return `<span title="${s(email)}" style="cursor:pointer;display:inline-block;width:5px;height:5px;border-radius:50%;background:var(--green);flex-shrink:0"></span>`;
}

function btn(label, onclick, opts = {}) {
  const { color = 'var(--t2)', bg = 'transparent', border = 'var(--bd)', small = false, icon = '' } = opts;
  const pad = small ? '2px 6px' : '4px 10px';
  const font = small ? '9px' : '10px';
  return `<button onclick="${onclick}" style="cursor:pointer;padding:${pad};border-radius:4px;border:1px solid ${border};background:${bg};color:${color};font:500 ${font} var(--mono);transition:opacity .15s;white-space:nowrap" onmouseenter="this.style.opacity='.8'" onmouseleave="this.style.opacity='1'">${icon}${s(label)}</button>`;
}


// ── 1. Session Card ─────────────────────────────────────────────────

export function renderSessionCard(session, index, isExpanded) {
  const sid = s(session.id);
  const provider = s(session.source || session.provider || 'apollo');
  const type = s(session.type || 'search');
  const intent = s(session.intent || '');
  const filterStr = s(session.filters_summary || '');
  const count = session.result_count ?? session.results?.length ?? 0;
  const emailCount = session.email_count ?? (session.results ? session.results.filter(r => r.email).length : 0);
  const yieldRaw = session.yield_rate != null ? session.yield_rate : (count > 0 ? emailCount / count : 0);
  const yieldPct = Math.round(yieldRaw * 100);
  const yieldStr = session.yield_rate != null || count > 0 ? `${yieldPct}%` : '\u2014';
  const dateStr = fmtRelative(session.created_at || session.timestamp);

  const providerColor = provider === 'apollo' ? 'var(--cyan)' : provider === 'linkedin' ? 'var(--blue)' : 'var(--t2)';

  // Yield color coding: >50% green, >25% gold, <25% red
  let yieldColor, yieldBadgeClass, yieldLabel;
  if (yieldPct >= 50) { yieldColor = 'var(--green)'; yieldBadgeClass = 'badge-excellent'; yieldLabel = 'EXCELLENT'; }
  else if (yieldPct >= 25) { yieldColor = 'var(--gold)'; yieldBadgeClass = 'badge-bon'; yieldLabel = 'BON'; }
  else { yieldColor = 'var(--red)'; yieldBadgeClass = 'badge-faible'; yieldLabel = 'FAIBLE'; }

  // Pipeline impact estimate (contacts with email = potential pipeline)
  const impact = emailCount > 0 ? `${emailCount} cibles` : '\u2014';

  const snapshots = isExpanded && session.results ? session.results.map((snap, i) => renderSnapshotRow(snap, i + 1)).join('') : '';

  return `<div class="tape-card${isExpanded ? ' expanded' : ''}" data-session-id="${sid}">
  <div class="tape-card-head" onclick="window.recon.toggleSession('${sid}')">
    ${badge(provider, 'var(--obsidian)', providerColor)}
    <span class="tape-type" style="color:var(--t2)">${type}</span>
    ${intent ? `<span class="tape-intent" title="${intent}">${intent}</span>` : ''}
    <span class="tape-summary" title="${filterStr}">${filterStr || '\u2014'}</span>
    <span class="tape-yield-badge ${yieldBadgeClass}">${yieldLabel}</span>
    <span class="tape-date">${dateStr}</span>
  </div>
  <div class="tape-metrics">
    <div class="tape-metric">
      <div class="tape-metric-val" style="color:var(--t1)">${count}</div>
      <div class="tape-metric-lbl">R\u00e9sultats</div>
    </div>
    <div class="tape-metric">
      <div class="tape-metric-val" style="color:var(--green)">${emailCount}</div>
      <div class="tape-metric-lbl">Avec email</div>
    </div>
    <div class="tape-metric">
      <div class="tape-metric-val" style="color:${yieldColor}">${yieldStr}</div>
      <div class="tape-metric-lbl">Rendement</div>
      <div class="tape-metric-bar"><div class="tape-metric-bar-fill" style="width:${Math.min(100, yieldPct)}%;background:${yieldColor}"></div></div>
    </div>
    <div class="tape-metric">
      <div class="tape-metric-val" style="color:var(--cyan)">${s(impact)}</div>
      <div class="tape-metric-lbl">Impact</div>
    </div>
  </div>
  <div class="tape-detail">
    ${snapshots ? `<div style="max-height:300px;overflow-y:auto">${snapshots}</div>` : '<div style="padding:12px;text-align:center;color:var(--t4);font:400 10px var(--mono)">Aucun r\u00e9sultat</div>'}
  </div>
</div>`;
}


// ── 2. Snapshot Row ─────────────────────────────────────────────────

export function renderSnapshotRow(snapshot, rank) {
  const name = s(snapshot.name || `${snapshot.first_name || ''} ${snapshot.last_name || ''}`.trim());
  const title = s(truncate(snapshot.title || '', 35));
  const company = s(snapshot.company_name || snapshot.company || snapshot.organization?.name || '');
  const country = s(snapshot.country || '');
  const flag = countryFlag(country);

  return `<div style="display:grid;grid-template-columns:28px 1fr 1fr 1fr 16px 30px;align-items:center;gap:6px;padding:4px 10px;font:400 10px var(--mono);color:var(--t2);border-bottom:1px solid var(--bd)" onmouseenter="this.style.background='rgba(255,255,255,.02)'" onmouseleave="this.style.background='transparent'">
  <span style="color:var(--t4);font-size:9px;text-align:right">${rank}</span>
  <span style="color:var(--t1);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${name || '—'}</span>
  <span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--t3)">${title}</span>
  <span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${company}</span>
  ${emailDot(snapshot.email)}
  <span style="font-size:10px;text-align:center">${flag}</span>
</div>`;
}


// ── 3. Person Row ───────────────────────────────────────────────────

export function renderPersonRow(person, opsState, freshness) {
  const pid = s(person.id);
  const status = opsState?.current_status || 'discovered';
  const color = STATUS_COLORS[status] || 'var(--t3)';
  const name = s(person.name || `${person.first_name || ''} ${person.last_name || ''}`.trim());
  const title = s(truncate(person.title || '', 28));
  const company = s(person.company_name || person.company_domain || '');
  const appearances = person.appearance_count || 1;
  const fr = freshness || { label: '—', color: 'var(--t4)' };

  return `<div onclick="window.recon.selectPerson('${pid}')" style="cursor:pointer;display:grid;grid-template-columns:8px 1fr 1fr 16px 36px 40px 68px;align-items:center;gap:6px;padding:5px 10px;font:400 10px var(--mono);color:var(--t2);border-bottom:1px solid var(--bd)" onmouseenter="this.style.background='rgba(255,255,255,.03)'" onmouseleave="this.style.background='transparent'" data-person-id="${pid}">
  ${dot(color)}
  <span style="color:var(--t1);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${name || '—'}</span>
  <span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--t3)">${title}${company ? `<span style="color:var(--t4)">@</span>${company}` : ''}</span>
  ${emailDot(person.email)}
  ${appearances > 1 ? badge(`${appearances}x`, 'var(--obsidian)', 'var(--gold)') : '<span></span>'}
  ${badge(fr.label, fr.color, `${fr.color}18`)}
  ${badge(statusLabel(status), color, `${color}18`)}
</div>`;
}


// ── 4. Person Detail ────────────────────────────────────────────────

export function renderPersonDetail(person, opsState, company, relationships, actions, sessions) {
  const pid = s(person.id);
  const status = opsState?.current_status || 'discovered';
  const color = STATUS_COLORS[status] || 'var(--t3)';
  const name = s(person.name || `${person.first_name || ''} ${person.last_name || ''}`.trim());
  const title = s(person.title || '');
  const companyName = s(person.company_name || company?.name || '');
  const email = s(person.email || '');
  const phone = s(person.phone || '');
  const country = s(person.country || '');
  const flag = countryFlag(country);
  const linkedin = s(person.linkedin_url || '');
  const seniority = s(person.seniority || '');

  // Next states for transition buttons
  const nextStates = getNextStates(status);

  // Relationship history
  const relHtml = (relationships || []).map(r =>
    `<div style="padding:3px 0;border-bottom:1px solid var(--bd);font-size:9px;color:var(--t3)">
      <span style="color:var(--t2)">${s(r.title || '')}</span>
      <span style="color:var(--t4)">@</span>
      <span style="color:var(--t2)">${s(r.company || '')}</span>
      ${r.period ? `<span style="color:var(--t4);margin-left:4px">${s(r.period)}</span>` : ''}
    </div>`
  ).join('');

  // Action log (last 10)
  const actHtml = (actions || []).slice(0, 10).map(a =>
    `<div style="display:flex;gap:6px;padding:3px 0;border-bottom:1px solid var(--bd);font-size:9px">
      <span style="color:var(--t4);flex-shrink:0;width:50px">${fmtRelative(a.created_at)}</span>
      <span style="color:var(--cyan);flex-shrink:0">${s(a.action_type || '')}</span>
      <span style="color:var(--t3);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${s(a.note || a.action_data?.reason || '')}</span>
    </div>`
  ).join('');

  // Session appearances
  const sessHtml = (sessions || []).map(ss =>
    `<div style="padding:2px 0;font-size:9px;color:var(--t3)">
      ${badge(s(ss.source || 'apollo'), 'var(--obsidian)', 'var(--cyan)')}
      <span style="margin-left:4px">${s(ss.intent || '')}</span>
      <span style="color:var(--t4);margin-left:4px">${fmtDateShort(ss.created_at)}</span>
    </div>`
  ).join('');

  // Next action suggestion
  const nextAction = opsState?.next_action || '';
  const nextDue = opsState?.next_action_due_at ? fmtDate(opsState.next_action_due_at) : '';

  // Status transition buttons
  const transitionBtns = nextStates.map(ns => {
    const nc = STATUS_COLORS[ns] || 'var(--t3)';
    return btn(statusLabel(ns), `window.recon.changeStatus('${pid}','${ns}')`, { color: nc, border: nc, small: true });
  }).join(' ');

  // Action buttons row
  const actionBtns = [
    btn('Injecter', `window.recon.injectPerson('${pid}')`, { color: 'var(--cyan)', border: 'var(--cyan)', small: true }),
    email ? btn('Email', `window.recon.emailPerson('${pid}')`, { color: 'var(--green)', border: 'var(--green)', small: true }) : '',
    btn('Note', `window.recon.addNote('${pid}')`, { color: 'var(--t2)', small: true }),
    btn('Revisiter', `window.recon.revisitPerson('${pid}')`, { color: 'var(--violet)', border: 'var(--violet)', small: true }),
    btn('Tag', `window.recon.tagPerson('${pid}')`, { color: 'var(--gold)', border: 'var(--gold)', small: true })
  ].filter(Boolean).join(' ');

  return `<div style="height:100%;overflow-y:auto;padding:12px;font:400 10px var(--mono);color:var(--t2)">
  <!-- Header -->
  <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px">
    ${dot(color, 8)}
    <span style="font:600 13px var(--mono);color:var(--t1)">${name || '—'}</span>
    ${badge(statusLabel(status), color, `${color}22`)}
  </div>

  <!-- Canonical info -->
  <div style="display:grid;grid-template-columns:60px 1fr;gap:4px 8px;margin-bottom:12px;font-size:10px">
    <span style="color:var(--t4)">Titre</span><span style="color:var(--t1)">${title || '—'}</span>
    <span style="color:var(--t4)">Societe</span><span style="color:var(--t1)">${companyName || '—'}</span>
    <span style="color:var(--t4)">Email</span><span style="color:${email ? 'var(--green)' : 'var(--t4)'}">${email || '—'}</span>
    ${phone ? `<span style="color:var(--t4)">Tel</span><span style="color:var(--t2)">${phone}</span>` : ''}
    <span style="color:var(--t4)">Pays</span><span>${flag} ${country || '—'}</span>
    ${seniority ? `<span style="color:var(--t4)">Niveau</span><span style="color:var(--t2)">${seniority}</span>` : ''}
    ${linkedin ? `<span style="color:var(--t4)">LinkedIn</span><span><a href="${linkedin}" target="_blank" rel="noopener" style="color:var(--blue);text-decoration:none;font-size:9px">Profil</a></span>` : ''}
  </div>

  <!-- Timeline -->
  <div style="margin-bottom:12px">
    <div style="font:600 9px var(--mono);color:var(--t3);text-transform:uppercase;letter-spacing:1px;margin-bottom:4px">Timeline</div>
    <div style="display:grid;grid-template-columns:60px 1fr;gap:2px 8px;font-size:9px">
      <span style="color:var(--t4)">Decouvert</span><span>${fmtDate(person.first_seen_at || person.created_at)}</span>
      <span style="color:var(--t4)">Vu</span><span>${fmtDate(person.last_seen_at)}</span>
      <span style="color:var(--t4)">Vus</span><span>${person.appearance_count || 1}x en ${(sessions || []).length} session${(sessions || []).length > 1 ? 's' : ''}</span>
    </div>
  </div>

  ${nextAction ? `
  <!-- Next Action -->
  <div style="margin-bottom:12px;padding:8px;border-radius:4px;border:1px solid var(--cyan)33;background:var(--cyan)08">
    <div style="font:600 9px var(--mono);color:var(--cyan);text-transform:uppercase;letter-spacing:1px;margin-bottom:4px">Action suivante</div>
    <div style="font-size:10px;color:var(--t1)">${s(nextAction)}</div>
    ${nextDue ? `<div style="font-size:9px;color:var(--t3);margin-top:2px">Echeance: ${nextDue}</div>` : ''}
  </div>` : ''}

  <!-- Status transitions -->
  <div style="margin-bottom:12px">
    <div style="font:600 9px var(--mono);color:var(--t3);text-transform:uppercase;letter-spacing:1px;margin-bottom:6px">Changer statut</div>
    <div style="display:flex;flex-wrap:wrap;gap:4px">${transitionBtns || '<span style="color:var(--t4);font-size:9px">Aucune transition possible</span>'}</div>
  </div>

  <!-- Action buttons -->
  <div style="margin-bottom:16px">
    <div style="font:600 9px var(--mono);color:var(--t3);text-transform:uppercase;letter-spacing:1px;margin-bottom:6px">Actions</div>
    <div style="display:flex;flex-wrap:wrap;gap:4px">${actionBtns}</div>
  </div>

  ${relHtml ? `
  <!-- Relationship History -->
  <div style="margin-bottom:12px">
    <div style="font:600 9px var(--mono);color:var(--t3);text-transform:uppercase;letter-spacing:1px;margin-bottom:4px">Historique postes</div>
    ${relHtml}
  </div>` : ''}

  ${actHtml ? `
  <!-- Action Log -->
  <div style="margin-bottom:12px">
    <div style="font:600 9px var(--mono);color:var(--t3);text-transform:uppercase;letter-spacing:1px;margin-bottom:4px">Journal d'actions</div>
    ${actHtml}
  </div>` : ''}

  ${sessHtml ? `
  <!-- Session Appearances -->
  <div style="margin-bottom:12px">
    <div style="font:600 9px var(--mono);color:var(--t3);text-transform:uppercase;letter-spacing:1px;margin-bottom:4px">Sessions</div>
    ${sessHtml}
  </div>` : ''}
</div>`;
}


// ── 5. Company Row ──────────────────────────────────────────────────

export function renderCompanyRow(company) {
  const cid = s(company.id);
  const name = s(company.name || company.domain || '');
  const domain = s(company.domain || '');
  const industry = s(truncate(company.industry || '', 22));
  const employees = company.employee_count != null ? company.employee_count.toLocaleString() : '—';
  const revenue = company.revenue ? `$${(company.revenue / 1e6).toFixed(1)}M` : '—';
  const techCount = company.tech_stack?.length || company.tech_count || 0;
  const lastSeen = fmtRelative(company.last_seen_at);

  return `<div onclick="window.recon.selectCompany('${cid}')" style="cursor:pointer;display:grid;grid-template-columns:1fr 120px 100px 60px 60px 36px 50px;align-items:center;gap:6px;padding:5px 10px;font:400 10px var(--mono);color:var(--t2);border-bottom:1px solid var(--bd)" onmouseenter="this.style.background='rgba(255,255,255,.03)'" onmouseleave="this.style.background='transparent'" data-company-id="${cid}">
  <div style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">
    <span style="color:var(--t1)">${name || '—'}</span>
    ${domain ? `<span style="color:var(--t4);margin-left:4px;font-size:9px">${domain}</span>` : ''}
  </div>
  <span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--t3)">${industry}</span>
  <span style="text-align:right;color:var(--t2)">${employees}</span>
  <span style="text-align:right;color:var(--t3)">${revenue}</span>
  <span style="text-align:right;color:var(--t2)">${techCount > 0 ? techCount : '—'}</span>
  <span></span>
  <span style="text-align:right;color:var(--t4);font-size:9px">${lastSeen}</span>
</div>`;
}


// ── 6. Action Queue Row ─────────────────────────────────────────────

export function renderActionQueueRow(person, opsState) {
  const pid = s(person.id);
  const status = opsState?.current_status || 'discovered';
  const color = STATUS_COLORS[status] || 'var(--t3)';
  const name = s(person.name || `${person.first_name || ''} ${person.last_name || ''}`.trim());
  const company = s(person.company_name || person.company_domain || '');
  const nextAction = s(opsState?.next_action || '');
  const dueAt = opsState?.next_action_due_at ? fmtDate(opsState.next_action_due_at) : '—';
  const priority = opsState?.priority_score ?? 0;

  let priColor;
  if (priority >= 70)      priColor = 'var(--red)';
  else if (priority >= 40) priColor = 'var(--gold)';
  else                     priColor = 'var(--t3)';

  const nextStates = getNextStates(status);
  const primaryNext = nextStates[0];

  const quickBtns = [
    primaryNext ? btn(statusLabel(primaryNext), `window.recon.changeStatus('${pid}','${primaryNext}')`, { color: STATUS_COLORS[primaryNext] || 'var(--t2)', small: true }) : '',
    btn('Note', `window.recon.addNote('${pid}')`, { small: true }),
    btn('Diff.', `window.recon.changeStatus('${pid}','deferred')`, { color: 'var(--t4)', small: true })
  ].filter(Boolean).join(' ');

  return `<div onclick="window.recon.selectPerson('${pid}')" style="cursor:pointer;display:grid;grid-template-columns:8px 1fr 100px 68px 1fr 80px auto;align-items:center;gap:6px;padding:5px 10px;font:400 10px var(--mono);color:var(--t2);border-bottom:1px solid var(--bd)" onmouseenter="this.style.background='rgba(255,255,255,.03)'" onmouseleave="this.style.background='transparent'" data-person-id="${pid}">
  ${dot(priColor)}
  <span style="color:var(--t1);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${name || '—'}</span>
  <span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--t3)">${company}</span>
  ${badge(statusLabel(status), color, `${color}18`)}
  <span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--cyan)">${nextAction || '—'}</span>
  <span style="color:var(--t3);font-size:9px">${dueAt}</span>
  <div onclick="event.stopPropagation()" style="display:flex;gap:3px">${quickBtns}</div>
</div>`;
}


// ── 7. Pattern Card ─────────────────────────────────────────────────

export function renderPatternCard(pattern) {
  const type = s(pattern.type || pattern.session_type || '');
  const intent = s(pattern.intent || '');
  const yieldRate = pattern.yield_rate != null ? Math.round(pattern.yield_rate * 100) : 0;
  const emails = pattern.emails_found ?? pattern.email_count ?? 0;
  const replies = pattern.replies ?? pattern.reply_count ?? 0;

  const barWidth = Math.max(2, yieldRate);
  let barColor;
  if (yieldRate >= 60)      barColor = 'var(--green)';
  else if (yieldRate >= 30) barColor = 'var(--gold)';
  else                      barColor = 'var(--red)';

  return `<div style="border:1px solid var(--bd);border-radius:6px;padding:10px;background:var(--graphite);margin-bottom:4px">
  <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
    <div style="display:flex;align-items:center;gap:6px">
      ${badge(type, 'var(--t1)', 'var(--steel)')}
      ${intent ? `<span style="color:var(--violet);font:400 10px var(--mono)">${intent}</span>` : ''}
    </div>
    <span style="font:600 11px var(--mono);color:${barColor}">${yieldRate}%</span>
  </div>
  <div style="height:4px;border-radius:2px;background:var(--bd);margin-bottom:8px;overflow:hidden">
    <div style="height:100%;width:${barWidth}%;border-radius:2px;background:${barColor};transition:width .3s"></div>
  </div>
  <div style="display:flex;gap:12px;font:400 9px var(--mono);color:var(--t3)">
    <span>Emails: <span style="color:var(--t1)">${emails}</span></span>
    <span>Reponses: <span style="color:var(--t1)">${replies}</span></span>
  </div>
</div>`;
}


// ── 8. Stats Bar ────────────────────────────────────────────────────

export function renderStatsBar(stats) {
  const totalPeople = stats.total_people ?? 0;
  const totalCompanies = stats.total_companies ?? 0;
  const totalSessions = stats.total_sessions ?? 0;
  const actionable = stats.actionable_count ?? 0;
  const avgYield = stats.avg_yield != null ? `${Math.round(stats.avg_yield * 100)}%` : '—';

  function stat(label, value, color = 'var(--t1)') {
    return `<div style="display:flex;align-items:baseline;gap:4px">
      <span style="font:600 14px var(--mono);color:${color}">${value}</span>
      <span style="font:400 9px var(--mono);color:var(--t4);text-transform:uppercase;letter-spacing:.5px">${label}</span>
    </div>`;
  }

  return `<div style="display:flex;align-items:center;gap:20px;padding:8px 14px;border-bottom:1px solid var(--bd);background:var(--obsidian)">
  ${stat('Contacts', totalPeople.toLocaleString())}
  ${stat('Societes', totalCompanies.toLocaleString())}
  ${stat('Sessions', totalSessions.toLocaleString())}
  ${stat('Actionable', actionable.toLocaleString(), 'var(--cyan)')}
  ${stat('Yield moy.', avgYield, 'var(--green)')}
</div>`;
}


// ── 9. Empty State ──────────────────────────────────────────────────

export function renderEmptyState(message) {
  return `<div style="display:flex;align-items:center;justify-content:center;min-height:120px;padding:24px;text-align:center">
  <span style="font:400 11px var(--mono);color:var(--t4);letter-spacing:.3px">${s(message || 'Aucune donnee')}</span>
</div>`;
}
