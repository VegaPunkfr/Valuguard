/**
 * Phase 4 — Account-specific UI validation for 4 Batch A accounts.
 * Each account: locate row → click ENVOYER → verify modal content matches account → close.
 */
import { chromium } from 'playwright';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const envPath = resolve(import.meta.dirname, '..', '.env.local');
const KEY = readFileSync(envPath, 'utf8').match(/COMMAND_SECRET=(.+)/)?.[1]?.trim();
if (!KEY) { console.error('No COMMAND_SECRET'); process.exit(1); }

const BASE = 'https://ghost-tax.com';
let browser, page, passed = 0, failed = 0;

async function test(name, fn) {
  try { await fn(); passed++; console.log(`  ✓ ${name}`); }
  catch (e) { failed++; console.error(`  ✗ ${name}: ${e.message}`); }
}

const ACCOUNTS = [
  { domain: 'trading212.com', company: 'Trading 212', person: 'Loukas Anastasiou', email: 'loukas.anastasiou@trading212.com' },
  { domain: 'paysend.com', company: 'Paysend', person: 'Wilhelm Rohde', email: 'w.rohde@paysend.com' },
  { domain: 'liberis.com', company: 'Liberis', person: 'Tom Bason', email: 'tom.bason@liberis.com' },
  { domain: 'fundapps.co', company: 'FundApps', person: 'Vivek Syal', email: 'viv@fundapps.co' },
];

console.log('═══════════════════════════════════════════');
console.log('PHASE 4 — ACCOUNT-SPECIFIC UI VALIDATION');
console.log('═══════════════════════════════════════════');

try {
  browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  page = await context.newPage();

  // Login
  await test('Login to cockpit', async () => {
    await page.goto(`${BASE}/cockpit`, { waitUntil: 'networkidle', timeout: 30000 });
    await page.fill('input[type="password"]', KEY);
    await page.click('button[type="submit"]');
    await page.waitForURL('**/cockpit-v4.html', { timeout: 15000 });
  });

  // Wait for prospects
  await test('Prospects loaded', async () => {
    await page.waitForSelector('.lead-row', { timeout: 20000 });
    const count = await page.locator('.lead-row').count();
    console.log(`    → ${count} rows`);
    if (count < 4) throw new Error(`Only ${count} rows`);
  });

  // Per-account validation
  for (const acct of ACCOUNTS) {
    console.log(`\n  ── ${acct.company} (${acct.domain}) ──`);

    // Find the row containing this company name
    await test(`${acct.company}: locate row`, async () => {
      const row = page.locator(`.lead-row:has-text("${acct.company}")`);
      const count = await row.count();
      if (count < 1) throw new Error(`Row not found for ${acct.company}`);
    });

    // Find ENVOYER button within or near this company's row
    await test(`${acct.company}: ENVOYER button visible`, async () => {
      const row = page.locator(`.lead-row:has-text("${acct.company}")`).first();
      const btn = row.locator('button:has-text("ENVOYER")');
      const count = await btn.count();
      if (count < 1) throw new Error(`No ENVOYER button for ${acct.company}`);
    });

    // Click ENVOYER for this account
    await test(`${acct.company}: click ENVOYER opens modal`, async () => {
      const row = page.locator(`.lead-row:has-text("${acct.company}")`).first();
      const btn = row.locator('button:has-text("ENVOYER")').first();
      await btn.click();
      await page.waitForSelector('#send-overlay', { timeout: 5000 });
    });

    // Verify modal content matches THIS account
    await test(`${acct.company}: modal shows correct destinataire`, async () => {
      const modal = page.locator('#send-overlay');
      const text = await modal.textContent();
      if (!text.includes(acct.person)) throw new Error(`Expected ${acct.person} in modal, not found`);
      if (!text.includes(acct.email)) throw new Error(`Expected ${acct.email} in modal, not found`);
      console.log(`    → ${acct.person} / ${acct.email} confirmed`);
    });

    await test(`${acct.company}: modal has non-empty subject`, async () => {
      const modal = page.locator('#send-overlay');
      const text = await modal.textContent();
      if (!text.includes('OBJET')) throw new Error('Missing OBJET');
      // Subject should contain company name or domain
      if (!text.includes(acct.company) && !text.includes(acct.domain)) throw new Error(`Subject doesn't reference ${acct.company}`);
    });

    await test(`${acct.company}: modal has non-empty body`, async () => {
      const pre = page.locator('#send-overlay pre').first();
      const content = await pre.textContent();
      if (!content || content.length < 100) throw new Error(`Body too short: ${content?.length || 0} chars`);
      // Body should reference the person's first name
      const firstName = acct.person.split(' ')[0];
      if (!content.includes(firstName)) throw new Error(`Body doesn't address ${firstName}`);
      console.log(`    → body: ${content.substring(0, 50)}...`);
    });

    await test(`${acct.company}: modal has findings`, async () => {
      const modal = page.locator('#send-overlay');
      const text = await modal.textContent();
      if (!text.includes('FINDINGS')) throw new Error('Missing FINDINGS section');
    });

    // Close modal
    await test(`${acct.company}: close modal`, async () => {
      const closeBtn = page.locator('#send-overlay button:has-text("Fermer")');
      await closeBtn.click();
      await page.waitForSelector('#send-overlay', { state: 'detached', timeout: 3000 });
    });
  }

} catch (e) {
  console.error(`FATAL: ${e.message}`);
  failed++;
} finally {
  if (browser) await browser.close();
}

console.log('');
console.log('═══════════════════════════════════════════');
console.log(`RESULTS: ${passed} passed, ${failed} failed`);
console.log('═══════════════════════════════════════════');
process.exit(failed > 0 ? 1 : 0);
