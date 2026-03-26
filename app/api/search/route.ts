import { NextRequest } from 'next/server';
import { scrapePlayByPoint } from '@/agents/playbypoint.mjs';

export const runtime = 'nodejs';
export const maxDuration = 300; // 5 minutes

export async function POST(req: NextRequest) {
  const { city, dateFrom, dateTo } = await req.json();

  if (!city || !dateFrom || !dateTo) {
    return new Response('Missing required fields', { status: 400 });
  }

  const from = new Date(dateFrom);
  const to = new Date(dateTo);
  // Set to end of day so the dateTo date is inclusive
  to.setHours(23, 59, 59, 999);

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      function emit(data: object) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      }

      let total = 0;

      try {
        const games = await (scrapePlayByPoint as (city: string, dateFrom: Date, dateTo: Date) => Promise<unknown[]>)(city, from, to);
        emit({ source: 'playbypoint', games });
        total += games.length;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        console.error('[api/search] PlayByPoint error:', message);
        emit({ source: 'playbypoint', error: message, games: [] });
      }

      emit({ done: true, total });
      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
