/**
 * @license
 * Copyright 2025 Google LLC
 * Portions Copyright 2025 TerminaI Authors
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, vi, afterEach, type Mock } from 'vitest';
import { parseLogFile } from './replay.js';
import fs from 'node:fs/promises';

vi.mock('node:fs/promises');

describe('parseLogFile', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should parse user and gemini events from log file', async () => {
    const mockContent = `
{"timestamp": "2024-01-01T10:00:00.000Z", "eventType": "user_prompt", "payload": {"message": "Hello"}}
{"timestamp": "2024-01-01T10:00:01.000Z", "eventType": "model_response", "payload": {"response": "Hi there"}}
{"timestamp": "2024-01-01T10:00:02.000Z", "eventType": "other_event", "payload": {}}
    `.trim();

    (fs.readFile as Mock).mockResolvedValue(mockContent);

    const events = await parseLogFile('/path/to/log.jsonl');

    expect(events).toHaveLength(2);
    expect(events[0]).toEqual({
      timestamp: new Date('2024-01-01T10:00:00.000Z').getTime(),
      type: 'user',
      text: 'Hello',
    });
    expect(events[1]).toEqual({
      timestamp: new Date('2024-01-01T10:00:01.000Z').getTime(),
      type: 'gemini',
      text: 'Hi there',
    });
  });

  it('should handle malformed lines', async () => {
    const mockContent = `
{"timestamp": "2024-01-01T10:00:00.000Z", "eventType": "user_prompt", "payload": {"message": "Hello"}}
INVALID_JSON
    `.trim();

    (fs.readFile as Mock).mockResolvedValue(mockContent);

    const events = await parseLogFile('/path/to/log.jsonl');

    expect(events).toHaveLength(1);
    expect(events[0].text).toBe('Hello');
  });
});
