/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

const RISK_COLORS: Record<string, string> = {
  low: 'bg-green-500/20 text-green-400',
  moderate: 'bg-yellow-500/20 text-yellow-400',
  high: 'bg-orange-500/20 text-orange-400',
  dangerous: 'bg-red-500/20 text-red-400',
};

const RISK_ICONS: Record<string, string> = {
  low: '🟢',
  moderate: '🟡',
  high: '🟠',
  dangerous: '🔴',
};

interface Props {
  level: string;
}

export function RiskBadge({ level }: Props) {
  const colorClass = RISK_COLORS[level] || RISK_COLORS.moderate;
  const icon = RISK_ICONS[level] || '🟡';

  return (
    <span
      className={`px-2 py-0.5 rounded-full text-xs font-medium ${colorClass}`}
    >
      {icon} {level.toUpperCase()}
    </span>
  );
}
