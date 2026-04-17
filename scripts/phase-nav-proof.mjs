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

  // A. Nav labels
  const tabs = await p.evaluate(() => Array.from(document.querySelectorAll('.tb-tab')).map(t => t.textContent.trim()));
  console.log('TAB_LABELS:', JSON.stringify(tabs));

  // B. Logo link
  const logoHref = await p.evaluate(() => document.querySelector('a.tb-brand')?.href || '(no link)');
  console.log('LOGO_HREF:', logoHref);

  // C. Autonomy select
  const selExists = await p.evaluate(() => !!document.getElementById('autonomy-select'));
  const selValue = await p.evaluate(() => document.getElementById('autonomy-select')?.value || '(none)');
  const selOptions = await p.evaluate(() => Array.from(document.getElementById('autonomy-select')?.options || []).map(o => `${o.value}:${o.text}`));
  console.log('AUTONOMY_SELECT_EXISTS:', selExists);
  console.log('AUTONOMY_SELECT_VALUE:', selValue);
  console.log('AUTONOMY_OPTIONS:', JSON.stringify(selOptions));

  // D. Doctrine label
  const docLabel = await p.evaluate(() => {
    const dds = document.querySelectorAll('#engine-body .engine-dim');
    return Array.from(dds).map(d => d.textContent.trim()).filter(t => t.includes('IMPOSÉ') || t.includes('IMPOS'));
  });
  console.log('DOCTRINE_LABELS:', JSON.stringify(docLabel));

  // Engine state text
  const engineText = await p.evaluate(() => document.getElementById('engine-body')?.textContent?.slice(0,800) || '');
  console.log('ENGINE:', engineText.replace(/\s+/g,' ').trim().slice(0,600));

  await p.screenshot({path:'public/screenshots/nav-01-full.png', fullPage:false});

  // Open drawer to check arbitrage
  await p.click('[data-tab="clients"]');
  await p.waitForTimeout(500);
  await p.screenshot({path:'public/screenshots/nav-02-clients.png', fullPage:false});

  await b.close();
})();
