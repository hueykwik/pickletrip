/**
 * CourtReserve agent
 * Scrapes pickleball events (open play, clinics, drills) for a city + date range.
 *
 * Usage: node agents/courtreserve.mjs
 * Or import scrapeCourtReserve() from Next.js API route.
 *
 * Approach:
 *   1. For each known facility, navigate the booking grid day-by-day
 *   2. Collect all "Details" event links visible in the grid
 *   3. For each unique event URL, visit the detail page and parse the DATES section
 *   4. Filter parsed dates to the requested date range
 */
import { chromium } from 'playwright-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';

chromium.use(StealthPlugin());

/**
 * Known CourtReserve facility booking URLs per city.
 * URL format: https://app.courtreserve.com/Online/Reservations/Bookings/{facilityId}?sId={sportId}
 * sId is the sport ID — use the pickleball-specific sId if available.
 */
const CITY_FACILITIES = {
  'west hollywood': [
    { name: 'Maui Country Club', url: 'https://app.courtreserve.com/Online/Reservations/Bookings/2457?sId=915' },
  ],
  'weho': [
    { name: 'Maui Country Club', url: 'https://app.courtreserve.com/Online/Reservations/Bookings/2457?sId=915' },
  ],
};

const BASE_URL = 'https://app.courtreserve.com';

/**
 * Parse a CourtReserve date string like "Wed, Apr 1st" into a Date.
 * Assumes current or next year.
 */
function parseDate(dateStr) {
  // Strip ordinal suffix: "1st" → "1", "25th" → "25"
  const cleaned = dateStr.replace(/(\d+)(st|nd|rd|th)/, '$1');
  const now = new Date();
  const parsed = new Date(`${cleaned} ${now.getFullYear()}`);
  if (isNaN(parsed.getTime())) return null;
  // If more than 60 days in the past, assume next year
  if (now - parsed > 60 * 24 * 60 * 60 * 1000) {
    parsed.setFullYear(now.getFullYear() + 1);
  }
  return parsed;
}

/**
 * Parse level from an event name.
 * e.g. "PLAY THE PRO (3.5+)" → "3.5+"
 *      "Open Play - Beginner" → "Beginner"
 */
function parseLevel(name) {
  const n = name.toLowerCase();
  // DUPR-style range in parens: "(3.5+)", "(3.0-3.5)", "(4.0+)"
  const duprMatch = name.match(/\(([0-9.]+\s*[-–+][0-9.]*)\)/);
  if (duprMatch) return duprMatch[1];
  // Single level in parens: "(3.5+)"
  const levelParens = name.match(/\(([0-9.]+\+?)\)/);
  if (levelParens) return levelParens[1];
  if (/beginner/i.test(n)) return 'Beginner';
  if (/advanced/i.test(n)) return 'Advanced';
  if (/intermediate/i.test(n)) return 'Intermediate';
  return null;
}

/**
 * Parse status text from CourtReserve.
 * e.g. "FULL", "Full", "X of Y spots remaining", "Register", "Join Waitlist"
 * Returns "open" or "full".
 */
function parseStatus(statusText) {
  const t = statusText.toLowerCase();
  if (t.includes('full') || t.includes('waitlist')) return 'full';
  if (t.includes('register') || t.includes('spots remaining') || t.includes('registration opens')) return 'open';
  return 'unknown';
}

/**
 * Collect all event "Details" links from a booking grid page for a specific date.
 * Returns array of absolute URLs.
 */
async function getEventLinksForDate(page, facilityUrl, date) {
  // Format date as MM/DD/YYYY for CourtReserve date param
  const dateParam = `${date.getMonth() + 1}/${date.getDate()}/${date.getFullYear()}`;
  // Try appending date param — CourtReserve uses ?Date= or the same URL navigates to today
  const url = facilityUrl.includes('?')
    ? `${facilityUrl}&Date=${dateParam}`
    : `${facilityUrl}?Date=${dateParam}`;

  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 20000 });
    await page.waitForTimeout(2000);
  } catch {
    return [];
  }

  const links = await page.evaluate((baseUrl) => {
    const anchors = Array.from(document.querySelectorAll('a[href*="/Events/Details/"]'));
    return [...new Set(anchors.map(a => a.href.startsWith('http') ? a.href : baseUrl + a.getAttribute('href')))];
  }, BASE_URL);

  return links;
}

/**
 * Visit an event detail page and extract all date occurrences in the date range.
 * Returns array of Game objects.
 */
async function getEventSessions(page, eventUrl, facilityName, dateFrom, dateTo) {
  try {
    await page.goto(eventUrl, { waitUntil: 'domcontentloaded', timeout: 20000 });
    await page.waitForTimeout(1500);
  } catch {
    return [];
  }

  // Check for login wall
  const isLoginWall = await page.evaluate(() => {
    const text = document.body.innerText.toLowerCase();
    return text.includes('please log in') || text.includes('members only') ||
      (text.includes('log in') && !text.includes('dates'));
  });
  if (isLoginWall) return [];

  const data = await page.evaluate(() => {
    const body = document.body.innerText;

    // Event name: first heading after the nav
    const h2s = Array.from(document.querySelectorAll('h2, h3, .event-title, [class*="title"]'));
    const nameEl = h2s.find(el => el.innerText.trim().length > 3 && !el.innerText.includes('DATES'));
    const eventName = nameEl?.innerText?.trim() ?? '';

    // Parse DATES section — the text after "DATES (N)" has blocks of:
    //   date line, time line, price line, status line(s)
    const fullText = body;
    const datesIdx = fullText.indexOf('DATES (');
    if (datesIdx === -1) {
      // Single occurrence — parse from top-level
      // Pattern: eventName \n date \n time \n price \n status
      return { eventName, dates: [] };
    }

    const datesSection = fullText.slice(datesIdx + fullText.slice(datesIdx).indexOf('\n') + 1);
    const lines = datesSection.split('\n').map(l => l.trim()).filter(Boolean);

    // Group into blocks: each block starts with a day-of-week date line
    const datePattern = /^(Mon|Tue|Wed|Thu|Fri|Sat|Sun),\s/;
    const timePattern = /^\d+:\d+(a|p|am|pm)/i;
    const pricePattern = /^\$[\d.]+$/;

    const blocks = [];
    let current = null;

    for (const line of lines) {
      if (datePattern.test(line)) {
        if (current) blocks.push(current);
        current = { date: line, time: '', price: '', statusLines: [] };
      } else if (current) {
        if (!current.time && timePattern.test(line)) {
          current.time = line;
        } else if (!current.price && pricePattern.test(line)) {
          current.price = line;
        } else if (line !== 'Register' || current.statusLines.length === 0) {
          current.statusLines.push(line);
        }
      }
    }
    if (current) blocks.push(current);

    return { eventName, dates: blocks };
  });

  if (!data.eventName && data.dates.length === 0) return [];

  const level = parseLevel(data.eventName);
  const sessions = [];

  for (const block of data.dates) {
    const d = parseDate(block.date);
    if (!d) continue;
    if (d < dateFrom || d > dateTo) continue;

    const statusText = block.statusLines.join(' ');
    const status = parseStatus(statusText);

    sessions.push({
      id: `cr-${eventUrl.split('/').pop()}-${d.getTime()}`,
      source: 'courtreserve',
      venue: facilityName,
      programName: data.eventName,
      date: block.date,
      time: block.time,
      status,
      level,
      url: eventUrl,
      price: block.price || null,
    });
  }

  return sessions;
}

/**
 * Main export: scrape CourtReserve for a city + date range.
 *
 * @param {string} city
 * @param {Date} dateFrom
 * @param {Date} dateTo
 * @returns {Promise<Game[]>}
 */
export async function scrapeCourtReserve(city, dateFrom, dateTo) {
  const facilities = CITY_FACILITIES[city.toLowerCase().trim()];
  if (!facilities) {
    console.warn(`[courtreserve] No facilities for city: ${city}`);
    return [];
  }

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  });

  const games = [];
  try {
    const page = await context.newPage();

    for (const facility of facilities) {
      console.error(`[courtreserve] Scanning facility: ${facility.name}`);

      // Collect event URLs across all days in the range
      const eventUrls = new Set();
      const current = new Date(dateFrom);
      while (current <= dateTo) {
        const links = await getEventLinksForDate(page, facility.url, current);
        links.forEach(l => eventUrls.add(l));
        console.error(`[courtreserve] ${current.toDateString()}: ${links.length} event links found`);
        current.setDate(current.getDate() + 1);
      }

      console.error(`[courtreserve] ${eventUrls.size} unique events to scrape`);

      // Visit each unique event detail page
      for (const eventUrl of eventUrls) {
        try {
          const sessions = await getEventSessions(page, eventUrl, facility.name, dateFrom, dateTo);
          console.error(`[courtreserve] ${eventUrl.split('/').pop()}: ${sessions.length} sessions in range`);
          games.push(...sessions);
        } catch (err) {
          console.error(`[courtreserve] Failed ${eventUrl}: ${err.message}`);
        }
      }
    }
  } finally {
    await browser.close();
  }

  return games;
}

// Run directly: node agents/courtreserve.mjs
if (process.argv[1].endsWith('courtreserve.mjs')) {
  const dateFrom = new Date();
  const dateTo = new Date();
  dateTo.setDate(dateTo.getDate() + 7);

  console.error(`[courtreserve] Searching West Hollywood, ${dateFrom.toDateString()} – ${dateTo.toDateString()}`);
  const games = await scrapeCourtReserve('west hollywood', dateFrom, dateTo);
  console.log(JSON.stringify(games, null, 2));
  console.error(`\n[courtreserve] Total: ${games.length} games found`);
}
