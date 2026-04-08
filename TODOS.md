# TODOS

## CourtReserve Agent

- **Re-investigate California Smash (El Segundo, ID 16314) for Events/Index access**
  **Priority:** P1
  California Smash was removed from `lib/cities.ts` when its Events/Index page appeared inaccessible. However, web research confirms they do run scheduled open play events ($15 morning open play M–F 9am–Noon, $29 beginner open play) registered via CourtReserve. Their own website (calismash.com) links to `Events/Details/16314/...` detail pages. The Events/Index page may require a logged-in session or have a different URL pattern. Possible approaches: (1) check if `https://app.courtreserve.com/Online/Events/Index/16314` is accessible when navigated to directly (our previous test may have been blocked by Cloudflare during scraping), or (2) scrape event detail links from calismash.com itself since their site embeds CourtReserve event widgets.

- **Add Santa Monica Pickleball Club (ID 10856) to cities.ts**
  **Priority:** P1
  SMPC is open to non-members — their website states "Players do not need to be members to play during our free SMPC Open Play sessions." They run drop-in open play at Memorial Park (M–F 8am–12pm and weekends). Their CourtReserve (org 10856) is used for scheduled events: round robins, clinics, and challenge courts — these require registration and may be open to non-members. Add to `lib/cities.ts` under greater-los-angeles as a CourtReserve facility and verify which events are publicly registerable. Note: the drop-in open play won't appear as CourtReserve events (no registration needed), but structured events will.

## Honolulu Agents — Follow-ups (from /autoplan review)

- **Move CR org ID off hardcode in Forte agent**
  **Priority:** P2
  `forte.mjs` hardcodes `publicbookings/13816` in two places. Works for the single current venue. If a second Forté-type facility is added with a different CourtReserve org, it silently returns zero results. Fix: add `crOrgId: number` to `ForteFacility` type in `lib/cities.ts` and use it in the URL filter.

- **Wix API fallback for Forte when Load More button not found**
  **Priority:** P2
  Wix sites expose a structured events API (`/_api/wix-one-events-server/events?`). If the Load More button selector breaks (Wix A/B tests UI without warning), use the API directly instead of Playwright pagination. Faster and more reliable.

- **DRY: extract shared parse utilities to `lib/parsers.ts`**
  **Priority:** P3
  `parseLevel()` and `formatDate()` are duplicated across `courtreserve.mjs`, `forte.mjs`, `meetup.mjs`, and `playbypoint.mjs`. Each has slightly different logic, which will cause inconsistent level display. A shared `lib/parsers.ts` would fix this and make future agent additions cleaner.

- **Forte `seenEventIds` scope asymmetry: add comment**
  **Priority:** P3
  `seenEventIds` is reset per-facility while `games` accumulates globally. This is correct but looks asymmetric. Add a comment explaining the design.

## Deployment — Future Work

- **Per-day cache key redesign for flexible date range matching**
  **Priority:** P3
  Current cache key (`metroName|dateFrom|dateTo`) only hits on exact date ranges. Cron pre-warms with a default 14-day range, but custom user searches with different dates miss the cache. A per-day key strategy (`metroName|date`) would let any date range assemble from individual cached days, dramatically improving cache hit rate when multiple users search the same metro with different date windows. Migration path: keep `lib/cache.ts` interface, add a `getRange(metro, from, to)` method that assembles from day-level entries. Deferred until the product has real users with diverse search patterns.

- **GitHub Actions cron + static JSON as alternative deployment architecture**
  **Priority:** P3
  If Railway + Playwright proves unreliable or too expensive, an alternative: run scrapers as GitHub Actions (free tier, scheduled cron), write results to a JSON file committed to the repo or hosted in S3/R2, and serve the static results from Vercel ($0). Eliminates Docker, RAM concerns, cron auth, and cache entirely. Tradeoff: two-system architecture, slower iteration, results stale until next GH Actions run. Only pursue if Railway deployment becomes a rabbit hole.

## Cache — Future Work

- **Upgrade to SQLite/Turso for cache persistence**
  **Priority:** P3
  The current two-layer cache (in-memory Map + `.cache/*.json` files) works well for a single server process but won't scale to multiple instances or serverless deployments. Turso (SQLite at the edge) would give durable, queryable, cross-instance storage with the same low-latency profile. Migration path: keep `lib/cache.ts` interface identical (`get`/`set`/`bust`), swap the file layer for a Turso client. The in-memory Map stays as the L1 layer.

## Completed

- **LA search shows "Pickles at Forté: searching" incorrectly**
  Fixed in v1.1.0.0: API now emits `activeSources` in the first SSE event; client initializes only the agents relevant to the searched metro.
  **Completed:** v1.1.0.0 (2026-04-03)

