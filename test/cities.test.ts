import { describe, it, expect } from 'vitest';
import { resolveFacilities, resolveMetroName } from '../lib/cities';

const LA_FACILITY_COUNT = 8;

describe('resolveFacilities', () => {
  it(`returns ${LA_FACILITY_COUNT} facilities for "west hollywood"`, () => {
    const facilities = resolveFacilities('west hollywood');
    expect(facilities).toHaveLength(LA_FACILITY_COUNT);
    expect(facilities.some(f => f.source === 'playbypoint')).toBe(true);
    expect(facilities.some(f => f.source === 'courtreserve')).toBe(true);
  });

  it(`returns ${LA_FACILITY_COUNT} facilities for alias "la"`, () => {
    const facilities = resolveFacilities('la');
    expect(facilities).toHaveLength(LA_FACILITY_COUNT);
  });

  it(`returns ${LA_FACILITY_COUNT} facilities for alias "weho"`, () => {
    const facilities = resolveFacilities('weho');
    expect(facilities).toHaveLength(LA_FACILITY_COUNT);
  });

  it(`returns ${LA_FACILITY_COUNT} facilities for "el segundo" (interim WeHo behavior)`, () => {
    const facilities = resolveFacilities('el segundo');
    expect(facilities).toHaveLength(LA_FACILITY_COUNT);
  });

  it('returns [] for unknown city "timbuktu"', () => {
    expect(resolveFacilities('timbuktu')).toEqual([]);
  });

  it('returns [] for empty string', () => {
    expect(resolveFacilities('')).toEqual([]);
  });

  it('is case-insensitive: "West Hollywood" → same as "west hollywood"', () => {
    expect(resolveFacilities('West Hollywood')).toHaveLength(LA_FACILITY_COUNT);
  });

  it('trims whitespace: "  LA  " → same as "la"', () => {
    expect(resolveFacilities('  LA  ')).toHaveLength(LA_FACILITY_COUNT);
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
