import { NextRequest } from 'next/server';
import { scrapePlayByPoint } from '@/agents/playbypoint.mjs';
import { scrapeCourtReserve } from '@/agents/courtreserve.mjs';
import { scrapeForte } from '@/agents/forte.mjs';
import { scrapeMeetup } from '@/agents/meetup.mjs';
import { scrapePodPlay } from '@/agents/podplay.mjs';
import { resolveFacilities, resolveMetroName, type FacilityConfig } from '@/lib/cities';
import * as cache from '@/lib/cache';
import type { Game } from '@/lib/types';

export const runtime = 'nodejs';
export const maxDuration = 300; // 5 minutes

type ScrapeFn = (facilities: FacilityConfig[], dateFrom: Date, dateTo: Date) => Promise<Game[]>;

export async function POST(req: NextRequest) {
  const { city, dateFrom, dateTo, forceRefresh } = await req.json();

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

  const cacheKey = `${metroName}|${dateFrom}|${dateTo}`;

  // Bust cache if caller requested fresh results
  if (forceRefresh) {
    await cache.bust(cacheKey);
  }

  // Check cache before opening the stream
  const cached = await cache.get(cacheKey);

  const encoder = new TextEncoder();

  if (cached) {
    // Serve cached result — identical event shape, instant response
    const stream = new ReadableStream({
      start(controller) {
        function emit(data: object) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
        }
        emit({ metroName: cached.metroName, activeSources: cached.activeSources, cachedAt: cached.cachedAt });
        for (const { source, games } of cached.sourceResults) {
          emit({ source, games });
        }
        emit({ done: true, total: cached.sourceResults.reduce((n, r) => n + r.games.length, 0) });
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

  // Cache miss — scrape and collect results
  const activeSources = [...new Set(facilities.map(f => f.source))];

  const allSources: Array<{ source: string; fn: ScrapeFn }> = [
    { source: 'playbypoint', fn: scrapePlayByPoint as ScrapeFn },
    { source: 'courtreserve', fn: scrapeCourtReserve as ScrapeFn },
    { source: 'forte', fn: scrapeForte as ScrapeFn },
    { source: 'meetup', fn: scrapeMeetup as ScrapeFn },
    { source: 'podplay', fn: scrapePodPlay as ScrapeFn },
  ];

  const sources = allSources.filter(s => (activeSources as string[]).includes(s.source));

  const stream = new ReadableStream({
    async start(controller) {
      function emit(data: object) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      }

      emit({ metroName, activeSources });

      let total = 0;
      const sourceResults: Array<{ source: string; games: Game[] }> = [];

      await Promise.all(sources.map(async ({ source, fn }) => {
        try {
          const games = await fn(facilities, from, to);
          sourceResults.push({ source, games });
          emit({ source, games });
          total += games.length;
        } catch (err) {
          const message = err instanceof Error ? err.message : 'Unknown error';
          console.error(`[api/search] ${source} error:`, message);
          sourceResults.push({ source, games: [] });
          emit({ source, error: message, games: [] });
        }
      }));

      // Store in cache after all scrapers complete
      await cache.set(cacheKey, {
        metroName: metroName ?? city,
        activeSources,
        sourceResults,
        cachedAt: Date.now(),
      });

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
