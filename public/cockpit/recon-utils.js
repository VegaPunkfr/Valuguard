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
