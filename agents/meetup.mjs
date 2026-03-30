/**
 * Meetup agent
 * Fetches upcoming pickleball events from Meetup groups via their public GraphQL API.
 * No browser required — pure fetch. No auth required.
 *
 * Usage: node agents/meetup.mjs
 * Or import scrapeMeetup() from Next.js API route.
 */

const GQL_URL = 'https://www.meetup.com/gql2';

const EVENTS_QUERY = `
  query GroupEvents($urlname: String!, $after: String, $from: DateTime!, $to: DateTime!) {
    groupByUrlname(urlname: $urlname) {
      events(
        status: ACTIVE
        first: 100
        after: $after
        filter: { afterDateTime: $from, beforeDateTime: $to }
      ) {
        edges {
          node {
            id
            title
            dateTime
            endTime
            eventUrl
            venue {
              name
              address
              city
            }
          }
        }
        pageInfo {
          hasNextPage
          endCursor
        }
      }
    }
  }
`;

/**
 * Parse skill level from event title or description.
 */
function parseLevel(title, description) {
  const text = `${title} ${description || ''}`;
  if (/\ball\s*levels?\b/i.test(text)) return 'All levels';
  if (/beginner/i.test(text)) return 'Beginner';
  if (/advanced/i.test(text)) return 'Advanced';
  if (/intermediate/i.test(text)) return 'Intermediate';
  if (/novice/i.test(text)) return 'Novice';
  // DUPR range e.g. "3.5-3.99"
  const duprMatch = text.match(/(\d+\.\d+)\s*[-–]\s*(\d+(?:\.\d+)?)/);
  if (duprMatch) return `DUPR ${duprMatch[1]}–${duprMatch[2]}`;
  return null;
}

/**
 * Format a Date to "Day, Mon DD" e.g. "Sat, Mar 28"
 */
function formatDate(d) {
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', timeZone: 'Pacific/Honolulu' });
}

/**
 * Format a Date to "H:MM AM/PM"
 */
function formatTime(d) {
  return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'Pacific/Honolulu' });
}

/**
 * Fetch one page of events from the Meetup GraphQL API.
 */
async function fetchEvents(urlname, from, to, cursor) {
  const body = JSON.stringify({
    query: EVENTS_QUERY,
    variables: {
      urlname,
      from: from.toISOString(),
      to: to.toISOString(),
      after: cursor ?? null,
    },
  });

  const res = await fetch(GQL_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    },
    body,
  });

  if (!res.ok) throw new Error(`Meetup GraphQL HTTP ${res.status}`);
  const json = await res.json();
  if (json.errors?.length) throw new Error(`Meetup GraphQL error: ${json.errors[0].message}`);
  return json.data?.groupByUrlname?.events ?? { edges: [], pageInfo: { hasNextPage: false } };
}

/**
 * Main export: scrape Meetup groups for events in the date range.
 *
 * @param {import('../lib/cities.js').MeetupFacility[]} facilities
 * @param {Date} dateFrom
 * @param {Date} dateTo
 * @returns {Promise<import('../lib/types.js').Game[]>}
 */
export async function scrapeMeetup(facilities, dateFrom, dateTo) {
  if (!facilities || facilities.length === 0) return [];

  const meetupFacilities = facilities.filter(f => f.source === 'meetup');
  if (meetupFacilities.length === 0) return [];

  const games = [];

  for (const facility of meetupFacilities) {
    console.error(`[meetup] Fetching ${facility.name} (${facility.groupUrlname})`);

    let cursor = null;
    let pageCount = 0;
    const MAX_PAGES = 10; // safety cap — 100 events/page × 10 = 1000 events max

    do {
      const page = await fetchEvents(facility.groupUrlname, dateFrom, dateTo, cursor);

      for (const edge of page.edges) {
        const node = edge.node;
        const d = new Date(node.dateTime);
        const venue = node.venue;

        // Validate URL
        if (!node.eventUrl?.startsWith('https://')) continue;

        games.push({
          id: `meetup-${node.id}`,
          source: 'meetup',
          venue: venue?.name || facility.name,
          programName: node.title,
          date: formatDate(d),
          time: formatTime(d),
          status: 'open',
          level: parseLevel(node.title, ''),
          url: node.eventUrl,
          price: null,
          city: facility.city,
        });
      }

      cursor = page.pageInfo.hasNextPage ? page.pageInfo.endCursor : null;
      pageCount++;
      console.error(`[meetup] ${facility.groupUrlname} page ${pageCount}: ${page.edges.length} events (hasMore: ${page.pageInfo.hasNextPage})`);
    } while (cursor && pageCount < MAX_PAGES);

    console.error(`[meetup] ${facility.groupUrlname} total: ${games.filter(g => g.city === facility.city).length} games`);
  }

  return games;
}

// Run directly: node agents/meetup.mjs
if (process.argv[1].endsWith('meetup.mjs')) {
  const dateFrom = new Date();
  const dateTo = new Date();
  dateTo.setDate(dateTo.getDate() + 14);

  const testFacilities = [
    { source: 'meetup', name: 'Oahu Pickleball Association', city: 'Honolulu', groupUrlname: 'oahu-pickleball-association' },
  ];

  console.error(`[meetup] Searching ${dateFrom.toDateString()} – ${dateTo.toDateString()}`);
  const games = await scrapeMeetup(testFacilities, dateFrom, dateTo);
  console.log(JSON.stringify(games, null, 2));
  console.error(`\n[meetup] Total: ${games.length} games found`);
}
