/**
 * @license
 * Copyright 2025 Google LLC
 * Portions Copyright 2025 TerminaI Authors
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Desktop Automation Protocol (DAP) Zod Schemas
 *
 * Runtime validation for tool arguments and driver responses.
 */

import { z } from 'zod';

// Reuse common shapes
export const DriverCapabilitiesSchema = z.object({
  canSnapshot: z.boolean(),
  canClick: z.boolean(),
  canType: z.boolean(),
  canScroll: z.boolean(),
  canKey: z.boolean(),
  canOcr: z.boolean(),
  canScreenshot: z.boolean(),
  canInjectInput: z.boolean(),
});

export const DriverDescriptorSchema = z.object({
  name: z.string(),
  kind: z.enum(['native', 'remote', 'mock']),
  version: z.string(),
  capabilities: DriverCapabilitiesSchema,
});

// ElementNode schema (recursive)
const ElementNodeSchemaBase = z.object({
  id: z.string(),
  role: z.string(),
  name: z.string().optional(),
  value: z.string().optional(),
  bounds: z
    .object({
      x: z.number(),
      y: z.number(),
      w: z.number(),
      h: z.number(),
    })
    .optional(),
  states: z
    .object({
      enabled: z.boolean().optional(),
      focused: z.boolean().optional(),
      checked: z.boolean().optional(),
      selected: z.boolean().optional(),
      expanded: z.boolean().optional(),
    })
    .optional(),
  platformIds: z
    .object({
      automationId: z.string().optional(),
      runtimeId: z.string().optional(),
      legacyId: z.string().optional(),
      atspiPath: z.string().optional(),
      axId: z.string().optional(),
      sapId: z.string().optional(),
    })
    .optional(),
  patterns: z
    .object({
      invoke: z.boolean().optional(),
      value: z.boolean().optional(),
      grid: z.boolean().optional(),
      selection: z.boolean().optional(),
      range: z.boolean().optional(),
    })
    .optional(),
});

// Use lazy for recursive children reference
export const ElementNodeSchema: z.ZodType<unknown> =
  ElementNodeSchemaBase.extend({
    children: z.lazy(() => z.array(ElementNodeSchema)).optional(),
  });

// VisualDOMSnapshot schema for runtime validation
export const VisualDOMSnapshotSchema = z.object({
  snapshotId: z.string(),
  timestamp: z.string(),
  activeApp: z.object({
    pid: z.number(),
    appId: z.string().optional(),
    processName: z.string().optional(),
    title: z.string(),
    windowHandle: z.string().optional(),
    bounds: z
      .object({
        x: z.number(),
        y: z.number(),
        w: z.number(),
        h: z.number(),
      })
      .optional(),
  }),
  tree: ElementNodeSchema.optional(),
  textIndex: z
    .array(
      z.object({
        text: z.string(),
        bounds: z.object({
          x: z.number(),
          y: z.number(),
          w: z.number(),
          h: z.number(),
        }),
        source: z.enum(['structure', 'ocr']),
        confidence: z.number(),
      }),
    )
    .optional(),
  screenshot: z
    .object({
      hash: z.string(),
      width: z.number(),
      height: z.number(),
      encoding: z.enum(['png', 'jpeg']),
    })
    .optional(),
  driver: DriverDescriptorSchema,
});

// Tool Argument Schemas

export const UiSnapshotSchema = z.object({
  scope: z.enum(['screen', 'window']).optional(),
  includeTree: z.boolean().optional().default(true),
  includeScreenshot: z.boolean().optional().default(false),
  includeTextIndex: z.boolean().optional().default(false),
  maxDepth: z.number().int().min(1).optional(),
});

export const UiQuerySchema = z.object({
  selector: z.string(),
  limit: z.number().int().min(1).optional().default(1),
  timeoutMs: z.number().int().min(0).optional(),
});

export const UiDescribeSchema = z.object({
  target: z.string(), // Selector is preferred, or serialized ElementRef
});

export const UiClickSchema = z.object({
  target: z.string(), // Selector is preferred, or serialized ElementRef
  button: z.enum(['left', 'right', 'middle']).optional().default('left'),
  clickCount: z.number().int().min(1).optional().default(1),
  modifiers: z.array(z.enum(['ctrl', 'alt', 'shift', 'meta'])).optional(),
  verify: z.boolean().optional().default(true),
});

export const UiTypeSchema = z.object({
  text: z.string(),
  target: z.string().optional(), // If omitted, types into currently focused element
  mode: z.enum(['insert', 'replace', 'append']).optional().default('insert'),
  redactInLogs: z.boolean().optional().default(false),
  verify: z.boolean().optional().default(true),
});

export const UiKeySchema = z.object({
  keys: z.array(z.string()), // e.g. ["Control", "c"]
  target: z.string().optional(),
  verify: z.boolean().optional().default(true),
});

export const UiScrollSchema = z.object({
  target: z.string().optional(),
  deltaX: z.number().optional().default(0),
  deltaY: z.number().optional().default(0),
  verify: z.boolean().optional().default(true),
});

export const UiFocusSchema = z.object({
  target: z.string(),
  verify: z.boolean().optional().default(true),
});

export const UiWaitSchema = z.object({
  selector: z.string(),
  state: z
    .enum(['visible', 'hidden', 'exists', 'removed'])
    .optional()
    .default('visible'),
  timeoutMs: z.number().int().optional().default(5000),
});

export const UiAssertSchema = z.object({
  target: z.string(),
  assertion: z.enum(['exists', 'not_exists', 'contains_text', 'equals_text']),
  value: z.string().optional(),
});

export const UiClickXySchema = z.object({
  x: z.number(),
  y: z.number(),
  coordinateSpace: z.enum(['screen', 'window']).optional().default('screen'),
  verify: z.boolean().optional().default(false),
});

// Types for validation of structure (inferred)
export type UiSnapshotArgs = z.infer<typeof UiSnapshotSchema>;
export type UiQueryArgs = z.infer<typeof UiQuerySchema>;
export type UiClickArgs = z.infer<typeof UiClickSchema>;
export type UiTypeArgs = z.infer<typeof UiTypeSchema>;
export type UiKeyArgs = z.infer<typeof UiKeySchema>;
export type UiScrollArgs = z.infer<typeof UiScrollSchema>;
export type UiFocusArgs = z.infer<typeof UiFocusSchema>;
export type UiWaitArgs = z.infer<typeof UiWaitSchema>;
export type UiAssertArgs = z.infer<typeof UiAssertSchema>;
export type UiDescribeArgs = z.infer<typeof UiDescribeSchema>;
export type UiClickXyArgs = z.infer<typeof UiClickXySchema>;

export const UiActionResultSchema = z.object({
  status: z.enum(['success', 'error']),
  driver: DriverDescriptorSchema,
  message: z.string().optional(),
  resolvedTarget: z
    .object({
      elementId: z.string(),
      bounds: z
        .object({
          x: z.number(),
          y: z.number(),
          w: z.number(),
          h: z.number(),
        })
        .optional(),
      role: z.string(),
      name: z.string().optional(),
      confidence: z.number(),
    })
    .optional(),
  evidence: z
    .object({
      snapshotId: z.string(),
      screenshotHash: z.string().optional(),
      cropHash: z.string().optional(),
      redactions: z.boolean().optional(),
    })
    .optional(),
  verification: z
    .object({
      passed: z.boolean(),
      details: z.string(),
    })
    .optional(),
  data: z.unknown().optional(),
});
