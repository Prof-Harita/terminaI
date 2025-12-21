import { RiskBadge } from './RiskBadge';
import { PendingConfirmation } from '../types/cli';

interface Props {
  confirmation: PendingConfirmation;
  onRespond: (approved: boolean) => void;
}

export function ConfirmationCard({ confirmation, onRespond }: Props) {
  return (
    <div
      style={{
        background: 'var(--bg-tertiary)',
        border: '1px solid #f59e0b33',
        borderRadius: 'var(--radius-lg)',
        padding: 'var(--space-5)',
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--space-3)',
          marginBottom: 'var(--space-4)',
        }}
      >
        <span style={{ fontSize: 'var(--text-lg)' }}>⚠️</span>
        <span
          style={{
            fontWeight: 600,
            fontSize: 'var(--text-sm)',
            color: 'var(--text-primary)',
          }}
        >
          Confirmation Required
        </span>
        <RiskBadge level={confirmation.riskLevel} />
      </div>

      {/* Description */}
      <p
        style={{
          margin: '0 0 var(--space-4) 0',
          fontSize: 'var(--text-sm)',
          color: 'var(--text-secondary)',
          lineHeight: 1.5,
        }}
      >
        {confirmation.description}
      </p>

      {/* Command preview */}
      <details style={{ marginBottom: 'var(--space-5)' }}>
        <summary
          style={{
            cursor: 'pointer',
            fontSize: 'var(--text-sm)',
            color: 'var(--text-muted)',
          }}
        >
          Show command
        </summary>
        <pre
          style={{
            marginTop: 'var(--space-3)',
            padding: 'var(--space-4)',
            background: 'var(--bg-primary)',
            borderRadius: 'var(--radius-md)',
            fontSize: 'var(--text-sm)',
            color: 'var(--text-secondary)',
            overflow: 'auto',
            fontFamily: 'monospace',
          }}
        >
          {confirmation.command}
        </pre>
      </details>

      {/* Actions */}
      <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
        <button
          className="btn"
          onClick={() => onRespond(true)}
          style={{
            flex: 1,
            background: '#22c55e',
            color: 'white',
          }}
        >
          Yes, proceed
        </button>
        <button
          className="btn btn-secondary"
          onClick={() => onRespond(false)}
          style={{ flex: 1 }}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
