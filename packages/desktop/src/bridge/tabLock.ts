/**
 * @license
 * Copyright 2025 Google LLC
 * Portions Copyright 2025 TerminaI Authors
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Simple multi-tab lock using BroadcastChannel and Navigator.locks (if available)
 * or purely BroadcastChannel for coordination.
 *
 * We want to ensure only ONE tab attempts to "own" the active task confirmation flow
 * if multiple are open, though typically they share the same backend state via the CLI.
 *
 * However, since the CLI tracks the task, multiple tabs showing the same UI is fine,
 * AS LONG AS they don't fight over the same confirmation implementation details or
 * cause duplicate side effects.
 *
 * The main requirement here is likely to detect if *another* tab is holding the "active"
 * connection or if we can proceed.
 *
 * For this refactor, we implemented a simpler "Leader Election" or just "Active Tab detection".
 *
 * But actually, strict requirement: "Only one tab should be 'Active' Bridge Controller".
 */

export class TabLock {
  private channel: BroadcastChannel;
  private isLeader: boolean = false;
  private id: string;
  private onRelease: (() => void) | null = null;

  constructor(channelName: string = 'terminai_bridge_lock') {
    this.id = crypto.randomUUID();
    this.channel = new BroadcastChannel(channelName);

    this.channel.onmessage = (event) => {
      this.handleMessage(event.data);
    };

    this.requestLeadership();
  }

  private handleMessage(msg: { type: string; from: string }) {
    if (msg.type === 'REQUEST_LEADERSHIP' && msg.from !== this.id) {
      // Another tab is requesting leadership
      // For now, we don't yield; first come first served via Web Locks
    }
  }

  private onCreate() {
    // Called when we successfully acquire the lock
  }

  requestLeadership() {
    this.channel.postMessage({ type: 'REQUEST_LEADERSHIP', from: this.id });
    // Optimistic: if no one says "I am leader" within X ms, we become leader.
    // Real implementation requires robust algorithm (e.g. Bully algo).
    // For simplicity/robustness in this context:
    // If we assume the most recently focused tab should ideally take over,
    // or if we just want *some* locking.

    // We will use the Web Locks API if available as it provides robust mutexes.
    if (typeof navigator !== 'undefined' && navigator.locks) {
      navigator.locks.request(
        'terminai_bridge_mutex',
        { ifAvailable: true },
        async (lock) => {
          if (!lock) {
            this.isLeader = false;
            return;
          }
          this.isLeader = true;
          this.onCreate();
          // Hold lock indefinitely until page unload or explicit release
          return new Promise<void>((resolve) => {
            this.onRelease = resolve;
          });
        },
      );
    } else {
      // Fallback for environments without Web Locks
      console.warn(
        'Web Locks API not available, falling back to optimistic leader.',
      );
      this.isLeader = true;
      this.onCreate();
    }
  }

  isLocked(): boolean {
    return this.isLeader;
  }

  release() {
    this.isLeader = false;
    if (this.onRelease) {
      this.onRelease();
      this.onRelease = null;
    }
    this.channel.close();
  }
}
