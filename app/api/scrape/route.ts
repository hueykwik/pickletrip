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

let scrapeStartedAt = 0;
const SCRAPE_TIMEOUT_MS = 30 * 60 * 1000; // 30 min — if a scrape takes longer, assume it died

function isScraping(): boolean {
  if (scrapeStartedAt === 0) return false;
  if (Date.now() - scrapeStartedAt > SCRAPE_TIMEOUT_MS) {
    console.log('[scrape] Previous scrape timed out, releasing lock');
    scrapeStartedAt = 0;
    return false;
  }
  return true;
}

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function runScrape(startTime: number) {
  const metroKeys = getMetroKeys();
  const dateFrom = todayDateStr();
  const dateTo = plus14DateStr();
  const from = new Date(dateFrom);
  const to = new Date(dateTo);
  to.setHours(23, 59, 59, 999);

  let totalGames = 0;

  for (let i = 0; i < metroKeys.length; i++) {
    const metroKey = metroKeys[i];
    const facilities = resolveFacilities(metroKey);
    const metroName = resolveMetroName(metroKey);
    if (facilities.length === 0) continue;

    // Pause between metros to let the OS reclaim memory/processes
    if (i > 0) await sleep(5000);

    console.log(`[scrape] --- ${metroName} (${i + 1}/${metroKeys.length}) ---`);

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

      // Brief pause between agents to let Chromium fully exit
      await sleep(2000);
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

  // Lock guard with timeout
  if (isScraping()) {
    return new Response(
      JSON.stringify({ error: 'Scrape already in progress' }),
      { status: 409, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // Return immediately — run scraping in the background
  const startTime = Date.now();
  scrapeStartedAt = startTime;

  // Fire and forget — don't await
  runScrape(startTime).catch(err => {
    console.error('[scrape] Background scrape failed:', err);
  }).finally(() => {
    scrapeStartedAt = 0;
  });

  return new Response(
    JSON.stringify({ ok: true, message: 'Scrape started in background' }),
    { status: 202, headers: { 'Content-Type': 'application/json' } }
  );
}
