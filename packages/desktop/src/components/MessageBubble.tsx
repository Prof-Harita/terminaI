import { Message } from '../types/cli';
import { ProgressBar } from './ProgressBar';

interface Props {
  message: Message;
}

export function MessageBubble({ message }: Props) {
  const isUser = message.role === 'user';

  return (
    <div
      style={{
        display: 'flex',
        justifyContent: isUser ? 'flex-end' : 'flex-start',
      }}
    >
      <div
        style={{
          maxWidth: '75%',
          padding: 'var(--space-4) var(--space-5)',
          borderRadius: isUser
            ? 'var(--radius-lg) var(--radius-lg) var(--radius-sm) var(--radius-lg)'
            : 'var(--radius-lg) var(--radius-lg) var(--radius-lg) var(--radius-sm)',
          background: isUser ? 'var(--accent)' : 'var(--bg-tertiary)',
          color: isUser ? 'white' : 'var(--text-primary)',
          fontSize: 'var(--text-base)',
          lineHeight: '1.5',
        }}
      >
        <p style={{ whiteSpace: 'pre-wrap', margin: 0 }}>{message.content}</p>

        {message.progress && (
          <div style={{ marginTop: 'var(--space-3)' }}>
            <ProgressBar
              label={message.progress.label}
              progress={message.progress.value}
              status={message.progress.done ? 'success' : 'running'}
            />
          </div>
        )}
      </div>
    </div>
  );
}

