export interface Game {
  id: string;
  source: 'playbypoint' | 'courtreserve' | 'forte' | 'meetup' | 'podplay' | 'holua';
  venue: string;
  programName: string;
  date: string;
  time: string;
  status: 'open' | 'full' | 'unknown';
  level: string | null;
  url: string;
  price: string | null;
  city: string;
  /** Display name of the facility/group that produced this game (e.g. Meetup group name) */
  facilityName?: string;
}
