/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { useSessions } from '../hooks/useSessions';
import { SessionCard } from './SessionCard';

export function SessionsSidebar() {
  const { sessions, stopSession, viewLogs } = useSessions();

  if (sessions.length === 0) return null;

  return (
    <div
      style={{
        width: '280px',
        background: 'var(--bg-secondary)',
        borderLeft: '1px solid var(--border)',
        padding: 'var(--space-5)',
        overflowY: 'auto',
      }}
    >
      <h2
        style={{
          margin: '0 0 var(--space-5) 0',
          fontSize: 'var(--text-xs)',
          fontWeight: 600,
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
          color: 'var(--text-muted)',
        }}
      >
        Sessions ({sessions.length})
      </h2>
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--space-3)',
        }}
      >
        {sessions.map((session) => (
          <SessionCard
            key={session.name}
            session={session}
            onStop={() => stopSession(session.name)}
            onViewLogs={() => viewLogs(session.name)}
          />
        ))}
      </div>
    </div>
  );
}
