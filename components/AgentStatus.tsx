interface AgentState {
  source: string;
  status: 'searching' | 'done' | 'error';
  count?: number;
  error?: string;
}

const SOURCE_LABELS: Record<string, string> = {
  playbypoint: 'PlayByPoint',
  courtreserve: 'CourtReserve',
  forte: 'Pickles at Forté',
  meetup: 'Oahu Pickleball Association',
};

export default function AgentStatus({ agents }: { agents: AgentState[] }) {
  if (agents.length === 0) return null;

  return (
    <div style={{
      background: 'var(--color-surface-2)',
      border: '1px solid var(--color-border)',
      borderRadius: 'var(--radius-md)',
      padding: '0.5rem 0.875rem',
      marginBottom: '1rem',
      display: 'flex',
      gap: '1rem',
      flexWrap: 'wrap',
    }}>
      {agents.map(agent => (
        <span
          key={agent.source}
          style={{ fontSize: '0.8125rem', display: 'flex', alignItems: 'center', gap: '0.375rem' }}
        >
          {agent.status === 'searching' && <Spinner />}
          {agent.status === 'done' && (
            <span style={{ color: 'var(--color-open-text)', fontSize: '0.75rem' }}>✓</span>
          )}
          {agent.status === 'error' && (
            <span style={{ color: 'var(--color-full-text)', fontSize: '0.75rem' }}>✕</span>
          )}
          <span style={{ fontWeight: 600, color: 'var(--color-text)' }}>
            {SOURCE_LABELS[agent.source] ?? agent.source}:
          </span>
          {agent.status === 'searching' && (
            <span style={{ color: 'var(--color-muted)' }}>searching…</span>
          )}
          {agent.status === 'done' && (
            <span style={{ color: 'var(--color-open-text)' }}>
              {agent.count ?? 0} game{agent.count !== 1 ? 's' : ''} found
            </span>
          )}
          {agent.status === 'error' && (
            <span style={{ color: 'var(--color-full-text)' }}>unavailable</span>
          )}
        </span>
      ))}
    </div>
  );
}

function Spinner() {
  return (
    <span style={{
      display: 'inline-block',
      width: 10,
      height: 10,
      border: '2px solid var(--color-border-strong)',
      borderTopColor: 'var(--color-accent)',
      borderRadius: '50%',
      animation: 'spin 0.8s linear infinite',
      flexShrink: 0,
    }} />
  );
}
