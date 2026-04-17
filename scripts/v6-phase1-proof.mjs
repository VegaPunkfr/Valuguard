import { chromium } from 'playwright';
import { readFileSync } from 'fs';
const secret = readFileSync('.env.local','utf8').match(/^COMMAND_SECRET=(.+)$/m)?.[1]?.replace(/"/g,'').trim();

(async () => {
  const b = await chromium.launch({ headless: true });
  const p = await b.newPage({ viewport: { width: 1920, height: 1080 } });

  // 1. V6 loads
  console.log('\n=== 1. V6 LOADS ===');
  await p.goto('https://ghost-tax.com/cockpit-v6.html', { waitUntil: 'networkidle', timeout: 30000 });
  const title = await p.title();
  console.log('TITLE:', title);
  await p.fill('#auth-input', secret);
  await p.click('#auth-submit');
  await p.waitForTimeout(4000);
  const tabLabels = await p.evaluate(() => Array.from(document.querySelectorAll('.tb-tab')).map(t => t.textContent.trim()));
  console.log('TABS:', JSON.stringify(tabLabels));
  const deadBtns = await p.evaluate(() => document.querySelectorAll('[class*="cta-pending"]').length);
  console.log('DEAD_BUTTONS:', deadBtns);
  await p.screenshot({ path: 'public/screenshots/v6-01-operations.png', fullPage: false });

  // 2. V5 still accessible
  console.log('\n=== 2. V5 STILL ACCESSIBLE ===');
  const v5res = await p.evaluate(() => fetch('/cockpit-v5.html').then(r => r.status));
  console.log('V5_STATUS:', v5res);

  // 3. DEFER produces event
  console.log('\n=== 3. DEFER TEST ===');
  await p.click('[data-tab="clients"]');
  await p.waitForTimeout(500);
  const row = await p.$('.clients-row');
  if (row) {
    const clientId = await row.evaluate(el => el.dataset.id);
    console.log('CLIENT_ID:', clientId);
    await row.click();
    await p.waitForTimeout(800);
    // Check if DIFFÉRER button exists and click it
    const deferBtn = await p.$('#btn-defer');
    if (deferBtn) {
      await deferBtn.click();
      await p.waitForTimeout(2000);
      // Check outreach_events for this DEFER
      const deferEvent = await p.evaluate(async (cid) => {
        const key = localStorage.getItem('gt-command-key');
        const res = await fetch(`/api/outreach/events?client_id=${cid}&kind=DEFER&limit=1`, {
          headers: { 'x-command-key': key }
        });
        if (!res.ok) return { error: res.status };
        return res.json();
      }, clientId);
      console.log('DEFER_EVENT:', JSON.stringify(deferEvent).slice(0, 300));
    } else {
      console.log('DEFER_BTN: not found');
    }
  }

  // 4. Guard L0 test — check send-approved returns 403 when L0
  console.log('\n=== 4. L0 GUARD ===');
  // First set L0
  const setL0 = await p.evaluate(async () => {
    const key = localStorage.getItem('gt-command-key');
    const res = await fetch('/api/command/sprint', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-command-key': key },
      body: JSON.stringify({ setting: 'autonomy_level', value: 0 })
    });
    return res.status;
  });
  console.log('SET_L0:', setL0);

  // Try send
  const sendL0 = await p.evaluate(async () => {
    const key = localStorage.getItem('gt-command-key');
    const res = await fetch('/api/command/send-approved', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-command-key': key },
      body: JSON.stringify({ to: 'test@test.com', subject: 'test', textBody: 'test' })
    });
    return { status: res.status, body: await res.json() };
  });
  console.log('SEND_AT_L0:', JSON.stringify(sendL0));

  // Restore L2
  await p.evaluate(async () => {
    const key = localStorage.getItem('gt-command-key');
    await fetch('/api/command/sprint', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-command-key': key },
      body: JSON.stringify({ setting: 'autonomy_level', value: 2 })
    });
  });
  console.log('RESTORED_L2');

  // 5. Autonomy guard exists
  console.log('\n=== 5. AUTONOMY GUARD MODULE ===');
  console.log('FILE_EXISTS:', require('fs').existsSync('lib/outreach/autonomy-guard.ts'));

  await b.close();
  console.log('\n=== DONE ===');
})();
