import { NextRequest } from 'next/server';
import { scrapePlayByPoint } from '@/agents/playbypoint.mjs';
import { scrapeCourtReserve } from '@/agents/courtreserve.mjs';
import { scrapeForte } from '@/agents/forte.mjs';
import { scrapeMeetup } from '@/agents/meetup.mjs';
import { scrapePodPlay } from '@/agents/podplay.mjs';
import { scrapeHolua } from '@/agents/holua.mjs';
import { getMetroKeys, resolveFacilities, resolveMetroName, type FacilityConfig } from '@/lib/cities';
import * as cache from '@/lib/cache';
import type { Game } from '@/lib/types';

export const runtime = 'nodejs';
export const maxDuration = 300;

type ScrapeFn = (facilities: FacilityConfig[], dateFrom: Date, dateTo: Date) => Promise<Game[]>;

const AGENT_MAP: Record<string, ScrapeFn> = {
  playbypoint: scrapePlayByPoint as ScrapeFn,
  courtreserve: scrapeCourtReserve as ScrapeFn,
  forte: scrapeForte as ScrapeFn,
  meetup: scrapeMeetup as ScrapeFn,
  podplay: scrapePodPlay as ScrapeFn,
  holua: scrapeHolua as ScrapeFn,
};

let scraping = false;

async function runScrape(startTime: number) {
  const metroKeys = getMetroKeys();
  const dateFrom = todayDateStr();
  const dateTo = plus14DateStr();
  const from = new Date(dateFrom);
  const to = new Date(dateTo);
  to.setHours(23, 59, 59, 999);

  let totalGames = 0;

  for (const metroKey of metroKeys) {
    const facilities = resolveFacilities(metroKey);
    const metroName = resolveMetroName(metroKey);
    if (facilities.length === 0) continue;

    const cacheKey = `${metroName}|${dateFrom}|${dateTo}`;
    await cache.bust(cacheKey);

    const activeSources = [...new Set(facilities.map(f => f.source))];
    const sourceResults: Array<{ source: string; games: Game[] }> = [];

    // Run agents SEQUENTIALLY — one browser at a time
    for (const source of activeSources) {
      const fn = AGENT_MAP[source];
      if (!fn) continue;

      try {
        console.log(`[scrape] ${metroName} / ${source}: starting`);
        const games = await fn(facilities, from, to);
        sourceResults.push({ source, games });
        console.log(`[scrape] ${metroName} / ${source}: ${games.length} games`);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        console.error(`[scrape] ${metroName} / ${source} error:`, message);
        sourceResults.push({ source, games: [] });
      }
    }

    const metroGames = sourceResults.reduce((n, r) => n + r.games.length, 0);
    totalGames += metroGames;

    await cache.set(cacheKey, {
      metroName: metroName ?? metroKey,
      activeSources,
      sourceResults,
      cachedAt: Date.now(),
    });
  }

  const duration = Date.now() - startTime;
  console.log(`[scrape] Done: ${totalGames} games across ${metroKeys.length} metros in ${duration}ms`);
}

function todayDateStr(): string {
  return new Date().toISOString().split('T')[0];
}

function plus14DateStr(): string {
  const d = new Date();
  d.setDate(d.getDate() + 14);
  return d.toISOString().split('T')[0];
}

export async function GET(req: NextRequest) {
  // Auth check
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return new Response(
      JSON.stringify({ error: 'CRON_SECRET not configured' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const auth = req.headers.get('authorization');
  if (auth !== `Bearer ${secret}`) {
    return new Response(
      JSON.stringify({ error: 'Unauthorized' }),
      { status: 401, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // Lock guard
  if (scraping) {
    return new Response(
      JSON.stringify({ error: 'Scrape already in progress' }),
      { status: 409, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // Return immediately — run scraping in the background
  scraping = true;
  const startTime = Date.now();

  // Fire and forget — don't await
  runScrape(startTime).catch(err => {
    console.error('[scrape] Background scrape failed:', err);
  }).finally(() => {
    scraping = false;
  });

  return new Response(
    JSON.stringify({ ok: true, message: 'Scrape started in background' }),
    { status: 202, headers: { 'Content-Type': 'application/json' } }
  );
}
