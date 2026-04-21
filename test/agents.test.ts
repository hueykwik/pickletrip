import { describe, it, expect } from 'vitest';

// ─── parseStatus (courtreserve) ───────────────────────────────────────────────
// Inline re-implementation to test the logic without needing a browser context.
function parseStatus(statusText: string): string {
  const t = statusText.toLowerCase();
  if (t.includes('full') || t.includes('waitlist')) return 'full';
  if (
    t.includes('register') ||
    t.includes('spots remaining') ||
    t.includes('registration opens') ||
    t.includes('registration not allowed')
  )
    return 'open';
  return 'unknown';
}

// ─── parseLevel (courtreserve) ────────────────────────────────────────────────
function parseLevel(name: string): string | null {
  const duprMatch = name.match(/\(([0-9.]+\s*[-–+][0-9.]*)\)/);
  if (duprMatch) return duprMatch[1];
  const levelParens = name.match(/\(([0-9.]+\+?)\)/);
  if (levelParens) return levelParens[1];
  if (/beginner/i.test(name)) return 'Beginner';
  if (/advanced/i.test(name)) return 'Advanced';
  if (/intermediate/i.test(name)) return 'Intermediate';
  return null;
}

// ─── parseDate (courtreserve) ─────────────────────────────────────────────────
function parseDate(dateStr: string): Date | null {
  const cleaned = dateStr.replace(/(\d+)(st|nd|rd|th)/, '$1');
  const now = new Date();
  const parsed = new Date(`${cleaned} ${now.getFullYear()}`);
  if (isNaN(parsed.getTime())) return null;
  if (now.getTime() - parsed.getTime() > 60 * 24 * 60 * 60 * 1000) {
    parsed.setFullYear(now.getFullYear() + 1);
  }
  return parsed;
}

describe('parseStatus', () => {
  it('returns full for "FULL"', () => expect(parseStatus('FULL')).toBe('full'));
  it('returns full for "Full"', () => expect(parseStatus('Full')).toBe('full'));
  it('returns full for "Join Waitlist"', () => expect(parseStatus('Join Waitlist')).toBe('full'));
  it('returns open for "Register"', () => expect(parseStatus('Register')).toBe('open'));
  it('returns open for "24 of 24 spots remaining"', () =>
    expect(parseStatus('24 of 24 spots remaining')).toBe('open'));
  it('returns open for "Registration not allowed for this event" (drop-in)', () =>
    expect(parseStatus('Registration not allowed for this event')).toBe('open'));
  it('returns open for "registration opens"', () =>
    expect(parseStatus('Registration opens soon')).toBe('open'));
  it('returns unknown for unrecognized text', () =>
    expect(parseStatus('Some other text')).toBe('unknown'));
});

describe('parseLevel', () => {
  it('extracts DUPR range in parens: "(3.5+)"', () =>
    expect(parseLevel('PLAY THE PRO (3.5+)')).toBe('3.5+'));
  it('extracts DUPR range: "(3.0-3.5)"', () =>
    expect(parseLevel('Open Play (3.0-3.5)')).toBe('3.0-3.5'));
  it('returns Beginner for beginner keyword', () =>
    expect(parseLevel('Open Play - Beginner')).toBe('Beginner'));
  it('returns Advanced for advanced keyword', () =>
    expect(parseLevel('Advanced Drills')).toBe('Advanced'));
  it('returns Intermediate for intermediate keyword', () =>
    expect(parseLevel('Intermediate Open Play')).toBe('Intermediate'));
  it('returns null for no level info', () =>
    expect(parseLevel('OPEN PLAY PICKLEBALL')).toBeNull());
});

describe('parseDate', () => {
  it('strips ordinal suffix: "Wed, Mar 25th"', () => {
    const d = parseDate('Wed, Mar 25th');
    expect(d).not.toBeNull();
    expect(d!.getMonth()).toBe(2); // March = 2
    expect(d!.getDate()).toBe(25);
  });
  it('handles 1st', () => {
    const d = parseDate('Fri, Apr 1st');
    expect(d!.getDate()).toBe(1);
    expect(d!.getMonth()).toBe(3); // April
  });
  it('handles 2nd ordinal suffix', () => {
    const d = parseDate('Wed, Apr 2nd');
    expect(d!.getDate()).toBe(2);
    expect(d!.getMonth()).toBe(3);
  });
});

// Forté tests moved to test/forte.test.ts. The legacy Playwright-based scraper
// (which parsed dates from CourtReserve URL params and Wix event-detail slugs)
// was replaced with a fetch-only scraper that reads the Wix event JSON inlined
// in the server-rendered HTML. See extractEventsFromHtml + eventToGame.

// ─── parseLevel (meetup) ──────────────────────────────────────────────────────
function parseLevelMeetup(title: string, description: string): string | null {
  const text = `${title} ${description || ''}`;
  if (/\ball\s*levels?\b/i.test(text)) return 'All levels';
  if (/beginner/i.test(text)) return 'Beginner';
  if (/advanced/i.test(text)) return 'Advanced';
  if (/intermediate/i.test(text)) return 'Intermediate';
  if (/novice/i.test(text)) return 'Novice';
  const duprMatch = text.match(/(\d+\.\d+)\s*[-–]\s*(\d+(?:\.\d+)?)/);
  if (duprMatch) return `DUPR ${duprMatch[1]}–${duprMatch[2]}`;
  return null;
}

describe('parseLevel (meetup)', () => {
  it('returns "All levels" for "all levels"', () =>
    expect(parseLevelMeetup('Open Play - All Levels', '')).toBe('All levels'));
  it('returns "All levels" for "all level"', () =>
    expect(parseLevelMeetup('All Level Pickleball', '')).toBe('All levels'));
  it('returns "Beginner" for beginner keyword', () =>
    expect(parseLevelMeetup('Beginner Clinic', '')).toBe('Beginner'));
  it('returns "Advanced" for advanced keyword', () =>
    expect(parseLevelMeetup('Advanced Open Play', '')).toBe('Advanced'));
  it('returns "Intermediate" for intermediate keyword', () =>
    expect(parseLevelMeetup('Intermediate Drills', '')).toBe('Intermediate'));
  it('returns "Novice" for novice keyword', () =>
    expect(parseLevelMeetup('Novice Night', '')).toBe('Novice'));
  it('returns DUPR range for "3.5-4.0" in title', () =>
    expect(parseLevelMeetup('Open Play 3.5-4.0', '')).toBe('DUPR 3.5–4.0'));
  it('returns null for no level info', () =>
    expect(parseLevelMeetup('Sunday Pickleball', '')).toBeNull());
});

// ─── scrapeHolua ─────────────────────────────────────────────────────────────
import { scrapeHolua } from '../agents/holua.mjs';

describe('scrapeHolua', () => {
  it('returns [] for empty facilities', async () => {
    expect(await scrapeHolua([], new Date(), new Date())).toEqual([]);
  });

  it('returns [] for non-holua facilities', async () => {
    const facilities = [{ source: 'meetup' as const, name: 'Test', city: 'Test', groupUrlname: 'test' }];
    expect(await scrapeHolua(facilities, new Date(), new Date())).toEqual([]);
  });

  it('generates slots for a single day (Monday)', async () => {
    // Find next Monday
    const monday = new Date();
    while (monday.getDay() !== 1) monday.setDate(monday.getDate() + 1);
    monday.setHours(0, 0, 0, 0);

    const facilities = [{ source: 'holua' as const, name: 'Holua Racquet & Paddle', city: 'Kailua-Kona' }];
    const games = await scrapeHolua(facilities, monday, monday);

    // Monday has 2 slots: 8am-12pm and 4pm-9pm
    expect(games).toHaveLength(2);
    expect(games[0].source).toBe('holua');
    expect(games[0].price).toBe('$15');
    expect(games[0].venue).toBe('Holua Racquet & Paddle');
  });

  it('generates 0 slots for Saturday (no regular open play)', async () => {
    const saturday = new Date();
    while (saturday.getDay() !== 6) saturday.setDate(saturday.getDate() + 1);
    saturday.setHours(0, 0, 0, 0);

    const facilities = [{ source: 'holua' as const, name: 'Holua Racquet & Paddle', city: 'Kailua-Kona' }];
    const games = await scrapeHolua(facilities, saturday, saturday);
    expect(games).toHaveLength(0);
  });

  it('marks beginner-friendly slots correctly', async () => {
    // Find next Sunday (has beginner-friendly slots)
    const sunday = new Date();
    while (sunday.getDay() !== 0) sunday.setDate(sunday.getDate() + 1);
    sunday.setHours(0, 0, 0, 0);

    const facilities = [{ source: 'holua' as const, name: 'Holua Racquet & Paddle', city: 'Kailua-Kona' }];
    const games = await scrapeHolua(facilities, sunday, sunday);

    expect(games).toHaveLength(2);
    expect(games.every(g => g.level === 'Beginner-friendly')).toBe(true);
    expect(games.every(g => g.programName.includes('Beginner-friendly'))).toBe(true);
  });
});
