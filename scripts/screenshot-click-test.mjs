import { chromium } from 'playwright';

const OUT = 'C:/Users/edith/Desktop/Ghost-Tax/Claude/public/screenshots';

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });

  page.once('dialog', async dialog => {
    await dialog.accept('test-key');
  });

  await page.goto('http://localhost:3000/cockpit-v4.html');
  await page.waitForTimeout(2000);

  // Click first prospect
  const firstLead = await page.$('.lead-row');
  if (firstLead) {
    await firstLead.click();
    await page.waitForTimeout(500);
    await page.screenshot({ path: `${OUT}/click-1st.png` });
    console.log('Clicked 1st prospect');
  }

  // Now try to click second prospect
  const leads = await page.$$('.lead-row');
  if (leads.length > 1) {
    await leads[1].click();
    await page.waitForTimeout(500);
    await page.screenshot({ path: `${OUT}/click-2nd.png` });
    console.log('Clicked 2nd prospect');
  } else {
    console.log('Only', leads.length, 'lead rows found after first click');
    // Check if lead-list still exists
    const listHTML = await page.$eval('#lead-list', el => el.innerHTML.substring(0, 200));
    console.log('lead-list content:', listHTML);
  }

  // Check for JS errors
  page.on('pageerror', err => console.log('PAGE ERROR:', err.message));

  // Try clicking via keyboard
  await page.keyboard.press('j');
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${OUT}/click-keyboard-j.png` });
  console.log('Pressed j for next prospect');

  await browser.close();
})();
