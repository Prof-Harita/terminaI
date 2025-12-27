/**
 * @license
 * Copyright 2025 Google LLC
 * Portions Copyright 2025 TerminaI Authors
 * SPDX-License-Identifier: Apache-2.0
 */

export type AuditReviewLevel = 'A' | 'B' | 'C';

export type AuditEventType =
  | 'tool.requested'
  | 'tool.awaiting_approval'
  | 'tool.approved'
  | 'tool.denied'
  | 'tool.execution_started'
  | 'tool.execution_finished'
  | 'tool.execution_failed'
  | 'session.start'
  | 'session.end';

export type AuditProvenance =
  | 'local_user'
  | 'web_remote_user'
  | 'model_suggestion'
  | 'workspace_file'
  | 'web_content'
  | 'tool_output'
  | 'unknown';

export interface AuditActor {
  kind: 'user' | 'policy' | 'model' | 'system';
  id?: string;
}

export interface AuditRedactionHint {
  path: string;
  strategy: 'drop' | 'mask' | 'hash';
  reason: 'secret' | 'pii' | 'ui_typed_text' | 'large_payload' | 'unknown';
}

export interface AuditEventBase {
  version: 1;
  eventType: AuditEventType;
  timestamp: string;
  sessionId: string;
  traceId?: string;
  provenance: AuditProvenance[];
  reviewLevel?: AuditReviewLevel;
  actor?: AuditActor;
  redactions?: AuditRedactionHint[];
  prevHash?: string;
  hash?: string;
}

export interface AuditToolContext {
  callId: string;
  toolName: string;
  toolKind?: string;
  args?: Record<string, unknown>;
  result?: {
    success: boolean;
    errorType?: string;
    exitCode?: number;
    outputBytes?: number;
    metadata?: Record<string, unknown>;
  };
}

export type AuditEvent = AuditEventBase & {
  tool?: AuditToolContext;
};
