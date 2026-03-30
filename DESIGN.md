# Design System — Pickletrip

## Product Context
- **What this is:** A travel aggregator for pickleball players — search a city and date range, get open games streamed from multiple booking platforms (PlayByPoint, CourtReserve, Pickles at Forté, Meetup groups).
- **Who it's for:** Traveling pickleball players who want to find games at their destination. The mental model is closer to Google Flights or Kayak than to a sports social app.
- **Space/industry:** Pickleball / sports booking. Category visual language (bright greens, community-social feel) deliberately rejected — we use travel-aggregator visual language instead.
- **Project type:** Utility web app, mobile-first.

## Aesthetic Direction
- **Direction:** Industrial/Utilitarian — information-first, zero decoration
- **Decoration level:** None — whitespace and typographic hierarchy do all the work
- **Mood:** Feels like a precision tool, not a social network. The user is scanning results quickly on their phone. Clarity above everything.
- **Rationale:** Every pickleball app designs for "community." Pickletrip designs for "finding a game in 10 seconds." The visual language of flight search (cool neutrals, monospace data, tight cards) fits better than the visual language of sports social.

## Wordmark / Icon
- Do NOT use 🏓 (that's a table tennis paddle — wrong sport).
- Do NOT use a generic pickleball paddle illustration.
- **Preferred direction:** Plain text wordmark — "Pickletrip" in DM Sans 700, no emoji or icon. Clean, distinctive, no sport-kit clichés.
- **Alternate option:** A minimal SVG pickleball (the ball, not the paddle) — a circle with small evenly-spaced holes, stroke-only, no fill. Inline before the wordmark. 16×16 at the heading scale.
- **Never:** generic sports emoji, crossed paddles, ping pong/table tennis assets.

## Typography
- **Primary (all UI):** [DM Sans](https://fonts.google.com/specimen/DM+Sans) — clean geometric sans-serif, great on mobile, not Inter
  - Weights in use: 400 (body), 500 (UI labels), 600 (button labels, card labels), 700 (headings, venue names)
- **Data fields:** [JetBrains Mono](https://fonts.google.com/specimen/JetBrains+Mono) — times, dates, DUPR ratings, level ranges
  - Weights in use: 400 (data display), 500 (emphasized data)
  - Use for: game times (`9:00 AM`), date strings (`Sat, Apr 5`), level ranges (`3.5–4.0`), DUPR values (`4.182`)
- **Never use:** Inter, Roboto, Helvetica, Montserrat, Poppins as primary
- **Loading:** Google Fonts CDN
  ```html
  <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet" />
  ```
- **Scale:**
  - `1.75rem / 700` — page title (h1)
  - `1rem / 600` — section heading (h2, results count)
  - `0.9375rem / 700` — venue name (card primary)
  - `0.875rem / 600` — form labels
  - `0.875rem / 400` — body, descriptions
  - `0.8125rem / 400` — card secondary (program name, datetime, price)
  - `0.75rem` — tertiary info (source label, city)
  - `0.6875rem / 700 + letter-spacing` — section labels, component titles (uppercase)

## Color
- **Approach:** Restrained — one accent color, everything else is slate neutrals

```css
:root {
  /* Backgrounds */
  --color-bg:        #f8fafc;  /* slate-50 — page background */
  --color-surface:   #ffffff;  /* white — cards, inputs */
  --color-surface-2: #f1f5f9;  /* slate-100 — agent status bar, secondary surfaces */

  /* Borders */
  --color-border:       #e2e8f0;  /* slate-200 */
  --color-border-strong: #cbd5e1; /* slate-300 — input focus ring base */

  /* Text */
  --color-text:   #0f172a;  /* slate-900 — primary text */
  --color-muted:  #64748b;  /* slate-500 — secondary text, labels */
  --color-faint:  #94a3b8;  /* slate-400 — tertiary, source labels */

  /* Accent (teal — NOT generic blue) */
  --color-accent:       #0d9488;  /* teal-600 */
  --color-accent-hover: #0f766e;  /* teal-700 */
  --color-accent-light: #f0fdfa;  /* teal-50 */

  /* Semantic — game status */
  --color-open-bg:   #dcfce7;  /* green-100 */
  --color-open-text: #15803d;  /* green-700 */
  --color-full-bg:   #fee2e2;  /* red-100 */
  --color-full-text: #b91c1c;  /* red-700 */

  /* Semantic — level badge */
  --color-level-bg:   #dbeafe;  /* blue-100 */
  --color-level-text: #1e40af;  /* blue-800 */

  /* Warning banner (partial errors) */
  --color-warn-bg:     #fffbeb;  /* amber-50 */
  --color-warn-border: #fde68a;  /* amber-200 */
  --color-warn-text:   #92400e;  /* amber-800 */
}
```

## Spacing
- **Base unit:** 4px
- **Density:** Comfortable — tight enough for mobile scanning, not cramped
- **Scale:** `2(0.125rem)` `4(0.25rem)` `6(0.375rem)` `8(0.5rem)` `12(0.75rem)` `16(1rem)` `20(1.25rem)` `24(1.5rem)` `32(2rem)` `48(3rem)` `64(4rem)`
- **Card internal padding:** `14px 16px` (`0.875rem 1rem`) on mobile, `16px 20px` on wider screens

## Layout
- **Approach:** Grid-disciplined, single column
- **Max content width:** 760px (keep existing)
- **Page padding:** `2rem 1rem`
- **Results gap:** `0.5rem` between cards (tighter than current `0.75rem`)
- **Form:** 3-column grid on desktop (`City / Arriving / Leaving`), stacked on mobile

## Border Radius
- **sm:** 4px — badges, small chips
- **md:** 6px — buttons, inputs, status bar
- **lg:** 8px — game cards, component panels

## The Game Card (most important component)
The card is a horizontal flex row: body on the left, action (button + source) on the right.

Key design decisions:
1. **Left border (3px)** colored by status — green for open, red for full, `var(--color-border-strong)` for unknown. This is the primary status signal, readable at a glance without reading any text.
2. **Venue name** in DM Sans 700 — the most important piece of information
3. **Date · Time** in JetBrains Mono — precision readout, tabular alignment
4. **Level range** in JetBrains Mono inside a blue badge — `3.5–4.0`, `4.0+`, `All levels`
5. **Open/Full badge** inside the card (in addition to left border) — belt and suspenders, for users who look at the badges
6. **"View & join →"** in teal — the only interactive accent element

```
┌─── ──────────────────────────────────────────────────────────┐
│ ▌  Venue Name Bold                  [3.5–4.0]  City          │ ← green/red/gray left border
│    Program Name muted                                         │
│    Sat, Apr 5 · 9:00 AM  (monospace)                         │
│    $8 drop-in                               [View & join →]  │
│                                              via PlayByPoint  │
└──────────────────────────────────────────────────────────────┘
```

## Motion
- **Approach:** Minimal-functional — the only animation is the search spinner
- **Spinner:** 10×10px, 2px border, `--color-border` base, `--color-accent` top arc, 0.8s linear infinite
- **No entrance animations.** Cards appear instantly as they stream in. Speed is a feature.
- **No hover transitions** beyond color change on the button.

## Decisions Log
| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-03-29 | Teal accent (#0d9488) over generic blue | Reads as travel-tool, not sports-social. Every pickleball app uses blue. |
| 2026-03-29 | JetBrains Mono for times, levels, DUPR | Precision readout feel. Makes data scannable on mobile. No sports app does this. |
| 2026-03-29 | Left border card status signal | Faster scan pattern than badge-only. Both border + badge kept for redundancy. |
| 2026-03-29 | Reject sports-social aesthetic | Pickletrip is a travel aggregator, not a community app. Kayak, not Pickleheads. |
| 2026-03-29 | No icon / plain wordmark | 🏓 is table tennis (wrong sport). No pickleball paddle illustration. Text-only or minimal SVG ball. |
| 2026-03-29 | DM Sans over Inter | Same clean feel, less overused. Works well at small sizes on mobile. |
