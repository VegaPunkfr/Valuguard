/**
 * PHASE 0B — Runtime visual proof for cockpit-v5
 * Usage: node scripts/phase0b-proof.mjs
 * Requires: COMMAND_SECRET in .env.local, Playwright chromium installed
 */
import { chromium } from 'playwright';
import { readFileSync } from 'fs';

const envRaw = readFileSync('.env.local', 'utf8');
const secret = envRaw.match(/^COMMAND_SECRET=(.+)$/m)?.[1]?.replace(/"/g, '').trim();
if (!secret) { console.error('COMMAND_SECRET not found in .env.local'); process.exit(1); }

const URL = 'https://ghost-tax.com/cockpit-v5.html';
const SCREENSHOTS_DIR = 'public/screenshots';

async function measure(page, selector, label) {
  const result = await page.evaluate((sel) => {
    const el = document.querySelector(sel);
    if (!el) return { exists: false };
    const cs = getComputedStyle(el);
    const rect = el.getBoundingClientRect();
    return {
      exists: true,
      hidden: el.hidden,
      display: cs.display,
      visibility: cs.visibility,
      width: rect.width,
      height: rect.height,
      top: rect.top,
      left: rect.left,
      offsetWidth: el.offsetWidth,
      offsetHeight: el.offsetHeight,
    };
  }, selector);
  console.log(`[${label}] ${selector}:`, JSON.stringify(result));
  return result;
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });

  console.log('\n══════ 1. NAVIGATE + AUTH ══════');
  await page.goto(URL, { waitUntil: 'networkidle', timeout: 30000 });
  await page.fill('#auth-input', secret);
  await page.click('#auth-submit');
  await page.waitForTimeout(3000); // wait for fetchSprint + render

  console.log('\n══════ 2. DEFAULT VIEW = COMMANDE ══════');
  await measure(page, '#view-command', 'COMMANDE visible');
  await measure(page, '#view-clients', 'CLIENTS hidden');
  await measure(page, '#view-sources', 'SOURCES hidden');
  await measure(page, '#command-focal-slot', 'FOCAL SLOT C.02');
  await measure(page, '#command-east-strata', 'EAST STRATA');
  await measure(page, '#queue-body', 'QUEUE BODY');
  await measure(page, '#journal-body', 'JOURNAL BODY');
  await page.screenshot({ path: `${SCREENSHOTS_DIR}/phase0b-01-commande.png`, fullPage: false });
  console.log('  → screenshot: phase0b-01-commande.png');

  console.log('\n══════ 3. SWITCH TO CLIENTS (click K.) ══════');
  await page.click('[data-tab="clients"]');
  await page.waitForTimeout(500);
  await measure(page, '#view-command', 'COMMANDE after switch');
  await measure(page, '#view-clients', 'CLIENTS after switch');
  await measure(page, '#clients-body', 'CLIENTS BODY');

  // Count visible client rows
  const clientRowCount = await page.evaluate(() => document.querySelectorAll('.clients-row').length);
  console.log(`  → client rows rendered: ${clientRowCount}`);
  await page.screenshot({ path: `${SCREENSHOTS_DIR}/phase0b-02-clients.png`, fullPage: false });
  console.log('  → screenshot: phase0b-02-clients.png');

  console.log('\n══════ 4. SWITCH TO SOURCES (click S.) ══════');
  await page.click('[data-tab="sources"]');
  await page.waitForTimeout(500);
  await measure(page, '#view-command', 'COMMANDE after sources');
  await measure(page, '#view-clients', 'CLIENTS after sources');
  await measure(page, '#view-sources', 'SOURCES after sources');
  await page.screenshot({ path: `${SCREENSHOTS_DIR}/phase0b-03-sources.png`, fullPage: false });
  console.log('  → screenshot: phase0b-03-sources.png');

  console.log('\n══════ 5. SWITCH BACK TO COMMANDE ══════');
  await page.click('[data-tab="command"]');
  await page.waitForTimeout(500);
  await measure(page, '#view-command', 'COMMANDE restored');
  await measure(page, '#view-clients', 'CLIENTS after restore');
  await measure(page, '#command-focal-slot', 'FOCAL SLOT restored');
  await page.screenshot({ path: `${SCREENSHOTS_DIR}/phase0b-04-commande-restored.png`, fullPage: false });
  console.log('  → screenshot: phase0b-04-commande-restored.png');

  console.log('\n══════ 6. DRAWER TEST ══════');
  // Switch to clients, click first row
  await page.click('[data-tab="clients"]');
  await page.waitForTimeout(500);
  const firstRow = await page.$('.clients-row');
  if (firstRow) {
    await firstRow.click();
    await page.waitForTimeout(800);
    await measure(page, '#drawer-backdrop', 'DRAWER BACKDROP');
    await measure(page, '.drawer', 'DRAWER');
    const drawerTitle = await page.evaluate(() => document.querySelector('.drw-company')?.textContent || '(empty)');
    console.log(`  → drawer company: ${drawerTitle}`);
    await page.screenshot({ path: `${SCREENSHOTS_DIR}/phase0b-05-drawer.png`, fullPage: false });
    console.log('  → screenshot: phase0b-05-drawer.png');
  } else {
    console.log('  → NO client rows found — drawer test SKIPPED');
  }

  console.log('\n══════ 7. MANDATE BAR ══════');
  await page.click('[data-tab="command"]');
  await page.waitForTimeout(300);
  await measure(page, '#mandate-bar', 'MANDATE BAR');
  await measure(page, '#mb-doctrine-stamp', 'DOCTRINE STAMP');
  const stampText = await page.evaluate(() => document.getElementById('mb-doctrine-stamp')?.textContent || '(empty)');
  console.log(`  → stamp text: "${stampText}"`);
  const subText = await page.evaluate(() => document.getElementById('mb-doctrine-sub')?.textContent || '(empty)');
  console.log(`  → sub text: "${subText}"`);

  console.log('\n══════ DONE ══════');
  await browser.close();
})();
