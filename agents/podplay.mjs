/**
 * PodPlay agent
 * Scrapes pickleball events from PodPlay venues (Big City Pickle, SPF Pickleball, etc.)
 *
 * Approach:
 *   PodPlay's REST API requires auth we can't obtain without credentials, so we scrape
 *   the rendered DOM instead. URL pattern: {baseUrl}/book/{areaSlug}/{YYYY-MM-DD}
 *   The page renders a list of court reservations (OFF PEAK slots) mixed with named
 *   structured events (open play, clinics). We extract only the named events.
 *
 * Usage: node agents/podplay.mjs
 * Or import scrapePodPlay() from the Next.js API route.
 */
import { chromium } from 'playwright-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';

chromium.use(StealthPlugin());

/**
 * Parse a PodPlay event anchor's text content into time, name, and status.
 * Text format: "4:00pm - 6:00pm\nIndoor Pickleball Open Play\n(3 spots left)"
 */
function parseEventText(raw) {
  const lines = raw.split('\n').map(l => l.trim()).filter(Boolean);
  if (lines.length < 2) return null;

  // First line is always the time range: "4:00pm - 6:00pm"
  const timeMatch = lines[0].match(/^(\d{1,2}:\d{2}(?:am|pm))\s*[-–]\s*(\d{1,2}:\d{2}(?:am|pm))$/i);
  if (!timeMatch) return null;

  const timeRange = lines[0];
  const name = lines[1];
  const statusLine = lines[2] || '';

  // Parse status
  let status = 'unknown';
  let spotsLeft = null;
  if (/waitlist/i.test(statusLine)) {
    status = 'full';
  } else {
    const spotsMatch = statusLine.match(/(\d+)\s+spot/i);
    if (spotsMatch) {
      spotsLeft = parseInt(spotsMatch[1], 10);
      status = spotsLeft > 0 ? 'open' : 'full';
    } else if (statusLine === '') {
      status = 'open'; // no status line = open
    }
  }

  return { timeRange, name, status, spotsLeft };
}

/**
 * Parse level from event name.
 */
function parseLevel(name) {
  // "Beginner-Intermediate (2.5-3.0)" or "(3.5-4.0)" or "(4.0+)"
  const duprMatch = name.match(/\(([0-9.]+\s*[-–][0-9.]+)\)/);
  if (duprMatch) return duprMatch[1];
  const duprPlus = name.match(/\(([0-9.]+\+)\)/);
  if (duprPlus) return duprPlus[1];
  if (/beginner.intermediate/i.test(name)) return 'Beginner–Intermediate';
  if (/beginner/i.test(name)) return 'Beginner';
  if (/intermediate/i.test(name)) return 'Intermediate';
  if (/advanced/i.test(name)) return 'Advanced';
  if (/open play/i.test(name)) return 'All levels';
  return null;
}

/**
 * Format a Date as YYYY-MM-DD in local time.
 */
function toDateStr(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Format a Date as a display string like "Sat, Apr 5".
 */
function formatDisplayDate(date) {
  return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

/**
 * Scrape one area for a date range and return game objects.
 * @param {import('playwright').Page} page
 * @param {object} facility  PodPlayFacility config
 * @param {Date} dateFrom
 * @param {Date} dateTo
 */
async function scrapeArea(page, facility, dateFrom, dateTo) {
  const games = [];
  const seenEventUrls = new Set();

  const current = new Date(dateFrom);
  current.setHours(0, 0, 0, 0);
  const end = new Date(dateTo);
  end.setHours(23, 59, 59, 999);

  while (current <= end) {
    const dateStr = toDateStr(current);
    const url = `${facility.url}/book/${facility.areaSlug}/${dateStr}`;

    try {
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 20000 });

      // Wait for events to render (the page loads JS dynamically)
      await page.waitForSelector('a[href*="/community/events/"]', { timeout: 8000 }).catch(() => {});

      // Extract named events (structured events with booking links)
      const events = await page.evaluate(() => {
        const anchors = Array.from(document.querySelectorAll('a[href*="/community/events/"]'));
        return anchors.map(a => ({
          text: a.innerText?.trim() || '',
          href: a.href,
        }));
      });

      const displayDate = formatDisplayDate(current);
      console.error(`[podplay] ${facility.name} ${dateStr}: ${events.length} event links`);

      for (const { text, href } of events) {
        if (seenEventUrls.has(href)) continue;
        seenEventUrls.add(href);

        const parsed = parseEventText(text);
        if (!parsed) continue;

        // Skip if this looks like a court reservation (no event name)
        if (!parsed.name || parsed.name.length < 3) continue;

        games.push({
          venue: facility.name,
          city: facility.city,
          name: parsed.name,
          date: displayDate,
          time: parsed.timeRange,
          level: parseLevel(parsed.name),
          status: parsed.status,
          price: null, // Not easily visible on the listing page
          url: href,
          source: 'podplay',
        });
      }
    } catch (err) {
      console.error(`[podplay] ${facility.name} ${dateStr}: error — ${err.message}`);
    }

    current.setDate(current.getDate() + 1);
  }

  return games;
}

/**
 * Main export — scrape all PodPlay facilities for the given date range.
 * @param {import('../lib/cities').PodPlayFacility[]} facilities
 * @param {Date} dateFrom
 * @param {Date} dateTo
 * @returns {Promise<import('../lib/types').Game[]>}
 */
export async function scrapePodPlay(facilities, dateFrom, dateTo) {
  const podFacilities = facilities.filter(f => f.source === 'podplay');
  if (!podFacilities.length) return [];

  const browser = await chromium.launch({ headless: true });
  const games = [];

  try {
    const page = await browser.newPage();

    for (const facility of podFacilities) {
      console.error(`[podplay] Scanning: ${facility.name} (${facility.areaSlug})`);
      const areaGames = await scrapeArea(page, facility, dateFrom, dateTo);
      games.push(...areaGames);
      console.error(`[podplay] ${facility.name}: ${areaGames.length} games`);
    }
  } finally {
    await browser.close();
  }

  console.error(`[podplay] Total: ${games.length} games`);
  return games;
}

// --- Standalone test ---
if (process.argv[1] && process.argv[1].endsWith('podplay.mjs')) {
  const from = new Date();
  from.setHours(0, 0, 0, 0);
  const to = new Date(from);
  to.setDate(to.getDate() + 3);

  const testFacilities = [
    { source: 'podplay', name: 'BCP West Loop', city: 'Chicago', url: 'https://bigcitypickle.podplay.app', areaSlug: 'bcp-west-loop' },
    { source: 'podplay', name: 'SPF Lincoln Park', city: 'Chicago', url: 'https://spf.podplay.app', areaSlug: 'lincoln-park' },
  ];

  const results = await scrapePodPlay(testFacilities, from, to);
  console.log(`\nFound ${results.length} games:`);
  results.forEach(g => console.log(` - [${g.date} ${g.time}] ${g.venue}: ${g.name} (${g.status})`));
  process.exit(0);
}
