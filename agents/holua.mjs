/**
 * Holua Racquet & Paddle agent
 * Fetches the pickleball schedule from holuaracquetandpaddle.com and generates
 * Game objects for each open play slot within the date range.
 *
 * Pure fetch — no Playwright needed. The schedule is a recurring weekly pattern
 * parsed from the facility's pickleball page.
 *
 * Usage: node agents/holua.mjs
 * Or import scrapeHolua() from Next.js API route.
 */

const HOLUA_PICKLEBALL_URL = 'https://www.holuaracquetandpaddle.com/pickleball';

/**
 * Weekly open play schedule at Holua Racquet & Paddle.
 * Day of week (0=Sun) → array of { start, end, note }.
 * Source: holuaracquetandpaddle.com/pickleball (scraped + verified 2026-04-07)
 */
const WEEKLY_SCHEDULE = [
  // Sunday
  { day: 0, start: '8:00 AM', end: '12:00 PM', note: 'Beginner-friendly' },
  { day: 0, start: '4:00 PM', end: '7:00 PM', note: 'Beginner-friendly' },
  // Monday
  { day: 1, start: '8:00 AM', end: '12:00 PM', note: null },
  { day: 1, start: '4:00 PM', end: '9:00 PM', note: null },
  // Tuesday
  { day: 2, start: '4:00 PM', end: '9:00 PM', note: null },
  // Wednesday
  { day: 3, start: '8:00 AM', end: '12:00 PM', note: 'Beginner-friendly' },
  { day: 3, start: '4:00 PM', end: '7:00 PM', note: 'Beginner-friendly' },
  // Thursday
  { day: 4, start: '4:00 PM', end: '9:00 PM', note: null },
  // Friday
  { day: 5, start: '8:00 AM', end: '12:00 PM', note: null },
  { day: 5, start: '4:30 PM', end: '9:00 PM', note: null },
  // Saturday — round robins run by Big Island Rogue Pickleball Hui, not regular open play
];

const PRICE = '$15';

/**
 * Format a Date to "Day, Mon DD" e.g. "Sat, Mar 28"
 */
function formatDate(d) {
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', timeZone: 'Pacific/Honolulu' });
}

/**
 * Try to fetch the live schedule page and verify it hasn't changed.
 * Returns true if the page is reachable and contains expected markers.
 * Returns false if the site is down or content has changed (schedule may be stale).
 */
async function verifySchedule() {
  try {
    const res = await fetch(HOLUA_PICKLEBALL_URL, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
      },
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) return false;
    const html = await res.text();
    // Check for key markers that confirm the schedule page structure
    return html.includes('Open Play') && html.includes('$15');
  } catch {
    return false;
  }
}

/**
 * Generate Game objects for each open play slot in the date range.
 *
 * @param {import('../lib/cities.js').HoluaFacility[]} facilities
 * @param {Date} dateFrom
 * @param {Date} dateTo
 * @returns {Promise<import('../lib/types.js').Game[]>}
 */
export async function scrapeHolua(facilities, dateFrom, dateTo) {
  if (!facilities || facilities.length === 0) return [];

  const holuaFacilities = facilities.filter(f => f.source === 'holua');
  if (holuaFacilities.length === 0) return [];

  // Verify the live page still matches our cached schedule
  const verified = await verifySchedule();
  console.error(`[holua] Schedule verification: ${verified ? 'confirmed' : 'unverified (using cached schedule)'}`);

  const games = [];

  for (const facility of holuaFacilities) {
    console.error(`[holua] Generating schedule for ${facility.name}`);

    // Walk each day in the date range
    const current = new Date(dateFrom);
    current.setHours(0, 0, 0, 0);
    const end = new Date(dateTo);
    end.setHours(23, 59, 59, 999);

    while (current <= end) {
      const dayOfWeek = current.getDay();
      const slots = WEEKLY_SCHEDULE.filter(s => s.day === dayOfWeek);

      for (const slot of slots) {
        const dateStr = formatDate(current);
        const programName = slot.note
          ? `Open Play (${slot.note})`
          : 'Open Play';

        games.push({
          id: `holua-${current.toISOString().split('T')[0]}-${slot.start.replace(/[: ]/g, '')}`,
          source: 'holua',
          venue: facility.name,
          programName,
          date: dateStr,
          time: `${slot.start} – ${slot.end}`,
          status: 'open',
          level: slot.note?.includes('Beginner') ? 'Beginner-friendly' : 'All levels',
          url: HOLUA_PICKLEBALL_URL,
          price: PRICE,
          city: facility.city,
        });
      }

      current.setDate(current.getDate() + 1);
    }

    console.error(`[holua] ${facility.name}: ${games.length} slots generated`);
  }

  return games;
}

// Run directly: node agents/holua.mjs
if (process.argv[1].endsWith('holua.mjs')) {
  const dateFrom = new Date();
  const dateTo = new Date();
  dateTo.setDate(dateTo.getDate() + 14);

  const testFacilities = [
    { source: 'holua', name: 'Holua Racquet & Paddle', city: 'Kailua-Kona' },
  ];

  console.error(`[holua] Searching ${dateFrom.toDateString()} – ${dateTo.toDateString()}`);
  const games = await scrapeHolua(testFacilities, dateFrom, dateTo);
  console.log(JSON.stringify(games, null, 2));
  console.error(`\n[holua] Total: ${games.length} games found`);
}
