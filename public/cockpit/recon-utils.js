// Recon Ledger Utilities — ES Module

const MONTHS_FR = ['janv.','févr.','mars','avr.','mai','juin','juil.','août','sept.','oct.','nov.','déc.'];

export function fmtDate(isoStr) {
  if (!isoStr) return '—';
  const d = new Date(isoStr);
  if (isNaN(d)) return '—';
  const day = String(d.getDate()).padStart(2, '0');
  const mon = MONTHS_FR[d.getMonth()];
  const h = String(d.getHours()).padStart(2, '0');
  const m = String(d.getMinutes()).padStart(2, '0');
  return `${day} ${mon} ${h}:${m}`;
}

export function fmtDateShort(isoStr) {
  if (!isoStr) return '—';
  const d = new Date(isoStr);
  if (isNaN(d)) return '—';
  return `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}`;
}

export function fmtRelative(isoStr) {
  if (!isoStr) return '—';
  const d = new Date(isoStr);
  if (isNaN(d)) return '—';
  const now = Date.now();
  const diffMs = now - d.getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'now';
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}j`;
  const weeks = Math.floor(days / 7);
  if (weeks < 5) return `${weeks}sem`;
  const months = Math.floor(days / 30);
  return `${months}mo`;
}

export function freshness(lastSeenAt) {
  if (!lastSeenAt) return { grade: 'stale', days: 999, label: 'inconnu', color: 'var(--t4)' };
  const days = Math.floor((Date.now() - new Date(lastSeenAt).getTime()) / 86400000);
  if (days < 7)  return { grade: 'fresh', days, label: `${days}j`, color: 'var(--green)' };
  if (days < 30) return { grade: 'warm',  days, label: `${days}j`, color: 'var(--gold)' };
  if (days < 90) return { grade: 'aging', days, label: `${days}j`, color: 'rgba(var(--red), .6)' };
  return { grade: 'stale', days, label: `${days}j`, color: 'var(--t4)' };
}

const STATUS_COLORS = {
  discovered:  'var(--t3)',
  reviewed:    'var(--blue)',
  shortlisted: 'var(--gold)',
  contacted:   'var(--cyan)',
  replied:     'var(--green)',
  nurturing:   'var(--violet)',
  deferred:    'var(--t4)',
  qualified:   'hsl(40,100%,55%)',
  closed:      'hsl(155,100%,50%)',
  suppressed:  'var(--red)'
};

export function statusColor(status) {
  return STATUS_COLORS[status] || 'var(--t3)';
}

const STATUS_LABELS = {
  discovered:  'Découvert',
  reviewed:    'Examiné',
  shortlisted: 'Présélectionné',
  contacted:   'Contacté',
  replied:     'Répondu',
  nurturing:   'Nurturing',
  deferred:    'Différé',
  qualified:   'Qualifié',
  closed:      'Conclu',
  suppressed:  'Supprimé'
};

export function statusLabel(status) {
  return STATUS_LABELS[status] || status || '—';
}

export function priorityBadge(score) {
  if (score == null) return '';
  let color, label;
  if (score >= 70)      { color = 'var(--red)';   label = 'HIGH'; }
  else if (score >= 40) { color = 'var(--gold)';  label = 'MED'; }
  else                  { color = 'var(--t3)';    label = 'LOW'; }
  return `<span style="display:inline-block;padding:1px 5px;border-radius:3px;font:600 9px var(--mono);background:${color};color:var(--obsidian);letter-spacing:.5px">${label}</span>`;
}

const COUNTRY_FLAGS = {
  germany:'🇩🇪',deutschland:'🇩🇪',de:'🇩🇪',
  'united states':'🇺🇸',us:'🇺🇸',usa:'🇺🇸',
  'united kingdom':'🇬🇧',uk:'🇬🇧',gb:'🇬🇧',
  netherlands:'🇳🇱',nl:'🇳🇱',
  france:'🇫🇷',fr:'🇫🇷',
  switzerland:'🇨🇭',ch:'🇨🇭',
  austria:'🇦🇹',at:'🇦🇹',
  belgium:'🇧🇪',be:'🇧🇪',
  canada:'🇨🇦',ca:'🇨🇦',
  ireland:'🇮🇪',ie:'🇮🇪',
  sweden:'🇸🇪',se:'🇸🇪',
  norway:'🇳🇴',no:'🇳🇴',
  denmark:'🇩🇰',dk:'🇩🇰',
  finland:'🇫🇮',fi:'🇫🇮',
  spain:'🇪🇸',es:'🇪🇸',
  italy:'🇮🇹',it:'🇮🇹',
  australia:'🇦🇺',au:'🇦🇺',
  japan:'🇯🇵',jp:'🇯🇵',
  india:'🇮🇳','in':'🇮🇳',
  brazil:'🇧🇷',br:'🇧🇷',
  singapore:'🇸🇬',sg:'🇸🇬',
  luxembourg:'🇱🇺',lu:'🇱🇺'
};

export function countryFlag(countryName) {
  if (!countryName) return '';
  return COUNTRY_FLAGS[countryName.toLowerCase().trim()] || '🏳️';
}

// Mapping emoji drapeau → code pays (miroir V4 L1546, requis par MessageForge)
export function flagToCountry(f) {
  return f === '🇩🇪' || f === '🇦🇹' ? 'DE'
    : f === '🇬🇧' ? 'UK'
    : f === '🇳🇱' ? 'NL'
    : f === '🇺🇸' ? 'US'
    : f === '🇨🇭' ? 'CH'
    : f === '🇮🇹' ? 'IT'
    : 'FR';
}

// Exposition globale pour les scripts non-module (cockpit-v6.html legacy)
if (typeof window !== 'undefined') {
  window.flagToCountry = flagToCountry;
}

// ───────────────────────────────────────────────────────────────────
// Smart Scheduling (miroir lib/outreach/send-window.ts)
// Port V4 L1534-1547 + L2275-2291, étendu timezone-aware + cooldown.
// ───────────────────────────────────────────────────────────────────

const COUNTRY_TIMEZONES = {
  DE: 'Europe/Berlin', AT: 'Europe/Berlin',
  UK: 'Europe/London',
  NL: 'Europe/Amsterdam', BE: 'Europe/Amsterdam',
  US: 'America/New_York',
  CH: 'Europe/Zurich',
  IT: 'Europe/Rome',
  FR: 'Europe/Paris'
};

const HOLIDAYS_BY_COUNTRY = {
  DE: ['2026-01-01','2026-04-03','2026-04-06','2026-05-01','2026-05-14','2026-05-25','2026-10-03','2026-12-25','2026-12-26'],
  AT: ['2026-01-01','2026-04-03','2026-04-06','2026-05-01','2026-05-14','2026-05-25','2026-10-03','2026-12-25','2026-12-26'],
  UK: ['2026-01-01','2026-04-03','2026-04-06','2026-05-04','2026-05-25','2026-08-31','2026-12-25','2026-12-28'],
  US: ['2026-01-01','2026-01-19','2026-02-16','2026-05-25','2026-07-03','2026-09-07','2026-11-26','2026-12-25'],
  NL: ['2026-01-01','2026-04-03','2026-04-06','2026-04-27','2026-05-05','2026-05-14','2026-05-25','2026-12-25','2026-12-26'],
  BE: ['2026-01-01','2026-04-06','2026-05-01','2026-05-14','2026-05-25','2026-07-21','2026-08-15','2026-11-01','2026-11-11','2026-12-25'],
  FR: ['2026-01-01','2026-04-06','2026-05-01','2026-05-08','2026-05-14','2026-05-25','2026-07-14','2026-08-15','2026-11-01','2026-11-11','2026-12-25'],
  CH: ['2026-01-01','2026-01-02','2026-04-03','2026-04-06','2026-05-01','2026-05-14','2026-05-25','2026-08-01','2026-12-25','2026-12-26'],
  IT: ['2026-01-01','2026-01-06','2026-04-06','2026-04-25','2026-05-01','2026-06-02','2026-08-15','2026-11-01','2026-12-08','2026-12-25','2026-12-26']
};

const DOMAIN_COOLDOWN_DAYS = 3;
const BUSINESS_HOUR_START = 8;
const BUSINESS_HOUR_END = 19;

function sw_normalizeMarket(code) {
  if (!code) return 'FR';
  const up = String(code).toUpperCase().trim();
  if (up === 'GB') return 'UK';
  if (['DE','AT','UK','NL','BE','US','CH','IT','FR'].includes(up)) return up;
  return 'FR';
}

function sw_resolveCountry(p) {
  if (!p) return 'FR';
  if (p.flag) return flagToCountry(p.flag);
  if (p.market) return sw_normalizeMarket(p.market);
  if (p.country) return sw_normalizeMarket(p.country);
  return 'FR';
}

function sw_getLocalParts(country, date) {
  const tz = COUNTRY_TIMEZONES[country] || 'Europe/Paris';
  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone: tz, hour12: false,
    hour: '2-digit', weekday: 'short',
    year: 'numeric', month: '2-digit', day: '2-digit'
  });
  const parts = fmt.formatToParts(date);
  let hour = 0, year = '1970', month = '01', day = '01', weekday = 'Mon';
  for (const p of parts) {
    if (p.type === 'hour') hour = parseInt(p.value, 10) || 0;
    else if (p.type === 'year') year = p.value;
    else if (p.type === 'month') month = p.value;
    else if (p.type === 'day') day = p.value;
    else if (p.type === 'weekday') weekday = p.value;
  }
  if (hour === 24) hour = 0;
  const wmap = { Sun:0, Mon:1, Tue:2, Wed:3, Thu:4, Fri:5, Sat:6 };
  return { hour, day: wmap[weekday] ?? 1, isoDate: `${year}-${month}-${day}` };
}

export function isBusinessHours(country, date = new Date()) {
  const c = sw_normalizeMarket(country);
  const { hour } = sw_getLocalParts(c, date);
  return hour >= BUSINESS_HOUR_START && hour <= BUSINESS_HOUR_END;
}

export function isWeekend(country, date = new Date()) {
  const c = sw_normalizeMarket(country);
  const { day } = sw_getLocalParts(c, date);
  return day === 0 || day === 6;
}

export function isHoliday(country, date = new Date()) {
  const c = sw_normalizeMarket(country);
  const { isoDate } = sw_getLocalParts(c, date);
  return (HOLIDAYS_BY_COUNTRY[c] || []).includes(isoDate);
}

export function isNonWorkDay(country, date = new Date()) {
  return isWeekend(country, date) || isHoliday(country, date);
}

export function canSendToProspect(prospect, now = new Date()) {
  const country = sw_resolveCountry(prospect);
  const { hour, day } = sw_getLocalParts(country, now);
  const businessHours = hour >= BUSINESS_HOUR_START && hour <= BUSINESS_HOUR_END;
  const weekend = day === 0 || day === 6;
  const holiday = isHoliday(country, now);

  let cooldownActive = false;
  let cooldownDaysLeft = 0;
  if (prospect && prospect.lastSendAt) {
    const last = prospect.lastSendAt instanceof Date
      ? prospect.lastSendAt : new Date(prospect.lastSendAt);
    if (!isNaN(last.getTime())) {
      const diffDays = (now.getTime() - last.getTime()) / 86400000;
      if (diffDays < DOMAIN_COOLDOWN_DAYS) {
        cooldownActive = true;
        cooldownDaysLeft = Math.ceil(DOMAIN_COOLDOWN_DAYS - diffDays);
      }
    }
  }

  let reason = null, canSend = true;
  if (weekend) { canSend = false; reason = 'Week-end → lundi'; }
  else if (holiday) { canSend = false; reason = `Férié ${country}`; }
  else if (!businessHours) { canSend = false; reason = `Hors heures (${hour}h ${country})`; }
  else if (cooldownActive) { canSend = false; reason = `Cooldown domaine — ${cooldownDaysLeft}j`; }

  return {
    canSend, deferred: !canSend, reason, country,
    localHour: hour, localDay: day,
    isBusinessHours: businessHours,
    isWeekend: weekend, isHoliday: holiday,
    cooldownActive, cooldownDaysLeft
  };
}

export function getSmartQueue(leads, now = new Date()) {
  const annotated = (leads || []).map(l => ({ ...l, _check: canSendToProspect(l, now) }));
  return {
    ready: annotated.filter(l => l._check.canSend),
    deferred: annotated.filter(l => !l._check.canSend),
    all: annotated
  };
}

export function formatLocalTime(country, date = new Date()) {
  const c = sw_normalizeMarket(country);
  const { hour } = sw_getLocalParts(c, date);
  return `${hour}h ${c}`;
}

// Exposition globale pour scripts non-module (cockpit-v6.html inline)
if (typeof window !== 'undefined') {
  window.SendWindow = {
    isBusinessHours, isWeekend, isHoliday, isNonWorkDay,
    canSendToProspect, getSmartQueue, formatLocalTime,
    COUNTRY_TIMEZONES, HOLIDAYS_BY_COUNTRY
  };
}

const TECH_COLORS = {
  salesforce:'#00A1E0',sap:'#0070F2','microsoft 365':'#0078D4',m365:'#0078D4',
  slack:'#4A154B',jira:'#0052CC',okta:'#007DC1',aws:'#FF9900',azure:'#0089D6',
  google:'#4285F4',hubspot:'#FF7A59',zendesk:'#03363D',snowflake:'#29B5E8',
  datadog:'#632CA6',pagerduty:'#06AC38',confluence:'#1868DB',notion:'#000000',
  zoom:'#2D8CFF',twilio:'#F22F46',stripe:'#635BFF',quickbooks:'#2CA01C'
};

export function techBadge(techName) {
  if (!techName) return '';
  const s = window.sanitize(techName);
  const bg = TECH_COLORS[techName.toLowerCase()] || 'var(--steel)';
  return `<span style="display:inline-block;padding:1px 5px;border-radius:3px;font:500 9px var(--mono);background:${bg}33;color:${bg};border:1px solid ${bg}44;margin:0 2px 2px 0;white-space:nowrap">${s}</span>`;
}

export function truncate(str, len) {
  if (!str) return '';
  return str.length > len ? str.slice(0, len) + '…' : str;
}

export function debounce(fn, ms) {
  let t;
  return function(...args) {
    clearTimeout(t);
    t = setTimeout(() => fn.apply(this, args), ms);
  };
}

export function virtualScroll(container, items, renderFn, itemHeight) {
  const BUFFER = 5;
  let scrollTop = 0;
  let viewHeight = container.clientHeight;

  function render() {
    scrollTop = container.scrollTop;
    viewHeight = container.clientHeight;
    const startIdx = Math.max(0, Math.floor(scrollTop / itemHeight) - BUFFER);
    const endIdx = Math.min(items.length, Math.ceil((scrollTop + viewHeight) / itemHeight) + BUFFER);
    const totalHeight = items.length * itemHeight;
    const offsetY = startIdx * itemHeight;

    const visibleItems = items.slice(startIdx, endIdx);
    const html = visibleItems.map((item, i) => renderFn(item, startIdx + i)).join('');

    container.innerHTML =
      `<div style="height:${totalHeight}px;position:relative">` +
        `<div style="position:absolute;top:${offsetY}px;left:0;right:0">${html}</div>` +
      `</div>`;
  }

  const onScroll = debounce(render, 16);
  container.addEventListener('scroll', onScroll, { passive: true });
  render();

  return {
    refresh(newItems) { items = newItems; render(); },
    destroy() { container.removeEventListener('scroll', onScroll); }
  };
}
