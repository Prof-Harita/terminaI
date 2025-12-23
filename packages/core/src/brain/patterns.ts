/**
 * @license
 * Copyright 2025 Google LLC
 * Portions Copyright 2025 TerminaI Authors
 * SPDX-License-Identifier: Apache-2.0
 */

import type { RiskDimensions } from './riskAssessor.js';

export interface RiskPattern {
  pattern: RegExp;
  dimensions: Partial<RiskDimensions>;
}

export const COMMON_PATTERNS: RiskPattern[] = [
  // Trivial read-only commands
  {
    pattern:
      /^(ls|pwd|whoami|date|uptime|free|df|cat|head|tail|grep|find|which|echo)\b/i,
    dimensions: {
      uniqueness: 5,
      complexity: 5,
      irreversibility: 0,
      consequences: 0,
      confidence: 95,
    },
  },
  // Network diagnostics
  {
    pattern: /^(ping|curl|wget|nslookup|dig|traceroute|netstat|ss)\b/i,
    dimensions: {
      uniqueness: 15,
      complexity: 10,
      irreversibility: 0,
      consequences: 5,
      confidence: 90,
    },
  },
  // Package managers (reversible but consequential)
  {
    pattern: /^(npm|yarn|pip|apt|brew)\s+(install|add)\b/i,
    dimensions: {
      uniqueness: 10,
      complexity: 20,
      irreversibility: 30,
      consequences: 40,
      confidence: 85,
    },
  },
  // Destructive patterns (high risk)
  {
    pattern: /\brm\s+(-rf?|--recursive)\b/i,
    dimensions: {
      uniqueness: 20,
      complexity: 15,
      irreversibility: 95,
      consequences: 80,
      confidence: 60,
    },
  },
  // System modification
  {
    pattern: /^sudo\b/i,
    dimensions: {
      irreversibility: 70,
      consequences: 70,
      confidence: 50,
    },
  },
  // Disk operations (critical)
  {
    pattern: /\b(dd|mkfs|fdisk|parted)\b/i,
    dimensions: {
      uniqueness: 80,
      complexity: 60,
      irreversibility: 100,
      consequences: 100,
      confidence: 30,
    },
  },
];

export function matchCommonPattern(
  command: string,
): Partial<RiskDimensions> | null {
  const normalized = command.trim();
  for (const { pattern, dimensions } of COMMON_PATTERNS) {
    if (pattern.test(normalized)) {
      return dimensions;
    }
  }
  return null;
}
