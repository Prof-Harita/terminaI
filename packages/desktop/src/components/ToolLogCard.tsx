/**
 * @license
 * Copyright 2025 Google LLC
 * Portions Copyright 2025 TerminaI Authors
 * SPDX-License-Identifier: Apache-2.0
 */

import type { ToolEvent } from '../types/cli';

interface ToolLogCardProps {
  event: ToolEvent;
}

export function ToolLogCard({ event }: ToolLogCardProps) {
  const statusColors = {
    running: 'text-yellow-500 bg-yellow-500/10 border-yellow-500/20',
    completed: 'text-green-500 bg-green-500/10 border-green-500/20',
    failed: 'text-red-500 bg-red-500/10 border-red-500/20',
    awaiting_input: 'text-blue-500 bg-blue-500/10 border-blue-500/20',
  };

  return (
    <div className="flex flex-col gap-2 p-3 rounded-md bg-[var(--bg-tertiary)] border border-[var(--border)] group">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 overflow-hidden">
          <span className="text-xs font-mono font-bold text-[var(--accent)] truncate">
            {event.toolName}
          </span>
          <div className={`px-1.5 py-0.5 rounded-sm text-[10px] font-bold uppercase tracking-wider border ${statusColors[event.status]}`}>
            {event.status}
          </div>
        </div>
        <span className="text-[10px] text-[var(--text-muted)] whitespace-nowrap">
          {new Date(event.startedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
        </span>
      </div>

      <div className="text-[11px] font-mono text-[var(--text-secondary)] bg-[var(--bg-primary)] p-2 rounded border border-[var(--border-light)] overflow-hidden">
        <pre className="overflow-x-auto">
          {JSON.stringify(event.inputArguments, null, 2)}
        </pre>
      </div>

      {event.terminalOutput && (
        <div className="text-[10px] font-mono text-[var(--text-muted)] max-h-24 overflow-y-auto bg-[var(--bg-primary)] p-2 rounded opacity-80">
          {event.terminalOutput}
        </div>
      )}
    </div>
  );
}
