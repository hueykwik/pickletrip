/**
 * Forté agent — fetch-only
 *
 * Scrapes pickleball events from Pickles at Forté (Honolulu, HI) by parsing
 * the server-rendered JSON blob that Wix inlines into the event-list page HTML.
 *
 * No browser required. Single HTTP GET of the event-list page. ~500ms.
 *
 * This replaces the prior Playwright-based scraper. The old scraper broke when
 * Wix redesigned the event-list page from a paginated list with direct
 * CourtReserve links to a calendar view with no visible event anchors. The
 * events themselves are still server-rendered into the page bundle as JSON —
 * that's what we read.
 *
 * Robustness notes:
 *   - If the HTML shape changes so the regex no longer matches any event blob,
 *     extractEventsFromHtml returns []. Call site should treat "0 events" as
 *     suspicious (see `scrapeForte` — throws if the blob regex found zero
 *     matches AND the page was ≥100KB, which signals a page-structure change
 *     vs. a genuinely empty schedule).
 *   - If an individual event blob fails to JSON.parse, it's skipped (other
 *     events still return).
 */

const EVENT_LIST_URL = 'https://www.picklesatforte.com/event-list';
const USER_AGENT =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36';

/**
 * Parse skill level from an event name (shared with other agents, inlined for now).
 */
function parseLevel(name) {
  if (!name) return null;
  const duprMatch = name.match(/\(([0-9.]+\s*[-–+][0-9.]*)\)/);
  if (duprMatch) return duprMatch[1];
  const levelParens = name.match(/\(([0-9.]+\+?)\)/);
  if (levelParens) return levelParens[1];
  if (/beginner/i.test(name)) return 'Beginner';
  if (/advanced/i.test(name)) return 'Advanced';
  if (/intermediate/i.test(name)) return 'Intermediate';
  return null;
}

/**
 * Format a Date as "Wed, Apr 22" in the event's timezone (usually Pacific/Honolulu).
 */
function formatDate(d, timeZone) {
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    timeZone: timeZone || 'Pacific/Honolulu',
  }).format(d);
}

/**
 * Format a Date as "5:30 PM" in the event's timezone.
 */
function formatTime(d, timeZone) {
  return new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone: timeZone || 'Pacific/Honolulu',
  }).format(d);
}

/**
 * Extract event objects from the server-rendered HTML.
 *
 * The Wix Events app embeds each event as a JSON object that starts with
 * `{"id":"<uuid>","location":` and extends until the matching closing brace.
 * We locate every start marker, balance braces to find each object's end, and
 * JSON.parse the result.
 *
 * Exported for testing.
 */
export function extractEventsFromHtml(html) {
  const events = [];
  const starts = html.matchAll(
    /\{"id":"([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})","location":/g,
  );

  for (const m of starts) {
    const startIdx = m.index;
    // Balance braces, respecting string literals and escape sequences.
    let depth = 0;
    let inStr = false;
    let esc = false;
    let endIdx = -1;
    for (let j = startIdx; j < html.length; j++) {
      const ch = html[j];
      if (esc) { esc = false; continue; }
      if (ch === '\\') { esc = true; continue; }
      if (ch === '"') { inStr = !inStr; continue; }
      if (inStr) continue;
      if (ch === '{') depth++;
      else if (ch === '}') {
        depth--;
        if (depth === 0) { endIdx = j + 1; break; }
      }
    }
    if (endIdx === -1) continue;
    try {
      events.push(JSON.parse(html.slice(startIdx, endIdx)));
    } catch {
      // Skip malformed blob — continue with the rest
    }
  }

  return events;
}

/**
 * Convert a Wix event object into a pickletrip Game for a given facility.
 * Returns null if the event has no valid scheduling.startDate.
 *
 * Exported for testing.
 */
export function eventToGame(event, facility) {
  const startIso = event?.scheduling?.config?.startDate;
  if (!startIso) return null;
  const start = new Date(startIso);
  if (isNaN(start.getTime())) return null;

  const tz = event?.scheduling?.config?.timeZoneId || 'Pacific/Honolulu';
  const slug = event?.slug || event.id;
  const url = `https://www.picklesatforte.com/event-details/${slug}`;

  return {
    id: `forte-${event.id}`,
    source: 'forte',
    venue: facility.name,
    city: facility.city,
    programName: event.title || 'Event at Pickles at Forté',
    date: formatDate(start, tz),
    time: formatTime(start, tz),
    status: 'open',
    level: parseLevel(event.title),
    url,
    price: null,
  };
}

/**
 * Main export: scrape Forté for a list of facilities + date range.
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

  console.error(`[forte] Fetching ${EVENT_LIST_URL}`);
  let html;
  try {
    const res = await fetch(EVENT_LIST_URL, {
      headers: {
        'user-agent': USER_AGENT,
        'accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    html = await res.text();
  } catch (err) {
    console.error(`[forte] fetch failed: ${err.message}`);
    return [];
  }

  const events = extractEventsFromHtml(html);
  console.error(`[forte] Extracted ${events.length} event objects from HTML (${html.length} bytes)`);

  // Liveness check: page is substantial but we found nothing → structure likely changed
  if (events.length === 0 && html.length > 100_000) {
    throw new Error(
      '[forte] Page returned but no event blobs matched. Wix may have changed the HTML shape. Update the regex in extractEventsFromHtml.',
    );
  }

  const games = [];
  for (const facility of forteFacilities) {
    for (const event of events) {
      const startIso = event?.scheduling?.config?.startDate;
      if (!startIso) continue;
      const start = new Date(startIso);
      if (isNaN(start.getTime()) || start < dateFrom || start > dateTo) continue;

      const game = eventToGame(event, facility);
      if (game) games.push(game);
    }
  }

  console.error(`[forte] Returning ${games.length} games in date range`);
  return games;
}

// Run directly: node agents/forte.mjs
if (import.meta.url === `file://${process.argv[1]}`) {
  const dateFrom = new Date();
  const dateTo = new Date();
  dateTo.setDate(dateTo.getDate() + 14);

  const testFacilities = [
    { source: 'forte', name: 'Pickles at Forté', city: 'Honolulu' },
  ];

  const games = await scrapeForte(testFacilities, dateFrom, dateTo);
  console.log(JSON.stringify(games.slice(0, 5), null, 2));
  console.error(`\n[forte] Total: ${games.length} games in next 14 days`);
}
