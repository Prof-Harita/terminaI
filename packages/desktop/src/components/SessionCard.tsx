import { Session } from '../hooks/useSessions';

interface Props {
  session: Session;
  onStop: () => void;
  onViewLogs: () => void;
}

export function SessionCard({ session, onStop, onViewLogs }: Props) {
  const statusIcon: Record<string, string> = {
    running: '●',
    stopped: '○',
    done: '✓',
  };

  const statusColor: Record<string, string> = {
    running: '#22c55e',
    stopped: 'var(--text-muted)',
    done: 'var(--accent)',
  };

  return (
    <div
      style={{
        background: 'var(--bg-tertiary)',
        borderRadius: 'var(--radius-md)',
        padding: 'var(--space-4)',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--space-2)',
          marginBottom: 'var(--space-2)',
        }}
      >
        <span style={{ color: statusColor[session.status], fontSize: 'var(--text-xs)' }}>
          {statusIcon[session.status]}
        </span>
        <span
          style={{
            fontWeight: 500,
            fontSize: 'var(--text-sm)',
            color: 'var(--text-primary)',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {session.name}
        </span>
      </div>
      <p
        style={{
          margin: '0 0 var(--space-3) 0',
          fontSize: 'var(--text-xs)',
          color: 'var(--text-muted)',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {session.command}
      </p>
      <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
        <button
          className="btn btn-ghost"
          onClick={onViewLogs}
          style={{ padding: 'var(--space-1) var(--space-3)', fontSize: 'var(--text-xs)' }}
        >
          View
        </button>
        {session.status === 'running' && (
          <button
            className="btn"
            onClick={onStop}
            style={{
              padding: 'var(--space-1) var(--space-3)',
              fontSize: 'var(--text-xs)',
              background: 'rgba(239, 68, 68, 0.1)',
              color: '#ef4444',
            }}
          >
            Stop
          </button>
        )}
      </div>
    </div>
  );
}
