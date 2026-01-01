/**
 * @license
 * Copyright 2025 Google LLC
 * Portions Copyright 2025 TerminaI Authors
 * SPDX-License-Identifier: Apache-2.0
 */

interface Props {
  label: string;
  progress: number;
  status?: 'running' | 'success' | 'error';
}

export function ProgressBar({ label, progress, status = 'running' }: Props) {
  const statusColors: Record<string, string> = {
    running: 'bg-cyan-500',
    success: 'bg-green-500',
    error: 'bg-red-500',
  };

  const statusColor = statusColors[status] || statusColors.running;

  return (
    <div className="bg-gray-800/50 rounded-lg p-3 my-2">
      <div className="flex justify-between text-sm mb-1.5">
        <span className="text-white">{label}</span>
        <span className="text-gray-400">{Math.round(progress)}%</span>
      </div>
      <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
        <div
          className={`h-full ${statusColor} transition-all duration-300`}
          style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
        />
      </div>
    </div>
  );
}
