/**
 * @license
 * Copyright 2025 Google LLC
 * Portions Copyright 2025 TerminaI Authors
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Task 41: BrokerRequestSchema (Zod Validation)
 *
 * This module defines the IPC message schemas for communication between
 * the "Brain" (AppContainer sandbox) and "Hands" (Admin Broker) processes.
 *
 * All messages are validated at runtime using Zod to prevent:
 * - Injection attacks via malformed messages
 * - Type confusion errors
 * - Command injection through unvalidated fields
 *
 * @see docs-terminai/architecture-sovereign-runtime.md Appendix M.3
 */

import { z } from 'zod';

export const BrokerErrorCodeSchema = z.enum([
  'INVALID_REQUEST',
  'HANDSHAKE_REQUIRED',
  'HANDSHAKE_FAILED',
  'AMSI_BLOCKED',
  'POLICY_DENIED',
  'APPROVAL_DENIED',
  'EXECUTION_ERROR',
]);

export type BrokerErrorCode = z.infer<typeof BrokerErrorCodeSchema>;

export const BaseRequestSchema = z.object({
  id: z.string().uuid(),
});

// ============================================================================
// Request Schemas
// ============================================================================

/**
 * Execute a command with optional arguments and working directory.
 * This is the primary method for running tools in the privileged context.
 */
export const ExecuteRequestSchema = BaseRequestSchema.extend({
  type: z.literal('execute'),
  /** Command or executable to run */
  command: z.string().min(1),
  /** Optional command arguments */
  args: z.array(z.string()).optional(),
  /** Execution mode */
  mode: z.enum(['exec', 'shell']).optional().default('exec'),
  /** Optional working directory (relative to workspace or absolute) */
  cwd: z.string().optional(),
  /** Optional environment variables to add/override */
  env: z.record(z.string()).optional(),
  /** Optional timeout in milliseconds (default: 30000) */
  timeout: z.number().positive().optional(),
});

/**
 * Read a file from the filesystem.
 * Path must be within the granted workspace.
 */
export const ReadFileRequestSchema = BaseRequestSchema.extend({
  type: z.literal('readFile'),
  /** Absolute path or path relative to workspace */
  path: z.string().min(1),
  /** Optional encoding (default: 'utf-8', use 'base64' for binary) */
  encoding: z.enum(['utf-8', 'base64']).optional(),
});

/**
 * Write content to a file.
 * Path must be within the granted workspace.
 */
export const WriteFileRequestSchema = BaseRequestSchema.extend({
  type: z.literal('writeFile'),
  /** Absolute path or path relative to workspace */
  path: z.string().min(1),
  /** File content to write */
  content: z.string(),
  /** Optional encoding (default: 'utf-8', use 'base64' for binary) */
  encoding: z.enum(['utf-8', 'base64']).optional(),
  /** Optional: create parent directories if they don't exist */
  createDirs: z.boolean().optional(),
});

/**
 * List directory contents.
 */
export const ListDirRequestSchema = BaseRequestSchema.extend({
  type: z.literal('listDir'),
  /** Directory path to list */
  path: z.string().min(1),
  /** Whether to include hidden files (default: false) */
  includeHidden: z.boolean().optional(),
});

/**
 * Execute a PowerShell script.
 * Script is scanned by AMSI before execution.
 */
export const PowerShellRequestSchema = BaseRequestSchema.extend({
  type: z.literal('powershell'),
  /** PowerShell script content */
  script: z.string().min(1),
  /** Optional working directory */
  cwd: z.string().optional(),
  /** Optional timeout in milliseconds (default: 60000) */
  timeout: z.number().positive().optional(),
});

/**
 * Scan content for malware using Windows AMSI.
 */
export const AmsiScanRequestSchema = BaseRequestSchema.extend({
  type: z.literal('amsiScan'),
  /** Content to scan */
  content: z.string(),
  /** Filename context for the scan */
  filename: z.string().min(1),
});

/**
 * Health check / ping request.
 */
export const PingRequestSchema = BaseRequestSchema.extend({
  type: z.literal('ping'),
});

export const HelloRequestSchema = BaseRequestSchema.extend({
  type: z.literal('hello'),
  token: z.string().min(16),
  clientVersion: z.string().optional(),
});

/**
 * Discriminated union of all valid broker requests.
 */
export const BrokerRequestSchema = z.discriminatedUnion('type', [
  ExecuteRequestSchema,
  ReadFileRequestSchema,
  WriteFileRequestSchema,
  ListDirRequestSchema,
  PowerShellRequestSchema,
  AmsiScanRequestSchema,
  PingRequestSchema,
  HelloRequestSchema,
]);

// ============================================================================
// Response Schemas
// ============================================================================

/**
 * Successful response with optional data payload.
 */
export const BaseResponseSchema = z.object({
  id: z.string().uuid(),
  success: z.boolean(),
});

export const SuccessResponseSchema = BaseResponseSchema.extend({
  success: z.literal(true),
  /** Response data (type depends on request type) */
  data: z.unknown().optional(),
});

/**
 * Error response with error message.
 */
export const ErrorResponseSchema = BaseResponseSchema.extend({
  success: z.literal(false),
  /** Human-readable error message */
  error: z.string(),
  /** Optional error code for programmatic handling */
  code: BrokerErrorCodeSchema.optional(),
});

/**
 * Union of success and error responses.
 */
export const BrokerResponseSchema = z.union([
  SuccessResponseSchema,
  ErrorResponseSchema,
]);

// ============================================================================
// Execute Response Schema (specific data shape)
// ============================================================================

/**
 * Data shape for 'execute' command responses.
 */
export const ExecuteResultSchema = z.object({
  /** Exit code of the process (0 = success) */
  exitCode: z.number(),
  /** Standard output */
  stdout: z.string(),
  /** Standard error */
  stderr: z.string(),
  /** Whether the process was killed due to timeout */
  timedOut: z.boolean().optional(),
});

/**
 * Data shape for 'listDir' command responses.
 */
export const ListDirResultSchema = z.array(
  z.object({
    name: z.string(),
    isDirectory: z.boolean(),
    size: z.number().optional(),
    modified: z.string().optional(),
  }),
);

/**
 * Data shape for 'amsiScan' command responses.
 */
export const AmsiScanResultSchema = z.object({
  /** Whether the content is clean (no threats detected) */
  clean: z.boolean(),
  /** AMSI result code */
  result: z.number(),
  /** Human-readable result description */
  description: z.string().optional(),
});

// ============================================================================
// Type Exports
// ============================================================================

export type ExecuteRequest = z.infer<typeof ExecuteRequestSchema>;
export type ReadFileRequest = z.infer<typeof ReadFileRequestSchema>;
export type WriteFileRequest = z.infer<typeof WriteFileRequestSchema>;
export type ListDirRequest = z.infer<typeof ListDirRequestSchema>;
export type PowerShellRequest = z.infer<typeof PowerShellRequestSchema>;
export type AmsiScanRequest = z.infer<typeof AmsiScanRequestSchema>;
export type PingRequest = z.infer<typeof PingRequestSchema>;
export type HelloRequest = z.infer<typeof HelloRequestSchema>;
export type BrokerRequest = z.infer<typeof BrokerRequestSchema>;

export type SuccessResponse = z.infer<typeof SuccessResponseSchema>;
export type ErrorResponse = z.infer<typeof ErrorResponseSchema>;
export type BrokerResponse = z.infer<typeof BrokerResponseSchema>;

export type ExecuteResult = z.infer<typeof ExecuteResultSchema>;
export type ListDirResult = z.infer<typeof ListDirResultSchema>;
export type AmsiScanResult = z.infer<typeof AmsiScanResultSchema>;

export interface BrokerSession {
  sessionId: string;
  connectedAt: string;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Create a success response.
 */
export function createSuccessResponse(
  id: string,
  data?: unknown,
): SuccessResponse {
  return { id, success: true, data };
}

/**
 * Create an error response.
 */
export function createErrorResponse(
  id: string,
  error: string,
  code?: BrokerErrorCode,
): ErrorResponse {
  return { id, success: false, error, code };
}

/**
 * Type guard to check if a response is successful.
 */
export function isSuccessResponse(
  response: BrokerResponse,
): response is SuccessResponse {
  return response.success === true;
}

/**
 * Type guard to check if a response is an error.
 */
export function isErrorResponse(
  response: BrokerResponse,
): response is ErrorResponse {
  return response.success === false;
}
