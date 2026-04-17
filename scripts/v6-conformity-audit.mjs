import { chromium } from 'playwright';
import { readFileSync } from 'fs';
const secret = readFileSync('.env.local','utf8').match(/^COMMAND_SECRET=(.+)$/m)?.[1]?.replace(/"/g,'').trim();
(async () => {
  const b = await chromium.launch({headless:true});
  const p = await b.newPage({viewport:{width:1920,height:1080}});
  await p.goto('https://ghost-tax.com/cockpit-v6.html',{waitUntil:'networkidle',timeout:30000});
  await p.fill('#auth-input', secret);
  await p.click('#auth-submit');
  await p.waitForTimeout(4000);

  console.log('=== A. NAVIGATION ===');
  const tabs = await p.evaluate(() => Array.from(document.querySelectorAll('.tb-tab')).map(t => t.textContent.trim()));
  console.log('TABS:', JSON.stringify(tabs));

  console.log('\n=== B. OPERATIONS VIEW ===');
  const panels = await p.evaluate(() => Array.from(document.querySelectorAll('.view-command .panel-title, .view-command .focal-title')).map(t => t.textContent.trim()));
  console.log('PANELS:', JSON.stringify(panels));
  const focalEmpty = await p.evaluate(() => document.getElementById('view-command')?.classList.contains('focal-empty'));
  console.log('FOCAL_EMPTY:', focalEmpty);
  const engineText = await p.evaluate(() => document.getElementById('engine-body')?.textContent?.replace(/\s+/g,' ').trim().slice(0,400));
  console.log('ENGINE:', engineText);
  await p.screenshot({path:'public/screenshots/v6-audit-01-ops.png',fullPage:false});

  console.log('\n=== C. CLIENTS VIEW ===');
  await p.click('[data-tab="clients"]');
  await p.waitForTimeout(500);
  const clientRows = await p.evaluate(() => document.querySelectorAll('.clients-row').length);
  console.log('ROWS:', clientRows);
  await p.screenshot({path:'public/screenshots/v6-audit-02-clients.png',fullPage:false});

  console.log('\n=== D. CONVERSATIONS VIEW ===');
  await p.click('[data-tab="conversations"]');
  await p.waitForTimeout(3000);
  const convVisible = await p.evaluate(() => ({
    hidden: document.getElementById('view-conversations')?.hidden,
    display: getComputedStyle(document.getElementById('view-conversations')).display,
    w: document.getElementById('view-conversations')?.offsetWidth,
  }));
  console.log('CONV_VIEW:', JSON.stringify(convVisible));
  const convItems = await p.evaluate(() => document.querySelectorAll('.conv-item').length);
  console.log('CONV_ITEMS:', convItems);
  const convListText = await p.evaluate(() => document.getElementById('conv-list-body')?.textContent?.replace(/\s+/g,' ').trim().slice(0,300));
  console.log('CONV_LIST_TEXT:', convListText);
  await p.screenshot({path:'public/screenshots/v6-audit-03-conv.png',fullPage:false});

  // Click first conversation if exists
  if (convItems > 0) {
    const first = await p.$('.conv-item');
    await first.click();
    await p.waitForTimeout(1000);
    const threadMsgs = await p.evaluate(() => document.querySelectorAll('.conv-msg').length);
    const threadDirs = await p.evaluate(() => Array.from(document.querySelectorAll('.conv-msg-dir')).map(d => d.textContent.trim()).slice(0,5));
    const honestyVisible = await p.evaluate(() => document.getElementById('conv-thread-body')?.textContent?.includes('Resend'));
    console.log('THREAD_MSGS:', threadMsgs);
    console.log('DIRECTIONS:', JSON.stringify(threadDirs));
    console.log('HONESTY_RESEND:', honestyVisible);
    await p.screenshot({path:'public/screenshots/v6-audit-04-thread.png',fullPage:false});
  }

  console.log('\n=== E. DRAWER + EXEC CTAs ===');
  await p.click('[data-tab="clients"]');
  await p.waitForTimeout(500);
  const row = await p.$('.clients-row');
  if (row) {
    await row.click();
    await p.waitForTimeout(1000);
    const drawerBtns = await p.evaluate(() => {
      const exec = document.getElementById('drw-exec-actions');
      const btns = exec ? Array.from(exec.querySelectorAll('button')).map(b => ({text:b.textContent.trim(), exec:b.dataset.exec})) : [];
      const differ = !!document.getElementById('btn-defer');
      const reject = !!document.getElementById('btn-reject');
      return {exec_btns: btns, differ, reject};
    });
    console.log('DRAWER_BTNS:', JSON.stringify(drawerBtns));
    const arbText = await p.evaluate(() => document.getElementById('drw-arbitrage')?.textContent?.replace(/\s+/g,' ').trim().slice(0,300));
    console.log('ARBITRAGE:', arbText);
    await p.screenshot({path:'public/screenshots/v6-audit-05-drawer.png',fullPage:false});
  }

  console.log('\n=== F. AUTONOMY ===');
  await p.keyboard.press('Escape');
  await p.waitForTimeout(300);
  await p.click('[data-tab="command"]');
  await p.waitForTimeout(500);
  const autoSelect = await p.evaluate(() => {
    const sel = document.getElementById('autonomy-select');
    return sel ? {value: sel.value, options: Array.from(sel.options).map(o => o.text)} : null;
  });
  console.log('AUTONOMY_SELECT:', JSON.stringify(autoSelect));
  const autoIndicator = await p.evaluate(() => {
    const body = document.getElementById('engine-body');
    const text = body?.textContent || '';
    return {
      lecture_seule: text.includes('LECTURE SEULE'),
      envoi_manuel: text.includes('ENVOI MANUEL'),
      envoi_auto: text.includes('ENVOI AUTOMATIQUE'),
    };
  });
  console.log('AUTONOMY_INDICATORS:', JSON.stringify(autoIndicator));

  console.log('\n=== G. SOURCES ===');
  await p.click('[data-tab="sources"]');
  await p.waitForTimeout(500);
  await p.screenshot({path:'public/screenshots/v6-audit-06-sources.png',fullPage:false});

  await b.close();
  console.log('\n=== AUDIT DONE ===');
})();
