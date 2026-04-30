import type { Game } from '@/lib/types';

const SOURCE_LABELS: Record<string, string> = {
  playbypoint: 'PlayByPoint',
  courtreserve: 'CourtReserve',
  forte: 'Pickles at Forté',
  podplay: 'PodPlay',
};

export default function GameCard({ game }: { game: Game }) {
  const isOpen = game.status === 'open';
  const isFull = game.status === 'full';
  const isKnownStatus = game.status !== 'unknown';

  const borderColor = isOpen
    ? 'var(--color-open-text)'
    : isFull
    ? 'var(--color-full-text)'
    : 'var(--color-border-strong)';

  return (
    <div
      style={{
        background: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
        borderLeft: `3px solid ${borderColor}`,
        borderRadius: 'var(--radius-lg)',
        padding: '0.875rem 1rem',
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        gap: '0.75rem',
      }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.375rem',
          flexWrap: 'wrap',
          marginBottom: '0.125rem',
        }}>
          <span style={{ fontWeight: 700, fontSize: '0.9375rem', color: 'var(--color-text)' }}>
            {game.venue}
          </span>
          {isKnownStatus && (
            <span style={{
              fontSize: '0.6875rem',
              fontWeight: 600,
              padding: '0.125rem 0.4375rem',
              borderRadius: 'var(--radius-sm)',
              background: isOpen ? 'var(--color-open-bg)' : 'var(--color-full-bg)',
              color: isOpen ? 'var(--color-open-text)' : 'var(--color-full-text)',
            }}>
              {isOpen ? 'Open' : 'Full'}
            </span>
          )}
          {game.level && (
            <span style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '0.6875rem',
              fontWeight: 500,
              padding: '0.125rem 0.4375rem',
              borderRadius: 'var(--radius-sm)',
              background: 'var(--color-level-bg)',
              color: 'var(--color-level-text)',
            }}>
              {game.level}
            </span>
          )}
          {game.city && (
            <span style={{ fontSize: '0.75rem', color: 'var(--color-faint)' }}>
              {game.city}
            </span>
          )}
        </div>

        <div style={{ fontSize: '0.8125rem', color: 'var(--color-muted)', marginBottom: '0.1875rem' }}>
          {game.programName}
        </div>

        <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8125rem', color: 'var(--color-text)' }}>
          {game.date}{game.time ? ` · ${game.time}` : ''}
          {!game.time && <span style={{ color: 'var(--color-faint)' }}> · Time unlisted</span>}
        </div>

        {game.price && (
          <div style={{ fontSize: '0.75rem', color: 'var(--color-muted)', marginTop: '0.125rem' }}>
            {game.price}
          </div>
        )}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.375rem', flexShrink: 0 }}>
        <a
          href={game.url}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            padding: '0.375rem 0.75rem',
            background: 'var(--color-accent)',
            color: '#fff',
            borderRadius: 'var(--radius-md)',
            fontSize: '0.8125rem',
            fontWeight: 600,
            textDecoration: 'none',
            whiteSpace: 'nowrap',
            fontFamily: 'var(--font-ui)',
          }}
          onMouseOver={e => (e.currentTarget.style.background = 'var(--color-accent-hover)')}
          onMouseOut={e => (e.currentTarget.style.background = 'var(--color-accent)')}
        >
          View &amp; join →
        </a>
        <span style={{ fontSize: '0.6875rem', color: 'var(--color-faint)' }}>
          via {game.facilityName ?? SOURCE_LABELS[game.source] ?? game.source}
        </span>
      </div>
    </div>
  );
}
