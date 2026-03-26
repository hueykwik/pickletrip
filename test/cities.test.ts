import { describe, it, expect } from 'vitest';
import { resolveFacilities, resolveMetroName } from '../lib/cities';

describe('resolveFacilities', () => {
  it('returns 2 facilities for "west hollywood"', () => {
    const facilities = resolveFacilities('west hollywood');
    expect(facilities).toHaveLength(2);
    expect(facilities.every(f => f.source === 'playbypoint')).toBe(true);
  });

  it('returns 2 facilities for alias "la"', () => {
    const facilities = resolveFacilities('la');
    expect(facilities).toHaveLength(2);
  });

  it('returns 2 facilities for alias "weho"', () => {
    const facilities = resolveFacilities('weho');
    expect(facilities).toHaveLength(2);
  });

  it('returns 2 facilities for "el segundo" (interim WeHo behavior)', () => {
    const facilities = resolveFacilities('el segundo');
    expect(facilities).toHaveLength(2);
  });

  it('returns [] for unknown city "timbuktu"', () => {
    expect(resolveFacilities('timbuktu')).toEqual([]);
  });

  it('returns [] for empty string', () => {
    expect(resolveFacilities('')).toEqual([]);
  });

  it('is case-insensitive: "West Hollywood" → same as "west hollywood"', () => {
    expect(resolveFacilities('West Hollywood')).toHaveLength(2);
  });

  it('trims whitespace: "  LA  " → same as "la"', () => {
    expect(resolveFacilities('  LA  ')).toHaveLength(2);
  });
});

describe('resolveMetroName', () => {
  it('returns "Greater Los Angeles Area" for "west hollywood"', () => {
    expect(resolveMetroName('west hollywood')).toBe('Greater Los Angeles Area');
  });

  it('returns "Greater Los Angeles Area" for alias "la"', () => {
    expect(resolveMetroName('la')).toBe('Greater Los Angeles Area');
  });

  it('returns "Greater Los Angeles Area" for "el segundo"', () => {
    expect(resolveMetroName('el segundo')).toBe('Greater Los Angeles Area');
  });

  it('returns null for unknown city "timbuktu"', () => {
    expect(resolveMetroName('timbuktu')).toBeNull();
  });

  it('returns null for empty string', () => {
    expect(resolveMetroName('')).toBeNull();
  });
});
