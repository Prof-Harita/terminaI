/**
 * @license
 * Copyright 2025 Google LLC
 * Portions Copyright 2025 TerminaI Authors
 * SPDX-License-Identifier: Apache-2.0
 */

import { getDesktopDriver } from '../drivers/driverRegistry.js';
import type { DesktopDriver } from '../drivers/types.js';
import { resolveSelector } from '../selectors/resolve.js';
import type {
  VisualDOMSnapshot,
  UiActionResult,
  ElementNode,
  DriverCapabilities,
} from '../protocol/types.js';
import type { ResolvedElement } from '../selectors/resolve.js';
import type {
  UiClickArgs,
  UiTypeArgs,
  UiQueryArgs,
  UiSnapshotArgs,
  UiKeyArgs,
  UiScrollArgs,
  UiFocusArgs,
  UiClickXyArgs,
  UiWaitArgs,
  UiAssertArgs,
} from '../protocol/schemas.js';

export class DesktopAutomationService {
  private static instance: DesktopAutomationService;
  private driver: DesktopDriver;
  private lastSnapshot?: VisualDOMSnapshot;
  private lastSnapshotTime: number = 0;
  private static readonly SNAPSHOT_TTL_MS = 200; // Cache valid for 200ms

  private constructor() {
    this.driver = getDesktopDriver();
  }

  static getInstance(): DesktopAutomationService {
    if (!DesktopAutomationService.instance) {
      DesktopAutomationService.instance = new DesktopAutomationService();
    }
    return DesktopAutomationService.instance;
  }

  async getCapabilities(): Promise<DriverCapabilities> {
    return this.driver.getCapabilities();
  }

  async snapshot(args: UiSnapshotArgs): Promise<VisualDOMSnapshot> {
    const snap = await this.driver.snapshot(args);
    this.lastSnapshot = snap;
    this.lastSnapshotTime = Date.now();
    return snap;
  }

  async query(args: UiQueryArgs): Promise<UiActionResult> {
    // 1. Get snapshot
    const snap = await this.ensureSnapshot();

    // 2. Resolve
    const matches = resolveSelector(snap, args.selector);

    // Limit
    const subset = matches.slice(0, args.limit || 1);

    return {
      status: 'success',
      driver: snap.driver,
      data: subset.map((m) => ({
        element: m.node,
        confidence: m.confidence,
      })),
    };
  }

  async click(args: UiClickArgs): Promise<UiActionResult> {
    // 1. Resolve Target
    const result = await this.resolveTargetForAction(args.target);
    const { snapshot, targetNode, targetId, matches } = result;

    // 2. Pre-Action Checks
    if (!targetNode) {
      return {
        status: 'error',
        driver: snapshot.driver,
        message: `Element not found: ${args.target}`,
      };
    }

    if (matches && matches.length > 1) {
      // Warning: Ambiguous selector
      // For now, we proceed with the first match (highest confidence/tree order), but we could policy-fail here.
      // console.warn(`Ambiguous selector: ${args.target} found ${matches.length} matches.`);
    }

    if (args.verify && targetNode.states?.enabled === false) {
      return {
        status: 'error',
        driver: snapshot.driver,
        message: `Element found but disabled: ${args.target}`,
      };
    }

    // 3. Execute
    const refinedArgs = { ...args, target: targetId ?? args.target };
    const actionResult = await this.driver.click(refinedArgs);

    // 4. Post-Action Verification (basic)
    if (actionResult.status === 'success' && args.verify) {
      // Invalidate cache immediately after action
      this.lastSnapshot = undefined;
      this.lastSnapshotTime = 0;
    }
    return actionResult;
  }

  async type(args: UiTypeArgs): Promise<UiActionResult> {
    let result: {
      snapshot: VisualDOMSnapshot;
      targetId?: string;
      targetNode?: ElementNode;
    };

    if (args.target) {
      result = await this.resolveTargetForAction(args.target);
    } else {
      result = {
        snapshot: this.lastSnapshot || (await this.ensureSnapshot()),
        targetId: undefined,
        targetNode: undefined,
      };
    }

    const { targetId } = result;
    const refinedArgs = { ...args, target: targetId ?? args.target };
    const res = await this.driver.type(refinedArgs);
    if (res.status === 'success') {
      this.lastSnapshot = undefined; // Invalidate cache
    }
    return res;
  }

  async key(args: UiKeyArgs): Promise<UiActionResult> {
    return this.driver.key(args);
  }

  async scroll(args: UiScrollArgs): Promise<UiActionResult> {
    let targetId: string | undefined;
    if (args.target) {
      const resolved = await this.resolveTargetForAction(args.target);
      targetId = resolved.targetId;
    }
    const refinedArgs = { ...args, target: targetId ?? args.target };
    return this.driver.scroll(refinedArgs);
  }

  async focus(args: UiFocusArgs): Promise<UiActionResult> {
    const { targetId } = await this.resolveTargetForAction(args.target);
    const refinedArgs = { ...args, target: targetId ?? args.target };
    return this.driver.focus(refinedArgs);
  }

  async clickXy(args: UiClickXyArgs): Promise<UiActionResult> {
    return this.driver.clickXy(args);
  }

  async waitFor(args: UiWaitArgs): Promise<UiActionResult> {
    const start = Date.now();
    const timeout = args.timeoutMs || 5000;

    // Polling loop
    while (Date.now() - start < timeout) {
      const snapshot = await this.ensureSnapshot(true); // Force fresh
      const matches = resolveSelector(snapshot, args.selector);
      const exists = matches.length > 0;

      let pass = false;
      if (args.state === 'hidden' || args.state === 'removed') {
        pass = !exists;
      } else {
        // visible, active, etc.
        pass = exists;
      }

      if (pass) {
        return {
          status: 'success',
          driver: snapshot.driver,
          message: `Waited for '${args.selector}' to be ${args.state}`,
        };
      }

      await new Promise((r) => setTimeout(r, 500));
    }

    return {
      status: 'error',
      driver: (this.lastSnapshot || (await this.ensureSnapshot())).driver,
      message: `Timeout waiting for '${args.selector}' to be ${args.state}`,
    };
  }

  async assert(args: UiAssertArgs): Promise<UiActionResult> {
    const snapshot = await this.ensureSnapshot();
    const matches = resolveSelector(snapshot, args.target);
    const exists = matches.length > 0;
    const node = matches[0]?.node;

    let passed = false;
    let actualValue: string | boolean | undefined;

    switch (args.assertion) {
      case 'exists':
        passed = exists;
        break;
      case 'not_exists':
        passed = !exists;
        break;
      case 'contains_text':
        actualValue = node?.name;
        passed =
          !!actualValue && String(actualValue).includes(args.value || '');
        break;
      case 'equals_text':
        actualValue = node?.name;
        passed = !!actualValue && String(actualValue) === (args.value || '');
        break;
      default:
        return {
          status: 'error',
          driver: snapshot.driver,
          message: `Unknown assertion: ${args.assertion}`,
        };
    }

    return {
      status: passed ? 'success' : 'error',
      driver: snapshot.driver,
      verification: {
        passed,
        details: `Assertion '${args.assertion}' on '${args.target}'. Expected '${args.value}', got '${actualValue}'`,
      },
    };
  }

  // --- Helpers ---

  private async ensureSnapshot(force = false): Promise<VisualDOMSnapshot> {
    const now = Date.now();
    if (
      !force &&
      this.lastSnapshot &&
      now - this.lastSnapshotTime < DesktopAutomationService.SNAPSHOT_TTL_MS
    ) {
      return this.lastSnapshot;
    }

    return this.snapshot({
      includeTree: true,
      includeScreenshot: false, // Default: no screenshot for perf
      includeTextIndex: false,
    });
  }

  private async resolveTargetForAction(target: string): Promise<{
    snapshot: VisualDOMSnapshot;
    targetNode?: ElementNode;
    targetId?: string;
    matches?: ResolvedElement[];
  }> {
    const snap = await this.ensureSnapshot();
    const matches = resolveSelector(snap, target);
    if (matches.length === 0) {
      return { snapshot: snap, matches: [] };
    }

    const match = matches[0].node;
    let robustId = target;
    if (match.platformIds?.automationId) {
      robustId = `uia:automationId="${match.platformIds.automationId}"`;
    } else if (match.platformIds?.legacyId) {
      robustId = `win32:legacyId=${match.platformIds.legacyId}`;
    } else if (match.platformIds?.atspiPath) {
      robustId = `atspi:path=${match.platformIds.atspiPath}`;
    }

    return { snapshot: snap, targetNode: match, targetId: robustId, matches };
  }
}
