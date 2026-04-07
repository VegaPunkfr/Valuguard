'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function CockpitLogin() {
  const [pw, setPw] = useState('');
  const [error, setError] = useState('');
  const router = useRouter();

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    const res = await fetch('/api/command/cockpit-auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key: pw }),
    });
    if (res.ok) {
      localStorage.setItem('gt-command-key', pw);
      router.push('/cockpit-v4.html');
    } else {
      setError('Clé invalide');
    }
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#05060E' }}>
      <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 16, width: 320 }}>
        <h1 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 28, letterSpacing: '0.1em', color: 'rgba(255,255,255,0.9)', textAlign: 'center' }}>
          GHOST TAX · COCKPIT
        </h1>
        <input
          type="password"
          value={pw}
          onChange={e => setPw(e.target.value)}
          placeholder="Clé de commande"
          autoFocus
          style={{ padding: '12px 16px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 6, color: '#fff', fontFamily: "'JetBrains Mono', monospace", fontSize: 13, outline: 'none' }}
        />
        {error && <p style={{ color: '#E5354A', fontSize: 12, fontFamily: "'JetBrains Mono', monospace", textAlign: 'center' }}>{error}</p>}
        <button
          type="submit"
          style={{ padding: '10px 20px', background: '#00CFC4', border: 'none', borderRadius: 6, color: '#05060E', fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, fontSize: 12, letterSpacing: '0.1em', cursor: 'pointer', textTransform: 'uppercase' }}
        >
          Accéder
        </button>
      </form>
    </div>
  );
}
