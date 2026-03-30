<!-- /autoplan restore point: /Users/huey/.gstack/projects/hueykwik-pickletrip/main-autoplan-restore-20260329-165744.md -->
# Pickletrip: Honolulu Expansion + New Agents (Forté + Meetup)

## Overview

Expand Pickletrip beyond its current LA-only coverage to support Honolulu, HI. This
requires two new scraping agents (Forté and Meetup), new facility types in the
city-data layer, and UI updates to surface the new sources. Also includes a two-phase
refactor of the PlayByPoint agent to fix listing-page discovery.

---

## Problem

Pickletrip currently only surfaces pickleball events in Greater Los Angeles via two
sources: PlayByPoint and CourtReserve. Users searching for games in Honolulu (a
high-demand pickleball market, especially for travelers) get zero results. Two key
Honolulu venues use non-standard booking platforms: Pickles at Forté (a Wix event list
that embeds CourtReserve links) and the Oahu Pickleball Association (Meetup groups).

Additionally, several PlayByPoint facilities (PIKL LA, Westchester Playa, Westwood PB
Center, Santa Monica PB Center) use a `/programs?` listing-page URL pattern that the
current single-pass scraper misses, silently returning fewer events than available.

---

## Scope

### In Scope

1. **Forté agent** (`agents/forte.mjs`)
   - Scrapes picklesatforte.com/event-list (Wix, no Cloudflare)
   - Two-bucket strategy: direct CourtReserve `publicbookings` links (fast path) +
     Wix event-detail links that require navigating to the detail page to extract the CR link
   - De-duplication by eventId, date-range filtering, level parsing from event names
   - Uses playwright-extra + stealth (same dependency already in place for PBP)

2. **Meetup agent** (`agents/meetup.mjs`)
   - Fetches events from Meetup groups via public GraphQL API (`meetup.com/gql2`)
   - Pure `fetch`, no browser — lightweight and fast
   - Pagination support (up to 10 pages × 100 events = 1,000 events max)
   - Level parsing from title + description text

3. **New city-data types** (`lib/cities.ts`)
   - `ForteFacility` — `{ source: 'forte', name, city }`
   - `MeetupFacility` — `{ source: 'meetup', name, city, groupUrlname }`
   - `FacilityConfig` union updated to include both

4. **Honolulu metro** (`lib/cities.ts`)
   - Metro key: `honolulu`, label: `"Honolulu, HI"`
   - Two facilities: Pickles at Forté (forte), Oahu Pickleball Association (meetup)
   - Aliases: `honolulu`, `oahu`, `hawaii`

5. **API route** (`app/api/search/route.ts`)
   - Wire `scrapeForte` and `scrapeMeetup` into the multi-source `Promise.all` fan-out

6. **UI updates**
   - `lib/types.ts`: expand `source` union to include `'forte' | 'meetup'`
   - `components/AgentStatus.tsx` + `components/GameCard.tsx`: add `forte` label
   - `app/page.tsx`: initialize `forte` agent in searching state; filter AgentStatus
     to only show agents that are actively searching, have results, or errored
     (hides zero-result completed agents from other metros)

7. **PlayByPoint two-phase scraper refactor** (`agents/playbypoint.mjs`)
   - Phase 1: collect direct `/programs/` links + listing-page `/programs?` links
     from facility homepage
   - Phase 2: for each listing-page URL, navigate and scrape program links
   - Fixes silent miss on PIKL LA, Westchester Playa, Westwood, SMPC

### Not In Scope (deferred to TODOS.md)

- **Meetup label in AgentStatus/GameCard**: `meetup` source label not yet added to
  `SOURCE_LABELS` in either component. `forte` was added but `meetup` was not.
  Tracked as P2 follow-up.
- **Meetup agent not shown in UI agent list**: `page.tsx` initializes only `forte`
  (not `meetup`) in the agent status panel. Meetup results will appear in games list
  but no status indicator is shown.
- **California Smash (El Segundo, CourtReserve ID 16314)**: removed from cities.ts
  in a prior commit; re-investigation pending (see TODOS.md P1).
- **Santa Monica Pickleball Club (CourtReserve ID 10856)**: not yet added; pending
  event accessibility verification (see TODOS.md P1).
- **Honolulu time-zone display**: events from Meetup return UTC ISO timestamps
  and are rendered in the server's locale. No HST correction or timezone display.
- **Price extraction for Forté/Meetup**: both agents return `price: null`. CourtReserve
  pricing (on the linked booking page) is not surfaced.

---

## Architecture

```
app/page.tsx
    │
    └── POST /api/search
            │
            ├── scrapePlayByPoint(pbpFacilities, dateFrom, dateTo)
            │     └── Playwright → playbypoint.com (two-phase link discovery)
            │
            ├── scrapeCourtReserve(crFacilities, dateFrom, dateTo)
            │     └── Playwright → app.courtreserve.com
            │
            ├── scrapeForte(forteFacilities, dateFrom, dateTo)
            │     └── Playwright → picklesatforte.com/event-list (Wix)
            │           ├── Bucket A: direct CR publicbookings links
            │           └── Bucket B: Wix detail → CR publicbookings links
            │
            └── scrapeMeetup(meetupFacilities, dateFrom, dateTo)
                  └── fetch → meetup.com/gql2 (GraphQL, no browser)

lib/cities.ts
  resolveFacilities(city) → FacilityConfig[]
  resolveMetroName(city) → string | null

  METRO_AREAS: {
    'greater-los-angeles': { ...7 facilities (PBP + CourtReserve) }
    'honolulu':            { ...2 facilities (Forte + Meetup) }
  }

  METRO_ALIASES: {
    'honolulu' → 'honolulu'
    'oahu'     → 'honolulu'
    'hawaii'   → 'honolulu'
    'la', 'los angeles', 'weho', ... → 'greater-los-angeles'
  }

lib/types.ts
  Game.source: 'playbypoint' | 'courtreserve' | 'forte' | 'meetup'
```

---

## Test Plan

### Existing tests to keep passing

- `test/agents.test.ts` — CourtReserve `parseStatus`, `parseLevel`, `parseDate` unit tests (17 tests)
- `test/cities.test.ts` — `resolveFacilities` + `resolveMetroName` for LA metro

### New tests needed

- `test/cities.test.ts`
  - `resolveFacilities('honolulu')` → 2 facilities (forte + meetup)
  - `resolveFacilities('oahu')` → 2 facilities (alias coverage)
  - `resolveFacilities('hawaii')` → 2 facilities (alias coverage)
  - `resolveMetroName('honolulu')` → `"Honolulu, HI"`
  - `resolveMetroName('oahu')` → `"Honolulu, HI"`

- `test/agents.test.ts` (or new files)
  - Meetup `parseLevel`: "All levels" → `"All levels"`, "3.5-3.99" → `"DUPR 3.5–3.99"`, beginner/advanced/intermediate keywords, null fallback
  - Forté `parseDateFromCRUrl`: valid ?date= param, missing param → null, invalid date → null
  - Forté `parseDateFromSlug`: valid slug date, slug without date → null
  - Forté `parseTimeFromSlug`: "09-00" → "9:00 AM", "14-30" → "2:30 PM"

---

## Open Questions / Risks

1. **Meetup GraphQL stability**: `meetup.com/gql2` is a semi-public API — no versioning
   guarantees. If Meetup rate-limits or breaks the endpoint, Honolulu results silently
   fail. Consider adding error logging to the SSE stream.

2. **Wix "Load More" variability**: The Forté agent clicks "Load More" up to 5 times.
   If Wix A/B tests the button text or data-hook, the selector fails silently and only
   the initial 6 events are returned. The selector covers 3 patterns but isn't
   exhaustive.

3. **No meetup agent label in UI**: `meetup` is not in `SOURCE_LABELS` in either
   `AgentStatus.tsx` or `GameCard.tsx`. Meetup games will render without a source label,
   and the agent won't show in the status panel. This is cosmetically broken for
   Honolulu searches.

4. **AgentStatus init for meetup**: `page.tsx` initializes `forte` but not `meetup` in
   the agent state array. Meetup events appear in results but there's no searching/done
   indicator for the Meetup source.

5. **PlayByPoint listing-page refactor untested**: The new two-phase scraper is a
   meaningful behavior change (navigates to additional URLs). No test coverage for
   the two-phase logic — relies on manual testing.

---

## CEO Review Results (Phase 1 — /autoplan)

### Context
This is a hobby project for personal use. Moat/competitive/distribution concerns are N/A.
Strategic premise accepted: build it for wherever you play.

### Scope Additions (auto-approved)

| # | Addition | Why |
|---|---------|-----|
| A | Meetup label in `SOURCE_LABELS` (AgentStatus.tsx + GameCard.tsx) | Known UI break — 30-min fix |
| B | Meetup agent in `page.tsx` initial agent state | Meetup results appear but no status indicator |
| C | HST timezone correction for Meetup events | UTC rendered in server locale — wrong time shown |
| D | SSE error emit when agent throws | Silent failure — user sees 0 results with no explanation |
| E | Cities tests for Honolulu metro + aliases | New metro has 0 test coverage |
| F | Forte parse function unit tests | `parseDateFromCRUrl`, `parseDateFromSlug`, `parseTimeFromSlug` |
| G | Meetup `parseLevel()` unit tests | Pure functions, trivial to add |
| H | PBP two-phase snapshot/fixture test | Behavior-critical refactor with no regression protection |

### Deferred to TODOS.md

- `lib/parsers.ts` — DRY extraction of `parseLevel()` / `formatDate()` across agents
- Wix API fallback for Forte when Load More button not found
- SEO city pages (`/honolulu`, `/los-angeles`)
- Analytics instrumentation

### Architecture ASCII Diagram

```
                    ┌─────────────────────┐
                    │    app/page.tsx      │
                    │  (search form + UI) │
                    └──────────┬──────────┘
                               │ POST /api/search
                               ▼
                    ┌─────────────────────┐
                    │  route.ts fan-out   │
                    │  Promise.all() x4   │
                    └──┬──┬──┬──┬─────────┘
                       │  │  │  │
              ┌────────┘  │  │  └──────────────┐
              ▼           ▼  ▼                  ▼
        ┌──────────┐ ┌────┐ ┌──────────┐ ┌──────────┐
        │PlayByPt  │ │ CR │ │  Forte   │ │  Meetup  │
        │2-phase   │ │    │ │ Wix+CR   │ │ GraphQL  │
        │Playwright│ │Pw. │ │Playwright│ │  fetch   │
        └────┬─────┘ └─┬──┘ └────┬─────┘ └────┬─────┘
             └────┬────┘         └──────────────┘
                  ▼
           Game[] merged + rendered
```

### Error & Rescue Map (gaps)

| Codepath | What can go wrong | Rescued? |
|---|---|---|
| `scrapeForte` → Wix timeout | page.goto() throws | Caught by route.ts Promise.all |
| `scrapeMeetup` → HTTP 429/403 | fetch throws | Caught by route.ts, but SSE error not emitted ← Gap D |
| `scrapeMeetup` → GQL error | Throws with message | Same as above |
| `page.tsx` AgentStatus | meetup not initialized | UI shows nothing for meetup ← Gap B |
| `GameCard` source label | meetup → undefined | Empty label ← Gap A |

### Failure Modes Registry

| Failure | Impact | Mitigated? |
|---|---|---|
| Wix DOM change (Load More selector) | Forte returns only 6 events | Partially (3 selector patterns) |
| Meetup API blocked/deprecated | 0 Honolulu meetup results | No (silent until user notices) |
| PBP listing-page regression | Fewer LA events silently | No test coverage yet |
| HST timezone wrong | Wrong times shown for Honolulu | Fix in scope (Gap C) |

### CEO Dream State Delta

```
CURRENT STATE                     THIS PLAN + GAPS FIXED          12-MONTH IDEAL
LA only (PBP + CR)            --> Honolulu (Forte + Meetup)     --> Multi-city (5+)
                                  PBP listing-page fix           DRY parse layer
                                  Full test coverage             Monitoring/alerting
                                  Correct Honolulu UI            City pages for SEO
```

### Decision Audit Trail

| # | Phase | Decision | Classification | Principle | Rationale | Rejected |
|---|-------|----------|---------------|-----------|-----------|---------|
| 1 | CEO | Approve meetup label fixes | Mechanical | P1 completeness | Known UI break, 30-min fix | — |
| 2 | CEO | Approve HST timezone correction | Mechanical | P1 completeness | Wrong times shown to user | — |
| 3 | CEO | Approve SSE error emit | Mechanical | P1 completeness | Silent failure unacceptable | — |
| 4 | CEO | Approve PBP snapshot test | Mechanical | P1 completeness | Behavior-critical, no regression protection | — |
| 5 | CEO | Approve Honolulu cities tests | Mechanical | P1 completeness | New metro has 0 test coverage | — |
| 6 | CEO | Approve Forte/Meetup parse tests | Mechanical | P1 completeness | Pure functions, trivial to add | — |
| 7 | CEO | Defer lib/parsers.ts DRY refactor | Mechanical | P3 pragmatic | Real but non-blocking | Accepted expansions A-H |
| 8 | CEO | Defer Wix API fallback | Mechanical | P3 pragmatic | Agent works, fallback is next-iter | Accepted expansions A-H |
| 9 | CEO | Drop moat/competitive findings | Mechanical | P6 bias to action | Hobby project context — not applicable | — |

---

## Design Review Results (Phase 2 — /autoplan)

### Scope Additions (auto-approved)

| # | Addition | Severity | Why |
|---|---------|----------|-----|
| A2 | `meetup: 'Oahu Pickleball Association'` in SOURCE_LABELS (both components) | Critical | Raw "meetup" key displayed |
| B2 | meetup entry in page.tsx `setAgents` init | Critical | No status indicator for meetup source |
| C2 | AgentStatus zero-filter only applies after `done === true` | High | Panel flashes empty mid-search |
| D2 | Empty state: `metroName ?? city` instead of raw `city` | High | "No games for oahu" looks like unrecognized city |
| E2 | `parseGameDate` handles ISO 8601 strings (Meetup returns ISO) | Medium | Sort breaks for all Meetup results |
| F2 | `game.status === 'unknown'` renders neutral badge in GameCard, not "Full" | Medium | Meetup events have no capacity — falsely shown as "Full" |
| G2 | Partial-error warning below results count when any agent errored | Medium | Error invisible after user scrolls |

### Deferred (design)

- metroName prominence — taste decision, surfaces at final gate
- LA search shows "Forté: searching" — non-trivial (requires server-emitted agent list); deferred to TODOS

### Design Litmus Scorecard

No hard rejections. Overall structure clean. Issues are interaction-state completeness, not architectural.

### Design Decision Additions to Audit Trail

| # | Phase | Decision | Classification | Principle | Rationale | Rejected |
|---|-------|----------|---------------|-----------|-----------|---------|
| 10 | Design | Approve meetup SOURCE_LABELS | Mechanical | P1 completeness | Critical UI break — raw key displayed | — |
| 11 | Design | Approve meetup agent init | Mechanical | P1 completeness | No status shown for second Honolulu source | — |
| 12 | Design | Approve AgentStatus zero-filter gate | Mechanical | P1 completeness | Panel flash during slow multi-source search | — |
| 13 | Design | Defer metroName prominence | Taste | P3 pragmatic | Works as-is; surface at final gate | — |
| 14 | Design | Approve empty state metroName fix | Mechanical | P1 completeness | Trust break on alias input | — |
| 15 | Design | Approve ISO string handling in parseGameDate | Mechanical | P1 completeness | Sort broken for Meetup results | — |
| 16 | Design | Approve unknown status neutral badge | Mechanical | P1 completeness | Meetup events falsely shown as "Full" | — |
| 17 | Design | Approve partial-error warning | Mechanical | P1 completeness | Error invisible post-scroll | — |
| 18 | Design | Defer LA search "Forté: searching" | Mechanical | P3 pragmatic | Server-emitted agent list is non-trivial | — |

---

## Eng Review Results (Phase 3 — /autoplan)

### Architecture: Sound

Fan-out in `route.ts` is correct. Each agent defensively filters its own source type from `FacilityConfig[]`. This is load-bearing — document as a contract in each agent's filter line.

### Scope Additions (auto-approved)

| # | Addition | Severity | Why |
|---|---------|----------|-----|
| A3 | Remove `description` field from Meetup GQL query | Low | Only used for parseLevel; full HTML blobs = MB per page at scale |
| B3 | Fix `parseTimeFromSlug` regex to match HH-MM after date segment (not just immediately after) | Low | Fails silently if slug has extra segment before time |
| C3 | Add date validation in `route.ts` before opening SSE stream | Medium | Invalid Date propagates into agents unnecessarily |

### Deferred to TODOS.md

- Forte CR org ID hardcode (`13816`) — only breaks with second Forte venue; added to TODOS as P2
- Bucket B failure aggregation — low observability gap; acceptable for hobby scale
- `seenEventIds` scope asymmetry — add comment when you're there; added to TODOS P3

### Architecture ASCII Diagram

```
app/page.tsx
    │ POST /api/search {city, dateFrom, dateTo, level?, dupr?}
    │
    ▼
route.ts
    │ 1. Validate presence: city, dateFrom, dateTo
    │ 2. NEW: Validate date format — return 400 if invalid
    │ 3. resolveFacilities(city) → FacilityConfig[]
    │ 4. resolveMetroName(city) → string | null
    │ 5. Emit SSE: {metroName}
    │ 6. Promise.all([scrapeX(facilities, from, to) for each source])
    │    Each scrape emits: {source, games[]} or {source, error}
    │ 7. Emit SSE: {done}
    │
    ├── scrapePlayByPoint(pbpFacilities, from, to)
    │       Playwright → playbypoint.com
    │       Two-phase: homepage links + listing-page links
    │
    ├── scrapeCourtReserve(crFacilities, from, to)
    │       Playwright → app.courtreserve.com
    │
    ├── scrapeForte(forteFacilities, from, to)
    │       Playwright → picklesatforte.com/event-list (Wix)
    │       Bucket A: direct CR publicbookings links
    │       Bucket B: Wix detail pages → CR links
    │       Timezone: parseDateFromCRUrl uses T00:00:00 (local)
    │                  → plan: use HST offset T00:00:00-10:00
    │
    └── scrapeMeetup(meetupFacilities, from, to)
            fetch → meetup.com/gql2 (GraphQL)
            Timezone: formatDate/formatTime need
                      timeZone: 'Pacific/Honolulu'
```

### Test Diagram — Codepath Coverage

```
CODEPATH                                    TYPE        TEST EXISTS?  GAP?
──────────────────────────────────────────  ──────────  ────────────  ────
resolveFacilities('honolulu')               Unit        NO            ← ADD
resolveFacilities('oahu') alias             Unit        NO            ← ADD
resolveFacilities('hawaii') alias           Unit        NO            ← ADD
resolveMetroName('honolulu')                Unit        NO            ← ADD
MeetupFacility.groupUrlname field           Unit        NO            ← ADD
parseDateFromCRUrl — valid URL              Unit        NO            ← ADD
parseDateFromCRUrl — no date param          Unit        NO            ← ADD
parseDateFromCRUrl — invalid date           Unit        NO            ← ADD
parseDateFromSlug — with date               Unit        NO            ← ADD
parseDateFromSlug — without date            Unit        NO            ← ADD
parseTimeFromSlug — AM time                 Unit        NO            ← ADD
parseTimeFromSlug — PM time                 Unit        NO            ← ADD
meetup.parseLevel — all levels              Unit        NO            ← ADD
meetup.parseLevel — DUPR range              Unit        NO            ← ADD
meetup.parseLevel — null fallback           Unit        NO            ← ADD
Forte Bucket A browser scrape               E2E         NO            defer
Forte Bucket B Wix detail nav               E2E         NO            defer
PBP two-phase listing-page discovery        E2E         NO            defer
Meetup GraphQL pagination                   Integration NO            defer
CourtReserve parseStatus/parseLevel/Date    Unit        YES (17) ✓   OK
LA metro resolveFacilities + aliases        Unit        YES ✓         OK
```

Test plan artifact: `~/.gstack/projects/hueykwik-pickletrip/huey-main-test-plan-20260329-171532.md`

### Failure Modes Registry (updated after all phases)

| Failure | Impact | Mitigated? | Fix |
|---|---|---|---|
| Wix DOM change (Load More selector) | Forte returns 6 events only | Partial (3 selectors) | Log warning; Wix API fallback (TODOS P2) |
| Meetup API blocked/deprecated | 0 meetup results; silent | No (caught, no SSE emit) | Gap D in scope |
| PBP listing-page regression | Fewer LA events | No test coverage | PBP snapshot test in scope |
| HST timezone wrong | Wrong event times shown | In scope (Gap C) | Specify offset + locale option |
| parseGameDate on ISO strings | Meetup sort broken | In scope (Gap E2) | ISO fast path in parseGameDate |
| Invalid date from client | Agents fail unnecessarily | In scope (Gap C3) | Validate before SSE opens |
| `unknown` status shown as "Full" | Wrong signal on Meetup events | In scope (Gap F2) | Neutral badge for unknown |
| Meetup description MB payload | Memory risk at 1000 events | In scope (Gap A3) | Remove description from GQL |

### Eng Decision Additions to Audit Trail

| # | Phase | Decision | Classification | Principle | Rationale | Rejected |
|---|-------|----------|---------------|-----------|-----------|---------|
| 19 | Eng | Confirm fan-out architecture is correct | Mechanical | — | Each agent defensively filters; pattern is sound | — |
| 20 | Eng | Approve remove description from Meetup GQL | Mechanical | P1 completeness | MB-per-page risk with no functionality cost | — |
| 21 | Eng | Approve parseTimeFromSlug regex fix | Mechanical | P1 completeness | Silent wrong-time for event slugs with extra segment | — |
| 22 | Eng | Approve route.ts date validation | Mechanical | P1 completeness | System boundary — validate at the edge | — |
| 23 | Eng | Defer Forte CR org ID hardcode | Mechanical | P3 pragmatic | Only breaks with second Forte venue; added to TODOS P2 | — |
| 24 | Eng | Defer Bucket B failure aggregation | Mechanical | P3 pragmatic | Acceptable observability for hobby scale | — |

---

## GSTACK REVIEW REPORT

| Review | Trigger | Why | Runs | Status | Findings |
|--------|---------|-----|------|--------|----------|
| CEO Review | `/autoplan` | Scope & strategy | 1 | issues_open (0 unresolved) | 9 decisions: 4 technical scope additions, 5 deferred/dropped |
| Eng Review | `/autoplan` | Architecture & tests | 1 | issues_open (0 unresolved) | 10 findings: 3 scope additions, 4 deferred, 3 confirmed-correct |
| Design Review | `/autoplan` | UI/UX gaps | 1 | issues_open (1 taste unresolved) | 10 findings: 8 approved, 1 taste (metroName prominence), 1 deferred |
| Dual Voices (CEO) | `/autoplan` | Independent 2nd opinion | 1 | subagent-only (Codex unavailable) | 2/6 confirmed |
| Dual Voices (Design) | `/autoplan` | Independent 2nd opinion | 1 | subagent-only | 6/7 confirmed |
| Dual Voices (Eng) | `/autoplan` | Independent 2nd opinion | 1 | subagent-only | 3/6 confirmed |

**VERDICT:** APPROVED — 24 decisions made, 22 auto-decided, 1 open taste decision (metroName prominence — user kept as-is), 0 user challenges. Run `/ship` when ready.

**Cross-phase theme:** Timezone correctness (HST) flagged independently by CEO, Design, and Eng. Specify `T00:00:00-10:00` offset in Forte and `timeZone: 'Pacific/Honolulu'` in Meetup locale formatters.

**Test plan:** `~/.gstack/projects/hueykwik-pickletrip/huey-main-test-plan-20260329-171532.md`
