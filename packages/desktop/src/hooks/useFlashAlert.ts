/**
 * @license
 * Copyright 2025 TerminaI Authors
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useRef } from 'react';

export function useFlashAlert(
  containerRef: React.RefObject<HTMLElement | null>,
  isWaiting: boolean,
) {
  const lastTriggerRef = useRef<number>(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (!isWaiting) return;

    const now = Date.now();
    // Debounce alerts (minimum 2 seconds between triggers)
    if (now - lastTriggerRef.current < 2000) return;
    lastTriggerRef.current = now;

    // 1. Visual Flash
    if (containerRef.current) {
      containerRef.current.classList.add('flash-alert');
      setTimeout(() => {
        containerRef.current?.classList.remove('flash-alert');
      }, 600);
    }

    // 2. Audio Ping
    if (!audioRef.current) {
      audioRef.current = new Audio('/notification.mp3');
    }
    audioRef.current
      .play()
      .catch((err) => console.warn('Audio play failed:', err));

    // 3. Programmatic Focus
    const terminalInput = containerRef.current?.querySelector(
      '.xterm-helper-textarea',
    ) as HTMLTextAreaElement;
    terminalInput?.focus();
  }, [isWaiting, containerRef]);
}
