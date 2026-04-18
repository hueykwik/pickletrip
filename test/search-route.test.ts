import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

const ROUTE_PATH = path.join(__dirname, '..', 'app', 'api', 'search', 'route.ts');

describe('search route — Railway 1GB safety', () => {
  it('does not run scrapers via Promise.all (would OOM on 1GB)', () => {
    // Atlanta, Big Island, and other multi-source metros use 3+ Playwright
    // agents. Promise.all spawns concurrent Chromium instances → ~900MB RSS →
    // container killed. Scrapers must run sequentially. See learning
    // `playwright-parallel-oom`.
    const src = fs.readFileSync(ROUTE_PATH, 'utf-8');
    expect(src).not.toMatch(/Promise\.all\s*\(\s*sources/);
  });

  it('uses a sequential for-loop with sleep between scrapers', () => {
    const src = fs.readFileSync(ROUTE_PATH, 'utf-8');
    // Asserting both pieces are present catches a partial revert (loop without
    // sleep, or sleep imported but loop replaced).
    expect(src).toMatch(/for\s*\([^)]*sources\.length/);
    expect(src).toMatch(/await\s+sleep\(/);
  });
});
