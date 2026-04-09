export interface PlayByPointFacility {
  source: 'playbypoint';
  name: string;
  city: string;
  /** Standard facility slug — resolves to app.playbypoint.com/f/{slug} */
  slug?: string;
  /** Full URL for branded/subdomain facilities e.g. https://piklla.playbypoint.com */
  url?: string;
}

export interface CourtReserveFacility {
  source: 'courtreserve';
  name: string;
  city: string;
  url: string;
}

export interface ForteFacility {
  source: 'forte';
  name: string;
  city: string;
}

export interface MeetupFacility {
  source: 'meetup';
  name: string;
  city: string;
  /** Meetup group URL name, e.g. "oahu-pickleball-association" */
  groupUrlname: string;
}

export interface HoluaFacility {
  source: 'holua';
  name: string;
  city: string;
}

export interface PodPlayFacility {
  source: 'podplay';
  name: string;
  city: string;
  /** Base URL of the PodPlay tenant, e.g. https://bigcitypickle.podplay.app */
  url: string;
  /** Area slug — used to build /book/{areaSlug}/{date} */
  areaSlug: string;
}

export type FacilityConfig = PlayByPointFacility | CourtReserveFacility | ForteFacility | MeetupFacility | PodPlayFacility | HoluaFacility;

/**
 * Metro areas: each metro maps to a human-readable label and a list of facilities.
 * Add new metros by adding an entry here — the aliases and route tables pick it up automatically.
 */
const METRO_AREAS: Record<string, { label: string; facilities: FacilityConfig[] }> = {
  'greater-los-angeles': {
    label: 'Greater Los Angeles Area',
    facilities: [
      // West Hollywood
      {
        source: 'playbypoint',
        name: 'Plummer Park',
        city: 'West Hollywood',
        slug: 'plummer-park',
      },
      // Los Angeles
      {
        source: 'playbypoint',
        name: 'PIKL Los Angeles',
        city: 'Los Angeles',
        url: 'https://piklla.playbypoint.com',
      },
      {
        source: 'playbypoint',
        name: 'Project Pickleball',
        city: 'Los Angeles',
        url: 'https://projectpickleball.playbypoint.com',
      },
      // Westchester / Playa Del Rey
      {
        source: 'playbypoint',
        name: 'Westchester Playa Pickleball',
        city: 'Los Angeles',
        url: 'https://westchesterpickleball.playbypoint.com',
      },
      // Westwood
      {
        source: 'playbypoint',
        name: 'Westwood Pickleball Center',
        city: 'Westwood',
        url: 'https://westwoodpbcenter.playbypoint.com',
      },
      // Santa Monica
      {
        source: 'playbypoint',
        name: 'Santa Monica Pickleball Center',
        city: 'Santa Monica',
        url: 'https://santamonicapickleball.playbypoint.com',
      },
      // Beverly Hills
      {
        source: 'playbypoint',
        name: 'La Cienega Tennis Center',
        city: 'Beverly Hills',
        url: 'https://beverlyhillslctc.playbypoint.com',
      },
    ],
  },
  'honolulu': {
    label: 'Honolulu, HI',
    facilities: [
      {
        source: 'forte',
        name: 'Pickles at Forté',
        city: 'Honolulu',
      },
      {
        source: 'meetup',
        name: 'Oahu Pickleball Association',
        city: 'Honolulu',
        groupUrlname: 'oahu-pickleball-association',
      },
    ],
  },
  'big-island': {
    label: 'Big Island, HI',
    facilities: [
      {
        source: 'holua',
        name: 'Holua Racquet & Paddle',
        city: 'Kailua-Kona',
      },
    ],
  },
  'san-francisco': {
    label: 'San Francisco, CA',
    facilities: [
      {
        source: 'playbypoint',
        name: 'Bay Padel – Treasure Island',
        city: 'San Francisco',
        url: 'https://baypadel.playbypoint.com',
      },
      {
        source: 'playbypoint',
        name: 'Bay Padel – Dogpatch',
        city: 'San Francisco',
        url: 'https://dogpatch.playbypoint.com',
      },
      {
        source: 'playbypoint',
        name: 'Mission Bay Pickleball Center',
        city: 'San Francisco',
        url: 'https://missionbaypickleball.playbypoint.com',
      },
      {
        source: 'meetup',
        name: 'Silly Pickles Pickleball SF',
        city: 'San Francisco',
        groupUrlname: 'silly-pickles-pickleball-san-francisco',
      },
      {
        source: 'meetup',
        name: 'BAY PICKLEBALL',
        city: 'San Francisco',
        groupUrlname: 'bay-pickleball',
      },
    ],
  },
  'east-bay': {
    label: 'East Bay, CA',
    facilities: [
      {
        source: 'meetup',
        name: 'Berkeley/Oakland Pickleball',
        city: 'Oakland',
        groupUrlname: 'Berkeley-Pickle-Ball-Meetup-Group',
      },
      {
        source: 'meetup',
        name: 'Bay Area Pickleball Alliance',
        city: 'Richmond',
        groupUrlname: 'Bay-Area-Pickleball-Alliance',
      },
    ],
  },
  'silicon-valley': {
    label: 'Silicon Valley, CA',
    facilities: [
      {
        source: 'courtreserve',
        name: 'The HUB Silicon Valley',
        city: 'Campbell',
        url: 'https://app.courtreserve.com/Online/Events/Index/10054',
      },
    ],
  },
  'seattle': {
    label: 'Seattle, WA',
    facilities: [
      {
        source: 'playbypoint',
        name: 'Picklewood',
        city: 'Seattle',
        url: 'https://picklewood.playbypoint.com',
      },
      {
        source: 'courtreserve',
        name: 'Side Out Tsunami',
        city: 'Seattle',
        url: 'https://app.courtreserve.com/Online/Events/Index/16870',
      },
      {
        source: 'courtreserve',
        name: 'Redmond Indoor Pickleball',
        city: 'Redmond',
        url: 'https://app.courtreserve.com/Online/Events/Index/7306',
      },
      {
        source: 'courtreserve',
        name: 'The Lodge at St. Edward',
        city: 'Kenmore',
        url: 'https://app.courtreserve.com/Online/Events/Index/8840',
      },
      {
        source: 'meetup',
        name: 'Seattle Pickleball',
        city: 'Seattle',
        groupUrlname: 'seattle-pickleball',
      },
    ],
  },
  'chicago': {
    label: 'Chicago, IL',
    facilities: [
      // Big City Pickle and SPF use PodPlay. CourtReserve venues (Pickleball Clubhouse/13168,
      // Sure Shot/9585, Pickledilly/13337) all redirect to member login — can't be scraped.
      // BCP Lincoln Yards and South Loop are "Coming soon!" (disabled in the UI).
      {
        source: 'podplay',
        name: 'BCP West Loop',
        city: 'Chicago',
        url: 'https://bigcitypickle.podplay.app',
        areaSlug: 'bcp-west-loop',
      },
      {
        source: 'podplay',
        name: 'BCP Fulton Market',
        city: 'Chicago',
        url: 'https://bigcitypickle.podplay.app',
        areaSlug: 'bcp-fulton-market',
      },
      {
        source: 'podplay',
        name: 'BCP Gold Coast',
        city: 'Chicago',
        url: 'https://bigcitypickle.podplay.app',
        areaSlug: 'bcp-gold-coast',
      },
      {
        source: 'podplay',
        name: 'Chicago Athletic Association',
        city: 'Chicago',
        url: 'https://bigcitypickle.podplay.app',
        areaSlug: 'chicago-athletic-association',
      },
      {
        source: 'podplay',
        name: 'SPF Lincoln Park',
        city: 'Chicago',
        url: 'https://spf.podplay.app',
        areaSlug: 'lincoln-park',
      },
      {
        source: 'podplay',
        name: 'SPF All Day',
        city: 'Chicago',
        url: 'https://spf.podplay.app',
        areaSlug: 'spf-all-day',
      },
      {
        source: 'podplay',
        name: 'SPF The Sport House',
        city: 'Chicago',
        url: 'https://spf.podplay.app',
        areaSlug: 'the-sport-house',
      },
    ],
  },
  'atlanta': {
    label: 'Atlanta, GA',
    facilities: [
      {
        source: 'playbypoint',
        name: 'Sandy Springs Racquet Center',
        city: 'Sandy Springs',
        url: 'https://sandyspringstc.playbypoint.com',
      },
      {
        source: 'playbypoint',
        name: 'Bitsy Grant Tennis Center',
        city: 'Atlanta',
        url: 'https://bitsygrant.playbypoint.com',
      },
      {
        source: 'courtreserve',
        name: 'Atlanta Pickleball Center',
        city: 'Atlanta',
        url: 'https://app.courtreserve.com/Online/Events/Index/8777',
      },
      {
        source: 'courtreserve',
        name: 'Atlanta National Pickleball Club',
        city: 'Alpharetta',
        url: 'https://app.courtreserve.com/Online/Events/Index/16024',
      },
      {
        source: 'podplay',
        name: 'Pickleball Kingdom South Cobb',
        city: 'Austell',
        url: 'https://pickleballkingdom.podplay.app',
        areaSlug: 'south-cobb',
      },
      {
        source: 'meetup',
        name: 'Atlanta Indoor Pickleball',
        city: 'Atlanta',
        groupUrlname: 'atlanta-pickleball',
      },
    ],
  },
  'new-york': {
    label: 'New York, NY',
    facilities: [
      // Note: CityPickle's permanent venues (Times Square, Atlantic Terminal) moved to PodPlay.
      // This slug covers their seasonal outdoor courts (Wollman Rink/Central Park area).
      {
        source: 'playbypoint',
        name: 'CityPickle',
        city: 'New York',
        slug: 'citypickle',
      },
      {
        source: 'courtreserve',
        name: 'PKLYN',
        city: 'Brooklyn',
        url: 'https://app.courtreserve.com/Online/Events/Index/11868',
      },
      {
        source: 'courtreserve',
        name: 'Open Play Pickleball',
        city: 'Florham Park',
        url: 'https://app.courtreserve.com/Online/Events/Index/16810',
      },
      {
        source: 'meetup',
        name: 'Pickleball for Fun!',
        city: 'New York',
        groupUrlname: 'pickleball-fun',
      },
    ],
  },
  'south-florida': {
    label: 'South Florida',
    facilities: [
      {
        source: 'playbypoint',
        name: 'Fair Expo Pickleball',
        city: 'Miami',
        url: 'https://fairexpo.playbypoint.com',
      },
      {
        source: 'playbypoint',
        name: 'Miami Shores Tennis & Pickleball',
        city: 'Miami Shores',
        slug: 'miami-shores-tennis-club',
      },
      {
        source: 'playbypoint',
        name: 'Diadem Pickleball Complex',
        city: 'Coconut Creek',
        url: 'https://diadempickleballcomplex.playbypoint.com',
      },
      {
        source: 'meetup',
        name: 'Pickleball Miami – Dink & Link',
        city: 'Miami',
        // Note: canonical slug has double-l typo — this is the correct Meetup URL name
        groupUrlname: 'pickellball-miami',
      },
      {
        source: 'meetup',
        name: 'Boca Raton Pickleball',
        city: 'Boca Raton',
        groupUrlname: 'boca-raton-pickleball-meetup-group',
      },
      {
        source: 'meetup',
        name: 'Fort Lauderdale Pickleball League',
        city: 'Fort Lauderdale',
        groupUrlname: 'east-fort-lauderdale-pickleball-league',
      },
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
  // Honolulu
  'honolulu': 'honolulu',
  'oahu': 'honolulu',
  // Big Island
  'big island': 'big-island',
  'big island hawaii': 'big-island',
  'kona': 'big-island',
  'kailua-kona': 'big-island',
  'kailua kona': 'big-island',
  'hilo': 'big-island',
  'waikoloa': 'big-island',
  'kohala coast': 'big-island',
  'hawaii island': 'big-island',
  // San Francisco
  'san francisco': 'san-francisco',
  'sf': 'san-francisco',
  'soma': 'san-francisco',
  'mission': 'san-francisco',
  'dogpatch': 'san-francisco',
  'mission bay': 'san-francisco',
  'treasure island': 'san-francisco',
  'noe valley': 'san-francisco',
  'marina': 'san-francisco',
  'castro': 'san-francisco',
  // East Bay
  'east bay': 'east-bay',
  'oakland': 'east-bay',
  'berkeley': 'east-bay',
  'emeryville': 'east-bay',
  'richmond': 'east-bay',
  'albany': 'east-bay',
  'walnut creek': 'east-bay',
  'fremont': 'east-bay',
  // Silicon Valley
  'silicon valley': 'silicon-valley',
  'sv': 'silicon-valley',
  'san jose': 'silicon-valley',
  'sj': 'silicon-valley',
  'palo alto': 'silicon-valley',
  'menlo park': 'silicon-valley',
  'mountain view': 'silicon-valley',
  'sunnyvale': 'silicon-valley',
  'campbell': 'silicon-valley',
  'santa clara': 'silicon-valley',
  'cupertino': 'silicon-valley',
  'san mateo': 'silicon-valley',
  'redwood city': 'silicon-valley',
  // Seattle
  'seattle': 'seattle',
  'sea': 'seattle',
  'bellevue': 'seattle',
  'redmond': 'seattle',
  'kirkland': 'seattle',
  'kenmore': 'seattle',
  'bothell': 'seattle',
  'issaquah': 'seattle',
  // Chicago
  'chicago': 'chicago',
  'chi': 'chicago',
  'naperville': 'chicago',
  'skokie': 'chicago',
  'evanston': 'chicago',
  'oak park': 'chicago',
  'schaumburg': 'chicago',
  // Atlanta
  'atlanta': 'atlanta',
  'atl': 'atlanta',
  'buckhead': 'atlanta',
  'midtown atlanta': 'atlanta',
  'sandy springs': 'atlanta',
  'alpharetta': 'atlanta',
  'marietta': 'atlanta',
  'decatur': 'atlanta',
  'roswell': 'atlanta',
  'dunwoody': 'atlanta',
  'smyrna': 'atlanta',
  'austell': 'atlanta',
  // New York
  'new york': 'new-york',
  'nyc': 'new-york',
  'ny': 'new-york',
  'manhattan': 'new-york',
  'brooklyn': 'new-york',
  'queens': 'new-york',
  'bronx': 'new-york',
  'hoboken': 'new-york',
  'jersey city': 'new-york',
  'new jersey': 'new-york',
  'nj': 'new-york',
  // South Florida
  'south florida': 'south-florida',
  'miami': 'south-florida',
  'miami beach': 'south-florida',
  'miami shores': 'south-florida',
  'fort lauderdale': 'south-florida',
  'ft lauderdale': 'south-florida',
  'boca raton': 'south-florida',
  'boca': 'south-florida',
  'west palm beach': 'south-florida',
  'wpb': 'south-florida',
  'coconut creek': 'south-florida',
  'pompano beach': 'south-florida',
  'hollywood': 'south-florida',
  'hallandale': 'south-florida',
};

/**
 * Resolve a user-typed city string to the list of facilities to scrape.
 * Returns [] for unknown cities.
 */
export function resolveFacilities(city: string): FacilityConfig[] {
  const normalized = city.trim().toLowerCase();
  if (!normalized) return [];
  // Check direct metro key first (used by cron), then aliases (used by user search)
  if (METRO_AREAS[normalized]) return METRO_AREAS[normalized].facilities;
  const metroKey = METRO_ALIASES[normalized];
  if (!metroKey) return [];
  return METRO_AREAS[metroKey]?.facilities ?? [];
}

/**
 * Resolve a user-typed city string to the metro display label.
 * Returns null for unknown cities.
 */
/**
 * Return all metro keys. Used by the cron pre-scrape endpoint to enumerate metros.
 */
export function getMetroKeys(): string[] {
  return Object.keys(METRO_AREAS);
}

export function resolveMetroName(city: string): string | null {
  const normalized = city.trim().toLowerCase();
  if (!normalized) return null;
  // Check direct metro key first (used by cron), then aliases (used by user search)
  if (METRO_AREAS[normalized]) return METRO_AREAS[normalized].label;
  const metroKey = METRO_ALIASES[normalized];
  if (!metroKey) return null;
  return METRO_AREAS[metroKey]?.label ?? null;
}
