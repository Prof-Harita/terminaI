/**
 * @license
 * Copyright 2025 Google LLC
 * Portions Copyright 2025 TerminaI Authors
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect } from 'vitest';
import { generateConfirmationToken, parseConfirmationToken } from './task.js';

describe('Task Confirmation Token', () => {
  const secret = 'test-secret-123';
  const taskId = 'task-uuid-v4';
  const callId = 'call-uuid-v4';

  it('should generate a valid token', () => {
    const token = generateConfirmationToken(taskId, callId, secret);
    expect(token).toBeDefined();
    expect(token).toContain('.');
  });

  it('should parse a valid token correctly', () => {
    const token = generateConfirmationToken(taskId, callId, secret);
    const result = parseConfirmationToken(token, secret);
    expect(result).toEqual({ taskId, callId });
  });

  it('should reject a token with wrong secret', () => {
    const token = generateConfirmationToken(taskId, callId, secret);
    const result = parseConfirmationToken(token, 'wrong-secret');
    expect(result).toBeNull();
  });

  it('should reject a tampered payload', () => {
    const token = generateConfirmationToken(taskId, callId, secret);
    const [payload, signature] = token.split('.');

    // Tamper payload
    const data = JSON.parse(Buffer.from(payload, 'base64').toString());
    data.taskId = 'hacked-task-id';
    const newPayload = Buffer.from(JSON.stringify(data)).toString('base64');

    const tamperedToken = `${newPayload}.${signature}`;
    const result = parseConfirmationToken(tamperedToken, secret);
    // Signature match will fail
    expect(result).toBeNull();
  });

  it('should reject an expired token', () => {
    // Manually create expired token
    const crypto = require('node:crypto');
    const payload = JSON.stringify({ taskId, callId, exp: Date.now() - 1000 });
    const signature = crypto
      .createHmac('sha256', secret)
      .update(payload)
      .digest('hex')
      .slice(0, 16);
    const token = Buffer.from(payload).toString('base64') + '.' + signature;

    const result = parseConfirmationToken(token, secret);
    expect(result).toBeNull();
  });
});
