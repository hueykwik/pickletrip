'use client';

import { useState, useRef } from 'react';
import GameCard from '@/components/GameCard';
import AgentStatus from '@/components/AgentStatus';
import type { Game } from '@/lib/types';

interface AgentState {
  source: string;
  status: 'searching' | 'done' | 'error';
  count?: number;
  error?: string;
}

const LEVELS = [
  { value: '', label: 'Any level' },
  { value: '2.5-3.0', label: '2.5 – 3.0' },
  { value: '3.0-3.5', label: '3.0 – 3.5' },
  { value: '3.5-4.0', label: '3.5 – 4.0' },
  { value: '4.0-4.5', label: '4.0 – 4.5' },
  { value: '4.5+', label: '4.5+' },
];

function parseGameDate(dateStr: string): Date {
  // Handle ISO 8601 strings from Meetup (e.g. "2026-03-28T10:00:00Z")
  if (/^\d{4}-\d{2}-\d{2}/.test(dateStr)) {
    const d = new Date(dateStr);
    if (!isNaN(d.getTime())) return d;
  }
  const now = new Date();
  const parsed = new Date(`${dateStr} ${now.getFullYear()}`);
  if (now.getTime() - parsed.getTime() > 60 * 24 * 60 * 60 * 1000) {
    parsed.setFullYear(now.getFullYear() + 1);
  }
  return parsed;
}

function toDateStr(d: Date): string {
  return d.toISOString().split('T')[0];
}

export default function Home() {
  const [city, setCity] = useState('');
  const [dateFrom, setDateFrom] = useState(() => toDateStr(new Date()));
  const [dateTo, setDateTo] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 14);
    return toDateStr(d);
  });
  const [level, setLevel] = useState('');

  const [games, setGames] = useState<Game[]>([]);
  const [agents, setAgents] = useState<AgentState[]>([]);
  const [metroName, setMetroName] = useState<string | null>(null);
  const [searching, setSearching] = useState(false);
  const [done, setDone] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!city || !dateFrom || !dateTo) return;

    abortRef.current?.abort();
    abortRef.current = new AbortController();

    setGames([]);
    setMetroName(null);
    setAgents([]);
    setSearching(true);
    setDone(false);

    try {
      const res = await fetch('/api/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ city, dateFrom, dateTo, level: level || undefined }),
        signal: abortRef.current.signal,
      });

      if (!res.body) throw new Error('No response body');
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = '';

      while (true) {
        const { done: streamDone, value } = await reader.read();
        if (streamDone) break;
        buf += decoder.decode(value, { stream: true });

        const lines = buf.split('\n');
        buf = lines.pop() ?? '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          try {
            const payload = JSON.parse(line.slice(6));
            if ('metroName' in payload) {
              setMetroName(payload.metroName);
              if (Array.isArray(payload.activeSources)) {
                setAgents(payload.activeSources.map((source: string) => ({ source, status: 'searching' as const })));
              }
            }
            if (payload.games) {
              setGames(prev => {
                const combined = [...prev, ...payload.games];
                return combined.sort((a, b) => {
                  try {
                    return parseGameDate(a.date).getTime() - parseGameDate(b.date).getTime();
                  } catch {
                    return 0;
                  }
                });
              });
              setAgents(prev =>
                prev.map(a =>
                  a.source === payload.source
                    ? { ...a, status: 'done', count: payload.games.length }
                    : a
                )
              );
            }
            if (payload.error) {
              setAgents(prev =>
                prev.map(a =>
                  a.source === payload.source
                    ? { ...a, status: 'error', error: payload.error }
                    : a
                )
              );
            }
            if (payload.done) {
              setDone(true);
              // Mark any still-searching agents as done (handles unknown city short-circuit)
              setAgents(prev =>
                prev.map(a => a.status === 'searching' ? { ...a, status: 'done', count: 0 } : a)
              );
            }
          } catch {
            // ignore parse errors
          }
        }
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.name !== 'AbortError') {
        console.error(err);
      }
    } finally {
      setSearching(false);
    }
  }

  return (
    <main style={{ maxWidth: 760, margin: '0 auto', padding: '2rem 1rem' }}>
      <h1 style={{ fontSize: '1.75rem', fontWeight: 700, marginBottom: '0.25rem', color: 'var(--color-text)' }}>
        Pickletrip
      </h1>
      <p style={{ color: 'var(--color-muted)', marginBottom: '1.5rem', fontSize: '0.9375rem' }}>
        Find pickleball games while traveling — filtered by level, streamed from every platform.
      </p>

      <form onSubmit={handleSearch} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '2rem' }}>
        <div className="form-row">
          <label style={labelStyle}>
            City
            <input
              style={inputStyle}
              type="text"
              placeholder="West Hollywood"
              value={city}
              onChange={e => setCity(e.target.value)}
              required
            />
          </label>
          <label style={labelStyle}>
            Arriving
            <input style={inputStyle} type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} required />
          </label>
          <label style={labelStyle}>
            Leaving
            <input style={inputStyle} type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} required />
          </label>
        </div>

        <label style={{ ...labelStyle, maxWidth: 220 }}>
          My Level
          <select style={inputStyle} value={level} onChange={e => setLevel(e.target.value)}>
            {LEVELS.map(l => <option key={l.value} value={l.value}>{l.label}</option>)}
          </select>
        </label>

        <button
          type="submit"
          disabled={searching}
          style={{
            padding: '0.5625rem 1.5rem',
            background: searching ? 'var(--color-border-strong)' : 'var(--color-accent)',
            color: '#fff',
            border: 'none',
            borderRadius: 'var(--radius-md)',
            fontSize: '0.9375rem',
            fontWeight: 600,
            cursor: searching ? 'not-allowed' : 'pointer',
            alignSelf: 'flex-start',
            fontFamily: 'var(--font-ui)',
          }}
        >
          {searching ? 'Searching…' : 'Find games'}
        </button>
      </form>

      {metroName && (
        <p style={{ fontSize: '0.8125rem', color: 'var(--color-muted)', marginBottom: '0.75rem' }}>
          Showing results for {metroName}
        </p>
      )}

      {agents.length > 0 && (
        <AgentStatus agents={agents.filter(a => a.status === 'searching' || (a.count ?? 0) > 0 || a.status === 'error' || (searching && a.status === 'done'))} />
      )}

      {games.length > 0 && (
        <div>
          <h2 style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-muted)', marginBottom: '0.75rem' }}>
            <span style={{ color: 'var(--color-text)' }}>{games.length} game{games.length !== 1 ? 's' : ''}</span> found
            {done ? '' : ' so far…'}
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {games.map(game => <GameCard key={game.id} game={game} />)}
          </div>
        </div>
      )}

      {done && games.length > 0 && agents.some(a => a.status === 'error') && (
        <p style={{
          fontSize: '0.8125rem',
          color: 'var(--color-warn-text)',
          background: 'var(--color-warn-bg)',
          border: '1px solid var(--color-warn-border)',
          borderRadius: 'var(--radius-md)',
          padding: '0.5rem 0.75rem',
          marginTop: '0.75rem',
        }}>
          Results may be incomplete — {agents.filter(a => a.status === 'error').length} source{agents.filter(a => a.status === 'error').length !== 1 ? 's' : ''} unavailable.
        </p>
      )}

      {done && games.length === 0 && (
        <p style={{ color: 'var(--color-muted)', fontSize: '0.9375rem' }}>
          No games found in {metroName ?? city} for those dates.
        </p>
      )}
    </main>
  );
}

const labelStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '0.25rem',
  fontSize: '0.875rem',
  fontWeight: 600,
  color: 'var(--color-text)',
};

const inputStyle: React.CSSProperties = {
  padding: '0.5rem 0.75rem',
  border: '1px solid var(--color-border-strong)',
  borderRadius: 'var(--radius-md)',
  fontSize: '0.9375rem',
  background: 'var(--color-surface)',
  color: 'var(--color-text)',
  fontFamily: 'var(--font-ui)',
};
