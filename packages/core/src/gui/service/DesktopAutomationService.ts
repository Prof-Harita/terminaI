/**
 * @license
 * Copyright 2025 Google LLC
 * Portions Copyright 2025 TerminaI Authors
 * SPDX-License-Identifier: Apache-2.0
 */

import { getDesktopDriver } from '../drivers/driverRegistry.js';
import { resolveSelector } from '../selectors/resolve.js';
import { SelectorParseError } from '../selectors/parser.js';
import type { DesktopDriver } from '../drivers/types.js';
import type {
  VisualDOMSnapshot,
  UiActionResult,
  ElementNode,
  DriverCapabilities,
  DriverDescriptor,
  UiDiagnosticsReport,
} from '../protocol/types.js';
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
  UiDiagnoseArgs,
} from '../protocol/schemas.js';
import { getGuiAutomationConfig } from '../config.js';
import type { ResolvedElement } from '../selectors/resolve.js';

export class DesktopAutomationService {
  private static instance: DesktopAutomationService;
  private driver: DesktopDriver;
  private lastSnapshot?: VisualDOMSnapshot;
  private lastSnapshotTime: number = 0;
  private static readonly SNAPSHOT_TTL_MS = 200; // Cache valid for 200ms
  // Default to false for security - must be explicitly enabled via settings
  private enabled = false;
  private driverDescriptor?: DriverDescriptor;
  private actionTimestamps: number[] = [];

  private constructor() {
    this.driver = getDesktopDriver();
  }

  static getInstance(): DesktopAutomationService {
    if (!DesktopAutomationService.instance) {
      DesktopAutomationService.instance = new DesktopAutomationService();
    }
    return DesktopAutomationService.instance;
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  static setDriverForTest(driver: DesktopDriver): void {
    if (!DesktopAutomationService.instance) {
      DesktopAutomationService.instance = new DesktopAutomationService();
    }
    DesktopAutomationService.instance.driver = driver;
    // For testing, we often want to bypass the "enabled" check or default it to true
    DesktopAutomationService.instance.enabled = true;
  }

  async getCapabilities(): Promise<DriverCapabilities> {
    await this.ensureConnected();
    return this.driver.getCapabilities();
  }

  async getDriverDescriptor(): Promise<DriverDescriptor> {
    await this.ensureConnected();
    const caps = await this.driver.getCapabilities();
    const descriptor: DriverDescriptor = {
      name: this.driver.name,
      kind: this.driver.kind,
      version: this.driver.version,
      capabilities: caps,
    };
    this.driverDescriptor = descriptor;
    return descriptor;
  }

  private async ensureConnected(): Promise<void> {
    if (!this.enabled) {
      throw new Error('GUI Automation is disabled by configuration.');
    }
    try {
      const health = await this.driver.getHealth();
      if (health.status !== 'healthy') {
        console.log('Driver not healthy, attempting to connect...');
        const status = await this.driver.connect();
        if (!status.connected) {
          throw new Error(`Failed to connect to driver: ${status.error}`);
        }
      }
    } catch (error) {
      // If getHealth fails (e.g. process dead), try to reconnect once
      console.warn('Driver health check failed, reconnecting:', error);
      const status = await this.driver.connect();
      if (!status.connected) {
        throw new Error(`Driver unavailable: ${status.error}`);
      }
    }
  }

  private async ensureCapability(cap: keyof DriverCapabilities): Promise<void> {
    await this.ensureConnected();
    const caps = await this.driver.getCapabilities();
    if (!caps[cap]) {
      // "GuidanceError" pattern: Clear message explaining limitation
      throw new Error(
        `Driver does not support '${cap}'. This action cannot be performed on the current system.`,
      );
    }
  }

  async snapshot(args: UiSnapshotArgs): Promise<VisualDOMSnapshot> {
    await this.ensureCapability('canSnapshot');

    // Bypass progressive logic if:
    // 1. Specific window ID provided (targeted capture)
    // 2. Tree disabled (nothing to graft)
    // 3. User explicitly requesting window scope (without ID implies active window, but usually means fallback)
    const bypassProgressive =
      (args.scope === 'window' && args.windowId) || args.includeTree === false;

    let finalSnapshot: VisualDOMSnapshot;

    if (bypassProgressive) {
      const {
        args: boundedArgs,
        maxDepth,
        maxNodes,
      } = this.buildBoundedSnapshotArgs(args);
      const snap = await this.driver.snapshot(boundedArgs);
      finalSnapshot = this.applySnapshotBounds(snap, maxDepth, maxNodes);
    } else {
      // Progressive Strategy: Outline -> Active Window Graft
      // 1. Outline Pass
      const {
        args: outlineArgs,
        maxDepth: outlineMaxDepth,
        maxNodes: outlineMaxNodes,
      } = this.buildBoundedSnapshotArgs({
        ...args,
        maxDepth: 4, // Outline depth
        maxNodes: 500,
        scope: 'screen',
      });

      const outline = await this.driver.snapshot(outlineArgs);
      const boundedOutline = this.applySnapshotBounds(
        outline,
        outlineMaxDepth,
        outlineMaxNodes,
      );

      finalSnapshot = boundedOutline;

      if (boundedOutline.tree) {
        // 2. Identify Active Window
        const activeWinTitle = boundedOutline.activeApp.title;
        const findWindow = (node: ElementNode): ElementNode | undefined => {
          if (node.role === 'window' && node.name === activeWinTitle) {
            return node;
          }
          if (node.children) {
            for (const child of node.children) {
              const found = findWindow(child);
              if (found) return found;
            }
          }
          return undefined;
        };

        const activeNode = findWindow(boundedOutline.tree);

        // 3. Deep Pass
        if (activeNode) {
          try {
            // Note: We don't apply bounds to the deep request here, we trust the driver
            // or apply them after?
            // If we use buildBoundedSnapshotArgs on original args, we get user's desired depth for the window.
            const {
              args: deepArgs,
              maxDepth: deepMaxDepth,
              maxNodes: deepMaxNodes,
            } = this.buildBoundedSnapshotArgs({
              ...args,
              scope: 'window',
              windowId: activeNode.id,
            });

            const deepSnap = await this.driver.snapshot(deepArgs);
            const boundedDeep = this.applySnapshotBounds(
              deepSnap,
              deepMaxDepth,
              deepMaxNodes,
            );

            if (boundedDeep.tree) {
              const grafted = this.graftNode(
                boundedOutline.tree,
                activeNode.id,
                boundedDeep.tree,
              );
              if (grafted) {
                // Determine truncation status: if deep snap was truncated, outline is effectively truncated logic-wise
                if (boundedDeep.limits?.truncated) {
                  if (!finalSnapshot.limits) finalSnapshot.limits = {};
                  finalSnapshot.limits.truncated = true;
                }
              }
            }
          } catch (e) {
            console.warn('Deep snapshot pass failed, using outline:', e);
          }
        }
      }
    }

    this.lastSnapshot = finalSnapshot;
    this.lastSnapshotTime = Date.now();
    return finalSnapshot;
  }

  // Helper to replace a node in the tree with a new version
  private graftNode(
    root: ElementNode,
    targetId: string,
    replacement: ElementNode,
  ): boolean {
    if (root.id === targetId) {
      // Cannot replace root this way unless we handle it at caller
      // But here we are searching children usually.
      return false; // Caller should handle root replacement if needed
    }

    if (root.children) {
      for (let i = 0; i < root.children.length; i++) {
        const child = root.children[i];
        if (child.id === targetId) {
          root.children[i] = replacement;
          return true;
        }
        if (this.graftNode(child, targetId, replacement)) {
          return true;
        }
      }
    }
    return false;
  }

  async query(args: UiQueryArgs): Promise<UiActionResult> {
    // Query relies on snapshot, so capability check happens in ensureSnapshot -> snapshot
    // 1. Get snapshot
    const snap = await this.ensureSnapshot();

    // 2. Resolve
    const matches = this.safeResolve(snap, args.selector);

    // Limit
    const subset = matches.slice(0, args.limit || 1);

    return this.buildResultWithEvidence(
      {
        status: 'success',
        driver: snap.driver,
        data: subset.map((m) => ({
          element: m.node,
          confidence: m.confidence,
        })),
      },
      snap,
    );
  }

  async click(args: UiClickArgs): Promise<UiActionResult> {
    await this.ensureCapability('canClick');
    const rateLimited = await this.enforceActionRateLimit();
    if (rateLimited) {
      return rateLimited;
    }

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

    // 3. Execute - pass target selector AND bounds for fallback click
    const refinedArgs: Record<string, unknown> = {
      ...args,
      target: targetId ?? args.target,
    };

    // Include bounds in the driver call so sidecar can use coordinate fallback
    if (targetNode.bounds) {
      refinedArgs['bounds'] = targetNode.bounds;
    }

    const actionResult = await this.driver.click(
      refinedArgs as unknown as UiClickArgs,
    );

    // 4. Post-Action Verification (basic)
    if (actionResult.status === 'success' && args.verify) {
      // Invalidate cache immediately after action
      this.lastSnapshot = undefined;
      this.lastSnapshotTime = 0;
    }
    return this.buildResultWithEvidence(
      actionResult,
      snapshot,
      targetNode,
      matches?.[0]?.confidence,
    );
  }

  async type(args: UiTypeArgs): Promise<UiActionResult> {
    await this.ensureCapability('canType');
    const rateLimited = await this.enforceActionRateLimit();
    if (rateLimited) {
      return rateLimited;
    }

    let result: {
      snapshot: VisualDOMSnapshot;
      targetId?: string;
      targetNode?: ElementNode;
      confidence?: number;
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

    const { targetId, targetNode } = result;

    // Smart Redaction Logic
    // If user didn't specify redaction preference, infer from target
    let shouldRedact = args.redactInLogs;
    if (shouldRedact === undefined) {
      // Check if target is a password field
      if (targetNode?.role?.toLowerCase().includes('password')) {
        shouldRedact = true;
      }
    }

    const refinedArgs = {
      ...args,
      target: targetId ?? args.target,
      redactInLogs: shouldRedact,
    };

    const res = await this.driver.type(refinedArgs);
    if (res.status === 'success') {
      this.lastSnapshot = undefined; // Invalidate cache
    }

    // Ensure evidence reflects redaction
    const resultWithEvidence = this.buildResultWithEvidence(
      res,
      result.snapshot,
      result.targetNode,
      result.confidence,
    );

    if (shouldRedact && resultWithEvidence.evidence) {
      resultWithEvidence.evidence.redactions = true;
    }

    return resultWithEvidence;
  }

  async key(args: UiKeyArgs): Promise<UiActionResult> {
    await this.ensureCapability('canKey');
    const rateLimited = await this.enforceActionRateLimit();
    if (rateLimited) {
      return rateLimited;
    }

    await this.ensureConnected(); // Redundant given ensureCapability but explicit
    const result = await this.driver.key(args);
    return this.buildResultWithEvidence(result, this.lastSnapshot);
  }

  async scroll(args: UiScrollArgs): Promise<UiActionResult> {
    await this.ensureCapability('canScroll');
    const rateLimited = await this.enforceActionRateLimit();
    if (rateLimited) {
      return rateLimited;
    }

    await this.ensureConnected();
    let targetId: string | undefined;
    let targetNode: ElementNode | undefined;
    let snapshot: VisualDOMSnapshot | undefined;
    let confidence: number | undefined;
    if (args.target) {
      const resolved = await this.resolveTargetForAction(args.target);
      targetId = resolved.targetId;
      targetNode = resolved.targetNode;
      snapshot = resolved.snapshot;
      confidence = resolved.confidence;
    }
    const refinedArgs = { ...args, target: targetId ?? args.target };
    const result = await this.driver.scroll(refinedArgs);
    return this.buildResultWithEvidence(
      result,
      snapshot,
      targetNode,
      confidence,
    );
  }

  async focus(args: UiFocusArgs): Promise<UiActionResult> {
    // Assuming focus capability is related to interaction or general support
    // There isn't a explicit 'canFocus' in DriverCapabilities usually, but let's check.
    // Definition says: canSnapshot, canClick, canType, canScroll, canKey, canOcr, canScreenshot, canInjectInput.
    // 'focus' tool usually implies activating a window.
    // If no specific capability, maybe we don't enforce?
    // Or maybe check 'canInjectInput'?
    // I'll skip specific capability check for focus for now as it's not in the list I saw earlier.
    const rateLimited = await this.enforceActionRateLimit();
    if (rateLimited) {
      return rateLimited;
    }

    await this.ensureConnected();
    const { targetId, targetNode, snapshot, confidence } =
      await this.resolveTargetForAction(args.target);
    const refinedArgs = { ...args, target: targetId ?? args.target };
    const result = await this.driver.focus(refinedArgs);
    return this.buildResultWithEvidence(
      result,
      snapshot,
      targetNode,
      confidence,
    );
  }

  async clickXy(args: UiClickXyArgs): Promise<UiActionResult> {
    await this.ensureCapability('canClick'); // Assuming clickXy requires same capability
    const rateLimited = await this.enforceActionRateLimit();
    if (rateLimited) {
      return rateLimited;
    }

    await this.ensureConnected();
    const result = await this.driver.clickXy(args);
    return this.buildResultWithEvidence(result, this.lastSnapshot);
  }

  async waitFor(
    args: UiWaitArgs,
    signal?: AbortSignal,
  ): Promise<UiActionResult> {
    const start = Date.now();
    const timeout = args.timeoutMs || 5000;

    // Polling loop
    while (Date.now() - start < timeout) {
      if (signal?.aborted) {
        throw new Error('Wait operation aborted');
      }
      const snapshot = await this.ensureSnapshot(true); // Force fresh
      const matches = this.safeResolve(snapshot, args.selector);
      const exists = matches.length > 0;

      let pass = false;
      if (args.state === 'hidden' || args.state === 'removed') {
        pass = !exists;
      } else {
        // visible, active, etc.
        pass = exists;
      }

      if (pass) {
        return this.buildResultWithEvidence(
          {
            status: 'success',
            driver: snapshot.driver,
            message: `Waited for '${args.selector}' to be ${args.state}`,
          },
          snapshot,
        );
      }

      await new Promise((r) => setTimeout(r, args.intervalMs || 500));
    }

    const snapshot = this.lastSnapshot || (await this.ensureSnapshot());
    return this.buildResultWithEvidence(
      {
        status: 'error',
        driver: snapshot.driver,
        message: `Timeout waiting for '${args.selector}' to be ${args.state}`,
      },
      snapshot,
    );
  }

  async assert(args: UiAssertArgs): Promise<UiActionResult> {
    const snapshot = await this.ensureSnapshot();
    const matches = this.safeResolve(snapshot, args.target);
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
        return this.buildResultWithEvidence(
          {
            status: 'error',
            driver: snapshot.driver,
            message: `Unknown assertion: ${args.assertion}`,
          },
          snapshot,
        );
    }

    return this.buildResultWithEvidence(
      {
        status: passed ? 'success' : 'error',
        driver: snapshot.driver,
        verification: {
          passed,
          details: `Assertion '${args.assertion}' on '${args.target}'. Expected '${args.value}', got '${actualValue}'`,
        },
      },
      snapshot,
    );
  }

  // --- Helpers ---

  private safeResolve(
    snap: VisualDOMSnapshot,
    selector: string,
  ): ResolvedElement[] {
    try {
      return resolveSelector(snap, selector);
    } catch (e) {
      if (e instanceof SelectorParseError) {
        throw new Error(
          `Invalid selector syntax: "${selector}". Error at index ${e.position}: ${e.message.replace(/Selector parse error at index \d+: /, '')}`,
        );
      }
      throw e;
    }
  }

  private async enforceActionRateLimit(): Promise<UiActionResult | null> {
    const { maxActionsPerMinute } = getGuiAutomationConfig();
    if (!maxActionsPerMinute || maxActionsPerMinute <= 0) {
      return null;
    }

    const now = Date.now();
    const windowStart = now - 60_000;
    this.actionTimestamps = this.actionTimestamps.filter(
      (timestamp) => timestamp >= windowStart,
    );

    if (this.actionTimestamps.length >= maxActionsPerMinute) {
      const driver =
        this.driverDescriptor ?? (await this.getDriverDescriptor());
      return {
        status: 'error',
        driver,
        message: `GUI automation rate limit exceeded (${maxActionsPerMinute} actions/minute).`,
      };
    }

    this.actionTimestamps.push(now);
    return null;
  }

  private buildBoundedSnapshotArgs(args: UiSnapshotArgs): {
    args: UiSnapshotArgs;
    maxDepth: number;
    maxNodes: number;
  } {
    const config = getGuiAutomationConfig();
    const maxDepth = Math.min(
      args.maxDepth ?? config.snapshotMaxDepth,
      config.snapshotMaxDepth,
    );
    const maxNodes = Math.min(
      args.maxNodes ?? config.snapshotMaxNodes,
      config.snapshotMaxNodes,
    );

    return {
      args: { ...args, maxDepth, maxNodes },
      maxDepth,
      maxNodes,
    };
  }

  private applySnapshotBounds(
    snapshot: VisualDOMSnapshot,
    maxDepth: number,
    maxNodes: number,
  ): VisualDOMSnapshot {
    let nodeCount = 0;
    let truncated = false;

    const prune = (
      node: ElementNode | undefined,
      depth: number,
    ): ElementNode | undefined => {
      if (!node) return undefined;

      if (depth >= maxDepth) {
        if (node.children && node.children.length > 0) {
          truncated = true;
        }
        return { ...node, children: undefined };
      }

      if (nodeCount >= maxNodes) {
        truncated = true;
        return undefined;
      }

      nodeCount += 1;
      const children: ElementNode[] = [];
      if (node.children?.length) {
        for (const child of node.children) {
          if (nodeCount >= maxNodes) {
            truncated = true;
            break;
          }
          const pruned = prune(child, depth + 1);
          if (pruned) {
            children.push(pruned);
          }
        }
      }

      return {
        ...node,
        children: children.length > 0 ? children : undefined,
      };
    };

    const prunedTree = prune(snapshot.tree, 0);
    const limitedTextIndex = snapshot.textIndex?.slice(0, maxNodes);
    if (
      limitedTextIndex &&
      snapshot.textIndex &&
      snapshot.textIndex.length > limitedTextIndex.length
    ) {
      truncated = true;
    }

    return {
      ...snapshot,
      tree: prunedTree,
      textIndex: limitedTextIndex ?? snapshot.textIndex,
      limits: {
        maxDepth,
        maxNodes,
        nodeCount,
        truncated,
      },
    };
  }

  private buildResultWithEvidence(
    result: UiActionResult,
    snapshot?: VisualDOMSnapshot,
    targetNode?: ElementNode,
    confidence?: number,
  ): UiActionResult {
    const config = getGuiAutomationConfig();
    const evidence =
      result.evidence ??
      (snapshot
        ? {
            snapshotId: snapshot.snapshotId,
            redactions: config.redactTypedTextByDefault,
          }
        : undefined);

    const resolvedTarget =
      result.resolvedTarget ??
      (targetNode
        ? {
            elementId: targetNode.id,
            bounds: targetNode.bounds,
            role: targetNode.role,
            name: targetNode.name,
            confidence: confidence ?? 1,
          }
        : undefined);

    return {
      ...result,
      evidence,
      resolvedTarget,
    };
  }

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
      includeScreenshot: false,
      includeTextIndex: false,
      maxDepth: 50,
      maxNodes: 500,
    });
  }

  private async resolveTargetForAction(target: string): Promise<{
    snapshot: VisualDOMSnapshot;
    targetNode?: ElementNode;
    targetId?: string;
    matches?: ResolvedElement[];
    confidence?: number;
  }> {
    const snap = await this.ensureSnapshot();
    const matches = this.safeResolve(snap, target);

    if (matches.length === 0) {
      return { snapshot: snap, matches: [] };
    }

    const match = matches[0].node;
    const confidence = matches[0]?.confidence;
    let robustId = target;
    if (match.platformIds?.automationId) {
      robustId = `uia:automationId="${match.platformIds.automationId}"`;
    } else if (match.platformIds?.legacyId) {
      robustId = `win32:legacyId=${match.platformIds.legacyId}`;
    } else if (match.platformIds?.atspiPath) {
      robustId = `atspi:atspiPath="${match.platformIds.atspiPath}"`;
    }

    return {
      snapshot: snap,
      targetNode: match,
      targetId: robustId,
      matches,
      confidence,
    };
  }

  async diagnose(args?: UiDiagnoseArgs): Promise<UiDiagnosticsReport> {
    const connection: { connected: boolean; error?: string } = {
      connected: false,
    };
    let driverDesc: DriverDescriptor = {
      name: this.driver.name,
      kind: this.driver.kind,
      version: this.driver.version,
      capabilities: {
        canSnapshot: false,
        canClick: false,
        canType: false,
        canScroll: false,
        canKey: false,
        canOcr: false,
        canScreenshot: false,
        canInjectInput: false,
      },
    };

    try {
      if (this.enabled) {
        await this.ensureConnected();
        connection.connected = true;
        // try to get descriptor via public method if connected
        // effectively ensures caps are fresh
        const realDesc = await this.getDriverDescriptor();
        driverDesc = realDesc;
      } else {
        connection.error = 'GUI Automation disabled in config';
      }
    } catch (e) {
      connection.error = e instanceof Error ? e.message : String(e);
      // Fallback: try to get capabilities even if health check failed (unlikely to work depending on driver)
      try {
        const caps = await this.driver.getCapabilities();
        driverDesc.capabilities = caps;
      } catch {
        // Ignore
      }
    }

    const report: UiDiagnosticsReport = {
      driver: driverDesc,
      connection,
      snapshotSanity: {
        desktopRootChildren: 0,
        applicationNamesSample: [],
        activeAppTitle: 'unknown',
        notes: [],
      },
      warnings: [],
      suggestedFixes: [],
    };

    if (!connection.connected) {
      report.warnings.push('Driver disconnected or disabled');
      report.suggestedFixes.push(
        'Check "gui.automation.enabled" setting or sidecar status.',
      );
      return report;
    }

    // Snapshot Sanity
    try {
      // Shallow snapshot for sanity check
      const snapshot = await this.driver.snapshot({
        maxDepth: args?.depth ?? 3,
        maxNodes: args?.sampleLimit ?? 300,
        includeTree: true,
        includeScreenshot: false,
        includeTextIndex: false,
        scope: 'screen',
      });

      const rootChildren = snapshot.tree?.children ?? [];
      report.snapshotSanity.desktopRootChildren = rootChildren.length;
      report.snapshotSanity.applicationNamesSample = rootChildren
        .slice(0, 10)
        .map((n) => n.name || n.role)
        .filter((n) => !!n);
      report.snapshotSanity.activeAppTitle = snapshot.activeApp.title;
      report.snapshotSanity.activeAppId = snapshot.activeApp.appId;

      // Heuristics
      if (rootChildren.length === 0) {
        report.warnings.push('Empty accessibility tree returned');
        report.suggestedFixes.push(
          'Ensure Screen Recording / Accessibility permissions are granted.',
        );
      }

      const appNames = report.snapshotSanity.applicationNamesSample;
      const gnomeOnly =
        appNames.length > 0 &&
        appNames.every((n) => n.toLowerCase().includes('gnome-shell'));

      if (gnomeOnly) {
        report.warnings.push('Only gnome-shell visible');
        report.snapshotSanity.notes.push('Typical AT-SPI visibility issue.');
        report.suggestedFixes.push(
          'Check if AT-SPI bus is properly exposed or if other apps are sandboxed.',
        );
      }
    } catch (e) {
      report.warnings.push(
        `Snapshot failed: ${e instanceof Error ? e.message : String(e)}`,
      );
      report.suggestedFixes.push('Check driver logs for snapshot errors.');
    }

    return report;
  }
}
