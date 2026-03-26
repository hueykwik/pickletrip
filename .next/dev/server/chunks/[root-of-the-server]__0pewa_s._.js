module.exports = [
"[externals]/next/dist/compiled/next-server/app-route-turbo.runtime.dev.js [external] (next/dist/compiled/next-server/app-route-turbo.runtime.dev.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/compiled/next-server/app-route-turbo.runtime.dev.js", () => require("next/dist/compiled/next-server/app-route-turbo.runtime.dev.js"));

module.exports = mod;
}),
"[externals]/next/dist/compiled/@opentelemetry/api [external] (next/dist/compiled/@opentelemetry/api, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/compiled/@opentelemetry/api", () => require("next/dist/compiled/@opentelemetry/api"));

module.exports = mod;
}),
"[externals]/next/dist/compiled/next-server/app-page-turbo.runtime.dev.js [external] (next/dist/compiled/next-server/app-page-turbo.runtime.dev.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/compiled/next-server/app-page-turbo.runtime.dev.js", () => require("next/dist/compiled/next-server/app-page-turbo.runtime.dev.js"));

module.exports = mod;
}),
"[externals]/next/dist/server/app-render/work-unit-async-storage.external.js [external] (next/dist/server/app-render/work-unit-async-storage.external.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/server/app-render/work-unit-async-storage.external.js", () => require("next/dist/server/app-render/work-unit-async-storage.external.js"));

module.exports = mod;
}),
"[externals]/next/dist/server/app-render/work-async-storage.external.js [external] (next/dist/server/app-render/work-async-storage.external.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/server/app-render/work-async-storage.external.js", () => require("next/dist/server/app-render/work-async-storage.external.js"));

module.exports = mod;
}),
"[externals]/next/dist/shared/lib/no-fallback-error.external.js [external] (next/dist/shared/lib/no-fallback-error.external.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/shared/lib/no-fallback-error.external.js", () => require("next/dist/shared/lib/no-fallback-error.external.js"));

module.exports = mod;
}),
"[project]/agents/playbypoint.mjs [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

return __turbopack_context__.a(async (__turbopack_handle_async_dependencies__, __turbopack_async_result__) => { try {

__turbopack_context__.s([
    "scrapePlayByPoint",
    ()=>scrapePlayByPoint
]);
/**
 * PlayByPoint agent
 * Scrapes pickleball game sessions for a city + date range.
 *
 * Usage: node agents/playbypoint.mjs
 * Or import scrapePlayByPoint() from Next.js API route.
 */ var __TURBOPACK__imported__module__$5b$externals$5d2f$playwright$2d$extra__$5b$external$5d$__$28$playwright$2d$extra$2c$__cjs$2c$__$5b$project$5d2f$node_modules$2f$playwright$2d$extra$29$__ = __turbopack_context__.i("[externals]/playwright-extra [external] (playwright-extra, cjs, [project]/node_modules/playwright-extra)");
var __TURBOPACK__imported__module__$5b$externals$5d2f$puppeteer$2d$extra$2d$plugin$2d$stealth__$5b$external$5d$__$28$puppeteer$2d$extra$2d$plugin$2d$stealth$2c$__cjs$2c$__$5b$project$5d2f$node_modules$2f$puppeteer$2d$extra$2d$plugin$2d$stealth$29$__ = __turbopack_context__.i("[externals]/puppeteer-extra-plugin-stealth [external] (puppeteer-extra-plugin-stealth, cjs, [project]/node_modules/puppeteer-extra-plugin-stealth)");
;
;
__TURBOPACK__imported__module__$5b$externals$5d2f$playwright$2d$extra__$5b$external$5d$__$28$playwright$2d$extra$2c$__cjs$2c$__$5b$project$5d2f$node_modules$2f$playwright$2d$extra$29$__["chromium"].use((0, __TURBOPACK__imported__module__$5b$externals$5d2f$puppeteer$2d$extra$2d$plugin$2d$stealth__$5b$external$5d$__$28$puppeteer$2d$extra$2d$plugin$2d$stealth$2c$__cjs$2c$__$5b$project$5d2f$node_modules$2f$puppeteer$2d$extra$2d$plugin$2d$stealth$29$__["default"])());
// Known facility slugs per city. Expand as needed.
const CITY_FACILITIES = {
    'west hollywood': [
        'west-hollywood-park-tennis-cuurts',
        'plummer-park'
    ],
    'weho': [
        'west-hollywood-park-tennis-cuurts',
        'plummer-park'
    ]
};
const BASE_URL = 'https://app.playbypoint.com';
/**
 * Parse a PlayByPoint date string like "Wed, Mar 25" into a Date.
 * Assumes current year (or next year if month is in the past).
 */ function parseDate(dateStr) {
    const now = new Date();
    const parsed = new Date(`${dateStr} ${now.getFullYear()}`);
    // If parsed date is more than 60 days in the past, assume next year
    if (now - parsed > 60 * 24 * 60 * 60 * 1000) {
        parsed.setFullYear(now.getFullYear() + 1);
    }
    return parsed;
}
/**
 * Parse skill level from a program name string.
 * Returns a normalized level string or null.
 */ function parseLevel(programName) {
    const name = programName.toLowerCase();
    if (/beginner/i.test(name)) return 'Beginner';
    if (/advanced/i.test(name)) return 'Advanced';
    if (/intermediate/i.test(name)) return 'Intermediate';
    // DUPR range e.g. "2.9-3.49" or "3.5-3.999"
    const duprMatch = name.match(/(\d+\.\d+)\s*[-–]\s*(\d+(?:\.\d+)?)/);
    if (duprMatch) return `DUPR ${duprMatch[1]}–${duprMatch[2]}`;
    return null;
}
/**
 * Scrape all pickleball programs from a facility page.
 * Returns array of { name, url, level }.
 */ async function getFacilityPrograms(page, facilitySlug) {
    const url = `${BASE_URL}/f/${facilitySlug}`;
    await page.goto(url, {
        waitUntil: 'domcontentloaded',
        timeout: 30000
    });
    await page.waitForTimeout(1500);
    const programs = await page.evaluate((baseUrl)=>{
        const links = Array.from(document.querySelectorAll('a[href*="/programs/"]'));
        return links.filter((a)=>a.innerText.toLowerCase().includes('pickleball')).map((a)=>{
            // Extract just the program title — first non-empty line before "M T W T F S S"
            const lines = a.innerText.split('\n').map((l)=>l.trim()).filter(Boolean);
            const titleLines = lines.filter((l)=>!/^[MTWFS]$/.test(l) && l !== 'View Details');
            // Usually: lines[0] = category, lines[1] = program name, lines[2] = facility name
            const name = titleLines.slice(0, 2).join(' — ');
            return {
                name,
                url: a.href.startsWith('http') ? a.href : baseUrl + a.getAttribute('href')
            };
        });
    }, BASE_URL);
    // Deduplicate by URL
    const seen = new Set();
    return programs.filter((p)=>{
        if (seen.has(p.url)) return false;
        seen.add(p.url);
        return true;
    }).map((p)=>({
            ...p,
            level: parseLevel(p.name)
        }));
}
/**
 * Scrape all sessions from a program page, filtered by date range.
 */ async function getProgramSessions(page, program, dateFrom, dateTo) {
    await page.goto(program.url, {
        waitUntil: 'networkidle',
        timeout: 30000
    });
    await page.waitForTimeout(1500);
    // Wait for session cards to appear
    try {
        await page.waitForSelector('.pbc.black.card', {
            timeout: 10000
        });
    } catch  {
        return []; // No sessions visible (login wall or empty)
    }
    const venueName = await page.evaluate(()=>{
        // Program page header: typically "Facility Name — Program Name"
        const h1 = document.querySelector('h1');
        if (h1) return h1.innerText.split('\n')[0].trim();
        const breadcrumb = document.querySelector('[class*="breadcrumb"] a');
        return breadcrumb?.innerText?.trim() ?? '';
    });
    const sessions = await page.evaluate(({ programUrl, programName, venueName })=>{
        const cards = Array.from(document.querySelectorAll('.pbc.black.card'));
        return cards.map((card)=>{
            const dateEl = card.querySelector('.text.big.semi.bold.header_font, [class*="header_font"]');
            const timeEl = card.querySelector('.meta');
            const statusEl = card.querySelector('.pbc_reservation_status_text span, [class*="status_text"] span');
            const sessionId = card.getAttribute('data-id') || card.getAttribute('data-lesson') || '';
            return {
                id: `pbp-${sessionId}`,
                source: 'playbypoint',
                venue: venueName,
                programName,
                date: dateEl?.innerText?.trim() ?? '',
                time: timeEl?.innerText?.trim() ?? '',
                status: statusEl?.innerText?.trim().toLowerCase() ?? 'unknown',
                level: null,
                url: programUrl,
                price: null
            };
        });
    }, {
        programUrl: program.url,
        programName: program.name,
        venueName
    });
    // Filter by date range
    return sessions.filter((s)=>{
        if (!s.date) return false;
        try {
            const d = parseDate(s.date);
            return d >= dateFrom && d <= dateTo;
        } catch  {
            return false;
        }
    }).map((s)=>({
            ...s,
            level: program.level
        }));
}
async function scrapePlayByPoint(city, dateFrom, dateTo) {
    const facilitySlugs = CITY_FACILITIES[city.toLowerCase().trim()];
    if (!facilitySlugs) {
        console.warn(`[playbypoint] No facility slugs for city: ${city}`);
        return [];
    }
    const browser = await __TURBOPACK__imported__module__$5b$externals$5d2f$playwright$2d$extra__$5b$external$5d$__$28$playwright$2d$extra$2c$__cjs$2c$__$5b$project$5d2f$node_modules$2f$playwright$2d$extra$29$__["chromium"].launch({
        headless: true
    });
    const context = await browser.newContext({
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
    });
    const games = [];
    try {
        const page = await context.newPage();
        for (const slug of facilitySlugs){
            console.error(`[playbypoint] Scanning facility: ${slug}`);
            let programs;
            try {
                programs = await getFacilityPrograms(page, slug);
            } catch (err) {
                console.error(`[playbypoint] Failed to load facility ${slug}: ${err.message}`);
                continue;
            }
            console.error(`[playbypoint] Found ${programs.length} pickleball programs`);
            for (const program of programs){
                console.error(`[playbypoint] Scraping: ${program.name}`);
                try {
                    const sessions = await getProgramSessions(page, program, dateFrom, dateTo);
                    console.error(`[playbypoint] ${sessions.length} sessions in date range`);
                    games.push(...sessions);
                } catch (err) {
                    console.error(`[playbypoint] Failed to scrape ${program.url}: ${err.message}`);
                }
            }
        }
    } finally{
        await browser.close();
    }
    return games;
}
// Run directly: node agents/playbypoint.mjs
if (process.argv[1].endsWith('playbypoint.mjs')) {
    const dateFrom = new Date();
    const dateTo = new Date();
    dateTo.setDate(dateTo.getDate() + 7);
    console.error(`[playbypoint] Searching West Hollywood, ${dateFrom.toDateString()} – ${dateTo.toDateString()}`);
    const games = await scrapePlayByPoint('west hollywood', dateFrom, dateTo);
    console.log(JSON.stringify(games, null, 2));
    console.error(`\n[playbypoint] Total: ${games.length} games found`);
}
__turbopack_async_result__();
} catch(e) { __turbopack_async_result__(e); } }, true);}),
"[project]/app/api/search/route.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

return __turbopack_context__.a(async (__turbopack_handle_async_dependencies__, __turbopack_async_result__) => { try {

__turbopack_context__.s([
    "POST",
    ()=>POST,
    "maxDuration",
    ()=>maxDuration,
    "runtime",
    ()=>runtime
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$agents$2f$playbypoint$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/agents/playbypoint.mjs [app-route] (ecmascript)");
var __turbopack_async_dependencies__ = __turbopack_handle_async_dependencies__([
    __TURBOPACK__imported__module__$5b$project$5d2f$agents$2f$playbypoint$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__
]);
[__TURBOPACK__imported__module__$5b$project$5d2f$agents$2f$playbypoint$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__] = __turbopack_async_dependencies__.then ? (await __turbopack_async_dependencies__)() : __turbopack_async_dependencies__;
;
const runtime = 'nodejs';
const maxDuration = 300; // 5 minutes
async function POST(req) {
    const { city, dateFrom, dateTo } = await req.json();
    if (!city || !dateFrom || !dateTo) {
        return new Response('Missing required fields', {
            status: 400
        });
    }
    const from = new Date(dateFrom);
    const to = new Date(dateTo);
    // Set to end of day so the dateTo date is inclusive
    to.setHours(23, 59, 59, 999);
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
        async start (controller) {
            function emit(data) {
                controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
            }
            let total = 0;
            try {
                const games = await __TURBOPACK__imported__module__$5b$project$5d2f$agents$2f$playbypoint$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["scrapePlayByPoint"](city, from, to);
                emit({
                    source: 'playbypoint',
                    games
                });
                total += games.length;
            } catch (err) {
                const message = err instanceof Error ? err.message : 'Unknown error';
                console.error('[api/search] PlayByPoint error:', message);
                emit({
                    source: 'playbypoint',
                    error: message,
                    games: []
                });
            }
            emit({
                done: true,
                total
            });
            controller.close();
        }
    });
    return new Response(stream, {
        headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive'
        }
    });
}
__turbopack_async_result__();
} catch(e) { __turbopack_async_result__(e); } }, false);}),
];

//# sourceMappingURL=%5Broot-of-the-server%5D__0pewa_s._.js.map