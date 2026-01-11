/**
 * @license
 * Copyright 2025 Google LLC
 * Portions Copyright 2025 TerminaI Authors
 * SPDX-License-Identifier: Apache-2.0
 */

import type { Message } from '../types/cli';
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
        justifyContent:
          message.role === 'system'
            ? 'center'
            : isUser
              ? 'flex-end'
              : 'flex-start',
      }}
    >
      <div
        style={{
          maxWidth: message.role === 'system' ? '90%' : '75%',
          padding: 'var(--space-4) var(--space-5)',
          borderRadius:
            message.role === 'system'
              ? 'var(--radius-lg)'
              : isUser
                ? 'var(--radius-lg) var(--radius-lg) var(--radius-sm) var(--radius-lg)'
                : 'var(--radius-lg) var(--radius-lg) var(--radius-lg) var(--radius-sm)',
          background:
            message.role === 'system'
              ? 'transparent'
              : isUser
                ? 'var(--accent)'
                : 'var(--bg-tertiary)',
          color:
            message.role === 'system'
              ? 'var(--text-secondary)'
              : isUser
                ? 'white'
                : 'var(--text-primary)',
          fontSize:
            message.role === 'system' ? 'var(--text-sm)' : 'var(--text-base)',
          fontStyle: message.role === 'system' ? 'italic' : 'normal',
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
