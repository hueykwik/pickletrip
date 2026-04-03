# Changelog

## [1.1.0.0] - 2026-04-03

### Added
- **9 new metros**: San Francisco, East Bay, Silicon Valley, Seattle, Chicago, New York City, South Florida, Atlanta, and Honolulu. Pickletrip now covers the top US pickleball markets.
- **Honolulu metro**: Pickles at Forté (Wix/CourtReserve scraper via Playwright) and Oahu Pickleball Association (Meetup GraphQL API, pure fetch). Aliases: `honolulu`, `oahu`, `hawaii`.
- **Forté agent** (`agents/forte.mjs`): Two-bucket Playwright strategy — Bucket A scrapes direct CourtReserve links, Bucket B follows Wix event-detail pages to extract booking links. HST-aware date parsing.
- **Meetup agent** (`agents/meetup.mjs`): Pure fetch, no browser required. Queries `meetup.com/gql2` GraphQL with pagination. Returns ISO 8601 dates formatted in HST.
- **PodPlay agent** (`agents/podplay.mjs`): Scrapes PodPlay booking platform for Chicago venues (Big City Pickle, SPF Pickleball).
- **Cache layer** (`lib/cache.ts`): Two-tier cache (in-memory + file, 4-hour TTL) for search results. Cache hit returns instantly via SSE. `forceRefresh` flag busts cache on demand.
- **Active-source agent status**: The UI only shows agents relevant to the searched metro.
- **Design system** (`DESIGN.md`, `CLAUDE.md`): Industrial/utilitarian aesthetic — DM Sans for UI, JetBrains Mono for times/levels/DUPR, teal `#0d9488` accent, slate neutrals, 3px status-border on game cards.
- **Default dates**: Arriving defaults to today, Leaving defaults to +14 days.
- **Date validation**: API returns 400 for malformed date strings before opening the SSE stream.

### Changed
- Game cards now use a 3px left border colored by status (green = open, red = full, gray = unknown) in addition to the Open/Full badge.
- JetBrains Mono used for date/time display and level range badges.
- DUPR rating field removed from search form.
- `parseGameDate` in the client handles ISO 8601 strings from Meetup for correct chronological sort.
- Agent status bar only shows sources that are searching, found results, or errored — zero-result done agents hide after search completes.

### Fixed
- `podplay` source added to `Game.source` type union and `SOURCE_LABELS` in both components.
- `metroName` null fallback in cache writes — uses raw city string when metro label is unavailable.
- Meetup events formatted in Hawaii Standard Time (`Pacific/Honolulu`) instead of server local time.
- Forté date parsing uses `T00:00:00-10:00` offset so midnight HST is preserved correctly.
- Empty state now shows metro name (`No games found in Honolulu, HI`) instead of raw city input.
- Partial error warning shown when search completes with results but some sources failed.

## [1.0.0.0] - 2026-03-28

Initial release. PlayByPoint + CourtReserve agents for Greater Los Angeles Area. SSE streaming, skill-level filter, city alias resolution.
