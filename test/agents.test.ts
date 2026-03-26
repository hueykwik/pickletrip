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
