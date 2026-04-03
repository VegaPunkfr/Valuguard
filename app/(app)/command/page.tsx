'use client';

/**
 * GHOST TAX — MISSION CONTROL v5
 *
 * Refonte totale. Layout inspiré de la référence Alexatel.
 * Une seule vue unifiée premium dark — pas de multi-écrans.
 * Approval mode en overlay modal.
 *
 * Structure:
 *   [Sidebar 64px] | [TopBar 56px + Scrollable Main]
 *                      ├── 3 KPI Cards
 *                      ├── Chart (65%) + Right Panel (35%)
 *                      └── Accounts Table
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { SEED_ACCOUNTS } from '@/lib/command/seed';
import { getTodayPlan, isInSendingWindow } from '@/lib/command/sending-windows';
import type { Account } from '@/types/command';

// ── Brand palette (rules/05-ui-brand.md) ─────────────────────
const P = {
  bg:          '#060912',
  surface:     '#0A0D19',
  panel:       '#0e1221',
  inset:       '#121828',
  raised:      '#171e30',
  border:      'rgba(36,48,78,0.28)',
  borderS:     'rgba(36,48,78,0.40)',
  borderHi:    'rgba(34,211,238,0.20)',
  borderGreen: 'rgba(52,211,153,0.18)',
  text1:       '#e4e9f4',
  text2:       '#8d9bb5',
  text3:       '#55637d',
  text4:       '#3a4560',
  green:       '#34d399',
  greenD:      'rgba(52,211,153,0.10)',
  amber:       '#f59e0b',
  amberD:      'rgba(245,158,11,0.10)',
  red:         '#ef4444',
  redD:        'rgba(239,68,68,0.10)',
  blue:        '#3b82f6',
  blueD:       'rgba(59,130,246,0.10)',
  cyan:        '#22d3ee',
  cyanD:       'rgba(34,211,238,0.10)',
  violet:      '#a78bfa',
  violetD:     'rgba(167,139,250,0.10)',
};

const F = {
  mono: "var(--font-mono,'IBM Plex Mono',ui-monospace,monospace)",
  sans: "var(--font-sans,'DM Sans',system-ui,-apple-system,sans-serif)",
};

// ── Keyframes ─────────────────────────────────────────────────
const KF = `
@keyframes mc-fadeIn   { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
@keyframes mc-pulse    { 0%,100%{opacity:1} 50%{opacity:.4} }
@keyframes mc-dot      { 0%,100%{transform:scale(1)} 50%{transform:scale(1.5)} }
@keyframes mc-swipeL   { from{opacity:1;transform:translateX(0) rotate(0deg)} to{opacity:0;transform:translateX(-110%) rotate(-14deg)} }
@keyframes mc-swipeR   { from{opacity:1;transform:translateX(0) rotate(0deg)} to{opacity:0;transform:translateX(110%) rotate(14deg)} }
@keyframes mc-cardIn   { from{opacity:0;transform:translateY(20px) scale(.96)} to{opacity:1;transform:translateY(0) scale(1)} }
@keyframes mc-shimmer  { 0%{background-position:-200% 0} 100%{background-position:200% 0} }
@keyframes mc-glow     { 0%,100%{box-shadow:0 0 0 0 rgba(34,211,238,0)} 50%{box-shadow:0 0 18px 3px rgba(34,211,238,.10)} }
`;

// ── Utilities ─────────────────────────────────────────────────
const fmtEur = (n: number) =>
  n >= 1_000_000 ? `${(n/1_000_000).toFixed(1)}M` :
  n >= 1_000     ? `${Math.round(n/1_000)}k`       : `${n}`;

const scoreColor = (s: number) =>
  s >= 70 ? P.green : s >= 50 ? P.amber : P.text2;

// ── SVG Icons ─────────────────────────────────────────────────
const I = {
  home: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>,
  radar:<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/><line x1="12" y1="2" x2="12" y2="4"/><line x1="12" y1="20" x2="12" y2="22"/><line x1="2" y1="12" x2="4" y2="12"/><line x1="20" y1="12" x2="22" y2="12"/></svg>,
  pipe: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>,
  mail: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>,
  bolt: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>,
  cog:  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>,
  bell: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>,
  srch: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>,
  li:   <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"/><rect x="2" y="9" width="4" height="12"/><circle cx="4" cy="4" r="2"/></svg>,
  at:   <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="4"/><path d="M16 8v5a3 3 0 0 0 6 0v-1a10 10 0 1 0-3.92 7.94"/></svg>,
  chk:  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>,
};

// ── Nav items ─────────────────────────────────────────────────
type NavId = 'overview' | 'signals' | 'pipeline' | 'sequences' | 'intel' | 'settings';
const NAV: { id: NavId; icon: React.ReactNode; label: string; href?: string }[] = [
  { id: 'overview',   icon: I.home, label: 'Overview'  },
  { id: 'signals',    icon: I.radar, label: 'Signaux'  },
  { id: 'pipeline',   icon: I.pipe, label: 'Pipeline'  },
  { id: 'sequences',  icon: I.mail, label: 'Séquences' },
  { id: 'intel',      icon: I.bolt, label: 'Intel',    href: '/intel' },
  { id: 'settings',   icon: I.cog,  label: 'Settings'  },
];

// ── Smooth area chart ─────────────────────────────────────────
function AreaChart({ data, width = 700, height = 160 }: {
  data: { color: string; label: string; values: number[] }[];
  width?: number;
  height?: number;
}) {
  const all = data.flatMap(d => d.values);
  const max = (Math.max(...all) || 1) * 1.15;
  const n   = data[0]?.values.length || 1;

  const pts = (vals: number[]) => vals.map((v, i) => ({
    x: (i / (n - 1)) * width,
    y: height - (v / max) * height,
  }));

  const path = (vals: number[]) => {
    const co = pts(vals);
    let d = `M${co[0].x},${co[0].y}`;
    for (let i = 1; i < co.length; i++) {
      const dx = (co[i].x - co[i-1].x) * 0.38;
      d += ` C${co[i-1].x+dx},${co[i-1].y} ${co[i].x-dx},${co[i].y} ${co[i].x},${co[i].y}`;
    }
    return d;
  };

  const months = ['Jan','Fév','Mar','Avr','Mai','Jun','Jul','Aoû','Sep','Oct','Nov','Déc'];

  return (
    <svg viewBox={`0 0 ${width} ${height+22}`} width="100%" height="100%" style={{ overflow:'visible' }}>
      <defs>
        {data.map((d,i) => (
          <linearGradient key={i} id={`g${i}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor={d.color} stopOpacity=".20"/>
            <stop offset="100%" stopColor={d.color} stopOpacity="0"/>
          </linearGradient>
        ))}
      </defs>
      {/* Grid */}
      {[0,.25,.5,.75,1].map((t,i) => (
        <line key={i} x1={0} y1={height*(1-t)} x2={width} y2={height*(1-t)}
          stroke={P.border} strokeWidth="1" strokeDasharray={i===0?'none':'3,5'}/>
      ))}
      {/* Series */}
      {data.map((d,i) => {
        const co = pts(d.values);
        const p  = path(d.values);
        const last = co[co.length-1];
        const area = `${p} L${last.x},${height} L${co[0].x},${height} Z`;
        return (
          <g key={i}>
            <path d={area} fill={`url(#g${i})`}/>
            <path d={p} fill="none" stroke={d.color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
            <circle cx={last.x} cy={last.y} r="4" fill={d.color}
              style={{animation:'mc-dot 2.2s ease-in-out infinite'}}/>
            <circle cx={last.x} cy={last.y} r="8" fill={d.color} opacity=".12"/>
          </g>
        );
      })}
      {/* X labels */}
      {Array.from({length:n}).map((_,i) => (
        <text key={i} x={(i/(n-1))*width} y={height+18}
          textAnchor="middle" fontSize="9" fill={P.text3} fontFamily={F.mono} letterSpacing=".06em">
          {months[i%12]}
        </text>
      ))}
    </svg>
  );
}

// ── Approval Overlay ──────────────────────────────────────────
function ApprovalOverlay({
  queue, index, cardAnim, approved, passed,
  onApprove, onPass, onClose,
}: {
  queue:    Account[];
  index:    number;
  cardAnim: 'L'|'R'|null;
  approved: Account[];
  passed:   Account[];
  onApprove: () => void;
  onPass:    () => void;
  onClose:   () => void;
}) {
  const done  = index >= queue.length;
  const card  = queue[index];
  const total = queue.length;
  const msg   = card?.outreach?.[0];
  const ch    = msg?.channel || 'email';

  const handleApproveClick = async () => {
    if (ch === 'email' && card?.financeLead?.email && msg?.body) {
      fetch('/api/command/send-approved', {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({
          to:       card.financeLead.email,
          subject:  msg.subject || `Ghost Tax — ${card.company}`,
          textBody: msg.body,
          domain:   card.domain,
          prospectId: card.id,
        }),
      }).catch(()=>{});
    } else if (ch === 'linkedin' && card?.financeLead?.linkedIn) {
      if (msg?.body) navigator.clipboard.writeText(msg.body).catch(()=>{});
      window.open(card.financeLead.linkedIn, '_blank');
    }
    onApprove();
  };

  const pct = total > 0 ? (index / total) * 100 : 100;

  return (
    <div style={{
      position:'fixed', inset:0, zIndex:400,
      background:'rgba(6,9,18,.90)',
      backdropFilter:'blur(12px)',
      display:'flex', flexDirection:'column',
      animation:'mc-fadeIn 200ms ease',
    }}>
      {/* Header */}
      <div style={{
        display:'flex', alignItems:'center', justifyContent:'space-between',
        padding:'16px 28px', borderBottom:`1px solid ${P.border}`, background:P.surface,
      }}>
        <button onClick={onClose} style={{
          background:'transparent', border:'none', color:P.text2, cursor:'pointer',
          fontFamily:F.mono, fontSize:10, fontWeight:700, letterSpacing:'.10em', textTransform:'uppercase',
          padding:'4px 0',
        }}>← RETOUR</button>
        <div style={{textAlign:'center'}}>
          <div style={{fontFamily:F.mono,fontSize:10,fontWeight:700,letterSpacing:'.14em',color:P.cyan,textTransform:'uppercase'}}>
            MODE APPROBATION
          </div>
          {!done && (
            <div style={{fontFamily:F.mono,fontSize:10,color:P.text3,marginTop:2}}>
              {index+1} / {total}
            </div>
          )}
        </div>
        <div style={{width:80}}/>
      </div>

      {/* Progress */}
      <div style={{height:2,background:P.inset}}>
        <div style={{height:'100%',width:`${pct}%`,background:P.cyan,transition:'width .3s ease'}}/>
      </div>

      {/* Content */}
      <div style={{flex:1,display:'flex',alignItems:'center',justifyContent:'center',padding:'28px 20px 20px'}}>
        {done ? (
          /* Done state */
          <div style={{
            textAlign:'center', animation:'mc-cardIn .3s cubic-bezier(.16,1,.3,1)',
            maxWidth:480, width:'100%',
          }}>
            <div style={{fontSize:48,marginBottom:20}}>🎯</div>
            <div style={{fontSize:26,fontWeight:800,color:P.text1,letterSpacing:'-.02em',marginBottom:8}}>
              Session terminée
            </div>
            <div style={{fontSize:13,color:P.text2,marginBottom:32}}>
              {approved.length} approuvé{approved.length!==1?'s':''} · {passed.length} passé{passed.length!==1?'s':''}
            </div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:28}}>
              {[
                {label:'APPROUVÉS', val:approved.length, color:P.green},
                {label:'PASSÉS',    val:passed.length,   color:P.text2},
                {label:'EXP. CIBLÉE', val:fmtEur(approved.reduce((s,a)=>s+(a.revenueEstimate||0),0))+'k EUR', color:P.cyan, str:true},
                {label:'MARCHÉS',     val:[...new Set(approved.map(a=>a.country).filter(Boolean))].join(', ')||'—', color:P.text2, str:true},
              ].map((s,i)=>(
                <div key={i} style={{background:P.surface,border:`1px solid ${P.border}`,borderRadius:10,padding:'16px 18px'}}>
                  <div style={{fontFamily:F.mono,fontSize:8,fontWeight:700,letterSpacing:'.14em',color:P.text3,textTransform:'uppercase',marginBottom:8}}>
                    {s.label}
                  </div>
                  <div style={{fontFamily:F.mono,fontSize:s.str?14:30,fontWeight:700,color:s.color,letterSpacing:'-.02em'}}>
                    {s.val}
                  </div>
                </div>
              ))}
            </div>
            <button onClick={onClose} style={{
              padding:'14px 32px',background:P.cyan,color:'#060912',border:'none',
              borderRadius:10,fontFamily:F.mono,fontSize:12,fontWeight:800,
              letterSpacing:'.08em',textTransform:'uppercase',cursor:'pointer',
            }}>RETOUR AU COCKPIT</button>
          </div>
        ) : card ? (
          /* Card */
          <div
            key={`card-${card.id}-${index}`}
            style={{
              width:'100%', maxWidth:500,
              animation: cardAnim==='R'
                ? 'mc-swipeR .38s cubic-bezier(.16,1,.3,1) forwards'
                : cardAnim==='L'
                ? 'mc-swipeL .38s cubic-bezier(.16,1,.3,1) forwards'
                : 'mc-cardIn .3s cubic-bezier(.16,1,.3,1)',
            }}
          >
            {/* Company card */}
            <div style={{background:P.surface,border:`1px solid ${P.border}`,borderRadius:16,overflow:'hidden',boxShadow:'0 24px 60px rgba(0,0,0,.4)'}}>
              {/* Card header */}
              <div style={{padding:'22px 24px 18px',borderBottom:`1px solid ${P.border}`,background:P.panel}}>
                <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',gap:12}}>
                  <div>
                    <div style={{fontSize:21,fontWeight:800,color:P.text1,letterSpacing:'-.01em',marginBottom:3}}>{card.company}</div>
                    <div style={{fontFamily:F.mono,fontSize:11,color:P.text2}}>{card.domain}</div>
                  </div>
                  <div style={{textAlign:'right',flexShrink:0}}>
                    <div style={{fontFamily:F.mono,fontSize:30,fontWeight:700,color:scoreColor(card.score||0),letterSpacing:'-.02em',lineHeight:1}}>{card.score||'—'}</div>
                    <div style={{fontFamily:F.mono,fontSize:8,color:P.text3,textTransform:'uppercase',letterSpacing:'.1em',marginTop:2}}>HEAT</div>
                  </div>
                </div>
                {card.financeLead?.name && (
                  <div style={{marginTop:12,padding:'9px 12px',background:P.bg,borderRadius:8,border:`1px solid ${P.border}`,display:'flex',alignItems:'center',gap:10}}>
                    <div style={{width:30,height:30,borderRadius:'50%',background:`${P.cyan}14`,border:`1px solid ${P.cyanD}`,display:'flex',alignItems:'center',justifyContent:'center',fontFamily:F.mono,fontSize:11,fontWeight:700,color:P.cyan,flexShrink:0}}>
                      {card.financeLead.name.charAt(0)}
                    </div>
                    <div style={{flex:1}}>
                      <div style={{fontSize:12,fontWeight:600,color:P.text1}}>{card.financeLead.name}</div>
                      <div style={{fontFamily:F.mono,fontSize:9,color:P.text3,marginTop:1}}>{card.financeLead.title}</div>
                    </div>
                    <span style={{
                      fontFamily:F.mono,fontSize:8,fontWeight:700,padding:'2px 7px',
                      borderRadius:4,textTransform:'uppercase',letterSpacing:'.08em',
                      color: ch==='email'?P.cyan:P.violet,
                      background: ch==='email'?P.cyanD:P.violetD,
                      border:`1px solid ${ch==='email'?P.borderHi:'rgba(167,139,250,.18)'}`,
                    }}>
                      {ch==='email'?'@ EMAIL':'LI'}
                    </span>
                  </div>
                )}
              </div>

              {/* Signal */}
              {card.mainSignal && (
                <div style={{padding:'10px 24px',borderBottom:`1px solid ${P.border}`,display:'flex',alignItems:'center',gap:8}}>
                  <div style={{width:5,height:5,borderRadius:'50%',background:P.amber,flexShrink:0}}/>
                  <span style={{fontFamily:F.mono,fontSize:10,color:P.text2}}>{card.mainSignal}</span>
                </div>
              )}

              {/* Message preview */}
              {msg?.body && (
                <div style={{padding:'16px 24px'}}>
                  <div style={{fontFamily:F.mono,fontSize:8,fontWeight:700,letterSpacing:'.14em',color:P.text3,textTransform:'uppercase',marginBottom:8}}>APERÇU MESSAGE</div>
                  {msg.subject && (
                    <div style={{fontFamily:F.mono,fontSize:11,fontWeight:600,color:P.text1,marginBottom:6,paddingBottom:6,borderBottom:`1px solid ${P.border}`}}>
                      {msg.subject}
                    </div>
                  )}
                  <div style={{fontSize:11,color:P.text2,lineHeight:1.65,maxHeight:80,overflow:'hidden',maskImage:'linear-gradient(to bottom,black 60%,transparent 100%)',WebkitMaskImage:'linear-gradient(to bottom,black 60%,transparent 100%)'}}>
                    {msg.body}
                  </div>
                </div>
              )}
            </div>

            {/* Buttons */}
            <div style={{display:'flex',gap:10,marginTop:16}}>
              <button onClick={onPass} style={{
                flex:1,padding:'14px 0',background:'transparent',color:P.text2,
                border:`1px solid ${P.border}`,borderRadius:12,fontFamily:F.mono,
                fontSize:12,fontWeight:700,letterSpacing:'.06em',textTransform:'uppercase',cursor:'pointer',
              }}>← PASSER</button>
              <button onClick={handleApproveClick} style={{
                flex:2,padding:'14px 0',background:P.green,color:'#060912',border:'none',
                borderRadius:12,fontFamily:F.mono,fontSize:13,fontWeight:800,
                letterSpacing:'.08em',textTransform:'uppercase',cursor:'pointer',
                boxShadow:`0 0 28px ${P.greenD}`,
              }}>
                {ch==='linkedin'?'APPROUVER + OUVRIR LI →':'APPROUVER + ENVOYER →'}
              </button>
            </div>
            <div style={{textAlign:'center',marginTop:10,fontFamily:F.mono,fontSize:9,color:P.text4}}>
              {ch==='linkedin'?'Message copié · profil LI ouvert dans un onglet':'Envoi via Resend · reports@ghost-tax.com'}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// MAIN — Mission Control Dashboard
// ══════════════════════════════════════════════════════════════

export default function MissionControl() {
  const [activeNav, setActiveNav]           = useState<NavId>('overview');
  const [chartTab,  setChartTab]            = useState<'daily'|'weekly'|'monthly'>('monthly');
  const [searchFocused, setSearchFocused]   = useState(false);
  const [now, setNow]                       = useState(new Date());
  const [approvalOpen, setApprovalOpen]     = useState(false);
  const [approvalIndex, setApprovalIndex]   = useState(0);
  const [cardAnim, setCardAnim]             = useState<'L'|'R'|null>(null);
  const [approvedList, setApprovedList]     = useState<Account[]>([]);
  const [passedList,   setPassedList]       = useState<Account[]>([]);
  const [mounted, setMounted]               = useState(false);

  useEffect(() => { setMounted(true); }, []);
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(t);
  }, []);

  // ── Data ───────────────────────────────────────────────────
  const todayPlan  = useMemo(() => getTodayPlan(),                              []);
  const winStatus  = useMemo(() => isInSendingWindow(todayPlan.markets[0]||'DE'), [todayPlan]);
  const accounts   = SEED_ACCOUNTS;
  const readyQueue = useMemo(() => accounts.filter(a => a.outreach?.length), [accounts]);
  const topByScore = useMemo(() => [...accounts].sort((a,b)=>(b.score||0)-(a.score||0)).slice(0,5), [accounts]);

  // ── Chart data ─────────────────────────────────────────────
  const chartData = useMemo(() => {
    const pts = chartTab==='daily'?7:12;
    const sent  = Array.from({length:pts},(_,i)=>Math.round(4+6*Math.sin(i*.8+1)+Math.random()*2));
    const reply = sent.map(v=>Math.round(v*(0.20+Math.random()*.15)));
    return [
      {color:P.cyan,  label:'Messages envoyés', values:sent  },
      {color:P.green, label:'Réponses reçues',  values:reply },
    ];
  }, [chartTab]);

  // ── LinkedIn post idea ─────────────────────────────────────
  const linkedinIdeas: Record<string,string> = {
    leak_of_week:    'Votre stack SaaS a probablement un fantôme de 15%. Voici comment le trouver en 5 min.',
    contrarian:      'Les audits IT coûtent 6 mois. Il y a une meilleure façon.',
    social_proof:    'Client sous NDA : 127k EUR d\'économies détectées en 48h.',
    founder_journey: 'J\'ai analysé 200+ stacks SaaS de PME européennes. Ce que j\'ai découvert...',
    data_insight:    'En 200+ analyses, aucune n\'a eu zéro exposition. Moyenne : 23% du budget IT.',
  };
  const liPost = linkedinIdeas[todayPlan.linkedinPostPillar] || linkedinIdeas.data_insight;

  // ── Approval handlers ──────────────────────────────────────
  const handleApprove = useCallback(() => {
    setCardAnim('R');
    setTimeout(() => {
      setApprovedList(prev => [...prev, readyQueue[approvalIndex]]);
      setCardAnim(null);
      setApprovalIndex(i => i+1);
    }, 400);
  }, [approvalIndex, readyQueue]);

  const handlePass = useCallback(() => {
    setCardAnim('L');
    setTimeout(() => {
      setPassedList(prev => [...prev, readyQueue[approvalIndex]]);
      setCardAnim(null);
      setApprovalIndex(i => i+1);
    }, 400);
  }, [approvalIndex, readyQueue]);

  const openApproval = () => {
    setApprovalIndex(0); setApprovedList([]); setPassedList([]); setCardAnim(null);
    setApprovalOpen(true);
  };

  // ── Sending window helpers ─────────────────────────────────
  const dayLabels = ['Dim','Lun','Mar','Mer','Jeu','Ven','Sam'];
  const dayFull   = ['Dimanche','Lundi','Mardi','Mercredi','Jeudi','Vendredi','Samedi'];
  const timeStr   = now.toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'});
  const dateStr   = `${dayFull[now.getDay()]} ${now.toLocaleDateString('fr-FR',{day:'numeric',month:'long'})}`;

  if (!mounted) return null;

  return (
    <div style={{
      position:'fixed', inset:0, zIndex:200,
      display:'flex', background:P.bg, color:P.text1, fontFamily:F.sans,
      overflow:'hidden',
    }}>
      <style dangerouslySetInnerHTML={{__html:KF}}/>

      {/* Approval Overlay */}
      {approvalOpen && (
        <ApprovalOverlay
          queue={readyQueue}
          index={approvalIndex}
          cardAnim={cardAnim}
          approved={approvedList}
          passed={passedList}
          onApprove={handleApprove}
          onPass={handlePass}
          onClose={() => setApprovalOpen(false)}
        />
      )}

      {/* ══════════════════════════════════════════════════════
          SIDEBAR — 64px, dark premium
      ══════════════════════════════════════════════════════ */}
      <aside style={{
        width:64, flexShrink:0,
        display:'flex', flexDirection:'column', alignItems:'center',
        paddingTop:18, paddingBottom:18, gap:2,
        background:P.surface, borderRight:`1px solid ${P.border}`,
        zIndex:10,
      }}>
        {/* Logo */}
        <div style={{
          width:36, height:36, borderRadius:10, marginBottom:22,
          background:`linear-gradient(135deg,${P.cyan} 0%,${P.blue} 100%)`,
          display:'flex', alignItems:'center', justifyContent:'center',
          fontFamily:F.mono, fontSize:11, fontWeight:900, color:'#060912',
          boxShadow:`0 0 18px ${P.cyanD}`, flexShrink:0,
        }}>GT</div>

        {NAV.map(item => {
          const active = activeNav === item.id;
          return (
            <button key={item.id} title={item.label}
              onClick={() => { if (item.href) window.location.href=item.href; else setActiveNav(item.id); }}
              style={{
                width:40, height:40, borderRadius:10, border:'none',
                display:'flex', alignItems:'center', justifyContent:'center',
                background: active ? `rgba(34,211,238,.12)` : 'transparent',
                color: active ? P.cyan : P.text3,
                cursor:'pointer', position:'relative',
                transition:'all .15s ease',
              }}
            >
              {item.icon}
              {active && (
                <div style={{
                  position:'absolute', left:-8, top:'50%', transform:'translateY(-50%)',
                  width:3, height:18, borderRadius:2, background:P.cyan,
                }}/>
              )}
            </button>
          );
        })}

        <div style={{flex:1}}/>

        {/* Notification dot */}
        <div style={{position:'relative',marginBottom:10}}>
          <div style={{
            width:34, height:34, borderRadius:10, background:P.panel,
            border:`1px solid ${P.border}`, display:'flex', alignItems:'center',
            justifyContent:'center', color:P.text2, cursor:'pointer',
          }}>{I.bell}</div>
          <div style={{
            position:'absolute', top:6, right:6, width:6, height:6, borderRadius:'50%',
            background:P.cyan, animation:'mc-pulse 2s ease-in-out infinite',
          }}/>
        </div>

        {/* Avatar */}
        <div style={{
          width:34, height:34, borderRadius:'50%',
          background:`linear-gradient(135deg,${P.violet} 0%,${P.blue} 100%)`,
          display:'flex', alignItems:'center', justifyContent:'center',
          fontFamily:F.mono, fontSize:11, fontWeight:800, color:'#fff',
          border:`2px solid ${P.border}`, cursor:'pointer',
        }}>J</div>
      </aside>

      {/* ══════════════════════════════════════════════════════
          MAIN CONTENT
      ══════════════════════════════════════════════════════ */}
      <div style={{flex:1, display:'flex', flexDirection:'column', minWidth:0, overflow:'hidden'}}>

        {/* TOP BAR */}
        <header style={{
          height:56, flexShrink:0,
          display:'flex', alignItems:'center', gap:14, padding:'0 22px',
          background:P.surface, borderBottom:`1px solid ${P.border}`,
        }}>
          {/* Title + date */}
          <div style={{display:'flex',flexDirection:'column',gap:1}}>
            <span style={{fontSize:15,fontWeight:800,color:P.text1,letterSpacing:'-.02em'}}>Mission Control</span>
            <span style={{fontFamily:F.mono,fontSize:8,fontWeight:600,color:P.text3,letterSpacing:'.12em',textTransform:'uppercase'}}>
              {dateStr} · {timeStr}
            </span>
          </div>

          {/* Window status */}
          <div style={{
            display:'flex', alignItems:'center', gap:7,
            padding:'5px 10px', borderRadius:7,
            background: winStatus.inWindow ? P.greenD : P.panel,
            border:`1px solid ${winStatus.inWindow ? P.borderGreen : P.border}`,
          }}>
            <div style={{
              width:6, height:6, borderRadius:'50%',
              background: winStatus.inWindow ? P.green : P.text3,
              animation: winStatus.inWindow ? 'mc-pulse 1.8s ease-in-out infinite' : 'none',
            }}/>
            <span style={{fontFamily:F.mono,fontSize:9,fontWeight:700,letterSpacing:'.10em',textTransform:'uppercase',
              color: winStatus.inWindow ? P.green : P.text3,
            }}>
              {winStatus.inWindow ? `FENÊTRE ACTIVE · ${todayPlan.markets[0]}` : `PROCHAINE · ${todayPlan.markets[0]}`}
            </span>
          </div>

          <div style={{flex:1}}/>

          {/* Search */}
          <div style={{
            display:'flex', alignItems:'center', gap:8,
            padding:'6px 12px', borderRadius:8, width:200,
            background:P.panel, border:`1px solid ${searchFocused?P.borderHi:P.border}`,
            transition:'all .2s ease',
          }}>
            <span style={{color:P.text3}}>{I.srch}</span>
            <input
              placeholder="Rechercher un compte..."
              onFocus={()=>setSearchFocused(true)}
              onBlur={()=>setSearchFocused(false)}
              style={{background:'transparent',border:'none',outline:'none',color:P.text1,fontSize:11,fontFamily:F.sans,width:'100%'}}
            />
          </div>

          {/* Approve CTA */}
          <button onClick={openApproval} style={{
            display:'flex', alignItems:'center', gap:7,
            padding:'8px 16px', background:P.cyan, color:'#060912',
            border:'none', borderRadius:8, cursor:'pointer',
            fontFamily:F.mono, fontSize:10, fontWeight:800,
            letterSpacing:'.08em', textTransform:'uppercase',
            boxShadow:`0 0 22px ${P.cyanD}`,
            transition:'all .15s ease',
          }}>
            {I.bolt}
            <span>APPROUVER ({readyQueue.length})</span>
          </button>
        </header>

        {/* SCROLLABLE */}
        <div style={{flex:1, overflow:'auto', padding:'18px 22px 28px', display:'flex', flexDirection:'column', gap:16}}>

          {/* ── KPI CARDS ─────────────────────────────────── */}
          <div style={{display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:14}}>

            {/* Card 1 — Pipeline Actif */}
            <div style={{
              background:`linear-gradient(145deg,${P.surface} 0%,${P.panel} 100%)`,
              border:`1px solid ${P.border}`, borderRadius:14, padding:'18px 20px',
              animation:'mc-fadeIn .4s cubic-bezier(.16,1,.3,1) both',
            }}>
              <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:14}}>
                <div style={{width:34,height:34,borderRadius:9,background:P.cyanD,border:`1px solid ${P.borderHi}`,display:'flex',alignItems:'center',justifyContent:'center',color:P.cyan}}>
                  {I.pipe}
                </div>
                <div>
                  <div style={{fontSize:13,fontWeight:700,color:P.text1}}>Pipeline Actif</div>
                  <div style={{display:'flex',alignItems:'center',gap:5,marginTop:2}}>
                    <div style={{width:5,height:5,borderRadius:'50%',background:P.cyan,animation:'mc-pulse 2s ease-in-out infinite'}}/>
                    <span style={{fontFamily:F.mono,fontSize:8,color:P.text3,textTransform:'uppercase',letterSpacing:'.1em'}}>DACH</span>
                  </div>
                </div>
              </div>
              {[
                {c:P.cyan,  t:`${accounts.length} comptes qualifiés`},
                {c:P.green, t:`${readyQueue.length} messages prêts à envoyer`},
                {c:P.amber, t:`${accounts.filter(a=>a.attackability==='now').length} fenêtres critiques ouvertes`},
                {c:P.text2, t:`Score Heat moyen : ${Math.round(accounts.reduce((s,a)=>s+(a.score||0),0)/accounts.length)}/100`},
              ].map((item,i)=>(
                <div key={i} style={{display:'flex',alignItems:'flex-start',gap:8,marginBottom:6}}>
                  <span style={{color:item.c,marginTop:1,flexShrink:0}}>{I.chk}</span>
                  <span style={{fontSize:12,color:P.text1,lineHeight:1.4}}>{item.t}</span>
                </div>
              ))}
            </div>

            {/* Card 2 — Intelligence Engines */}
            <div style={{
              background:`linear-gradient(145deg,${P.surface} 0%,${P.panel} 100%)`,
              border:`1px solid ${P.border}`, borderRadius:14, padding:'18px 20px',
              animation:'mc-fadeIn .4s cubic-bezier(.16,1,.3,1) .08s both',
            }}>
              <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:14}}>
                <div style={{width:34,height:34,borderRadius:9,background:P.violetD,border:`1px solid rgba(167,139,250,.18)`,display:'flex',alignItems:'center',justifyContent:'center',color:P.violet}}>
                  {I.bolt}
                </div>
                <div>
                  <div style={{fontSize:13,fontWeight:700,color:P.text1}}>Intelligence Engines</div>
                  <div style={{display:'flex',alignItems:'center',gap:5,marginTop:2}}>
                    <div style={{width:5,height:5,borderRadius:'50%',background:P.violet,animation:'mc-pulse 2.2s ease-in-out infinite'}}/>
                    <span style={{fontFamily:F.mono,fontSize:8,color:P.text3,textTransform:'uppercase',letterSpacing:'.1em'}}>ACTIF</span>
                  </div>
                </div>
              </div>
              {[
                {c:P.violet, t:'21 phases d\'analyse disponibles'},
                {c:P.green,  t:'Moteur exposition : ACTIF'},
                {c:P.cyan,   t:'Market Memory : 200+ cas indexés'},
                {c:P.text2,  t:'Confiance moyenne : 73/100'},
              ].map((item,i)=>(
                <div key={i} style={{display:'flex',alignItems:'flex-start',gap:8,marginBottom:6}}>
                  <span style={{color:item.c,marginTop:1,flexShrink:0}}>{I.chk}</span>
                  <span style={{fontSize:12,color:P.text1,lineHeight:1.4}}>{item.t}</span>
                </div>
              ))}
            </div>

            {/* Card 3 — Fenêtre & Mission */}
            <div style={{
              background:`linear-gradient(145deg,${P.surface} 0%,${P.panel} 100%)`,
              border:`1px solid ${winStatus.inWindow?P.borderGreen:P.border}`,
              borderRadius:14, padding:'18px 20px',
              boxShadow: winStatus.inWindow ? `inset 0 0 40px ${P.greenD}` : 'none',
              animation:'mc-fadeIn .4s cubic-bezier(.16,1,.3,1) .16s both',
            }}>
              <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:14}}>
                <div style={{width:34,height:34,borderRadius:9,background:P.greenD,border:`1px solid ${P.borderGreen}`,display:'flex',alignItems:'center',justifyContent:'center',color:P.green}}>
                  {I.radar}
                </div>
                <div>
                  <div style={{fontSize:13,fontWeight:700,color:P.text1}}>Fenêtre & Marché</div>
                  <div style={{display:'flex',alignItems:'center',gap:5,marginTop:2}}>
                    <div style={{width:5,height:5,borderRadius:'50%',background:winStatus.inWindow?P.green:P.text3,animation:winStatus.inWindow?'mc-pulse 1.5s ease-in-out infinite':'none'}}/>
                    <span style={{fontFamily:F.mono,fontSize:8,color:winStatus.inWindow?P.green:P.text3,textTransform:'uppercase',letterSpacing:'.1em'}}>
                      {winStatus.inWindow?'EN FENÊTRE':'HORS FENÊTRE'}
                    </span>
                  </div>
                </div>
              </div>
              {[
                {c: winStatus.inWindow?P.green:P.text3, t:`Marché : ${todayPlan.markets.join(' + ')}`},
                {c: P.amber, t:`${todayPlan.isFollowUpDay?'Jour follow-up':'Nouvelles approches OK'}`},
                {c: P.cyan,  t:`Pilier LinkedIn : ${todayPlan.linkedinPostPillar.replace(/_/g,' ')}`},
                {c: P.text2, t:`${todayPlan.windows[0]?.start}–${todayPlan.windows[0]?.end} CET · PRIME`},
              ].map((item,i)=>(
                <div key={i} style={{display:'flex',alignItems:'flex-start',gap:8,marginBottom:6}}>
                  <span style={{color:item.c,marginTop:1,flexShrink:0}}>{I.chk}</span>
                  <span style={{fontSize:12,color:P.text1,lineHeight:1.4}}>{item.t}</span>
                </div>
              ))}
            </div>
          </div>

          {/* ── CHART + RIGHT PANEL ───────────────────────── */}
          <div style={{display:'grid', gridTemplateColumns:'1fr 330px', gap:14}}>

            {/* Chart — Activité Outreach */}
            <div style={{
              background:P.surface, border:`1px solid ${P.border}`, borderRadius:14, padding:'20px 22px',
              display:'flex', flexDirection:'column', gap:14,
              animation:'mc-fadeIn .4s cubic-bezier(.16,1,.3,1) .2s both',
            }}>
              <div style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}>
                <div>
                  <div style={{fontSize:14,fontWeight:700,color:P.text1,letterSpacing:'-.01em'}}>Activité Outreach</div>
                  <div style={{fontFamily:F.mono,fontSize:8,color:P.text3,textTransform:'uppercase',letterSpacing:'.12em',marginTop:3}}>
                    Messages envoyés · Réponses reçues
                  </div>
                </div>
                {/* Tab switcher */}
                <div style={{display:'flex',gap:2,background:P.panel,borderRadius:8,padding:3}}>
                  {(['daily','weekly','monthly'] as const).map(tab=>(
                    <button key={tab} onClick={()=>setChartTab(tab)} style={{
                      padding:'4px 9px', borderRadius:5, cursor:'pointer',
                      fontFamily:F.mono, fontSize:8, fontWeight:700, letterSpacing:'.08em', textTransform:'uppercase',
                      background: chartTab===tab ? P.surface : 'transparent',
                      color: chartTab===tab ? P.cyan : P.text3,
                      border: chartTab===tab ? `1px solid ${P.border}` : '1px solid transparent',
                      transition:'all .15s ease',
                    }}>
                      {{daily:'Quotidien',weekly:'Hebdo',monthly:'Mensuel'}[tab]}
                    </button>
                  ))}
                </div>
              </div>

              {/* Legend */}
              <div style={{display:'flex',gap:18}}>
                {chartData.map((d,i)=>(
                  <div key={i} style={{display:'flex',alignItems:'center',gap:6}}>
                    <div style={{width:18,height:2,borderRadius:1,background:d.color}}/>
                    <span style={{fontFamily:F.mono,fontSize:8,color:P.text3,textTransform:'uppercase',letterSpacing:'.08em'}}>{d.label}</span>
                  </div>
                ))}
              </div>

              {/* Chart area */}
              <div style={{flex:1,minHeight:150}}>
                <AreaChart data={chartData}/>
              </div>
            </div>

            {/* RIGHT PANEL */}
            <div style={{display:'flex',flexDirection:'column',gap:12}}>

              {/* Prospects prioritaires — like "Messages" */}
              <div style={{
                background:P.surface, border:`1px solid ${P.border}`, borderRadius:14,
                overflow:'hidden', flex:1,
                animation:'mc-fadeIn .4s cubic-bezier(.16,1,.3,1) .24s both',
              }}>
                <div style={{
                  padding:'12px 16px', borderBottom:`1px solid ${P.border}`,
                  display:'flex', alignItems:'center', justifyContent:'space-between',
                }}>
                  <span style={{fontFamily:F.mono,fontSize:8,fontWeight:700,textTransform:'uppercase',letterSpacing:'.12em',color:P.text3}}>Top Prospects</span>
                  <button onClick={openApproval} style={{
                    fontFamily:F.mono,fontSize:8,color:P.cyan,background:'transparent',border:'none',
                    cursor:'pointer',letterSpacing:'.06em',padding:'2px 0',
                  }}>APPROUVER →</button>
                </div>
                {topByScore.map((a,i)=>(
                  <div key={a.id} style={{
                    display:'flex', alignItems:'center', gap:10, padding:'9px 16px',
                    borderBottom: i<4?`1px solid ${P.border}`:'none',
                    cursor:'pointer', transition:'background .15s ease',
                  }}
                    onMouseEnter={e=>(e.currentTarget.style.background=P.panel)}
                    onMouseLeave={e=>(e.currentTarget.style.background='transparent')}
                  >
                    <div style={{
                      width:28,height:28,borderRadius:'50%',background:P.inset,
                      border:`1px solid ${P.border}`,display:'flex',alignItems:'center',
                      justifyContent:'center',fontFamily:F.mono,fontSize:10,fontWeight:700,
                      color:scoreColor(a.score||0),flexShrink:0,
                    }}>{a.company.charAt(0)}</div>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{fontSize:11,fontWeight:600,color:P.text1,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{a.company}</div>
                      <div style={{fontFamily:F.mono,fontSize:8,color:P.text3,marginTop:1}}>{a.mainSignal?.substring(0,36)||a.country}</div>
                    </div>
                    <div style={{
                      fontFamily:F.mono,fontSize:11,fontWeight:700,
                      color:scoreColor(a.score||0),
                      background:`${scoreColor(a.score||0)}12`,
                      padding:'2px 6px',borderRadius:4,
                      border:`1px solid ${scoreColor(a.score||0)}25`,
                      flexShrink:0,
                    }}>{a.score}</div>
                  </div>
                ))}
              </div>

              {/* Mission du jour — like "Online consultation" */}
              <div style={{
                background:P.surface, border:`1px solid ${P.borderHi}`, borderRadius:14,
                padding:'14px 16px',
                animation:'mc-fadeIn .4s cubic-bezier(.16,1,.3,1) .3s both',
                boxShadow:`inset 0 0 30px ${P.cyanD}`,
              }}>
                <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:10}}>
                  <span style={{fontFamily:F.mono,fontSize:8,fontWeight:700,textTransform:'uppercase',letterSpacing:'.12em',color:P.cyan}}>Mission du Jour</span>
                  <span style={{fontFamily:F.mono,fontSize:8,color:P.text3}}>{dayLabels[now.getDay()]}</span>
                </div>
                <div style={{fontSize:12,color:P.text1,lineHeight:1.6,marginBottom:10}}>
                  💡 {liPost}
                </div>
                <div style={{
                  padding:'8px 10px',background:P.inset,borderRadius:6,
                  fontFamily:F.mono,fontSize:9,color:P.text3,
                  border:`1px solid ${P.border}`,
                }}>
                  → Adapte et publie depuis LinkedIn directement.
                </div>
              </div>

              {/* Quick actions — like "Send Messages" */}
              <div style={{
                background:P.surface, border:`1px solid ${P.border}`, borderRadius:14,
                padding:'14px 16px', display:'flex', flexDirection:'column', gap:7,
                animation:'mc-fadeIn .4s cubic-bezier(.16,1,.3,1) .36s both',
              }}>
                <div style={{fontFamily:F.mono,fontSize:8,fontWeight:700,textTransform:'uppercase',letterSpacing:'.12em',color:P.text3,marginBottom:3}}>
                  Actions Rapides
                </div>
                {[
                  {label:'Nouveau Scan Intel',   sub:'/intel',   color:P.green,  href:'/intel'  },
                  {label:'Mode Approbation',      sub:'cockpit',  color:P.cyan,   action:openApproval},
                  {label:'Signal Hunter DACH',    sub:'/command', color:P.violet, href:'/command'},
                ].map((a,i)=>(
                  <button key={i} onClick={a.action||(()=>a.href&&(window.location.href=a.href))} style={{
                    display:'flex',alignItems:'center',justifyContent:'space-between',
                    padding:'8px 11px',background:P.panel,border:`1px solid ${P.border}`,
                    borderRadius:7,cursor:'pointer',width:'100%',transition:'all .15s ease',
                  }}
                    onMouseEnter={e=>{(e.currentTarget as HTMLElement).style.borderColor=a.color+'40';(e.currentTarget as HTMLElement).style.background=a.color+'08';}}
                    onMouseLeave={e=>{(e.currentTarget as HTMLElement).style.borderColor=P.border;(e.currentTarget as HTMLElement).style.background=P.panel;}}
                  >
                    <span style={{fontSize:11,fontWeight:600,color:P.text1}}>{a.label}</span>
                    <span style={{color:a.color,fontSize:13}}>→</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* ── ACCOUNTS TABLE — like "Current Partnerships" ─ */}
          <div style={{
            background:P.surface, border:`1px solid ${P.border}`, borderRadius:14,
            overflow:'hidden',
            animation:'mc-fadeIn .4s cubic-bezier(.16,1,.3,1) .4s both',
          }}>
            {/* Header */}
            <div style={{
              display:'flex', alignItems:'center', justifyContent:'space-between',
              padding:'13px 20px', borderBottom:`1px solid ${P.border}`,
            }}>
              <span style={{fontFamily:F.mono,fontSize:8,fontWeight:700,textTransform:'uppercase',letterSpacing:'.12em',color:P.text3}}>
                Comptes DACH — Pipeline
              </span>
              <div style={{display:'flex',alignItems:'center',gap:6}}>
                <span style={{fontFamily:F.mono,fontSize:8,color:P.text3}}>{accounts.length} comptes</span>
                <button onClick={openApproval} style={{
                  fontFamily:F.mono,fontSize:8,color:P.cyan,background:'transparent',border:'none',cursor:'pointer',letterSpacing:'.06em',
                }}>MODE APPROBATION →</button>
              </div>
            </div>

            {/* Rows — like "Current Partnerships" */}
            {accounts.map((a,i)=>{
              const ch = a.outreach?.[0]?.channel||'email';
              return (
                <div key={a.id} style={{
                  display:'grid',
                  gridTemplateColumns:'36px 1fr 90px 120px 80px 80px',
                  alignItems:'center', gap:16, padding:'11px 20px',
                  borderBottom: i<accounts.length-1 ? `1px solid ${P.border}` : 'none',
                  cursor:'pointer', transition:'background .15s ease',
                }}
                  onMouseEnter={e=>(e.currentTarget.style.background=P.panel)}
                  onMouseLeave={e=>(e.currentTarget.style.background='transparent')}
                >
                  {/* Logo */}
                  <div style={{
                    width:34,height:34,borderRadius:8,background:P.inset,
                    border:`1px solid ${P.border}`,display:'flex',alignItems:'center',
                    justifyContent:'center',fontFamily:F.mono,fontSize:11,fontWeight:700,
                    color:scoreColor(a.score||0),
                  }}>{a.company.charAt(0)}</div>

                  {/* Name + signal */}
                  <div style={{minWidth:0}}>
                    <div style={{fontSize:12,fontWeight:600,color:P.text1}}>{a.company}</div>
                    <div style={{fontFamily:F.mono,fontSize:9,color:P.text3,marginTop:1,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>
                      {a.domain} · {a.country}
                    </div>
                  </div>

                  {/* Signal */}
                  <div style={{fontFamily:F.mono,fontSize:9,color:P.amber,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>
                    {a.attackability==='now'?'⚡ Now':'Soon'}
                  </div>

                  {/* Contact */}
                  <div style={{fontFamily:F.mono,fontSize:9,color:P.text2,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>
                    {a.financeLead?.name||'—'} · {a.financeLead?.title?.split(' ')[0]||'—'}
                  </div>

                  {/* Channel badge */}
                  <div style={{
                    display:'flex',alignItems:'center',gap:5,
                    padding:'3px 8px',borderRadius:20,width:'fit-content',
                    background: ch==='linkedin'?P.violetD:P.cyanD,
                    border:`1px solid ${ch==='linkedin'?'rgba(167,139,250,.18)':P.borderHi}`,
                  }}>
                    <span style={{color:ch==='linkedin'?P.violet:P.cyan}}>{ch==='linkedin'?I.li:I.at}</span>
                    <span style={{fontFamily:F.mono,fontSize:8,fontWeight:700,letterSpacing:'.06em',textTransform:'uppercase',color:ch==='linkedin'?P.violet:P.cyan}}>
                      {ch==='linkedin'?'LI':'@'}
                    </span>
                  </div>

                  {/* Score */}
                  <div style={{textAlign:'right'}}>
                    <div style={{
                      display:'inline-flex',alignItems:'center',gap:4,
                      padding:'3px 9px',borderRadius:20,
                      background:`${scoreColor(a.score||0)}12`,
                      border:`1px solid ${scoreColor(a.score||0)}25`,
                    }}>
                      <div style={{width:5,height:5,borderRadius:'50%',background:scoreColor(a.score||0)}}/>
                      <span style={{fontFamily:F.mono,fontSize:10,fontWeight:700,color:scoreColor(a.score||0)}}>
                        {a.score||'—'}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div style={{height:8}}/>
        </div>
      </div>
    </div>
  );
}
