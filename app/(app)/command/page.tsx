'use client';

/**
 * GHOST TAX — MISSION CONTROL V10
 * Auto-pipeline: Apollo search → enrich → AI messages → cockpit.
 * Jean-Étienne ouvre le cockpit, il se remplit tout seul.
 */

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  buildCockpitState,
  runAutoPipeline,
  sendApprovedEmail,
  handleLinkedInApproval,
  setupKeyboardShortcuts,
  updateTabTitle,
  pushActivity,
  generateMissingMessages,
  fmtEur,
  fmtDuration,
  type CockpitState,
  type ApprovalItem,
} from '@/lib/command/cockpit-engine';
import { loadAccounts } from '@/lib/command/store';

// ── Tokens ───────────────────────────────────────────────
const P = {
  bg:      '#060912',
  surface: '#0C1019',
  border:  'rgba(255,255,255,0.06)',
  text1:   '#F1F5F9',
  text2:   '#94A3B8',
  text3:   '#475569',
  text4:   '#2D3A4E',
  cyan:    '#22D3EE',
  green:   '#34D399',
  amber:   '#FBBF24',
  red:     '#F87171',
} as const;
const FM = "var(--vg-font-mono,'JetBrains Mono',monospace)";
const FS = "var(--vg-font-sans,'Inter',system-ui,sans-serif)";
const lbl: React.CSSProperties = {
  fontFamily: FM, fontSize: 9, fontWeight: 700,
  letterSpacing: '.14em', color: P.text3,
  textTransform: 'uppercase' as const,
};

// ── Status dot ────────────────────────────────────────────
function StatusDot({ status }: { status: string }) {
  const color =
    status === 'outreach_ready' || status === 'qualified' ? P.green :
    status === 'contacted' ? '#3B82F6' :
    status === 'replied' ? P.amber :
    status === 'new' ? P.text3 : P.text4;
  return <span style={{ display: 'inline-block', width: 6, height: 6, borderRadius: '50%', background: color, flexShrink: 0 }} />;
}

// ── Country flag ──────────────────────────────────────────
function Flag({ country }: { country: string }) {
  const flags: Record<string, string> = {
    DE: '\u{1F1E9}\u{1F1EA}', NL: '\u{1F1F3}\u{1F1F1}', UK: '\u{1F1EC}\u{1F1E7}',
    US: '\u{1F1FA}\u{1F1F8}', FR: '\u{1F1EB}\u{1F1F7}', CH: '\u{1F1E8}\u{1F1ED}',
    AT: '\u{1F1E6}\u{1F1F9}', BE: '\u{1F1E7}\u{1F1EA}',
  };
  return <span style={{ fontSize: 12 }}>{flags[country] || country}</span>;
}

// ── Spinner ───────────────────────────────────────────────
function Spinner({ size = 14 }: { size?: number }) {
  return (
    <span style={{
      display: 'inline-block', width: size, height: size,
      border: `2px solid ${P.text4}`, borderTopColor: P.cyan,
      borderRadius: '50%', animation: 'spin 0.8s linear infinite',
    }} />
  );
}

// ── Loading Screen ────────────────────────────────────────
function LoadingScreen({ message, detail }: { message: string; detail?: string }) {
  return (
    <div style={{
      background: P.bg, minHeight: '100%', fontFamily: FS,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <div style={{ textAlign: 'center', maxWidth: 480, padding: 32 }}>
        <div style={{ marginBottom: 24 }}>
          <Spinner size={32} />
        </div>

        <div style={{
          fontFamily: FM, fontSize: 14, fontWeight: 700, color: P.cyan,
          marginBottom: 12, letterSpacing: '.04em',
        }}>
          {message}
        </div>

        {detail && (
          <div style={{
            fontFamily: FM, fontSize: 11, color: P.text3,
            lineHeight: 1.8, maxWidth: 360, margin: '0 auto',
          }}>
            {detail}
          </div>
        )}

        <div style={{
          marginTop: 24, height: 3, background: P.text4,
          borderRadius: 2, overflow: 'hidden', maxWidth: 280,
          margin: '24px auto 0',
        }}>
          <div style={{
            height: '100%', background: P.cyan, borderRadius: 2,
            animation: 'loading-bar 3s ease-in-out infinite',
          }} />
        </div>

        <div style={{
          fontFamily: FM, fontSize: 10, color: P.text4,
          marginTop: 16, letterSpacing: '.06em',
        }}>
          Temps estim{'\u00e9'} : ~45 secondes
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════
// ── MAIN PAGE ─────────────────────────────────────────────
// ══════════════════════════════════════════════════════════

export default function MissionControlV10() {
  const [state, setState] = useState<CockpitState | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMessage, setLoadingMessage] = useState('Chargement du cockpit...');
  const [loadingDetail, setLoadingDetail] = useState<string | undefined>();
  const [refreshing, setRefreshing] = useState(false);
  const [approvalMode, setApprovalMode] = useState(false);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [sessionStart, setSessionStart] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [approved, setApproved] = useState(0);
  const [skipped, setSkipped] = useState(0);
  const [lastAction, setLastAction] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // ── Boot: load state + auto-pipeline if empty ──
  useEffect(() => {
    async function boot() {
      setLoading(true);

      // 1. Charger l'état existant
      setLoadingMessage('Chargement du cockpit...');
      let cockpitState = buildCockpitState();

      // 2. Si la queue est vide → lancer le pipeline automatique
      if (cockpitState.approvalQueue.length === 0) {
        setLoadingMessage('\ud83d\udd0d Recherche de prospects sur Apollo...');
        setLoadingDetail('Le syst\u00e8me cherche des CFOs et CIOs,\nscanne leurs entreprises, et g\u00e9n\u00e8re\ndes messages personnalis\u00e9s.');

        const { added, withMessages } = await runAutoPipeline();

        if (added > 0) {
          setLoadingMessage(`\u2705 ${added} prospect${added > 1 ? 's' : ''} trouv\u00e9${added > 1 ? 's' : ''}`);
          setLoadingDetail(undefined);

          // 3. Si des prospects n'ont pas de messages → les générer
          if (withMessages < added) {
            setLoadingMessage('\ud83e\udd16 G\u00e9n\u00e9ration des messages IA...');
            setLoadingDetail(`${added - withMessages} message${(added - withMessages) > 1 ? 's' : ''} \u00e0 g\u00e9n\u00e9rer...`);
            const accounts = loadAccounts();
            const generated = await generateMissingMessages(accounts);
            if (generated > 0) {
              setLoadingMessage(`\u2705 ${added} prospects, ${withMessages + generated} messages \u2014 pr\u00eats \u00e0 valider`);
            }
          } else {
            setLoadingMessage(`\u2705 ${added} prospects avec messages \u2014 pr\u00eats \u00e0 valider`);
          }

          // Small delay so user sees the success message
          await new Promise(r => setTimeout(r, 1200));

          // 4. Recharger l'état
          cockpitState = buildCockpitState();
        } else {
          // Pipeline found nothing — still load the cockpit
          setLoadingMessage('Aucun nouveau prospect disponible');
          setLoadingDetail(undefined);
          await new Promise(r => setTimeout(r, 800));
        }
      }

      setState(cockpitState);
      setLoading(false);
    }
    boot();
  }, []);

  // ── Tab title badge ──
  useEffect(() => {
    updateTabTitle(state?.approvalQueue.length || 0);
  }, [state]);

  // ── Timer in approval mode ──
  useEffect(() => {
    if (!approvalMode) return;
    const id = setInterval(() => {
      setElapsed(Math.floor((Date.now() - sessionStart) / 1000));
    }, 1000);
    return () => clearInterval(id);
  }, [approvalMode, sessionStart]);

  // ── Keyboard shortcuts ──
  const handleApprove = useCallback(async () => {
    if (!state) return;
    const item = state.approvalQueue[currentIdx];
    if (!item) return;

    setLastAction('sending...');

    if (item.channel === 'email') {
      const ok = await sendApprovedEmail(item);
      setLastAction(ok
        ? `\u2705 Envoy\u00e9 \u2192 ${item.contactEmail}`
        : '\u274c \u00c9chec envoi'
      );
    } else {
      await handleLinkedInApproval(item);
      setLastAction('\ud83d\udccb Copi\u00e9 ! Collez sur LinkedIn.');
    }

    setApproved(a => a + 1);

    setTimeout(() => {
      setLastAction(null);
      if (currentIdx + 1 < state.approvalQueue.length) {
        setCurrentIdx(i => i + 1);
      }
    }, 1200);
  }, [state, currentIdx]);

  const handleSkip = useCallback(() => {
    if (!state) return;
    const item = state.approvalQueue[currentIdx];
    if (item) {
      pushActivity('\u23ed\ufe0f', `Pass\u00e9 \u2192 ${item.account.company}`);
    }
    setSkipped(s => s + 1);
    if (currentIdx + 1 < state.approvalQueue.length) {
      setCurrentIdx(i => i + 1);
    }
  }, [state, currentIdx]);

  const closeApproval = useCallback(() => {
    if (approved + skipped > 0) {
      pushActivity('\ud83c\udfaf', `Session: ${approved} approuv\u00e9${approved > 1 ? 's' : ''}, ${skipped} pass\u00e9${skipped > 1 ? 's' : ''}, ${fmtDuration(elapsed * 1000)}`);
    }
    setApprovalMode(false);
    setState(buildCockpitState());
  }, [approved, skipped, elapsed]);

  useEffect(() => {
    if (!approvalMode) return;
    return setupKeyboardShortcuts(handleApprove, handleSkip, closeApproval);
  }, [approvalMode, handleApprove, handleSkip, closeApproval]);

  // ── Start approval session ──
  function startApproval() {
    setCurrentIdx(0);
    setApproved(0);
    setSkipped(0);
    setSessionStart(Date.now());
    setElapsed(0);
    setLastAction(null);
    setApprovalMode(true);
  }

  // ── Refresh pipeline ──
  async function handleRefresh() {
    setRefreshing(true);
    const { added, withMessages } = await runAutoPipeline();
    if (added > 0 && withMessages < added) {
      const accounts = loadAccounts();
      await generateMissingMessages(accounts);
    }
    setState(buildCockpitState());
    setRefreshing(false);
    if (added > 0) {
      pushActivity('\ud83d\udd04', `Pipeline refresh: ${added} nouveaux prospects`);
    }
  }

  // ── Copy LinkedIn post ──
  function handleCopyLinkedIn() {
    if (!state?.linkedinPost) return;
    navigator.clipboard.writeText(state.linkedinPost.body);
    setCopied(true);
    pushActivity('\ud83d\udccb', 'Post LinkedIn copi\u00e9');
    setTimeout(() => setCopied(false), 2000);
  }

  // ── LOADING SCREEN ──
  if (loading) {
    return (
      <>
        <style>{`
          @keyframes spin { to { transform: rotate(360deg); } }
          @keyframes loading-bar {
            0% { width: 0%; }
            50% { width: 70%; }
            100% { width: 95%; }
          }
        `}</style>
        <LoadingScreen message={loadingMessage} detail={loadingDetail} />
      </>
    );
  }

  if (!state) return <div style={{ background: P.bg, minHeight: '100%' }} />;

  const { brief, approvalQueue, autoSentCount, followUpsDue, revenueEUR, linkedinPost, activityFeed, pipelineValueEUR } = state;

  // ══════════════════════════════════════════════════════
  // ── APPROVAL OVERLAY ────────────────────────────────
  // ══════════════════════════════════════════════════════
  if (approvalMode) {
    const item = approvalQueue[currentIdx];
    const sessionDone = !item || currentIdx >= approvalQueue.length;
    const progress = approvalQueue.length > 0 ? ((Math.min(currentIdx + 1, approvalQueue.length)) / approvalQueue.length) * 100 : 100;

    // ── Session end screen ──
    if (sessionDone) {
      return (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 400,
          background: P.bg, color: P.text1, fontFamily: FS,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          <div style={{ textAlign: 'center', maxWidth: 440 }}>
            <div style={{ fontFamily: FM, fontSize: 14, color: P.green, letterSpacing: '.1em', marginBottom: 12 }}>
              {'\ud83c\udfaf'} SESSION TERMIN{'\u00c9'}E {'\u00b7'} {fmtDuration(elapsed * 1000)}
            </div>
            <div style={{ display: 'flex', justifyContent: 'center', gap: 32, margin: '24px 0' }}>
              <div>
                <div style={{ fontFamily: FM, fontSize: 28, fontWeight: 800, color: P.cyan }}>{approved}</div>
                <div style={{ ...lbl, marginTop: 4 }}>approuv{'\u00e9'}s</div>
              </div>
              <div>
                <div style={{ fontFamily: FM, fontSize: 28, fontWeight: 800, color: P.text3 }}>{skipped}</div>
                <div style={{ ...lbl, marginTop: 4 }}>pass{'\u00e9'}s</div>
              </div>
              <div>
                <div style={{ fontFamily: FM, fontSize: 28, fontWeight: 800, color: P.green }}>{fmtEur(pipelineValueEUR)}</div>
                <div style={{ ...lbl, marginTop: 4 }}>pipeline</div>
              </div>
            </div>

            {linkedinPost && (
              <div style={{
                background: P.surface, border: `1px solid ${P.border}`,
                borderRadius: 10, padding: '14px 18px', margin: '20px 0', textAlign: 'left',
              }}>
                <div style={{ ...lbl, marginBottom: 6 }}>Post LinkedIn du jour</div>
                <div style={{ fontFamily: FM, fontSize: 11, color: P.text2, lineHeight: 1.6, maxHeight: 60, overflow: 'hidden' }}>
                  {linkedinPost.body.slice(0, 200)}...
                </div>
                <button onClick={handleCopyLinkedIn} style={{
                  fontFamily: FM, fontSize: 10, fontWeight: 700, letterSpacing: '.1em',
                  padding: '5px 14px', borderRadius: 5, marginTop: 8, cursor: 'pointer',
                  border: `1px solid ${P.cyan}20`, background: `${P.cyan}10`,
                  color: copied ? P.green : P.cyan,
                }}>
                  {copied ? 'COPI\u00c9' : 'COPIER'}
                </button>
              </div>
            )}

            <div style={{ fontFamily: FM, fontSize: 11, color: P.text3, margin: '16px 0' }}>
              Prochain briefing : demain 8:25
            </div>

            <button onClick={closeApproval} style={{
              padding: '12px 32px', borderRadius: 8, border: 'none', cursor: 'pointer',
              fontFamily: FM, fontSize: 12, fontWeight: 700, letterSpacing: '.1em',
              background: P.cyan, color: P.bg,
            }}>
              FERMER
            </button>
          </div>
        </div>
      );
    }

    // ── Active approval card ──
    const a = item.account;
    const exposureRange = `${fmtEur(item.exposureLow)}\u2013${fmtEur(item.exposureHigh)} EUR/an`;

    return (
      <div style={{
        position: 'fixed', inset: 0, zIndex: 400,
        background: P.bg, color: P.text1, fontFamily: FS,
        display: 'flex', flexDirection: 'column',
      }}>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        {/* Top bar */}
        <div style={{
          height: 48, padding: '0 24px',
          display: 'flex', alignItems: 'center', gap: 16,
          background: P.surface, borderBottom: `1px solid ${P.border}`,
        }}>
          <button onClick={closeApproval} style={{
            fontFamily: FM, fontSize: 10, color: P.text3, background: 'none',
            border: 'none', cursor: 'pointer', letterSpacing: '.06em',
          }}>
            ESC
          </button>
          <span style={{ fontFamily: FM, fontSize: 11, color: P.text1, fontWeight: 700 }}>
            {currentIdx + 1}/{approvalQueue.length}
          </span>
          <span style={{ fontFamily: FM, fontSize: 10, color: P.text3 }}>
            {fmtDuration(elapsed * 1000)}
          </span>
          <div style={{ flex: 1, height: 2, background: P.text4, borderRadius: 1 }}>
            <div style={{ width: `${progress}%`, height: '100%', background: P.cyan, borderRadius: 1, transition: 'width .3s' }} />
          </div>
          <span style={{ fontFamily: FM, fontSize: 10, color: P.green }}>{approved} {'\u2705'}</span>
          <span style={{ fontFamily: FM, fontSize: 10, color: P.text3 }}>{skipped} {'\u23ed\ufe0f'}</span>
        </div>

        {/* Card */}
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 32 }}>
          <div style={{ width: '100%', maxWidth: 560 }}>

            {/* Contact */}
            <div style={{ marginBottom: 24 }}>
              <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 4 }}>
                {a.financeLead?.name || a.company}
              </div>
              <div style={{ fontFamily: FM, fontSize: 11, color: P.text2 }}>
                {a.financeLead?.title || 'CFO'} {'\u00b7'} {a.company}
              </div>
              <div style={{ fontFamily: FM, fontSize: 11, color: P.text3, marginTop: 2 }}>
                <Flag country={a.country} /> {a.country} {'\u00b7'} {(a as any).headcount || '?'} emp {'\u00b7'} {(a as any).industry || ''}
              </div>
            </div>

            {/* Exposure */}
            <div style={{
              background: P.surface, border: `1px solid ${P.border}`,
              borderRadius: 10, padding: '16px 20px', marginBottom: 20,
            }}>
              <div style={{ fontFamily: FM, fontSize: 28, fontWeight: 800, color: P.cyan, letterSpacing: '-.02em' }}>
                {exposureRange}
              </div>
              <div style={{ fontFamily: FM, fontSize: 14, fontWeight: 700, color: P.red, marginTop: 4 }}>
                ~{item.dailyLoss} EUR/jour perdu
              </div>
              <div style={{ fontFamily: FM, fontSize: 10, color: P.text3, marginTop: 6 }}>
                Score {item.heat} {'\u00b7'} Gate: {item.qualityVerdict} {'\u00b7'} Confiance: {item.confidenceScore}/100
              </div>
            </div>

            {/* Message preview */}
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontFamily: FM, fontSize: 10, color: P.cyan, fontWeight: 700, letterSpacing: '.1em', marginBottom: 8 }}>
                {item.channel === 'email' ? 'EMAIL' : 'LINKEDIN'} {'\u00b7'} {item.message.language.toUpperCase()}
              </div>
              <div style={{
                background: P.surface, border: `1px solid ${P.border}`,
                borderRadius: 8, padding: 16, maxHeight: 240, overflowY: 'auto' as const,
              }}>
                {item.message.subject && (
                  <div style={{ fontFamily: FM, fontSize: 12, color: P.text1, marginBottom: 8, fontWeight: 600 }}>
                    {item.message.subject}
                  </div>
                )}
                <pre style={{
                  fontFamily: FM, fontSize: 12, color: P.text2, lineHeight: 1.7,
                  whiteSpace: 'pre-wrap' as const, margin: 0,
                }}>
                  {item.message.body}
                </pre>
              </div>
            </div>

            {/* Feedback */}
            {lastAction && (
              <div style={{
                fontFamily: FM, fontSize: 12, textAlign: 'center', padding: '8px 0', marginBottom: 8,
                color: lastAction.startsWith('\u2705') ? P.green : lastAction.startsWith('\u274c') ? P.red : P.cyan,
              }}>
                {lastAction}
              </div>
            )}

            {/* Buttons */}
            <div style={{ display: 'flex', gap: 12 }}>
              <button onClick={handleSkip} style={{
                flex: 1, padding: '14px 0', borderRadius: 8,
                fontFamily: FM, fontSize: 12, fontWeight: 700, letterSpacing: '.1em',
                background: 'transparent', color: P.text3,
                border: `1px solid ${P.border}`, cursor: 'pointer',
              }}>
                {'\u2190'} PASSER
              </button>
              <button onClick={handleApprove} style={{
                flex: 2, padding: '14px 0', borderRadius: 8,
                fontFamily: FM, fontSize: 12, fontWeight: 700, letterSpacing: '.1em',
                background: P.cyan, color: P.bg,
                border: 'none', cursor: 'pointer',
              }}>
                APPROUVER {'\u21b5'}
              </button>
            </div>

            <div style={{ fontFamily: FM, fontSize: 9, color: P.text4, textAlign: 'center', marginTop: 10, letterSpacing: '.08em' }}>
              ENTER = approuver {'\u00b7'} {'\u2190'} = passer {'\u00b7'} ESC = fermer
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ══════════════════════════════════════════════════════
  // ── MAIN VIEW ──────────────────────────────────────
  // ══════════════════════════════════════════════════════
  return (
    <div style={{
      background: P.bg, fontFamily: FS, color: P.text1,
      minHeight: '100%', padding: '28px 28px 80px',
      maxWidth: 800, margin: '0 auto',
    }}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes loading-bar {
          0% { width: 0%; }
          50% { width: 70%; }
          100% { width: 95%; }
        }
      `}</style>

      {/* ── HEADER ── */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontFamily: FM, fontSize: 11, color: P.text3, letterSpacing: '.06em' }}>
          {brief.dayOfWeek} {brief.date}
          {brief.sendingWindow.inWindow && (
            <span style={{ color: P.green, marginLeft: 10 }}>
              {brief.markets[0] || 'EU'} {brief.sendingWindow.minutesLeft}min
            </span>
          )}
          {!brief.sendingWindow.inWindow && brief.markets[0] && (
            <span style={{ color: P.text4, marginLeft: 10 }}>
              Hors fen{'\u00ea'}tre {brief.markets[0]}
            </span>
          )}
        </div>
      </div>

      {/* ── ACTION BANNER ── */}
      {approvalQueue.length > 0 ? (
        <div style={{
          background: P.surface, border: `1px solid ${P.border}`,
          borderRadius: 12, padding: '24px 28px', marginBottom: 28,
          textAlign: 'center',
        }}>
          <div style={{ fontFamily: FM, fontSize: 13, color: P.text1, marginBottom: 14 }}>
            {approvalQueue.length} message{approvalQueue.length > 1 ? 's' : ''} {'\u00e0'} valider {'\u00b7'} ~{Math.ceil(approvalQueue.length * 15)}s
          </div>
          <button onClick={startApproval} style={{
            width: '100%', maxWidth: 400, padding: '16px 0',
            borderRadius: 8, border: 'none', cursor: 'pointer',
            fontFamily: FM, fontSize: 13, fontWeight: 800,
            letterSpacing: '.16em', color: P.bg, background: P.cyan,
          }}>
            COMMENCER
          </button>
        </div>
      ) : brief.isWeekend ? (
        <div style={{
          background: P.surface, border: `1px solid ${P.border}`,
          borderRadius: 12, padding: '20px 28px', marginBottom: 28,
          textAlign: 'center',
        }}>
          <div style={{ fontFamily: FM, fontSize: 12, color: P.text3 }}>
            Week-end. Le syst{'\u00e8'}me pr{'\u00e9'}pare lundi.
          </div>
        </div>
      ) : (
        <div style={{
          background: P.surface, border: `1px solid ${P.border}`,
          borderRadius: 12, padding: '20px 28px', marginBottom: 28,
          textAlign: 'center',
        }}>
          <div style={{ fontFamily: FM, fontSize: 12, color: P.green, marginBottom: 12 }}>
            Rien {'\u00e0'} faire. Prochain briefing demain 8:25.
          </div>
        </div>
      )}

      {/* ── METRICS ── */}
      <div style={{
        display: 'flex', gap: 0, marginBottom: 28,
        background: P.surface, border: `1px solid ${P.border}`,
        borderRadius: 10, overflow: 'hidden',
      }}>
        {[
          { n: autoSentCount,        label: 'auto',   color: P.cyan  },
          { n: approvalQueue.length,  label: 'queue',  color: P.amber },
          { n: followUpsDue,         label: 'follow', color: P.red   },
          { n: fmtEur(revenueEUR),   label: 'rev',    color: P.green },
        ].map((m, i) => (
          <div key={m.label} style={{
            flex: 1, padding: '14px 0', textAlign: 'center',
            borderRight: i < 3 ? `1px solid ${P.border}` : 'none',
          }}>
            <div style={{ fontFamily: FM, fontSize: 20, fontWeight: 800, color: m.color }}>{m.n}</div>
            <div style={{ fontFamily: FM, fontSize: 9, color: P.text3, letterSpacing: '.1em', marginTop: 2 }}>{m.label}</div>
          </div>
        ))}
      </div>

      {/* ── PIPELINE ── */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ ...lbl, marginBottom: 10 }}>
          PIPELINE {'\u00b7'} {approvalQueue.length + autoSentCount} comptes
        </div>
        {approvalQueue.map((item) => {
          const a = item.account;
          const hCol = item.heat >= 75 ? P.red : item.heat >= 60 ? P.amber : item.heat >= 40 ? '#3B82F6' : P.text3;
          const chIcon = item.channel === 'email' ? '\u{1F4E7}' : '\u{1F4AC}';
          const stLabel = a.outreach?.some((o: any) => o.status === 'draft')
            ? 'pr\u00eat'
            : a.status === 'contacted' ? 'envoy\u00e9'
            : a.status === 'replied' ? 'r\u00e9pondu'
            : '\u2014';

          return (
            <Link key={a.id} href={`/command/accounts/${a.id}`} style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '9px 0', textDecoration: 'none',
              borderBottom: `1px solid ${P.border}`,
            }}>
              <StatusDot status={a.status} />
              <span style={{ fontSize: 13, fontWeight: 600, color: P.text1, flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }}>
                {a.company}
              </span>
              <span style={{ fontFamily: FM, fontSize: 10, color: P.text2 }}>
                {a.financeLead?.title?.split(' ')[0] || 'CFO'} {a.financeLead?.name?.split(' ')[0]}.{a.financeLead?.name?.split(' ').pop()?.charAt(0)}
              </span>
              <Flag country={a.country} />
              <span style={{ fontFamily: FM, fontSize: 12, fontWeight: 800, color: hCol, width: 28, textAlign: 'right' as const }}>
                {item.heat}
              </span>
              <span style={{ fontSize: 11 }}>{chIcon}</span>
              <span style={{ fontFamily: FM, fontSize: 10, color: P.text3, width: 52 }}>{stLabel}</span>
            </Link>
          );
        })}
      </div>

      {/* ── REFRESH BUTTON ── */}
      <div style={{ textAlign: 'center', marginBottom: 28 }}>
        <button onClick={handleRefresh} disabled={refreshing} style={{
          fontFamily: FM, fontSize: 10, fontWeight: 700, letterSpacing: '.1em',
          padding: '10px 24px', borderRadius: 6, cursor: refreshing ? 'wait' : 'pointer',
          border: `1px solid ${P.cyan}20`, background: `${P.cyan}06`, color: P.cyan,
          opacity: refreshing ? 0.6 : 1,
          display: 'inline-flex', alignItems: 'center', gap: 8,
        }}>
          {refreshing ? <Spinner size={12} /> : null}
          {refreshing ? 'RECHERCHE EN COURS...' : '\ud83d\udd04 CHERCHER DE NOUVEAUX PROSPECTS'}
        </button>
      </div>

      {/* ── LINKEDIN POST ── */}
      {linkedinPost && (
        <div style={{
          background: P.surface, border: `1px solid ${P.border}`,
          borderRadius: 10, padding: '16px 20px', marginBottom: 28,
        }}>
          <div style={{ ...lbl, marginBottom: 8 }}>Post LinkedIn {'\u00b7'} {linkedinPost.pillar}</div>
          <div style={{
            fontFamily: FM, fontSize: 12, color: P.text2, lineHeight: 1.7,
            maxHeight: 80, overflow: 'hidden',
          }}>
            {linkedinPost.body.slice(0, 200)}
          </div>
          <button onClick={handleCopyLinkedIn} style={{
            fontFamily: FM, fontSize: 10, fontWeight: 700, letterSpacing: '.1em',
            padding: '6px 16px', borderRadius: 5, marginTop: 10,
            cursor: 'pointer', border: `1px solid ${P.cyan}20`,
            background: `${P.cyan}10`, color: copied ? P.green : P.cyan,
          }}>
            {copied ? 'COPI\u00c9' : 'COPIER'}
          </button>
        </div>
      )}

      {/* ── ACTIVITY FEED ── */}
      {activityFeed.length > 0 && (
        <div>
          <div style={{ ...lbl, marginBottom: 10 }}>Activit{'\u00e9'}</div>
          {activityFeed.slice(0, 8).map((entry, i) => (
            <div key={i} style={{
              fontFamily: FM, fontSize: 11, color: P.text3,
              padding: '5px 0', borderBottom: i < 7 ? `1px solid ${P.border}` : 'none',
              display: 'flex', gap: 8,
            }}>
              <span style={{ color: P.text4, width: 38, flexShrink: 0 }}>{entry.ts}</span>
              <span>{entry.icon}</span>
              <span style={{ color: P.text2 }}>{entry.text}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
