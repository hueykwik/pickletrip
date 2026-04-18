import fs from 'fs/promises';
import path from 'path';
import type { Game } from './types';

export interface CacheEntry {
  metroName: string;
  activeSources: string[];
  sourceResults: Array<{ source: string; games: Game[] }>;
  cachedAt: number;
}

const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

function getCacheDir(): string {
  return process.env.CACHE_DIR ?? path.join(process.cwd(), '.cache');
}

// In-memory store — fast layer; persists within a single server session
const memCache = new Map<string, CacheEntry>();

function cacheFilePath(key: string): string {
  return path.join(getCacheDir(), `${encodeURIComponent(key)}.json`);
}

function isExpired(entry: CacheEntry): boolean {
  return Date.now() - entry.cachedAt > CACHE_TTL_MS;
}

export async function get(key: string): Promise<CacheEntry | null> {
  // 1. Check in-memory first
  const memEntry = memCache.get(key);
  if (memEntry) {
    if (!isExpired(memEntry)) return memEntry;
    memCache.delete(key); // evict stale
  }

  // 2. Fall back to file cache
  try {
    const raw = await fs.readFile(cacheFilePath(key), 'utf-8');
    const entry: CacheEntry = JSON.parse(raw);
    if (isExpired(entry)) {
      await fs.unlink(cacheFilePath(key)).catch(() => {});
      return null;
    }
    // Warm the in-memory cache so subsequent requests skip disk
    memCache.set(key, entry);
    return entry;
  } catch {
    // File missing, corrupt, or unreadable — treat as miss
    return null;
  }
}

export async function set(key: string, entry: CacheEntry): Promise<void> {
  memCache.set(key, entry);
  try {
    await fs.mkdir(getCacheDir(), { recursive: true });
    await fs.writeFile(cacheFilePath(key), JSON.stringify(entry), 'utf-8');
  } catch (err) {
    // Non-fatal: in-memory cache still works
    console.warn('[cache] Failed to write cache file:', err instanceof Error ? err.message : err);
  }
}

export async function bust(key: string): Promise<void> {
  memCache.delete(key);
  await fs.unlink(cacheFilePath(key)).catch(() => {}); // ignore if missing
}
