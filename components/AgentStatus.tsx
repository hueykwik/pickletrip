interface AgentState {
  source: string;
  status: 'searching' | 'done' | 'error';
  count?: number;
  error?: string;
}

const SOURCE_LABELS: Record<string, string> = {
  playbypoint: 'PlayByPoint',
  courtreserve: 'CourtReserve',
};

export default function AgentStatus({ agents }: { agents: AgentState[] }) {
  return (
    <div
      style={{
        background: '#f3f4f6',
        border: '1px solid #e5e7eb',
        borderRadius: 6,
        padding: '0.625rem 1rem',
        marginBottom: '1.25rem',
        display: 'flex',
        gap: '1rem',
        flexWrap: 'wrap',
      }}
    >
      {agents.map(agent => (
        <span key={agent.source} style={{ fontSize: '0.8125rem', display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
          {agent.status === 'searching' && <Spinner />}
          {agent.status === 'done' && <span>✓</span>}
          {agent.status === 'error' && <span>✕</span>}
          <span style={{ fontWeight: 600 }}>{SOURCE_LABELS[agent.source] ?? agent.source}:</span>
          {agent.status === 'searching' && <span style={{ color: '#6b7280' }}>searching…</span>}
          {agent.status === 'done' && (
            <span style={{ color: '#166534' }}>
              {agent.count ?? 0} game{agent.count !== 1 ? 's' : ''} found
            </span>
          )}
          {agent.status === 'error' && (
            <span style={{ color: '#991b1b' }}>unavailable — try again later</span>
          )}
        </span>
      ))}
    </div>
  );
}

function Spinner() {
  return (
    <span
      style={{
        display: 'inline-block',
        width: 10,
        height: 10,
        border: '2px solid #d1d5db',
        borderTopColor: '#2563eb',
        borderRadius: '50%',
        animation: 'spin 0.8s linear infinite',
      }}
    />
  );
}
