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

  // Cas B : queue vide (état courant = 16 SENT, 0 READY/SCHEDULED)
  const hasClass = await p.evaluate(() => document.getElementById('view-command')?.classList.contains('focal-empty'));
  console.log('focal-empty class present:', hasClass);

  const focalDisplay = await p.evaluate(() => getComputedStyle(document.getElementById('command-focal-slot')).display);
  console.log('focal-slot display:', focalDisplay);

  const eastW = await p.evaluate(() => document.getElementById('command-east-strata')?.getBoundingClientRect().width || 0);
  console.log('east-strata width:', eastW);

  const briefH = await p.evaluate(() => document.getElementById('brief-body')?.getBoundingClientRect().height || 0);
  console.log('brief-body height:', briefH);

  const excH = await p.evaluate(() => document.getElementById('exceptions-body')?.getBoundingClientRect().height || 0);
  console.log('exceptions-body height:', excH);

  const journalH = await p.evaluate(() => document.getElementById('journal-body')?.getBoundingClientRect().height || 0);
  console.log('journal-body height:', journalH);

  await p.screenshot({path:'public/screenshots/phase0e-focal-empty.png', fullPage:false});
  console.log('screenshot: phase0e-focal-empty.png');

  await b.close();
})();
