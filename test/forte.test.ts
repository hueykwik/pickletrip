import { describe, it, expect } from 'vitest';
// @ts-expect-error — .mjs import, no types
import { extractEventsFromHtml, eventToGame } from '../agents/forte.mjs';

const FIXTURE = `
<html><body>
<script>
window.__DATA__ = {"somePrefix": true, "payload": [
{"id":"11111111-2222-3333-4444-555555555555","location":{"name":"Pickles at Forté","address":"1032 Fort Street Mall"},"title":"Beginner Skill Builder","slug":"beginner-skill-builder-2026-05-01-17-00","scheduling":{"config":{"startDate":"2026-05-01T17:00:00.000Z","endDate":"2026-05-01T19:00:00.000Z","timeZoneId":"Pacific/Honolulu"}},"status":0},
{"id":"aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee","location":{"name":"Pickles at Forté"},"title":"PLAY THE PRO (3.5+)","slug":"play-the-pro-2026-05-02-09-00","scheduling":{"config":{"startDate":"2026-05-02T19:30:00.000Z","endDate":"2026-05-02T21:30:00.000Z","timeZoneId":"Pacific/Honolulu"}},"status":0},
{"id":"99999999-8888-7777-6666-555555555555","location":{"name":"Pickles at Forté"},"title":"Advanced Drills — quotes: \\"fancy\\" and a } brace","slug":"advanced-drills","scheduling":{"config":{"startDate":"2026-05-03T20:00:00.000Z","timeZoneId":"Pacific/Honolulu"}},"status":0}
]};
</script>
</body></html>
`;

describe('forte scraper — HTML extraction', () => {
  it('extracts all event objects from embedded JSON', () => {
    const events = extractEventsFromHtml(FIXTURE);
    expect(events).toHaveLength(3);
    expect(events[0].title).toBe('Beginner Skill Builder');
    expect(events[1].title).toBe('PLAY THE PRO (3.5+)');
  });

  it('correctly balances braces inside JSON string literals', () => {
    // Third event title contains escaped quotes and a literal } char — the
    // brace-balancer must not get confused by these.
    const events = extractEventsFromHtml(FIXTURE);
    const tricky = events.find(e => e.id.startsWith('9999'));
    expect(tricky).toBeDefined();
    expect(tricky.title).toContain('fancy');
    expect(tricky.title).toContain('}');
  });

  it('returns [] on HTML with no event blobs', () => {
    expect(extractEventsFromHtml('<html><body>nothing here</body></html>')).toEqual([]);
  });

  it('skips malformed JSON without throwing', () => {
    const bad = '{"id":"11111111-2222-3333-4444-555555555555","location": BROKEN';
    expect(() => extractEventsFromHtml(bad)).not.toThrow();
    expect(extractEventsFromHtml(bad)).toEqual([]);
  });
});

describe('forte scraper — event to game mapping', () => {
  const facility = { source: 'forte', name: 'Pickles at Forté', city: 'Honolulu' };

  it('maps a Wix event to a Game with HST-formatted date/time', () => {
    const [evt] = extractEventsFromHtml(FIXTURE);
    const game = eventToGame(evt, facility);
    expect(game).not.toBeNull();
    expect(game.source).toBe('forte');
    expect(game.venue).toBe('Pickles at Forté');
    expect(game.city).toBe('Honolulu');
    expect(game.programName).toBe('Beginner Skill Builder');
    // 2026-05-01T17:00:00Z = 2026-05-01 07:00 HST (UTC-10). Friday.
    expect(game.date).toBe('Fri, May 1');
    expect(game.time).toBe('7:00 AM');
    expect(game.url).toBe('https://www.picklesatforte.com/event-details/beginner-skill-builder-2026-05-01-17-00');
  });

  it('parses DUPR-style level from event title', () => {
    const events = extractEventsFromHtml(FIXTURE);
    const pro = events.find(e => e.title.includes('PRO'));
    const game = eventToGame(pro, facility);
    expect(game.level).toBe('3.5+');
  });

  it('returns null for events without scheduling.startDate', () => {
    const bad = { id: 'x', title: 'y', scheduling: { config: {} } };
    expect(eventToGame(bad, facility)).toBeNull();
  });

  it('falls back to id when slug is missing', () => {
    const noSlug = { id: 'abc123', title: 'Test', scheduling: { config: { startDate: '2026-05-01T17:00:00Z', timeZoneId: 'Pacific/Honolulu' } } };
    const game = eventToGame(noSlug, facility);
    expect(game.url).toBe('https://www.picklesatforte.com/event-details/abc123');
  });
});
