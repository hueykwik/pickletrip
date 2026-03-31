import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'fs/promises';
import path from 'path';

// Use a temp directory isolated per test run — set before importing cache
const TEST_CACHE_DIR = path.join(process.cwd(), '.cache-test');
process.env.CACHE_DIR = TEST_CACHE_DIR;

// Import after setting env so the module picks up TEST_CACHE_DIR
import * as cache from '../lib/cache';
import type { CacheEntry } from '../lib/cache';

const SAMPLE_ENTRY: CacheEntry = {
  metroName: 'Los Angeles, CA',
  activeSources: ['playbypoint', 'courtreserve'],
  sourceResults: [
    { source: 'playbypoint', games: [] },
    { source: 'courtreserve', games: [] },
  ],
  cachedAt: Date.now(),
};

beforeEach(async () => {
  await fs.rm(TEST_CACHE_DIR, { recursive: true, force: true });
});

afterEach(async () => {
  await fs.rm(TEST_CACHE_DIR, { recursive: true, force: true });
  vi.restoreAllMocks();
});

describe('cache.get', () => {
  it('returns null on cold miss (no file, no memory)', async () => {
    const result = await cache.get('missing-key');
    expect(result).toBeNull();
  });

  it('returns entry from memory on hit', async () => {
    await cache.set('la-key', SAMPLE_ENTRY);
    const result = await cache.get('la-key');
    expect(result).not.toBeNull();
    expect(result!.metroName).toBe('Los Angeles, CA');
  });

  it('returns null and evicts expired memory entry', async () => {
    const expired: CacheEntry = { ...SAMPLE_ENTRY, cachedAt: Date.now() - 5 * 60 * 60 * 1000 }; // 5h ago
    await cache.set('expired-key', expired);
    const result = await cache.get('expired-key');
    expect(result).toBeNull();
  });

  it('loads from file when memory is cold (simulating restart)', async () => {
    // Write directly to file without warming memory
    await fs.mkdir(TEST_CACHE_DIR, { recursive: true });
    const key = 'file-only-key';
    const filePath = path.join(TEST_CACHE_DIR, `${encodeURIComponent(key)}.json`);
    await fs.writeFile(filePath, JSON.stringify(SAMPLE_ENTRY), 'utf-8');

    const result = await cache.get(key);
    expect(result).not.toBeNull();
    expect(result!.metroName).toBe('Los Angeles, CA');
  });

  it('warms memory on file hit (subsequent get skips disk)', async () => {
    const key = 'warm-test-key';
    await fs.mkdir(TEST_CACHE_DIR, { recursive: true });
    const filePath = path.join(TEST_CACHE_DIR, `${encodeURIComponent(key)}.json`);
    await fs.writeFile(filePath, JSON.stringify(SAMPLE_ENTRY), 'utf-8');

    // First get loads from file
    await cache.get(key);

    // Delete the file — second get should still succeed (from memory)
    await fs.unlink(filePath);
    const result = await cache.get(key);
    expect(result).not.toBeNull();
  });

  it('returns null for expired file entry', async () => {
    const key = 'expired-file-key';
    const expired: CacheEntry = { ...SAMPLE_ENTRY, cachedAt: Date.now() - 5 * 60 * 60 * 1000 };
    await fs.mkdir(TEST_CACHE_DIR, { recursive: true });
    await fs.writeFile(path.join(TEST_CACHE_DIR, `${encodeURIComponent(key)}.json`), JSON.stringify(expired), 'utf-8');

    const result = await cache.get(key);
    expect(result).toBeNull();
  });

  it('returns null for corrupt JSON file without throwing', async () => {
    const key = 'corrupt-key';
    await fs.mkdir(TEST_CACHE_DIR, { recursive: true });
    await fs.writeFile(path.join(TEST_CACHE_DIR, `${encodeURIComponent(key)}.json`), 'not valid json{{{', 'utf-8');

    await expect(cache.get(key)).resolves.toBeNull();
  });
});

describe('cache.set', () => {
  it('stores entry in memory', async () => {
    await cache.set('set-test', SAMPLE_ENTRY);
    const result = await cache.get('set-test');
    expect(result).not.toBeNull();
  });

  it('creates .cache dir and writes file', async () => {
    const key = 'file-write-test';
    await cache.set(key, SAMPLE_ENTRY);
    const filePath = path.join(TEST_CACHE_DIR, `${encodeURIComponent(key)}.json`);
    const raw = await fs.readFile(filePath, 'utf-8');
    const parsed = JSON.parse(raw);
    expect(parsed.metroName).toBe('Los Angeles, CA');
  });

  it('does not throw if file write fails', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(fs, 'writeFile').mockRejectedValueOnce(new Error('disk full'));

    // Should resolve without throwing (in-memory cache still works)
    await cache.set('fail-write', SAMPLE_ENTRY);
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('[cache]'), expect.any(String));
  });
});

describe('cache.bust', () => {
  it('removes entry from memory and file', async () => {
    const key = 'bust-test';
    await cache.set(key, SAMPLE_ENTRY);
    await cache.bust(key);

    // Memory cleared — bust should have removed it; verify with a get (which also won't find file)
    const result = await cache.get(key);
    expect(result).toBeNull();
  });

  it('does not throw if key does not exist', async () => {
    await cache.bust('nonexistent-key'); // would throw if unhandled
  });
});
