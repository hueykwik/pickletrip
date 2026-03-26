// Stealth validation: can we bypass Cloudflare on PlayByPoint?
// Run: node validate-stealth.mjs
import { chromium } from 'playwright-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';

chromium.use(StealthPlugin());

const TARGETS = [
  {
    name: 'PlayByPoint (West Hollywood Park)',
    url: 'https://app.playbypoint.com/f/west-hollywood-park-tennis-cuurts',
    blockedText: 'Performing security verification',
  },
  {
    name: 'CourtReserve (public pickleball booking)',
    url: 'https://app.courtreserve.com/Online/Reservations/Bookings/2457?sId=915',
    blockedText: 'you have been blocked',
  },
];

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
});

for (const target of TARGETS) {
  const page = await context.newPage();
  try {
    const response = await page.goto(target.url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    const title = await page.title();
    const bodyText = await page.evaluate(() => document.body?.innerText?.slice(0, 200) ?? '');
    const blocked = bodyText.toLowerCase().includes(target.blockedText.toLowerCase());

    console.log(`\n[${target.name}]`);
    console.log(`  HTTP: ${response?.status()}`);
    console.log(`  Title: ${title}`);
    console.log(`  Cloudflare blocked: ${blocked ? '❌ YES — stealth failed' : '✅ NO — stealth works!'}`);
    if (blocked) console.log(`  Body snippet: ${bodyText.slice(0, 100)}`);
  } catch (err) {
    console.log(`\n[${target.name}] ERROR: ${err.message}`);
  }
  await page.close();
}

await browser.close();
