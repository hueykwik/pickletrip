/**
 * PlayByPoint agent
 * Scrapes pickleball game sessions for a list of facilities + date range.
 *
 * Usage: node agents/playbypoint.mjs
 * Or import scrapePlayByPoint() from Next.js API route.
 */
import { chromium } from 'playwright-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';

chromium.use(StealthPlugin());

const BASE_URL = 'https://app.playbypoint.com';

/**
 * Parse a PlayByPoint date string like "Wed, Mar 25" into a Date.
 * Assumes current year (or next year if month is in the past).
 */
function parseDate(dateStr) {
  const now = new Date();
  const parsed = new Date(`${dateStr} ${now.getFullYear()}`);
  // If parsed date is more than 60 days in the past, assume next year
  if (now - parsed > 60 * 24 * 60 * 60 * 1000) {
    parsed.setFullYear(now.getFullYear() + 1);
  }
  return parsed;
}

/**
 * Parse skill level from a program name string.
 * Returns a normalized level string or null.
 */
function parseLevel(programName) {
  const name = programName.toLowerCase();
  if (/beginner/i.test(name)) return 'Beginner';
  if (/advanced/i.test(name)) return 'Advanced';
  if (/intermediate/i.test(name)) return 'Intermediate';
  // DUPR range e.g. "2.9-3.49" or "3.5-3.999"
  const duprMatch = name.match(/(\d+\.\d+)\s*[-–]\s*(\d+(?:\.\d+)?)/);
  if (duprMatch) return `DUPR ${duprMatch[1]}–${duprMatch[2]}`;
  return null;
}

/**
 * Scrape all pickleball programs from a facility page.
 * Accepts either a slug (app.playbypoint.com/f/{slug}) or a full URL
 * for branded/subdomain facilities (e.g. https://piklla.playbypoint.com).
 * Returns array of { name, url, level }.
 */
async function getFacilityPrograms(page, facilitySlugOrUrl) {
  const facilityUrl = facilitySlugOrUrl.startsWith('http')
    ? facilitySlugOrUrl
    : `${BASE_URL}/f/${facilitySlugOrUrl}`;
  // For subdomain facilities, program links are relative to the subdomain origin
  const facilityOrigin = new URL(facilityUrl).origin;

  await page.goto(facilityUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(1500);

  const programs = await page.evaluate((origin) => {
    const links = Array.from(document.querySelectorAll('a[href*="/programs/"]'));
    return links
      .filter(a => a.innerText.toLowerCase().includes('pickleball'))
      .map(a => {
        // Extract just the program title — first non-empty line before "M T W T F S S"
        const lines = a.innerText.split('\n').map(l => l.trim()).filter(Boolean);
        const titleLines = lines.filter(l => !/^[MTWFS]$/.test(l) && l !== 'View Details');
        // Usually: lines[0] = category, lines[1] = program name, lines[2] = facility name
        const name = titleLines.slice(0, 2).join(' — ');
        return {
          name,
          url: a.href.startsWith('http') ? a.href : origin + a.getAttribute('href'),
        };
      });
  }, facilityOrigin);

  // Deduplicate by URL
  const seen = new Set();
  return programs
    .filter(p => { if (seen.has(p.url)) return false; seen.add(p.url); return true; })
    .map(p => ({ ...p, level: parseLevel(p.name) }));
}

/**
 * Scrape all sessions from a program page, filtered by date range.
 */
async function getProgramSessions(page, program, facility, dateFrom, dateTo) {
  await page.goto(program.url, { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(1500);

  // Wait for session cards to appear
  try {
    await page.waitForSelector('.pbc.black.card', { timeout: 10000 });
  } catch {
    return []; // No sessions visible (login wall or empty)
  }

  const venueName = await page.evaluate(() => {
    // Program page header: typically "Facility Name — Program Name"
    const h1 = document.querySelector('h1');
    if (h1) return h1.innerText.split('\n')[0].trim();
    const breadcrumb = document.querySelector('[class*="breadcrumb"] a');
    return breadcrumb?.innerText?.trim() ?? '';
  });

  const sessions = await page.evaluate(({ programUrl, programName, venueName }) => {
    const cards = Array.from(document.querySelectorAll('.pbc.black.card'));
    return cards.map((card, index) => {
      const dateEl = card.querySelector('.text.big.semi.bold.header_font, [class*="header_font"]');
      const timeEl = card.querySelector('.meta');
      const statusEl = card.querySelector('.pbc_reservation_status_text span, [class*="status_text"] span');
      const sessionId = card.getAttribute('data-id') || card.getAttribute('data-lesson') || String(index);

      return {
        id: `pbp-${sessionId}`,
        source: 'playbypoint',
        venue: venueName,
        programName,
        date: dateEl?.innerText?.trim() ?? '',
        time: timeEl?.innerText?.trim() ?? '',
        status: statusEl?.innerText?.trim().toLowerCase() ?? 'unknown',
        level: null, // filled in by caller from program.level
        url: programUrl.startsWith('https://') ? programUrl : `https://${programUrl.replace(/^https?:\/\//, '')}`,
        price: null,
      };
    });
  }, { programUrl: program.url, programName: program.name, venueName });

  // Filter by date range
  return sessions.filter(s => {
    if (!s.date) return false;
    try {
      const d = parseDate(s.date);
      return d >= dateFrom && d <= dateTo;
    } catch {
      return false;
    }
  }).map(s => ({ ...s, level: program.level, city: facility.city }));
}

/**
 * Main export: scrape PlayByPoint for a list of facilities + date range.
 *
 * @param {import('../lib/cities.js').PlayByPointFacility[]} facilities
 * @param {Date} dateFrom
 * @param {Date} dateTo
 * @returns {Promise<import('../lib/types.js').Game[]>}
 */
export async function scrapePlayByPoint(facilities, dateFrom, dateTo) {
  if (!facilities || facilities.length === 0) return [];

  const pbpFacilities = facilities.filter(f => f.source === 'playbypoint');
  if (pbpFacilities.length === 0) return [];

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  });

  const games = [];
  try {
    const page = await context.newPage();

    for (const facility of pbpFacilities) {
      const facilityRef = facility.url ?? facility.slug;
      console.error(`[playbypoint] Scanning facility: ${facility.name} (${facilityRef})`);
      let programs;
      try {
        programs = await getFacilityPrograms(page, facilityRef);
      } catch (err) {
        console.error(`[playbypoint] Failed to load facility ${facilityRef}: ${err.message}`);
        continue;
      }
      console.error(`[playbypoint] Found ${programs.length} pickleball programs`);

      for (const program of programs) {
        console.error(`[playbypoint] Scraping: ${program.name}`);
        try {
          const sessions = await getProgramSessions(page, program, facility, dateFrom, dateTo);
          console.error(`[playbypoint] ${sessions.length} sessions in date range`);
          games.push(...sessions);
        } catch (err) {
          console.error(`[playbypoint] Failed to scrape ${program.url}: ${err.message}`);
        }
      }
    }
  } finally {
    await browser.close();
  }

  return games;
}

// Run directly: node agents/playbypoint.mjs
if (process.argv[1].endsWith('playbypoint.mjs')) {
  const dateFrom = new Date();
  const dateTo = new Date();
  dateTo.setDate(dateTo.getDate() + 7);

  const testFacilities = [
    { source: 'playbypoint', name: 'West Hollywood Park', city: 'West Hollywood', slug: 'west-hollywood-park-tennis-courts' },
    { source: 'playbypoint', name: 'Plummer Park', city: 'West Hollywood', slug: 'plummer-park' },
  ];

  console.error(`[playbypoint] Searching West Hollywood, ${dateFrom.toDateString()} – ${dateTo.toDateString()}`);
  const games = await scrapePlayByPoint(testFacilities, dateFrom, dateTo);
  console.log(JSON.stringify(games, null, 2));
  console.error(`\n[playbypoint] Total: ${games.length} games found`);
}
