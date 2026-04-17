import { chromium } from 'playwright-core';

const VIEWS = ['cockpit', 'apollo', 'sequences', 'linkedin', 'revenue', 'intel', 'settings', 'brief'];
const OUT = 'C:/Users/edith/Desktop/Ghost-Tax/Claude/public/screenshots';

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });

  await page.goto('http://localhost:3000/cockpit-v4.html');

  // Dismiss the command key prompt
  page.once('dialog', async dialog => {
    await dialog.accept('test-key');
  });
  await page.waitForTimeout(2000);

  for (const view of VIEWS) {
    // Click nav or use keyboard
    if (view === 'brief') {
      await page.keyboard.press('b');
    } else if (view === 'settings') {
      await page.keyboard.press(',');
    } else {
      const idx = VIEWS.indexOf(view) + 1;
      if (idx <= 6) await page.keyboard.press(String(idx));
    }
    await page.waitForTimeout(800);
    await page.screenshot({ path: `${OUT}/tab-${view}.png`, fullPage: false });
    console.log(`Screenshot: tab-${view}.png`);
  }

  // Also screenshot cockpit with a prospect selected
  await page.keyboard.press('1'); // back to cockpit
  await page.waitForTimeout(500);
  await page.keyboard.press('j'); // select first prospect
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${OUT}/tab-cockpit-selected.png`, fullPage: false });
  console.log('Screenshot: tab-cockpit-selected.png');

  await browser.close();
  console.log('Done — all screenshots saved');
})();
