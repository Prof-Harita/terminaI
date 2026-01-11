/**
 * @license
 * Copyright 2025 Google LLC
 * Portions Copyright 2025 TerminaI Authors
 * SPDX-License-Identifier: Apache-2.0
 */

import { useHistoryStore } from '../../stores/historyStore';
import { Clock, Trash2 } from 'lucide-react';

interface Props {
  onSelectSession: (id: string) => void;
  onNewChat?: () => void;
}

export function HistoryView({ onSelectSession }: Props) {
  const sessions = useHistoryStore((s) => s.sessions);
  const removeSession = useHistoryStore((s) => s.removeSession);
  const clearHistory = useHistoryStore((s) => s.clearHistory);

  return (
    <div className="h-full overflow-y-auto">
      <div className="p-3 space-y-2">
        <div className="flex items-center justify-between px-2 mb-2">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            Recent Sessions
          </span>
          {sessions.length > 0 && (
            <button
              onClick={() => clearHistory()}
              className="text-xs text-muted-foreground hover:text-red-400 transition-colors"
            >
              Clear All
            </button>
          )}
        </div>

        {sessions.length > 0 ? (
          <div className="space-y-1">
            {sessions.map((session) => (
              <div
                key={session.id}
                className="group flex items-start gap-3 p-2.5 rounded-md hover:bg-sidebar-accent cursor-pointer transition-all border border-transparent hover:border-sidebar-border"
                onClick={() => onSelectSession(session.id)}
              >
                <div className="mt-1 p-1.5 rounded bg-primary/10 text-primary">
                  <Clock className="w-3.5 h-3.5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate pr-6 relative">
                    {session.title}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        removeSession(session.id);
                      }}
                      className="absolute right-0 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 p-1 hover:text-red-400 text-muted-foreground bg-sidebar-accent rounded transition-all"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                  <div className="text-xs text-muted-foreground truncate opacity-70">
                    {session.lastMessage}
                  </div>
                  <div className="text-[10px] text-muted-foreground/50 mt-1">
                    {new Date(session.timestamp).toLocaleString()}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 px-4">
            <div className="p-3 rounded-full bg-muted/30 w-12 h-12 flex items-center justify-center mx-auto mb-3">
              <Clock className="w-6 h-6 text-muted-foreground/30" />
            </div>
            <div className="text-muted-foreground text-sm font-medium">
              No session history yet
            </div>
            <div className="text-muted-foreground/60 text-xs mt-1">
              Start a conversation to see history
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
