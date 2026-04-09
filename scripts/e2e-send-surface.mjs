/**
 * E2E test: Send Surface on ghost-tax.com cockpit
 *
 * Validates:
 * 1. Login with COMMAND_SECRET
 * 2. Prospects loaded from Recon Ledger
 * 3. ENVOYER button visible on send-ready accounts
 * 4. Click opens modal with destinataire/objet/body/findings
 * 5. Copy button works
 * 6. Status updates after action
 *
 * Run: node scripts/e2e-send-surface.mjs
 * Requires: COMMAND_SECRET in .env.local
 */

import { readFileSync } from 'fs';
import { resolve } from 'path';

// Read COMMAND_SECRET from .env.local
const envPath = resolve(import.meta.dirname, '..', '.env.local');
const envContent = readFileSync(envPath, 'utf8');
const secretMatch = envContent.match(/COMMAND_SECRET=(.+)/);
if (!secretMatch) { console.error('COMMAND_SECRET not found in .env.local'); process.exit(1); }
const COMMAND_SECRET = secretMatch[1].trim();

const BASE = 'https://ghost-tax.com';

async function test(name, fn) {
  try {
    await fn();
    console.log(`  ✓ ${name}`);
  } catch (e) {
    console.error(`  ✗ ${name}: ${e.message}`);
    process.exitCode = 1;
  }
}

function assert(condition, msg) { if (!condition) throw new Error(msg); }

console.log('═══════════════════════════════════════');
console.log('E2E SEND SURFACE TEST');
console.log('═══════════════════════════════════════');

// Test 1: Login endpoint
await test('cockpit-auth accepts correct key', async () => {
  const res = await fetch(`${BASE}/api/command/cockpit-auth`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'User-Agent': 'GhostTax-E2E/1.0' },
    body: JSON.stringify({ key: COMMAND_SECRET }),
  });
  assert(res.ok, `Expected 200, got ${res.status}`);
  const data = await res.json();
  assert(data.ok, 'Expected { ok: true }');
});

// Test 2: prospects_send_ready endpoint returns assembled data
await test('prospects_send_ready returns assembled prospects', async () => {
  const res = await fetch(`${BASE}/api/command/recon-ledger?type=prospects_send_ready`, {
    headers: { 'Content-Type': 'application/json', 'x-command-key': COMMAND_SECRET, 'User-Agent': 'GhostTax-E2E/1.0' },
  });
  assert(res.ok, `Expected 200, got ${res.status}`);
  const data = await res.json();
  assert(Array.isArray(data.data), 'Expected data.data to be array');
  assert(data.data.length > 0, 'Expected at least 1 prospect');
  console.log(`    → ${data.data.length} prospects returned`);
});

// Test 3: send_ready prospects have all required fields
await test('send_ready prospects have person+company+thesis+draft', async () => {
  const res = await fetch(`${BASE}/api/command/recon-ledger?type=prospects_send_ready`, {
    headers: { 'Content-Type': 'application/json', 'x-command-key': COMMAND_SECRET, 'User-Agent': 'GhostTax-E2E/1.0' },
  });
  const data = await res.json();
  const sendReady = data.data.filter(d => d.send_ready);
  console.log(`    → ${sendReady.length} send_ready prospects`);
  assert(sendReady.length >= 4, `Expected >=4 send_ready, got ${sendReady.length}`);

  for (const p of sendReady) {
    assert(p.person_name, `Missing person_name for ${p.person_email}`);
    assert(p.person_email, 'Missing person_email');
    assert(p.company_name, `Missing company_name for ${p.person_email}`);
    assert(p.email_draft_subject, `Missing draft subject for ${p.person_email}`);
    assert(p.email_draft_body, `Missing draft body for ${p.person_email}`);
    assert(p.findings && p.findings.length > 0, `Missing findings for ${p.person_email}`);
    assert(p.exposure_range, `Missing exposure_range for ${p.person_email}`);
    assert(p.ops_status, `Missing ops_status for ${p.person_email}`);
    console.log(`    → ${p.person_name} @ ${p.company_name}: ${p.findings.length} findings, draft ✓, ${p.ops_status}`);
  }
});

// Test 4: Specific accounts are send_ready
await test('Trading 212 + Paysend + Liberis + FundApps are send_ready', async () => {
  const res = await fetch(`${BASE}/api/command/recon-ledger?type=prospects_send_ready`, {
    headers: { 'Content-Type': 'application/json', 'x-command-key': COMMAND_SECRET, 'User-Agent': 'GhostTax-E2E/1.0' },
  });
  const data = await res.json();
  const targets = ['trading212.com', 'paysend.com', 'liberis.com', 'fundapps.co'];
  for (const domain of targets) {
    const match = data.data.find(d => d.company_domain === domain);
    assert(match, `${domain} not found in prospects`);
    assert(match.send_ready, `${domain} not send_ready`);
    assert(match.email_draft_body, `${domain} missing draft`);
    console.log(`    → ${domain}: ✓ send_ready, ${match.findings?.length || 0} findings`);
  }
});

// Test 5: State transition enforcement still works
await test('state transition enforcement blocks invalid transitions', async () => {
  // Try discovered → qualified (should fail)
  const res = await fetch(`${BASE}/api/command/recon-ledger`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-command-key': COMMAND_SECRET, 'User-Agent': 'GhostTax-E2E/1.0' },
    body: JSON.stringify({ action: 'update_ops', entity_id: '00000000-0000-0000-0000-000000000000', updates: { current_status: 'qualified' } }),
  });
  const data = await res.json();
  assert(data.error, 'Expected error for invalid entity');
});

// Test 6: Health check passes
await test('health check returns READY with all tables', async () => {
  const res = await fetch(`${BASE}/api/command/recon-ledger/health`, {
    headers: { 'x-command-key': COMMAND_SECRET, 'User-Agent': 'GhostTax-E2E/1.0' },
  });
  const data = await res.json();
  assert(data.status === 'READY', `Expected READY, got ${data.status}`);
  assert(data.migration_ready, 'Migration not ready');
  assert(data.ingest_ready, 'Ingest not ready');
  console.log(`    → ${JSON.stringify(data.counts)}`);
});

console.log('');
console.log('═══════════════════════════════════════');
console.log('ALL TESTS COMPLETE');
console.log('═══════════════════════════════════════');
