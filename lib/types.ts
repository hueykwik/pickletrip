export interface Game {
  id: string;
  source: 'playbypoint' | 'courtreserve';
  venue: string;
  programName: string;
  date: string;
  time: string;
  status: 'open' | 'full' | 'unknown';
  level: string | null;
  url: string;
  price: string | null;
  city: string;
}
