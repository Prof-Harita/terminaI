/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { EventEmitter } from 'node:events';

export type SessionEventType = 'started' | 'finished' | 'crashed' | 'output';

export interface SessionEvent {
  type: SessionEventType;
  sessionName: string;
  message: string;
  timestamp: number;
}

class SessionNotifier extends EventEmitter {
  notify(event: SessionEvent): void {
    this.emit('session-event', event);
  }
}

export const sessionNotifier = new SessionNotifier();
