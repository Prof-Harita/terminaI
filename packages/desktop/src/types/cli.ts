/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

export interface CliEvent {
  type:
    | 'text'
    | 'tool_call'
    | 'tool_result'
    | 'confirmation'
    | 'error'
    | 'done';
  content?: string;
  toolName?: string;
  toolArgs?: Record<string, unknown>;
  confirmationId?: string;
  riskLevel?: 'low' | 'moderate' | 'high' | 'dangerous';
}

export interface PendingConfirmation {
  id: string;
  description: string;
  command: string;
  riskLevel: string;
  requiresPin?: boolean;
  pinLength?: number;
}

export interface Progress {
  label: string;
  value: number;
  done: boolean;
}

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  events: CliEvent[];
  pendingConfirmation?: PendingConfirmation;
  progress?: Progress;
}
