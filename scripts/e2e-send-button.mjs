/**
 * TRUE Playwright browser E2E: send button + modal + DOM assertions
 * Run: npx playwright test scripts/e2e-send-button.mjs
 * Or:  node scripts/e2e-send-button.mjs
 */
import { chromium } from 'playwright';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const envPath = resolve(import.meta.dirname, '..', '.env.local');
const envContent = readFileSync(envPath, 'utf8');
const KEY = envContent.match(/COMMAND_SECRET=(.+)/)?.[1]?.trim();
if (!KEY) { console.error('No COMMAND_SECRET'); process.exit(1); }

const BASE = 'https://ghost-tax.com';
let browser, page, passed = 0, failed = 0;

async function test(name, fn) {
  try { await fn(); passed++; console.log(`  ✓ ${name}`); }
  catch (e) { failed++; console.error(`  ✗ ${name}: ${e.message}`); }
}

console.log('═══════════════════════════════════════');
console.log('PLAYWRIGHT BROWSER E2E — SEND SURFACE');
console.log('═══════════════════════════════════════');

try {
  browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  page = await context.newPage();

  // Step 1: Login
  await test('Navigate to cockpit login', async () => {
    await page.goto(`${BASE}/cockpit`, { waitUntil: 'networkidle', timeout: 30000 });
    const title = await page.title();
    console.log(`    → Page title: ${title}`);
  });

  await test('Enter COMMAND_SECRET and login', async () => {
    await page.fill('input[type="password"]', KEY);
    await page.click('button[type="submit"]');
    await page.waitForURL('**/cockpit-v4.html', { timeout: 15000 });
    console.log(`    → Redirected to cockpit-v4.html`);
  });

  // Step 2: Wait for prospects to load from Recon Ledger
  await test('Prospects loaded from Recon Ledger', async () => {
    // Wait for lead rows to appear (loaded async from API)
    await page.waitForSelector('.lead-row', { timeout: 20000 });
    const count = await page.locator('.lead-row').count();
    console.log(`    → ${count} prospect rows rendered`);
    if (count < 1) throw new Error('No prospect rows found');
  });

  // Step 3: Find ENVOYER button
  await test('ENVOYER button visible on at least one prospect', async () => {
    const sendButtons = page.locator('button:has-text("ENVOYER")');
    const count = await sendButtons.count();
    console.log(`    → ${count} ENVOYER buttons found`);
    if (count < 1) throw new Error('No ENVOYER button found');
  });

  // Step 4: Click ENVOYER button — modal opens
  await test('Click ENVOYER opens send surface modal', async () => {
    const firstSendBtn = page.locator('button:has-text("ENVOYER")').first();
    await firstSendBtn.click();
    // Wait for modal overlay
    await page.waitForSelector('#send-overlay', { timeout: 5000 });
    console.log(`    → #send-overlay modal appeared`);
  });

  // Step 5: Modal contains destinataire, objet, body, findings
  await test('Modal shows destinataire', async () => {
    const modal = page.locator('#send-overlay');
    const text = await modal.textContent();
    // Check for "DESTINATAIRE" label
    if (!text.includes('DESTINATAIRE')) throw new Error('Missing DESTINATAIRE label');
    console.log(`    → DESTINATAIRE label found`);
  });

  await test('Modal shows objet', async () => {
    const modal = page.locator('#send-overlay');
    const text = await modal.textContent();
    if (!text.includes('OBJET')) throw new Error('Missing OBJET label');
    console.log(`    → OBJET label found`);
  });

  await test('Modal shows message body', async () => {
    const modal = page.locator('#send-overlay');
    const text = await modal.textContent();
    if (!text.includes('MESSAGE')) throw new Error('Missing MESSAGE label');
    // Check the pre element has content
    const preContent = await modal.locator('pre').first().textContent();
    if (!preContent || preContent.length < 50) throw new Error('Message body too short or empty');
    console.log(`    → MESSAGE body: ${preContent.substring(0, 60)}...`);
  });

  await test('Modal shows findings', async () => {
    const modal = page.locator('#send-overlay');
    const text = await modal.textContent();
    if (!text.includes('FINDINGS')) throw new Error('Missing FINDINGS label');
    const findingsCount = await modal.locator('div:has-text("→")').count();
    console.log(`    → ${findingsCount} finding lines found`);
  });

  await test('Modal shows exposure range', async () => {
    const modal = page.locator('#send-overlay');
    const text = await modal.textContent();
    if (!text.includes('EXPOSITION')) throw new Error('Missing EXPOSITION label');
    if (!text.includes('€')) throw new Error('Missing EUR symbol in exposure');
    console.log(`    → Exposure range with € found`);
  });

  await test('Modal shows état', async () => {
    const modal = page.locator('#send-overlay');
    const text = await modal.textContent();
    if (!text.includes('ÉTAT')) throw new Error('Missing ÉTAT label');
    console.log(`    → ÉTAT label found`);
  });

  // Step 6: Copier button works
  await test('Copier le message button exists', async () => {
    const copyBtn = page.locator('#send-overlay button:has-text("Copier")');
    const count = await copyBtn.count();
    if (count < 1) throw new Error('No Copier button');
    console.log(`    → Copier button found`);
  });

  // Step 7: Envoyer via Resend button exists
  await test('Envoyer via Resend button exists', async () => {
    const sendBtn = page.locator('#send-overlay button:has-text("Envoyer via Resend")');
    const count = await sendBtn.count();
    if (count < 1) throw new Error('No Envoyer via Resend button');
    console.log(`    → Envoyer via Resend button found`);
  });

  // Step 8: Close modal
  await test('Close modal via Fermer button', async () => {
    const closeBtn = page.locator('#send-overlay button:has-text("Fermer")');
    await closeBtn.click();
    await page.waitForSelector('#send-overlay', { state: 'detached', timeout: 3000 });
    console.log(`    → Modal closed`);
  });

  // Step 9: État visible in lead list
  await test('Status visible in lead list rows', async () => {
    const firstRow = page.locator('.lead-row').first();
    const text = await firstRow.textContent();
    const states = ['discovered', 'first_seen_high_potential', 'reviewed', 'shortlisted', 'contacted', 'replied', 'nurturing', 'deferred', 'qualified'];
    const found = states.some(s => text.toLowerCase().includes(s));
    if (!found) throw new Error(`No status visible in row: ${text.substring(0, 80)}`);
    console.log(`    → Status found in lead row`);
  });

} catch (e) {
  console.error(`FATAL: ${e.message}`);
  failed++;
} finally {
  if (browser) await browser.close();
}

console.log('');
console.log('═══════════════════════════════════════');
console.log(`RESULTS: ${passed} passed, ${failed} failed`);
console.log('═══════════════════════════════════════');
process.exit(failed > 0 ? 1 : 0);
