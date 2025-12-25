/**
 * Desktop Automation Protocol (DAP) Zod Schemas
 *
 * Runtime validation for tool arguments and driver responses.
 */

import { z } from 'zod';

// Reuse common shapes
/*
const BoundsSchema = z.object({
  x: z.number(),
  y: z.number(),
  w: z.number(),
  h: z.number(),
});
*/

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
  element: z.union([
    z.string(), // selector
    z.object({ snapshotId: z.string(), elementId: z.string() }), // ElementRef
  ]),
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
export type UiClickXyArgs = z.infer<typeof UiClickXySchema>;
