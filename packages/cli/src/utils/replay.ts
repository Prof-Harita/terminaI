/**
 * @license
 * Copyright 2025 Google LLC
 * Portions Copyright 2025 TerminaI Authors
 * SPDX-License-Identifier: Apache-2.0
 */

import fs from 'node:fs/promises';
import { type HistoryItem } from '../ui/types.js';

export interface ReplayEvent {
  timestamp: number;
  type: 'user' | 'gemini';
  text: string;
}

export async function parseLogFile(filePath: string): Promise<ReplayEvent[]> {
  const fileContent = await fs.readFile(filePath, 'utf-8');
  const lines = fileContent.split('\n').filter((line) => line.trim() !== '');

  const events: ReplayEvent[] = [];

  for (const line of lines) {
    try {
      const logEntry = JSON.parse(line);
      const ts = new Date(logEntry.timestamp).getTime();

      if (logEntry.eventType === 'user_prompt' && logEntry.payload?.message) {
        events.push({
          timestamp: ts,
          type: 'user',
          text: logEntry.payload.message,
        });
      } else if (logEntry.eventType === 'model_response') {
        const text =
          typeof logEntry.payload?.response === 'string'
            ? logEntry.payload.response
            : JSON.stringify(logEntry.payload?.response || '');

        if (text) {
          events.push({
            timestamp: ts,
            type: 'gemini',
            text,
          });
        }
      }
    } catch (e) {
      console.warn(`Failed to parse log line: ${line}`, e);
    }
  }

  return events.sort((a, b) => a.timestamp - b.timestamp);
}

export function mapLogToHistoryItem(
  event: ReplayEvent,
  id: number,
): HistoryItem {
  if (event.type === 'user') {
    return {
      id,
      type: 'user',
      text: event.text,
      timestamp: event.timestamp,
      processed: true,
    } as HistoryItem;
  } else {
    return {
      id,
      type: 'gemini',
      text: event.text,
      timestamp: event.timestamp,
    } as HistoryItem;
  }
}
