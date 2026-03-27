# TODOS

## CourtReserve Agent

- **Find CourtReserve facilities with public open play events for LA and Honolulu**
  **Priority:** P1
  California Smash (El Segundo, ID 16314) and Pickles at Forté (Honolulu, ID 13816) are members-only court-booking clubs — their CourtReserve portals only expose `PublicBookings/Index` (court reservations by the hour), not `Events/Index` (open play sessions). The scraper requires `Events/Index` pages. Both were removed from `lib/cities.ts`. Need to find alternative facilities in these cities that do have public open play events on CourtReserve. For Honolulu specifically, check venues like YMCA, public parks using CourtReserve, or open play clubs. For LA/El Segundo, check whether California Smash offers open play through a different booking path or find another El Segundo venue.

## Completed

