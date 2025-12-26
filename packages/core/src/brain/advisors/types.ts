/**
 * @license
 * Copyright 2025 Google LLC
 * Portions Copyright 2025 TerminaI Authors
 * SPDX-License-Identifier: Apache-2.0
 */

import type { SystemSpec } from '../systemSpec.js';

/**
 * Proposal for an approach to solve a task.
 */
export interface AdvisorProposal {
  approach: string;
  reasoning: string;
  estimatedTime: 'fast' | 'medium' | 'slow';
  requiredDeps: string[];
  confidence: number; // 0-100
}

/**
 * Interface for parallel advisors in the Consensus Framework.
 */
export interface Advisor {
  readonly name: string;
  propose(task: string, systemSpec: SystemSpec): Promise<AdvisorProposal>;
}
