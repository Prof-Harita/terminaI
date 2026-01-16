/**
 * @license
 * Copyright 2025 Google LLC
 * Portions Copyright 2025 TerminaI Authors
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useRef, useState } from 'react';
import type { ReplayEvent } from '../../utils/replay.js';
import type { UseHistoryManagerReturn } from './useHistoryManager.js';
import type { HistoryItemWithoutId } from '../types.js';

export function useReplay(
  historyManager: UseHistoryManagerReturn,
  replayEvents?: ReplayEvent[],
) {
  const [isReplaying, setIsReplaying] = useState(
    !!replayEvents && replayEvents.length > 0,
  );
  const eventIndexRef = useRef(0);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!replayEvents || replayEvents.length === 0) return;

    // Clear any existing timeout on mount/update
    if (timeoutRef.current) clearTimeout(timeoutRef.current);

    const processNextEvent = () => {
      const index = eventIndexRef.current;
      if (index >= replayEvents.length) {
        setIsReplaying(false);
        return;
      }

      const event = replayEvents[index];
      const nextEvent = replayEvents[index + 1];

      // Add current event to history
      if (event.type === 'user') {
        historyManager.addItem(
          {
            type: 'user',
            text: event.text,
            processed: true,
            timestamp: event.timestamp,
          } as HistoryItemWithoutId,
          event.timestamp,
        );
      } else {
        historyManager.addItem(
          {
            type: 'gemini',
            text: event.text,
            timestamp: event.timestamp,
          } as HistoryItemWithoutId,
          event.timestamp,
        );
      }

      eventIndexRef.current++;

      if (nextEvent) {
        // Calculate delay
        let delay = nextEvent.timestamp - event.timestamp;
        // Keep authentic timing
        if (delay < 0) delay = 0;

        timeoutRef.current = setTimeout(processNextEvent, delay);
      } else {
        setIsReplaying(false);
      }
    };

    // Start with a small delay for the first item
    timeoutRef.current = setTimeout(processNextEvent, 1000);

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [replayEvents, historyManager]);

  return { isReplaying };
}
