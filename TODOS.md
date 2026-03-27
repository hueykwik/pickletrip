# TODOS

## CourtReserve Agent

- **CourtReserve scraper not returning results for West Hollywood searches**
  **Priority:** P1
  CourtReserve queries for the LA metro (California Smash, El Segundo) return no games. Investigate selector and navigation issues in `agents/courtreserve.mjs` — the scraper may be hitting Cloudflare, using wrong selectors for the Events/Index page, or the date filtering logic may be broken. California Smash was just added (facility ID 16314) so this hasn't been validated end-to-end yet.

## Completed
