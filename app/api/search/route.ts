import { NextRequest } from 'next/server';
import { scrapePlayByPoint } from '@/agents/playbypoint.mjs';
import { scrapeCourtReserve } from '@/agents/courtreserve.mjs';
import { scrapeForte } from '@/agents/forte.mjs';
import { scrapeMeetup } from '@/agents/meetup.mjs';
import { resolveFacilities, resolveMetroName, type FacilityConfig } from '@/lib/cities';
import type { Game } from '@/lib/types';

export const runtime = 'nodejs';
export const maxDuration = 300; // 5 minutes

type ScrapeFn = (facilities: FacilityConfig[], dateFrom: Date, dateTo: Date) => Promise<Game[]>;

export async function POST(req: NextRequest) {
  const { city, dateFrom, dateTo } = await req.json();

  if (!city || !dateFrom || !dateTo) {
    return new Response('Missing required fields', { status: 400 });
  }

  if (typeof city === 'string' && city.length > 100) {
    return new Response('City name too long', { status: 400 });
  }

  const facilities = resolveFacilities(city);
  const metroName = resolveMetroName(city);

  if (facilities.length === 0) {
    return new Response(
      `data: ${JSON.stringify({ done: true, total: 0 })}\n\n`,
      {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        },
      }
    );
  }

  const from = new Date(dateFrom);
  const to = new Date(dateTo);

  if (isNaN(from.getTime()) || isNaN(to.getTime())) {
    return new Response('Invalid date format', { status: 400 });
  }

  // Set to end of day so the dateTo date is inclusive
  to.setHours(23, 59, 59, 999);

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      function emit(data: object) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      }

      // Derive which sources are active for this metro from the facilities list
      const activeSources = [...new Set(facilities.map(f => f.source))];

      // Emit metro label + active sources so the UI only shows relevant agents
      emit({ metroName, activeSources });

      let total = 0;

      const allSources: Array<{ source: string; fn: ScrapeFn }> = [
        { source: 'playbypoint', fn: scrapePlayByPoint as ScrapeFn },
        { source: 'courtreserve', fn: scrapeCourtReserve as ScrapeFn },
        { source: 'forte', fn: scrapeForte as ScrapeFn },
        { source: 'meetup', fn: scrapeMeetup as ScrapeFn },
      ];

      const sources = allSources.filter(s => (activeSources as string[]).includes(s.source));

      await Promise.all(sources.map(async ({ source, fn }) => {
        try {
          const games = await fn(facilities, from, to);
          emit({ source, games });
          total += games.length;
        } catch (err) {
          const message = err instanceof Error ? err.message : 'Unknown error';
          console.error(`[api/search] ${source} error:`, message);
          emit({ source, error: message, games: [] });
        }
      }));

      emit({ done: true, total });
      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
