import { describe, it, expect } from 'vitest';
import { resolveFacilities, resolveMetroName, getMetroKeys } from '../lib/cities';

const LA_FACILITY_COUNT = 7;

describe('resolveFacilities', () => {
  it(`returns ${LA_FACILITY_COUNT} facilities for "west hollywood"`, () => {
    const facilities = resolveFacilities('west hollywood');
    expect(facilities).toHaveLength(LA_FACILITY_COUNT);
    expect(facilities.some(f => f.source === 'playbypoint')).toBe(true);
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

  it('returns "Honolulu, HI" for "honolulu"', () => {
    expect(resolveMetroName('honolulu')).toBe('Honolulu, HI');
  });

  it('returns "Honolulu, HI" for alias "oahu"', () => {
    expect(resolveMetroName('oahu')).toBe('Honolulu, HI');
  });

});

const HONOLULU_FACILITY_COUNT = 2;

describe('resolveFacilities — Honolulu', () => {
  it(`returns ${HONOLULU_FACILITY_COUNT} facilities for "honolulu"`, () => {
    const facilities = resolveFacilities('honolulu');
    expect(facilities).toHaveLength(HONOLULU_FACILITY_COUNT);
  });

  it(`returns ${HONOLULU_FACILITY_COUNT} facilities for alias "oahu"`, () => {
    expect(resolveFacilities('oahu')).toHaveLength(HONOLULU_FACILITY_COUNT);
  });

  it('includes a forte source', () => {
    const facilities = resolveFacilities('honolulu');
    expect(facilities.some(f => f.source === 'forte')).toBe(true);
  });

  it('includes a meetup source with groupUrlname', () => {
    const facilities = resolveFacilities('honolulu');
    const meetup = facilities.find(f => f.source === 'meetup');
    expect(meetup).toBeDefined();
    expect((meetup as { groupUrlname: string }).groupUrlname).toBe('oahu-pickleball-association');
  });
});

const BIG_ISLAND_FACILITY_COUNT = 1;

describe('resolveFacilities — Big Island', () => {
  it(`returns ${BIG_ISLAND_FACILITY_COUNT} facility for "big island"`, () => {
    expect(resolveFacilities('big island')).toHaveLength(BIG_ISLAND_FACILITY_COUNT);
  });

  it(`returns ${BIG_ISLAND_FACILITY_COUNT} facility for alias "kona"`, () => {
    expect(resolveFacilities('kona')).toHaveLength(BIG_ISLAND_FACILITY_COUNT);
  });

  it(`returns ${BIG_ISLAND_FACILITY_COUNT} facility for alias "hilo"`, () => {
    expect(resolveFacilities('hilo')).toHaveLength(BIG_ISLAND_FACILITY_COUNT);
  });

  it(`returns ${BIG_ISLAND_FACILITY_COUNT} facility for alias "waikoloa"`, () => {
    expect(resolveFacilities('waikoloa')).toHaveLength(BIG_ISLAND_FACILITY_COUNT);
  });

  it('includes a holua source', () => {
    const facilities = resolveFacilities('big island');
    expect(facilities.some(f => f.source === 'holua')).toBe(true);
  });

  it('returns "Big Island, HI" for resolveMetroName("kona")', () => {
    expect(resolveMetroName('kona')).toBe('Big Island, HI');
  });

  it('returns "Big Island, HI" for resolveMetroName("big island")', () => {
    expect(resolveMetroName('big island')).toBe('Big Island, HI');
  });
});

const SINGAPORE_FACILITY_COUNT = 6;

describe('resolveFacilities — Singapore', () => {
  it(`returns ${SINGAPORE_FACILITY_COUNT} facilities for "singapore"`, () => {
    expect(resolveFacilities('singapore')).toHaveLength(SINGAPORE_FACILITY_COUNT);
  });

  it(`returns ${SINGAPORE_FACILITY_COUNT} facilities for alias "sg"`, () => {
    expect(resolveFacilities('sg')).toHaveLength(SINGAPORE_FACILITY_COUNT);
  });

  it(`returns ${SINGAPORE_FACILITY_COUNT} facilities for alias "jurong"`, () => {
    expect(resolveFacilities('jurong')).toHaveLength(SINGAPORE_FACILITY_COUNT);
  });

  it('includes playbypoint sources', () => {
    const facilities = resolveFacilities('singapore');
    expect(facilities.some(f => f.source === 'playbypoint')).toBe(true);
  });

  it('includes meetup sources', () => {
    const facilities = resolveFacilities('singapore');
    expect(facilities.some(f => f.source === 'meetup')).toBe(true);
  });

  it('returns "Singapore" for resolveMetroName("singapore")', () => {
    expect(resolveMetroName('singapore')).toBe('Singapore');
  });

  it('returns "Singapore" for resolveMetroName("sg")', () => {
    expect(resolveMetroName('sg')).toBe('Singapore');
  });
});

const SEOUL_FACILITY_COUNT = 3;

describe('resolveFacilities — Seoul', () => {
  it(`returns ${SEOUL_FACILITY_COUNT} facilities for "seoul"`, () => {
    expect(resolveFacilities('seoul')).toHaveLength(SEOUL_FACILITY_COUNT);
  });

  it(`returns ${SEOUL_FACILITY_COUNT} facilities for alias "korea"`, () => {
    expect(resolveFacilities('korea')).toHaveLength(SEOUL_FACILITY_COUNT);
  });

  it('includes only meetup sources', () => {
    const facilities = resolveFacilities('seoul');
    expect(facilities.every(f => f.source === 'meetup')).toBe(true);
  });

  it('returns "Seoul, South Korea" for resolveMetroName("seoul")', () => {
    expect(resolveMetroName('seoul')).toBe('Seoul, South Korea');
  });

  it('returns "Seoul, South Korea" for resolveMetroName("korea")', () => {
    expect(resolveMetroName('korea')).toBe('Seoul, South Korea');
  });
});

describe('getMetroKeys', () => {
  it('returns an array of metro keys', () => {
    const keys = getMetroKeys();
    expect(Array.isArray(keys)).toBe(true);
    expect(keys.length).toBeGreaterThan(0);
  });

  it('includes big-island', () => {
    expect(getMetroKeys()).toContain('big-island');
  });

  it('includes honolulu', () => {
    expect(getMetroKeys()).toContain('honolulu');
  });

  it('includes greater-los-angeles', () => {
    expect(getMetroKeys()).toContain('greater-los-angeles');
  });

  it('includes singapore', () => {
    expect(getMetroKeys()).toContain('singapore');
  });

  it('includes seoul', () => {
    expect(getMetroKeys()).toContain('seoul');
  });
});
