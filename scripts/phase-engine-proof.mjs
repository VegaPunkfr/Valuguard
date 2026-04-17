import { chromium } from 'playwright';
import { readFileSync } from 'fs';
const secret = readFileSync('.env.local','utf8').match(/^COMMAND_SECRET=(.+)$/m)?.[1]?.replace(/"/g,'').trim();
(async () => {
  const b = await chromium.launch({headless:true});
  const p = await b.newPage({viewport:{width:1920,height:1080}});
  await p.goto('https://ghost-tax.com/cockpit-v5.html',{waitUntil:'networkidle',timeout:30000});
  await p.fill('#auth-input', secret);
  await p.click('#auth-submit');
  await p.waitForTimeout(4000);

  // Engine block
  const engineExists = await p.evaluate(() => !!document.getElementById('engine-body'));
  const engineText = await p.evaluate(() => document.getElementById('engine-body')?.textContent?.slice(0,600) || '');
  console.log('ENGINE_EXISTS:', engineExists);
  console.log('ENGINE_TEXT:', engineText);

  const engineH = await p.evaluate(() => document.getElementById('engine-body')?.getBoundingClientRect().height || 0);
  console.log('ENGINE_HEIGHT:', engineH);

  await p.screenshot({path:'public/screenshots/engine-01-commande.png', fullPage:false});

  // Scroll down to see full engine
  await p.evaluate(() => window.scrollBy(0, 300));
  await p.waitForTimeout(300);
  await p.screenshot({path:'public/screenshots/engine-02-commande-scroll.png', fullPage:false});

  // Open drawer to check arbitrage
  await p.click('[data-tab="clients"]');
  await p.waitForTimeout(500);
  const row = await p.$('.clients-row');
  if (row) {
    await row.click();
    await p.waitForTimeout(800);

    const arbExists = await p.evaluate(() => !!document.getElementById('drw-arbitrage'));
    const arbText = await p.evaluate(() => document.getElementById('drw-arbitrage')?.textContent?.slice(0,400) || '');
    console.log('ARBITRAGE_EXISTS:', arbExists);
    console.log('ARBITRAGE_TEXT:', arbText);

    await p.screenshot({path:'public/screenshots/engine-03-drawer-arbitrage.png', fullPage:false});
  }
  await b.close();
})();
