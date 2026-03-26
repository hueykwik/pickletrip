'use client';

import { useState, useRef } from 'react';
import GameCard from '@/components/GameCard';
import AgentStatus from '@/components/AgentStatus';

interface Game {
  id: string;
  source: string;
  venue: string;
  programName: string;
  date: string;
  time: string;
  status: string;
  level: string | null;
  url: string;
  price: string | null;
}

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

export default function Home() {
  const [city, setCity] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [level, setLevel] = useState('');
  const [dupr, setDupr] = useState('');

  const [games, setGames] = useState<Game[]>([]);
  const [agents, setAgents] = useState<AgentState[]>([]);
  const [searching, setSearching] = useState(false);
  const [done, setDone] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!city || !dateFrom || !dateTo) return;

    abortRef.current?.abort();
    abortRef.current = new AbortController();

    setGames([]);
    setAgents([
      { source: 'playbypoint', status: 'searching' },
      { source: 'courtreserve', status: 'searching' },
    ]);
    setSearching(true);
    setDone(false);

    try {
      const res = await fetch('/api/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ city, dateFrom, dateTo, level: level || undefined, dupr: dupr || undefined }),
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
            if (payload.games) {
              setGames(prev => [...prev, ...payload.games]);
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
      <h1 style={{ fontSize: '1.75rem', fontWeight: 700, marginBottom: '0.25rem' }}>
        🏓 Pickletrip
      </h1>
      <p style={{ color: '#6b7280', marginBottom: '1.5rem' }}>
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

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.75rem' }}>
          <label style={labelStyle}>
            My Level
            <select style={inputStyle} value={level} onChange={e => setLevel(e.target.value)}>
              {LEVELS.map(l => <option key={l.value} value={l.value}>{l.label}</option>)}
            </select>
          </label>
          <label style={labelStyle}>
            DUPR Rating <span style={{ color: '#9ca3af', fontWeight: 400 }}>(optional)</span>
            <input
              style={inputStyle}
              type="number"
              step="0.001"
              min="1"
              max="8"
              placeholder="4.182"
              value={dupr}
              onChange={e => setDupr(e.target.value)}
            />
          </label>
        </div>

        <button
          type="submit"
          disabled={searching}
          style={{
            padding: '0.625rem 1.5rem',
            background: searching ? '#9ca3af' : '#2563eb',
            color: '#fff',
            border: 'none',
            borderRadius: 6,
            fontSize: '1rem',
            fontWeight: 600,
            cursor: searching ? 'not-allowed' : 'pointer',
            alignSelf: 'flex-start',
          }}
        >
          {searching ? 'Searching…' : 'Find games'}
        </button>
      </form>

      {agents.length > 0 && <AgentStatus agents={agents} />}

      {games.length > 0 && (
        <div>
          <h2 style={{ fontSize: '1rem', fontWeight: 600, color: '#374151', marginBottom: '0.75rem' }}>
            {games.length} game{games.length !== 1 ? 's' : ''} found
            {done ? '' : ' so far…'}
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {games.map(game => <GameCard key={game.id} game={game} />)}
          </div>
        </div>
      )}

      {done && games.length === 0 && (
        <p style={{ color: '#6b7280' }}>No games found for {city} in that date range.</p>
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
  color: '#374151',
};

const inputStyle: React.CSSProperties = {
  padding: '0.5rem 0.75rem',
  border: '1px solid #d1d5db',
  borderRadius: 6,
  fontSize: '0.9375rem',
  background: '#fff',
};
