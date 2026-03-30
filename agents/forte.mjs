/**
 * Forté agent
 * Scrapes pickleball events from Pickles at Forté (Honolulu, HI)
 * via their Wix event list at picklesatforte.com/event-list.
 *
 * Strategy:
 *   1. Navigate to the Wix event-list page (no Cloudflare)
 *   2. Click "Load More" to surface events across the requested date range
 *   3. Extract two link types:
 *      a. Direct CourtReserve publicbookings links (eventId in URL, date in URL)
 *      b. Wix event-detail links (date embedded in slug, follow to get CR link)
 *   4. De-duplicate by eventId and filter to date range
 *   5. Return Game[] without hitting courtreserve.com directly
 */
import { chromium } from 'playwright-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';

chromium.use(StealthPlugin());

const EVENT_LIST_URL = 'https://www.picklesatforte.com/event-list';

/**
 * Parse the date from a CourtReserve publicbookings URL.
 * Looks for ?date=YYYY-MM-DD or &date=YYYY-MM-DD.
 */
function parseDateFromCRUrl(url) {
  const match = url.match(/[?&]date=(\d{4}-\d{2}-\d{2})/);
  if (!match) return null;
  // Use HST offset so midnight is interpreted in Hawaii time, not server local time
  const d = new Date(`${match[1]}T00:00:00-10:00`);
  return isNaN(d.getTime()) ? null : d;
}

/**
 * Parse the date from a Wix event-detail slug.
 * e.g. "forte-skill-lab-intermediate-2026-03-28-09-00" → Date(2026-03-28)
 */
function parseDateFromSlug(slug) {
  const match = slug.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return null;
  const d = new Date(`${match[1]}-${match[2]}-${match[3]}T00:00:00`);
  return isNaN(d.getTime()) ? null : d;
}

/**
 * Parse a start time from a Wix event-detail slug.
 * e.g. "forte-skill-lab-2026-03-28-09-00" → "9:00 AM"
 */
function parseTimeFromSlug(slug) {
  // Find the date, then look for HH-MM anywhere after it (handles slugs with
  // extra words between date and time, e.g. "...-2026-03-28-advanced-09-00")
  const dateMatch = slug.match(/\d{4}-\d{2}-\d{2}/);
  if (!dateMatch) return '';
  const afterDate = slug.slice(dateMatch.index + dateMatch[0].length);
  const match = afterDate.match(/(\d{2})-(\d{2})(?:[^0-9]|$)/);
  if (!match) return '';
  const h = parseInt(match[1], 10);
  const m = match[2];
  const period = h >= 12 ? 'PM' : 'AM';
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${h12}:${m} ${period}`;
}

/**
 * Extract eventId from a CourtReserve publicbookings URL.
 */
function extractEventId(url) {
  const match = url.match(/[?&]eventId=(\d+)/);
  return match ? match[1] : null;
}

/**
 * Parse skill level from an event name.
 */
function parseLevel(name) {
  if (!name) return null;
  const n = name.toLowerCase();
  const duprMatch = name.match(/\(([0-9.]+\s*[-–+][0-9.]*)\)/);
  if (duprMatch) return duprMatch[1];
  const levelParens = name.match(/\(([0-9.]+\+?)\)/);
  if (levelParens) return levelParens[1];
  if (/beginner/i.test(n)) return 'Beginner';
  if (/advanced/i.test(n)) return 'Advanced';
  if (/intermediate/i.test(n)) return 'Intermediate';
  return null;
}

/**
 * Format a Date into a human-readable string like "Thu, Mar 28".
 */
function formatDate(d) {
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

/**
 * Main export: scrape Pickles at Forté for events in the date range.
 *
 * @param {import('../lib/cities.js').ForteFacility[]} facilities
 * @param {Date} dateFrom
 * @param {Date} dateTo
 * @returns {Promise<import('../lib/types.js').Game[]>}
 */
export async function scrapeForte(facilities, dateFrom, dateTo) {
  if (!facilities || facilities.length === 0) return [];

  const forteFacilities = facilities.filter(f => f.source === 'forte');
  if (forteFacilities.length === 0) return [];

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  });

  const games = [];
  try {
    const page = await context.newPage();

    for (const facility of forteFacilities) {
      console.error(`[forte] Scanning ${facility.name} (${EVENT_LIST_URL})`);

      await page.goto(EVENT_LIST_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await page.waitForTimeout(2000);

      // Click "Load More" up to 5 times to surface events in the requested date range.
      // The Wix event list paginates and only shows ~6 events initially.
      for (let i = 0; i < 5; i++) {
        try {
          const loadMore = await page.$(
            'button:has-text("Load More"), [data-hook="load-more-button"], button[aria-label*="more"]'
          );
          if (!loadMore) break;
          await loadMore.click();
          await page.waitForTimeout(1500);
        } catch {
          break;
        }
      }

      // Collect all anchor elements on the page
      const links = await page.evaluate(() => {
        const anchors = Array.from(document.querySelectorAll('a[href]'));
        return anchors.map(a => ({
          href: a.href || '',
          text: a.innerText?.trim() ?? '',
        }));
      });

      console.error(`[forte] Found ${links.length} total links`);

      // Bucket A: direct CourtReserve publicbookings links with eventId + date
      const directCRLinks = links.filter(l =>
        l.href.includes('publicbookings/13816') && l.href.includes('eventId=')
      );

      // Bucket B: Wix event-detail links (have date in slug)
      const wixDetailLinks = links.filter(
        (l, idx, arr) =>
          l.href.includes('picklesatforte.com/event-details/') &&
          // deduplicate by href
          arr.findIndex(x => x.href === l.href) === idx
      );

      console.error(
        `[forte] ${directCRLinks.length} direct CR links, ${wixDetailLinks.length} Wix detail links`
      );

      const seenEventIds = new Set();

      // --- Process Bucket A ---
      for (const link of directCRLinks) {
        const eventId = extractEventId(link.href);
        if (!eventId || seenEventIds.has(eventId)) continue;

        const d = parseDateFromCRUrl(link.href);
        if (!d || d < dateFrom || d > dateTo) continue;

        seenEventIds.add(eventId);
        const name = link.text || 'Event at Pickles at Forté';

        games.push({
          id: `forte-${eventId}-${d.getTime()}`,
          source: 'forte',
          venue: facility.name,
          programName: name,
          date: formatDate(d),
          time: '',
          status: 'open',
          level: parseLevel(name),
          url: link.href,
          price: null,
          city: facility.city,
        });

        console.error(`[forte] [direct] ${name} on ${formatDate(d)}`);
      }

      // --- Process Bucket B (Wix detail links) ---
      // Pre-filter by slug date to avoid unnecessary page loads
      const inRangeWixLinks = wixDetailLinks.filter(l => {
        const slug = l.href.split('/event-details/')[1]?.split('?')[0] ?? '';
        const d = parseDateFromSlug(slug);
        if (!d) return true; // no date in slug — follow it anyway
        return d >= dateFrom && d <= dateTo;
      });

      console.error(`[forte] Following ${inRangeWixLinks.length} Wix detail links in range`);

      for (const link of inRangeWixLinks) {
        try {
          await page.goto(link.href, { waitUntil: 'domcontentloaded', timeout: 20000 });
          await page.waitForTimeout(1500);

          // Find the CourtReserve publicbookings link on the Wix detail page
          const crHref = await page.evaluate(() => {
            const anchors = Array.from(document.querySelectorAll('a[href*="publicbookings/13816"]'));
            return anchors.find(a => a.href?.includes('eventId='))?.href ?? null;
          });

          if (!crHref) {
            console.error(`[forte] No CR link found at ${link.href}`);
            continue;
          }

          const eventId = extractEventId(crHref);
          if (!eventId || seenEventIds.has(eventId)) continue;

          const d = parseDateFromCRUrl(crHref);
          if (!d || d < dateFrom || d > dateTo) continue;

          seenEventIds.add(eventId);

          // Get event name from Wix page heading
          const eventName = await page.evaluate(() => {
            const h1 = document.querySelector('h1');
            return h1?.innerText?.trim() ?? '';
          });

          // Parse time from the slug (most reliable source)
          const slug = link.href.split('/event-details/')[1]?.split('?')[0] ?? '';
          const time = parseTimeFromSlug(slug);

          const name = eventName || link.text || 'Event at Pickles at Forté';

          games.push({
            id: `forte-${eventId}-${d.getTime()}`,
            source: 'forte',
            venue: facility.name,
            programName: name,
            date: formatDate(d),
            time,
            status: 'open',
            level: parseLevel(name),
            url: crHref,
            price: null,
            city: facility.city,
          });

          console.error(`[forte] [detail] ${name} on ${formatDate(d)}`);
        } catch (err) {
          console.error(`[forte] Failed to follow ${link.href}: ${err.message}`);
        }
      }

      console.error(`[forte] ${games.filter(g => g.city === facility.city).length} total games found`);
    }
  } finally {
    await browser.close();
  }

  return games;
}

// Run directly: node agents/forte.mjs
if (process.argv[1].endsWith('forte.mjs')) {
  const dateFrom = new Date();
  const dateTo = new Date();
  dateTo.setDate(dateTo.getDate() + 14);

  const testFacilities = [
    { source: 'forte', name: 'Pickles at Forté', city: 'Honolulu' },
  ];

  console.error(`[forte] Searching Honolulu, ${dateFrom.toDateString()} – ${dateTo.toDateString()}`);
  const games = await scrapeForte(testFacilities, dateFrom, dateTo);
  console.log(JSON.stringify(games, null, 2));
  console.error(`\n[forte] Total: ${games.length} games found`);
}
