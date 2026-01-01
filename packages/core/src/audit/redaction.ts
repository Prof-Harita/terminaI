/**
 * @license
 * Copyright 2025 Google LLC
 * Portions Copyright 2025 TerminaI Authors
 * SPDX-License-Identifier: Apache-2.0
 */

import type {
  AuditEvent,
  AuditRedactionHint,
  AuditToolContext,
} from './schema.js';

const SECRET_PATTERNS = [
  /token/i,
  /secret/i,
  /password/i,
  /api[-_]?key/i,
  /bearer\s+/i,
];

export interface RedactionOptions {
  redactUiTypedText?: boolean;
}

function mask(value: string): string {
  return value.length > 8 ? `${value.slice(0, 2)}***` : '***';
}

function shouldRedactString(value: string): boolean {
  return SECRET_PATTERNS.some((pattern) => pattern.test(value));
}

function redactValue(
  value: unknown,
  path: string,
  opts: RedactionOptions,
  hints: AuditRedactionHint[],
): unknown {
  if (value === null || value === undefined) return value;

  if (typeof value === 'string') {
    if (opts.redactUiTypedText && path.endsWith('args.text')) {
      hints.push({
        path,
        strategy: 'mask',
        reason: 'ui_typed_text',
      });
      return mask(value);
    }
    if (shouldRedactString(value)) {
      hints.push({
        path,
        strategy: 'mask',
        reason: 'secret',
      });
      return mask(value);
    }
    return value;
  }

  if (Array.isArray(value)) {
    return value.map((item, idx) =>
      redactValue(item, `${path}[${idx}]`, opts, hints),
    );
  }

  if (typeof value === 'object') {
    const redacted: Record<string, unknown> = {};
    for (const [key, nested] of Object.entries(
      value as Record<string, unknown>,
    )) {
      redacted[key] = redactValue(
        nested,
        path ? `${path}.${key}` : key,
        opts,
        hints,
      );
    }
    return redacted;
  }

  return value;
}

export function redactEvent(
  event: AuditEvent,
  options: RedactionOptions,
): AuditEvent {
  const hints: AuditRedactionHint[] = [];
  const tool = event.tool;
  let redactedTool: AuditEvent['tool'] = undefined;
  if (tool) {
    const assuredTool: AuditToolContext = tool;
    const redactedArgs = redactValue(
      assuredTool.args,
      'tool.args',
      options,
      hints,
    ) as Record<string, unknown> | undefined;
    const redactedResult = redactValue(
      assuredTool.result,
      'tool.result',
      options,
      hints,
    ) as AuditToolContext['result'];
    redactedTool = {
      ...assuredTool,
      args: redactedArgs,
      result: redactedResult,
    };
  }
  const redacted = {
    ...event,
    tool: redactedTool,
  };

  if (hints.length > 0) {
    redacted.redactions = [...(redacted.redactions ?? []), ...hints];
  }
  return redacted;
}
