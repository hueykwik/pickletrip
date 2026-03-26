export interface PlayByPointFacility {
  source: 'playbypoint';
  name: string;
  city: string;
  slug: string;
}

export interface CourtReserveFacility {
  source: 'courtreserve';
  name: string;
  city: string;
  url: string;
}

export type FacilityConfig = PlayByPointFacility | CourtReserveFacility;

/**
 * Metro areas: each metro maps to a human-readable label and a list of facilities.
 * Add new metros by adding an entry here — the aliases and route tables pick it up automatically.
 */
const METRO_AREAS: Record<string, { label: string; facilities: FacilityConfig[] }> = {
  'greater-los-angeles': {
    label: 'Greater Los Angeles Area',
    facilities: [
      {
        source: 'playbypoint',
        name: 'West Hollywood Park',
        city: 'West Hollywood',
        slug: 'west-hollywood-park-tennis-courts',
      },
      {
        source: 'playbypoint',
        name: 'Plummer Park',
        city: 'West Hollywood',
        slug: 'plummer-park',
      },
      // TODO: Add California Smash (El Segundo) once CourtReserve facility ID is confirmed
    ],
  },
};

/**
 * City alias map: any variation a user might type → canonical metro key.
 * Case-insensitive matching is applied before lookup (see resolveFacilities).
 */
const METRO_ALIASES: Record<string, string> = {
  // Greater Los Angeles Area
  'west hollywood': 'greater-los-angeles',
  'weho': 'greater-los-angeles',
  'west la': 'greater-los-angeles',
  'la': 'greater-los-angeles',
  'los angeles': 'greater-los-angeles',
  'bh': 'greater-los-angeles',
  'beverly hills': 'greater-los-angeles',
  'santa monica': 'greater-los-angeles',
  'culver city': 'greater-los-angeles',
  'el segundo': 'greater-los-angeles',
};

/**
 * Resolve a user-typed city string to the list of facilities to scrape.
 * Returns [] for unknown cities.
 */
export function resolveFacilities(city: string): FacilityConfig[] {
  const normalized = city.trim().toLowerCase();
  if (!normalized) return [];
  const metroKey = METRO_ALIASES[normalized];
  if (!metroKey) return [];
  return METRO_AREAS[metroKey]?.facilities ?? [];
}

/**
 * Resolve a user-typed city string to the metro display label.
 * Returns null for unknown cities.
 */
export function resolveMetroName(city: string): string | null {
  const normalized = city.trim().toLowerCase();
  if (!normalized) return null;
  const metroKey = METRO_ALIASES[normalized];
  if (!metroKey) return null;
  return METRO_AREAS[metroKey]?.label ?? null;
}
