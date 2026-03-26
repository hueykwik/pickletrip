import { NextRequest } from 'next/server';
import { scrapePlayByPoint } from '@/agents/playbypoint.mjs';
import { scrapeCourtReserve } from '@/agents/courtreserve.mjs';
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
  // Set to end of day so the dateTo date is inclusive
  to.setHours(23, 59, 59, 999);

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      function emit(data: object) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      }

      // Emit metro label first — UI shows it immediately before game cards stream in
      emit({ metroName });

      let total = 0;

      const sources: Array<{ source: string; fn: ScrapeFn }> = [
        { source: 'playbypoint', fn: scrapePlayByPoint as ScrapeFn },
        { source: 'courtreserve', fn: scrapeCourtReserve as ScrapeFn },
      ];

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
