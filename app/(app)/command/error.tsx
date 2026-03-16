'use client';

export default function CommandError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div style={{ fontFamily: 'var(--vg-font-mono, monospace)', color: '#f87171', padding: 40, minHeight: '50vh' }}>
      <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>Command Center Error</div>
      <pre style={{ fontSize: 11, color: '#f87171', background: '#0a0d19', padding: 16, borderRadius: 8, whiteSpace: 'pre-wrap', border: '1px solid rgba(248,113,113,0.15)', marginBottom: 16 }}>
        {error.message}
        {error.stack && '\n\n' + error.stack.split('\n').slice(0, 5).join('\n')}
      </pre>
      <div style={{ display: 'flex', gap: 8 }}>
        <button onClick={reset} style={{ fontFamily: 'var(--vg-font-mono, monospace)', fontSize: 10, padding: '8px 16px', background: 'rgba(96,165,250,0.1)', color: '#60a5fa', border: '1px solid rgba(96,165,250,0.2)', borderRadius: 6, cursor: 'pointer' }}>RETRY</button>
        <button onClick={() => { try { localStorage.removeItem('gt-command-v3'); localStorage.removeItem('gt-command-v2'); localStorage.removeItem('gt-command-accounts'); } catch {} reset(); }} style={{ fontFamily: 'var(--vg-font-mono, monospace)', fontSize: 10, padding: '8px 16px', background: 'rgba(248,113,113,0.1)', color: '#f87171', border: '1px solid rgba(248,113,113,0.2)', borderRadius: 6, cursor: 'pointer' }}>CLEAR CACHE & RETRY</button>
      </div>
    </div>
  );
}
