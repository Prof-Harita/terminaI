/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * The approval level required for a tool action.
 * - A: No approval required (read-only, bounded, reversible)
 * - B: Click-to-approve with explanation
 * - C: Click-to-approve with explanation + 6-digit PIN
 */
export type ReviewLevel = 'A' | 'B' | 'C';

/**
 * Classification of operation types for safety assessment.
 */
export type OperationClass =
  | 'read'
  | 'write'
  | 'delete'
  | 'privileged'
  | 'network'
  | 'process'
  | 'device'
  | 'unknown';

/**
 * Source/origin of a tool call for trust assessment.
 */
export type Provenance =
  | 'local_user'
  | 'web_remote_user'
  | 'model_suggestion'
  | 'workspace_file'
  | 'web_content'
  | 'tool_output'
  | 'unknown';

/**
 * Structured profile of a tool action derived from deterministic parsing and analysis.
 */
export interface ActionProfile {
  /** The name of the tool being invoked */
  toolName: string;

  /** Classified operation types detected in this action */
  operations: OperationClass[];

  /** Command roots or sub-operation identifiers */
  roots: string[];

  /** Paths that will be touched/modified by this action */
  touchedPaths: string[];

  /** Whether the action touches paths outside registered workspaces */
  outsideWorkspace: boolean;

  /** Whether the action uses sudo or equivalent privilege escalation */
  usesPrivilege: boolean;

  /** Whether the action has unbounded scope signals (/, ~, wildcards with deletes) */
  hasUnboundedScopeSignals: boolean;

  /** Confidence in the parsing/analysis (low triggers automatic escalation) */
  parseConfidence: 'high' | 'medium' | 'low';

  /** Sources/origins of this action */
  provenance: Provenance[];

  /** Human-readable summary of the raw action */
  rawSummary: string;
}

/**
 * Result of deterministic minimum review level computation.
 */
export interface DeterministicReviewResult {
  /** The minimum required review level (A/B/C) */
  level: ReviewLevel;

  /** Reasons for this level (for logging and display) */
  reasons: string[];

  /** Whether user click-to-approve is required */
  requiresClick: boolean;

  /** Whether 6-digit PIN verification is required */
  requiresPin: boolean;
}
