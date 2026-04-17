import { chromium } from 'playwright';
const OUT = 'C:/Users/edith/Desktop/Ghost-Tax/Claude/public/screenshots';

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  await page.goto('http://localhost:3000/ghost-tax-v5.html');
  await page.waitForTimeout(3000);

  // Hero
  await page.screenshot({ path: `${OUT}/v5-hero.png` });
  console.log('Hero captured');

  // Scroll down through sections
  for (let i = 1; i <= 5; i++) {
    await page.evaluate(() => window.scrollBy(0, window.innerHeight));
    await page.waitForTimeout(800);
    await page.screenshot({ path: `${OUT}/v5-scroll-${i}.png` });
    console.log(`Scroll ${i} captured`);
  }

  await browser.close();
  console.log('Done');
})();
