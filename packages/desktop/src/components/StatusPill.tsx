/**
 * @license
 * Copyright 2025 Google LLC
 * Portions Copyright 2025 TerminaI Authors
 * SPDX-License-Identifier: Apache-2.0
 */

interface StatusPillProps {
  status: string;
}

export function StatusPill({ status }: StatusPillProps) {
  return (
    <div className="sticky bottom-6 mx-auto z-20">
      <div className="px-4 py-2 rounded-full bg-[var(--bg-elevated)] border border-[var(--border-light)] 
                      shadow-lg flex items-center gap-3 animate-pulse">
        <div className="w-2 h-2 rounded-full bg-[var(--accent)]" />
        <span className="text-sm font-medium text-[var(--text-secondary)] whitespace-nowrap">
          {status}
        </span>
      </div>
    </div>
  );
}
