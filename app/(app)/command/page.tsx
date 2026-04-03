'use client';

/**
 * GHOST TAX — MISSION CONTROL v7
 *
 * Design: Linear / Vercel / Raycast.
 * Une seule colonne. Zéro bruit. 2 minutes max.
 *
 * v7 changes vs v6:
 *  - Suppression du hack position:fixed sur le wrapper principal
 *    (le layout command/layout.tsx gère maintenant le fullscreen dark shell)
 *  - L'overlay approbation garde position:fixed zIndex:400
 *  - Tout le reste identique
 */

import { useState, useEffect } from 'react';
import { loadAccounts } from '@/lib/command/store';
import { getTodayPlan, isInSendingWindow } from '@/lib/command/sending-windows';
import { selectNextPost, formatForLinkedIn } from '@/lib/command/linkedin-content';
import type { Account, OutreachDraft } from '@/types/command';
import type { LinkedInPost } from '@/lib/command/linkedin-content';

// ── Palette ────────────────────────────────────────────────
const P = {
  bg:      '#060912',
  surface: '#0C1019',
  border:  'rgba(255,255,255,0.06)',
  text1:   '#F1F5F9',
  text2:   '#94A3B8',
  text3:   '#475569',
  cyan:    '#22D3EE',
  green:   '#34D399',
  amber:   '#FBBF24',
  red:     '#F87171',
};

const F = {
  mono: "var(--vg-font-mono,'JetBrains Mono',monospace)",
  sans: "var(--vg-font-sans,'Inter',system-ui,sans-serif)",
};

// ── Keyframes ──────────────────────────────────────────────
const KF = `
@keyframes mc-fade { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
@keyframes mc-swL  { from{opacity:1;transform:translateX(0) rotate(0deg)} to{opacity:0;transform:translateX(-110%) rotate(-10deg)} }
@keyframes mc-swR  { from{opacity:1;transform:translateX(0) rotate(0deg)} to{opacity:0;transform:translateX(110%) rotate(10deg)} }
@keyframes mc-in   { from{opacity:0;transform:translateY(14px) scale(.97)} to{opacity:1;transform:translateY(0) scale(1)} }
`;

// ── Helpers ────────────────────────────────────────────────
const DAYS   = ['Dimanche','Lundi','Mardi','Mercredi','Jeudi','Vendredi','Samedi'];
const MONTHS = ['janvier','février','mars','avril','mai','juin','juillet','août','septembre','octobre','novembre','décembre'];
const FLAGS: Record<string, string> = { DE:'🇩🇪', NL:'🇳🇱', AT:'🇦🇹', CH:'🇨🇭', FR:'🇫🇷', GB:'🇬🇧', US:'🇺🇸', BE:'🇧🇪' };

function fmtDate(d: Date) {
  return `${DAYS[d.getDay()]} ${d.getDate()} ${MONTHS[d.getMonth()]}`;
}
function fmtTime(d: Date) {
  return `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
}
function fmtEur(n: number) {
  return n >= 1_000_000 ? `${(n/1_000_000).toFixed(1)}M€`
       : n >= 1_000     ? `${Math.round(n/1_000)}k€`
       : `${n}€`;
}
function flag(c: string) { return FLAGS[c] || '🌍'; }

function getExposure(a: Account): { low: number; high: number; daily: number } | null {
  if (a.scan?.exposureLow && a.scan?.exposureHigh) {
    const avg = (a.scan.exposureLow + a.scan.exposureHigh) / 2;
    return { low: a.scan.exposureLow, high: a.scan.exposureHigh, daily: Math.round(avg / 365) };
  }
  if (a.revenueEstimate) {
    const est = a.revenueEstimate * 0.15;
    return { low: Math.round(est * 0.7), high: Math.round(est * 1.3), daily: Math.round(est / 365) };
  }
  return null;
}

function secToLabel(s: number) {
  return s >= 60 ? `${Math.floor(s/60)} min ${s%60} sec` : `${s} sec`;
}

// ── Component ──────────────────────────────────────────────
export default function MissionControl() {
  const [mounted,      setMounted]      = useState(false);
  const [accounts,     setAccounts]     = useState<Account[]>([]);
  const [liPost,       setLiPost]       = useState<LinkedInPost | null>(null);
  const [now,          setNow]          = useState(new Date());

  // Overlay state
  const [overlayOpen,  setOverlayOpen]  = useState(false);
  const [cardIdx,      setCardIdx]      = useState(0);
  const [cardAnim,     setCardAnim]     = useState<'swL'|'swR'|'in'|null>(null);
  const [approved,     setApproved]     = useState<string[]>([]);
  const [passed,       setPassed]       = useState<string[]>([]);
  const [done,         setDone]         = useState(false);
  const [sessionStart, setSessionStart] = useState(0);
  const [sending,      setSending]      = useState(false);
  const [feedback,     setFeedback]     = useState<string|null>(null);
  const [postCopied,   setPostCopied]   = useState(false);

  // ── Init ──────────────────────────────────────────────────
  useEffect(() => {
    setMounted(true);
    setAccounts(loadAccounts());
    setLiPost(selectNextPost(undefined, 'fr'));
  }, []);

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(t);
  }, []);

  if (!mounted) return <div style={{ background: P.bg, minHeight: '100vh' }} />;

  // ── Derived ───────────────────────────────────────────────
  const plan   = getTodayPlan();
  const market = plan.markets[0] || 'DE';
  const win    = isInSendingWindow(market);

  const readyQueue = accounts.filter(a =>
    a.status !== 'dropped' &&
    a.outreach?.some(o => o.status === 'draft')
  );
  const sentCount   = accounts.filter(a => a.outreach?.some(o => o.status === 'sent')).length;
  const followCount = accounts.filter(a => a.status === 'contacted').length;
  const pipeline    = [...accounts]
    .filter(a => a.status !== 'dropped')
    .sort((a, b) => b.score - a.score)
    .slice(0, 10);

  const card: Account | undefined  = readyQueue[cardIdx];
  const draft: OutreachDraft | undefined = card?.outreach?.find(o => o.status === 'draft');
  const exp        = card ? getExposure(card) : null;
  const sessionSec = Math.round((Date.now() - sessionStart) / 1000);

  const winLabel = win.inWindow
    ? `🟢 Fenêtre ${market} ouverte`
    : `⚫ Hors fenêtre ${market}`;
  const winColor = win.inWindow ? P.green : P.text3;

  // ── Actions ───────────────────────────────────────────────
  function nextCard() {
    const next = cardIdx + 1;
    if (next >= readyQueue.length) {
      setDone(true);
    } else {
      setCardIdx(next);
      setCardAnim('in');
      setTimeout(() => setCardAnim(null), 400);
    }
    setFeedback(null);
  }

  function handlePass() {
    if (!card || cardAnim) return;
    setCardAnim('swL');
    setPassed(p => [...p, card.id]);
    setTimeout(nextCard, 360);
  }

  async function handleApprove() {
    if (!card || !draft || cardAnim || sending) return;

    if (draft.channel === 'linkedin') {
      try { await navigator.clipboard.writeText(draft.body); } catch {}
      if (card.financeLead.linkedIn) window.open(card.financeLead.linkedIn, '_blank');
      setCardAnim('swR');
      setApproved(a => [...a, card.id]);
      setTimeout(nextCard, 360);
      return;
    }

    // Email path
    setSending(true);
    try {
      const res = await fetch('/api/command/send-approved', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to:         card.financeLead.email,
          subject:    draft.subject || `Ghost Tax · ${card.company}`,
          textBody:   draft.body,
          domain:     card.domain || card.website,
          prospectId: card.id,
        }),
      });
      if (res.ok) {
        setFeedback(`✅ Envoyé à ${card.financeLead.email}`);
        setApproved(a => [...a, card.id]);
        setCardAnim('swR');
        setTimeout(nextCard, 900);
      } else {
        setFeedback('⚠️ Erreur envoi — vérifie Resend');
      }
    } catch {
      setFeedback('⚠️ Erreur réseau');
    } finally {
      setSending(false);
    }
  }

  function openOverlay() {
    setCardIdx(0);
    setApproved([]);
    setPassed([]);
    setDone(false);
    setFeedback(null);
    setOverlayOpen(true);
    setSessionStart(Date.now());
    setCardAnim('in');
    setTimeout(() => setCardAnim(null), 400);
  }

  async function copyPost() {
    if (!liPost) return;
    try {
      await navigator.clipboard.writeText(formatForLinkedIn(liPost));
      setPostCopied(true);
      setTimeout(() => setPostCopied(false), 2000);
    } catch {}
  }

  // ── Render ────────────────────────────────────────────────
  return (
    <>
      <style>{KF}</style>

      {/* ════════════════════════════════════════════════════
          MAIN PAGE — renders naturally in layout's <main>
         ════════════════════════════════════════════════════ */}
      <div style={{ background: P.bg, fontFamily: F.sans, color: P.text1 }}>
        <div style={{ maxWidth: 680, margin: '0 auto', padding: '52px 32px 80px' }}>

          {/* ── Header ── */}
          <div style={{ marginBottom: 52, animation: 'mc-fade .4s ease both' }}>
            <div style={{
              fontFamily: F.mono, fontSize: 9, fontWeight: 700,
              letterSpacing: '.2em', textTransform: 'uppercase',
              color: P.text3, marginBottom: 14,
            }}>
              Ghost Tax · Mission Control
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 14, flexWrap: 'wrap' }}>
              <h1 style={{ margin: 0, fontSize: 26, fontWeight: 600, letterSpacing: '-.02em', color: P.text1 }}>
                {fmtDate(now)}
              </h1>
              <span style={{ fontFamily: F.mono, fontSize: 13, color: P.text3 }}>
                {fmtTime(now)}
              </span>
              <span style={{
                fontFamily: F.mono, fontSize: 10, color: winColor,
                padding: '3px 9px', borderRadius: 4,
                border: `1px solid ${winColor}33`,
              }}>
                {winLabel}
              </span>
            </div>
          </div>

          {/* ── KPI Pills ── */}
          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(4,1fr)',
            gap: 10, marginBottom: 44,
            animation: 'mc-fade .4s ease .05s both',
          }}>
            {[
              { v: sentCount,         label: 'envoyés',   icon: '✅', hi: false },
              { v: readyQueue.length, label: 'à valider', icon: '📬', hi: readyQueue.length > 0 },
              { v: followCount,       label: 'follow-up', icon: '🔄', hi: false },
              { v: '—',              label: 'revenus',   icon: '💰', hi: false },
            ].map((k, i) => (
              <div key={i} style={{
                background: P.surface,
                border: `1px solid ${k.hi ? P.cyan + '28' : P.border}`,
                borderRadius: 10, padding: '16px 14px',
              }}>
                <div style={{
                  fontFamily: F.mono, fontSize: 18, fontWeight: 700,
                  color: k.hi ? P.cyan : P.text1, lineHeight: 1,
                }}>
                  {k.v}
                </div>
                <div style={{
                  fontFamily: F.mono, fontSize: 9, color: P.text3,
                  marginTop: 6, letterSpacing: '.08em', textTransform: 'uppercase',
                }}>
                  {k.icon} {k.label}
                </div>
              </div>
            ))}
          </div>

          {/* ── CTA Hero ── */}
          <div style={{ marginBottom: 52, animation: 'mc-fade .4s ease .1s both' }}>
            {readyQueue.length > 0 ? (
              <div style={{
                background: P.surface,
                border: `1px solid ${P.cyan}18`,
                borderRadius: 14, padding: '36px 32px',
                textAlign: 'center',
              }}>
                <div style={{ fontSize: 14, color: P.text2, marginBottom: 6 }}>
                  <span style={{ fontFamily: F.mono, fontSize: 20, fontWeight: 700, color: P.cyan }}>
                    {readyQueue.length}
                  </span>
                  {' '}message{readyQueue.length > 1 ? 's' : ''} à valider
                  <span style={{ color: P.text3, fontFamily: F.mono, fontSize: 12 }}>
                    {' '}· ~{Math.max(30, readyQueue.length * 45)} sec
                  </span>
                </div>
                <div style={{ fontFamily: F.mono, fontSize: 11, color: P.text3, marginBottom: 28 }}>
                  Approuve, passe ou skip — toi seul décides
                </div>
                <button
                  onClick={openOverlay}
                  style={{
                    background: P.cyan, color: '#000',
                    border: 'none', borderRadius: 8,
                    padding: '15px 0', fontSize: 13,
                    fontWeight: 700, fontFamily: F.mono,
                    letterSpacing: '.09em', textTransform: 'uppercase',
                    cursor: 'pointer', display: 'block',
                    width: '100%', maxWidth: 340, margin: '0 auto',
                  }}
                >
                  Commencer l&apos;approbation →
                </button>
              </div>
            ) : (
              <div style={{
                background: P.surface, border: `1px solid ${P.border}`,
                borderRadius: 14, padding: '40px 32px', textAlign: 'center',
              }}>
                <div style={{ fontSize: 36, marginBottom: 14 }}>🎯</div>
                <div style={{ fontSize: 14, color: P.text2 }}>Aucun message en attente</div>
                <div style={{ fontFamily: F.mono, fontSize: 11, color: P.text3, marginTop: 8 }}>
                  Le pipeline se remplira au prochain scan
                </div>
              </div>
            )}
          </div>

          {/* ── Pipeline ── */}
          {pipeline.length > 0 && (
            <div style={{ marginBottom: 52, animation: 'mc-fade .4s ease .15s both' }}>
              <div style={{
                fontFamily: F.mono, fontSize: 9, fontWeight: 700,
                letterSpacing: '.16em', textTransform: 'uppercase',
                color: P.text3, marginBottom: 18,
                paddingBottom: 10, borderBottom: `1px solid ${P.border}`,
              }}>
                Pipeline · {pipeline.length} comptes
              </div>
              <div>
                {pipeline.map((a, i) => {
                  const d = a.outreach?.find(o => o.status === 'draft');
                  const s = a.outreach?.some(o => o.status === 'sent');
                  const statusColor = s ? P.text3 : d ? P.cyan : P.text3;
                  const statusLabel = s ? '📤 envoyé'
                    : d ? (d.channel === 'linkedin' ? '💬 prêt' : '📧 prêt')
                    : '⏳ en cours';
                  return (
                    <div key={a.id} style={{
                      display: 'flex', alignItems: 'center', gap: 14,
                      padding: '11px 0', borderBottom: `1px solid ${P.border}`,
                      animation: `mc-fade .3s ease ${0.15 + i * 0.03}s both`,
                    }}>
                      <span style={{ fontSize: 14, flexShrink: 0 }}>{flag(a.country)}</span>
                      <span style={{
                        fontSize: 13, color: P.text1, flex: 1,
                        minWidth: 0, overflow: 'hidden',
                        textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      }}>
                        {a.financeLead.name !== 'Unknown' ? a.financeLead.name : a.company}
                      </span>
                      <span style={{
                        fontSize: 11, color: P.text3, flexShrink: 0,
                        maxWidth: 90, overflow: 'hidden',
                        textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      }}>
                        {a.financeLead.title || 'CFO'}
                      </span>
                      <span style={{
                        fontSize: 11, color: P.text3, flexShrink: 0,
                        maxWidth: 100, overflow: 'hidden',
                        textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      }}>
                        {a.company}
                      </span>
                      <span style={{
                        fontFamily: F.mono, fontSize: 11, fontWeight: 600,
                        color: P.text2, flexShrink: 0, width: 30, textAlign: 'right',
                      }}>
                        {a.score}
                      </span>
                      <span style={{
                        fontFamily: F.mono, fontSize: 10, color: statusColor,
                        flexShrink: 0, width: 82, textAlign: 'right',
                      }}>
                        {statusLabel}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── LinkedIn Post ── */}
          {liPost && (
            <div style={{ animation: 'mc-fade .4s ease .2s both' }}>
              <div style={{
                fontFamily: F.mono, fontSize: 9, fontWeight: 700,
                letterSpacing: '.16em', textTransform: 'uppercase',
                color: P.text3, marginBottom: 18,
                paddingBottom: 10, borderBottom: `1px solid ${P.border}`,
              }}>
                Post LinkedIn du jour
              </div>
              <div style={{
                background: P.surface, border: `1px solid ${P.border}`,
                borderRadius: 12, padding: '24px',
              }}>
                <div style={{
                  fontFamily: F.mono, fontSize: 12, color: P.text2,
                  lineHeight: 1.8, whiteSpace: 'pre-wrap',
                  maxHeight: 148, overflowY: 'auto',
                }}>
                  {liPost.body.slice(0, 220)}{liPost.body.length > 220 ? '…' : ''}
                </div>
                <button
                  onClick={copyPost}
                  style={{
                    marginTop: 16, background: 'transparent',
                    border: `1px solid ${postCopied ? P.green + '40' : P.border}`,
                    borderRadius: 6, padding: '8px 16px',
                    fontSize: 11, fontFamily: F.mono,
                    color: postCopied ? P.green : P.text3,
                    cursor: 'pointer', letterSpacing: '.06em',
                  }}
                >
                  {postCopied ? '✅ Copié' : '📋 Copier le post'}
                </button>
              </div>
            </div>
          )}

        </div>
      </div>

      {/* ════════════════════════════════════════════════════
          APPROVAL OVERLAY — position:fixed z-400
          (au-dessus du command layout z-100)
         ════════════════════════════════════════════════════ */}
      {overlayOpen && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 400,
          background: P.bg, display: 'flex',
          flexDirection: 'column', fontFamily: F.sans,
        }}>

          {/* Top bar */}
          <div style={{
            display: 'flex', alignItems: 'center',
            justifyContent: 'space-between',
            padding: '18px 32px',
            borderBottom: `1px solid ${P.border}`,
            flexShrink: 0,
          }}>
            <button
              onClick={() => setOverlayOpen(false)}
              style={{
                background: 'transparent', border: 'none',
                color: P.text3, fontFamily: F.mono,
                fontSize: 11, cursor: 'pointer', letterSpacing: '.06em',
              }}
            >
              ← RETOUR
            </button>
            {!done && (
              <div style={{ fontFamily: F.mono, fontSize: 11, color: P.text3 }}>
                {cardIdx + 1} / {readyQueue.length}
              </div>
            )}
            <div style={{
              fontFamily: F.mono, fontSize: 9, letterSpacing: '.14em',
              color: P.text3, textTransform: 'uppercase',
            }}>
              Mode Approbation
            </div>
          </div>

          {/* Progress bar */}
          {!done && (
            <div style={{ height: 2, background: P.border, flexShrink: 0 }}>
              <div style={{
                height: '100%', background: P.cyan,
                width: `${Math.round((cardIdx / readyQueue.length) * 100)}%`,
                transition: 'width .3s ease',
              }} />
            </div>
          )}

          {/* Body */}
          <div style={{
            flex: 1, display: 'flex', alignItems: 'center',
            justifyContent: 'center', padding: '32px',
            overflowY: 'auto',
          }}>

            {/* ── SESSION DONE ── */}
            {done && (
              <div style={{
                textAlign: 'center', maxWidth: 480, width: '100%',
                animation: 'mc-fade .4s ease both',
              }}>
                <div style={{ fontSize: 44, marginBottom: 16 }}>🎯</div>
                <div style={{ fontSize: 22, fontWeight: 600, letterSpacing: '-.01em', marginBottom: 6 }}>
                  Session terminée
                </div>
                <div style={{ fontFamily: F.mono, fontSize: 12, color: P.text3, marginBottom: 36 }}>
                  {secToLabel(sessionSec)}
                </div>
                <div style={{ display: 'flex', justifyContent: 'center', gap: 40, marginBottom: 52 }}>
                  <div>
                    <div style={{ fontFamily: F.mono, fontSize: 30, fontWeight: 700, color: P.green }}>
                      {approved.length}
                    </div>
                    <div style={{ fontSize: 11, color: P.text3, marginTop: 4 }}>approuvés</div>
                  </div>
                  <div>
                    <div style={{ fontFamily: F.mono, fontSize: 30, fontWeight: 700, color: P.text3 }}>
                      {passed.length}
                    </div>
                    <div style={{ fontSize: 11, color: P.text3, marginTop: 4 }}>passés</div>
                  </div>
                </div>

                {liPost && (
                  <div style={{
                    background: P.surface, border: `1px solid ${P.border}`,
                    borderRadius: 12, padding: '20px 24px',
                    textAlign: 'left', marginBottom: 36,
                  }}>
                    <div style={{
                      fontFamily: F.mono, fontSize: 9, color: P.text3,
                      letterSpacing: '.14em', textTransform: 'uppercase', marginBottom: 12,
                    }}>
                      Post LinkedIn du jour
                    </div>
                    <div style={{ fontFamily: F.mono, fontSize: 11, color: P.text2, lineHeight: 1.7 }}>
                      {liPost.body.slice(0, 140)}…
                    </div>
                    <button
                      onClick={copyPost}
                      style={{
                        marginTop: 14, background: 'transparent',
                        border: `1px solid ${postCopied ? P.green + '40' : P.border}`,
                        borderRadius: 6, padding: '7px 14px',
                        fontSize: 10, fontFamily: F.mono,
                        color: postCopied ? P.green : P.text3, cursor: 'pointer',
                      }}
                    >
                      {postCopied ? '✅ Copié' : '📋 Copier le post'}
                    </button>
                  </div>
                )}

                <div style={{ fontFamily: F.mono, fontSize: 10, color: P.text3, marginBottom: 24 }}>
                  Prochain briefing : {market} · demain
                </div>
                <button
                  onClick={() => setOverlayOpen(false)}
                  style={{
                    background: P.surface, border: `1px solid ${P.border}`,
                    borderRadius: 8, padding: '12px 32px',
                    fontFamily: F.mono, fontSize: 11,
                    color: P.text2, cursor: 'pointer',
                    letterSpacing: '.08em', textTransform: 'uppercase',
                  }}
                >
                  Fermer
                </button>
              </div>
            )}

            {/* ── APPROVAL CARD ── */}
            {!done && card && (
              <div
                key={card.id}
                style={{
                  maxWidth: 520, width: '100%',
                  animation: cardAnim === 'swL' ? 'mc-swL .36s ease forwards' :
                             cardAnim === 'swR' ? 'mc-swR .36s ease forwards' :
                             cardAnim === 'in'  ? 'mc-in .36s ease forwards'  :
                             'none',
                }}
              >
                {/* Contact header */}
                <div style={{ textAlign: 'center', marginBottom: 28 }}>
                  <div style={{
                    fontSize: 22, fontWeight: 600, letterSpacing: '-.01em',
                    color: P.text1, marginBottom: 6,
                  }}>
                    {card.financeLead.name !== 'Unknown' ? card.financeLead.name : card.company}
                  </div>
                  <div style={{ fontSize: 13, color: P.text2 }}>
                    {card.financeLead.title || 'Directeur Financier'} · {card.company}
                  </div>
                  <div style={{ fontFamily: F.mono, fontSize: 11, color: P.text3, marginTop: 4 }}>
                    {flag(card.country)} {card.country} · {card.employeeRange} · {card.industry}
                  </div>
                </div>

                {/* Exposure */}
                {exp && (
                  <div style={{
                    background: P.surface, border: `1px solid ${P.border}`,
                    borderRadius: 10, padding: '16px 22px',
                    display: 'flex', justifyContent: 'space-between',
                    alignItems: 'center', marginBottom: 14,
                  }}>
                    <div>
                      <div style={{ fontFamily: F.mono, fontSize: 17, fontWeight: 700, color: P.cyan }}>
                        {fmtEur(exp.low)}–{fmtEur(exp.high)}/an
                      </div>
                      <div style={{ fontSize: 10, color: P.text3, marginTop: 3 }}>exposition estimée</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontFamily: F.mono, fontSize: 15, fontWeight: 700, color: P.red }}>
                        ~{fmtEur(exp.daily)}/jour
                      </div>
                      <div style={{ fontSize: 10, color: P.text3, marginTop: 3 }}>perte quotidienne</div>
                    </div>
                  </div>
                )}

                {/* Badges */}
                <div style={{ display: 'flex', gap: 8, marginBottom: 14, justifyContent: 'center' }}>
                  <span style={{
                    fontFamily: F.mono, fontSize: 10, padding: '4px 10px',
                    borderRadius: 4, border: `1px solid ${P.border}`, color: P.text2,
                  }}>
                    {draft?.channel === 'linkedin' ? '💬 LinkedIn DM' : '📧 Email'}
                  </span>
                  <span style={{
                    fontFamily: F.mono, fontSize: 10, padding: '4px 10px',
                    borderRadius: 4, border: `1px solid ${P.border}`, color: P.amber,
                  }}>
                    Score {card.score}/25
                  </span>
                </div>

                {/* Message preview */}
                {draft && (
                  <div style={{
                    background: P.surface, border: `1px solid ${P.border}`,
                    borderRadius: 10, padding: '18px 20px', marginBottom: 28,
                  }}>
                    {draft.subject && (
                      <div style={{
                        fontFamily: F.mono, fontSize: 11, color: P.text3,
                        marginBottom: 12, paddingBottom: 12,
                        borderBottom: `1px solid ${P.border}`,
                      }}>
                        {draft.subject}
                      </div>
                    )}
                    <div style={{
                      fontFamily: F.mono, fontSize: 12, color: P.text2,
                      lineHeight: 1.8, maxHeight: 200, overflowY: 'auto',
                      whiteSpace: 'pre-wrap',
                    }}>
                      {draft.body}
                    </div>
                  </div>
                )}

                {/* Feedback */}
                {feedback && (
                  <div style={{
                    fontFamily: F.mono, fontSize: 11, textAlign: 'center',
                    marginBottom: 16,
                    color: feedback.startsWith('✅') ? P.green : P.amber,
                  }}>
                    {feedback}
                  </div>
                )}

                {/* Action buttons */}
                <div style={{ display: 'flex', gap: 12 }}>
                  <button
                    onClick={handlePass}
                    disabled={!!cardAnim || sending}
                    style={{
                      flex: 1, background: 'transparent',
                      border: `1px solid ${P.border}`,
                      borderRadius: 8, padding: '14px 0',
                      fontFamily: F.mono, fontSize: 12,
                      color: P.text3,
                      cursor: (cardAnim || sending) ? 'default' : 'pointer',
                      letterSpacing: '.06em', textTransform: 'uppercase',
                    }}
                  >
                    ✗ Passer
                  </button>
                  <button
                    onClick={handleApprove}
                    disabled={!!cardAnim || sending}
                    style={{
                      flex: 2,
                      background: sending ? P.surface : P.cyan,
                      border: sending ? `1px solid ${P.border}` : 'none',
                      borderRadius: 8, padding: '14px 0',
                      fontFamily: F.mono, fontSize: 13, fontWeight: 700,
                      color: sending ? P.text3 : '#000',
                      cursor: (cardAnim || sending) ? 'default' : 'pointer',
                      letterSpacing: '.06em', textTransform: 'uppercase',
                    }}
                  >
                    {sending ? '⏳ Envoi…' :
                     draft?.channel === 'linkedin' ? '📋 Copier + LinkedIn →' :
                     '✓ Approuver →'}
                  </button>
                </div>
              </div>
            )}

          </div>
        </div>
      )}
    </>
  );
}
