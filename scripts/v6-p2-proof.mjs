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

  // Check 4 tabs exist
  const tabs = await p.evaluate(() => Array.from(document.querySelectorAll('.tb-tab')).map(t => ({text:t.textContent.trim(), tab:t.dataset.tab})));
  console.log('TABS:', JSON.stringify(tabs));

  // Switch to Conversations
  await p.click('[data-tab="conversations"]');
  await p.waitForTimeout(3000);

  // Check conversations view visible
  const convVisible = await p.evaluate(() => {
    const el = document.getElementById('view-conversations');
    return el ? {hidden: el.hidden, display: getComputedStyle(el).display, w: el.offsetWidth, h: el.offsetHeight} : null;
  });
  console.log('CONV_VIEW:', JSON.stringify(convVisible));

  // Check list items
  const itemCount = await p.evaluate(() => document.querySelectorAll('.conv-item').length);
  console.log('CONV_ITEMS:', itemCount);

  // Check no inbox elements
  const noInbox = await p.evaluate(() => {
    const btns = document.querySelectorAll('#view-conversations button');
    const compose = Array.from(btns).filter(b => /répondre|composer|reply|compose/i.test(b.textContent));
    const unread = document.querySelectorAll('#view-conversations .unread, #view-conversations [data-unread]');
    return {compose_buttons: compose.length, unread_indicators: unread.length};
  });
  console.log('NO_INBOX_CHECK:', JSON.stringify(noInbox));

  await p.screenshot({path:'public/screenshots/v6-p2-conversations.png', fullPage:false});

  // Click first conversation if exists
  const firstItem = await p.$('.conv-item');
  if (firstItem) {
    await firstItem.click();
    await p.waitForTimeout(1000);
    const threadMsgs = await p.evaluate(() => document.querySelectorAll('.conv-msg').length);
    console.log('THREAD_MESSAGES:', threadMsgs);

    // Check direction arrows
    const dirs = await p.evaluate(() => Array.from(document.querySelectorAll('.conv-msg-dir')).slice(0,5).map(d => d.textContent.trim()));
    console.log('DIRECTIONS:', JSON.stringify(dirs));

    // Check honesty wording
    const honesty = await p.evaluate(() => {
      const texts = document.getElementById('conv-thread-body')?.textContent || '';
      return {
        resend_mention: texts.includes('Resend'),
        poller_mention: texts.includes('poller'),
      };
    });
    console.log('HONESTY:', JSON.stringify(honesty));

    await p.screenshot({path:'public/screenshots/v6-p2-thread.png', fullPage:false});
  }

  await b.close();
})();
