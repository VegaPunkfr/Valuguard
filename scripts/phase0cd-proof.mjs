import { chromium } from 'playwright';
import { readFileSync } from 'fs';
const secret = readFileSync('.env.local','utf8').match(/^COMMAND_SECRET=(.+)$/m)?.[1]?.replace(/"/g,'').trim();
(async () => {
  const b = await chromium.launch({headless:true});
  const p = await b.newPage({viewport:{width:1920,height:1080}});
  await p.goto('https://ghost-tax.com/cockpit-v5.html',{waitUntil:'networkidle',timeout:30000});
  await p.fill('#auth-input', secret);
  await p.click('#auth-submit');
  await p.waitForTimeout(3000);

  await p.screenshot({path:'public/screenshots/phase0cd-01-commande.png',fullPage:false});

  const btns = await p.evaluate(() => {
    const ids = ['btn-send-now','btn-review','btn-regen','btn-change-angle','btn-edit-draft','btn-add-note','btn-pause','btn-revoke','btn-settings','btn-palette','btn-defer','btn-reject','auth-submit','imp-submit','freshness-badge'];
    return ids.map(id => {
      const el = document.getElementById(id);
      if (!el) return {id, exists:false};
      const cs = getComputedStyle(el);
      return {id, exists:true, display:cs.display, w:el.offsetWidth, h:el.offsetHeight, visible:cs.display!=='none'&&el.offsetWidth>0};
    });
  });
  console.log('BUTTONS:', JSON.stringify(btns, null, 2));

  const mbH = await p.evaluate(() => document.getElementById('mandate-bar')?.getBoundingClientRect().height || 0);
  console.log('MANDATE_BAR_HEIGHT:', mbH);
  const focalH = await p.evaluate(() => document.getElementById('command-focal-slot')?.getBoundingClientRect().height || 0);
  console.log('FOCAL_SLOT_HEIGHT:', focalH);

  await p.click('[data-tab="clients"]');
  await p.waitForTimeout(500);
  await p.screenshot({path:'public/screenshots/phase0cd-02-clients.png',fullPage:false});

  const row = await p.$('.clients-row');
  if (row) {
    await row.click();
    await p.waitForTimeout(800);
    await p.screenshot({path:'public/screenshots/phase0cd-03-drawer.png',fullPage:false});
    const drwBtns = await p.evaluate(() => {
      const ids = ['btn-send-now','btn-review','btn-defer','btn-reject','btn-regen','btn-change-angle','btn-edit-draft','btn-add-note'];
      return ids.map(id => {
        const el = document.getElementById(id);
        if (!el) return {id, exists:false};
        const cs = getComputedStyle(el);
        return {id, display:cs.display, visible:cs.display!=='none'&&el.offsetWidth>0};
      });
    });
    console.log('DRAWER_BUTTONS:', JSON.stringify(drwBtns));
  }
  await b.close();
})();
