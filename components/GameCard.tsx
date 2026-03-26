import type { Game } from '@/lib/types';

const SOURCE_LABELS: Record<string, string> = {
  playbypoint: 'PlayByPoint',
  courtreserve: 'CourtReserve',
};

export default function GameCard({ game }: { game: Game }) {
  const isOpen = game.status === 'open';

  return (
    <div
      style={{
        background: '#fff',
        border: '1px solid #e5e7eb',
        borderRadius: 8,
        padding: '1rem 1.25rem',
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        gap: '1rem',
      }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.25rem' }}>
          <span style={{ fontWeight: 700, fontSize: '0.9375rem' }}>{game.venue}</span>
          <span
            style={{
              fontSize: '0.75rem',
              fontWeight: 600,
              padding: '0.125rem 0.5rem',
              borderRadius: 4,
              background: isOpen ? '#dcfce7' : '#fee2e2',
              color: isOpen ? '#166534' : '#991b1b',
            }}
          >
            {isOpen ? 'Open' : 'Full'}
          </span>
          {game.level && (
            <span
              style={{
                fontSize: '0.75rem',
                fontWeight: 600,
                padding: '0.125rem 0.5rem',
                borderRadius: 4,
                background: '#dbeafe',
                color: '#1e40af',
              }}
            >
              {game.level}
            </span>
          )}
          {game.city && (
            <span style={{ fontSize: '0.75rem', color: '#9ca3af' }}>
              {game.city}
            </span>
          )}
        </div>
        <div style={{ fontSize: '0.8125rem', color: '#6b7280', marginBottom: '0.125rem' }}>
          {game.programName}
        </div>
        <div style={{ fontSize: '0.875rem', color: '#374151' }}>
          {game.date} · {game.time || 'Time unlisted'}
        </div>
        {game.price && (
          <div style={{ fontSize: '0.8125rem', color: '#6b7280', marginTop: '0.125rem' }}>
            {game.price}
          </div>
        )}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.5rem', flexShrink: 0 }}>
        <a
          href={game.url}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            padding: '0.375rem 0.875rem',
            background: '#2563eb',
            color: '#fff',
            borderRadius: 6,
            fontSize: '0.8125rem',
            fontWeight: 600,
            textDecoration: 'none',
            whiteSpace: 'nowrap',
          }}
        >
          View &amp; join →
        </a>
        <span style={{ fontSize: '0.6875rem', color: '#9ca3af' }}>
          via {SOURCE_LABELS[game.source] ?? game.source}
        </span>
      </div>
    </div>
  );
}
