/**
 * @license
 * Copyright 2025 Google LLC
 * Portions Copyright 2025 TerminaI Authors
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect } from 'vitest';
import { z } from 'zod';

/**
 * Contract tests to verify Linux sidecar JSON-RPC response shapes.
 * These tests validate the expected structure of responses without
 * actually running the sidecar (which requires a Linux GUI environment).
 */

// Expected schema for driver descriptor (always present in responses)
const DriverDescriptorSchema = z.object({
  name: z.string(),
  kind: z.enum(['native', 'mock', 'remote']),
  version: z.string(),
  capabilities: z.object({
    canSnapshot: z.boolean(),
    canClick: z.boolean(),
    canType: z.boolean(),
    canScroll: z.boolean(),
    canKey: z.boolean(),
    canOcr: z.boolean(),
    canScreenshot: z.boolean(),
    canInjectInput: z.boolean(),
  }),
});

// Expected schema for snapshot response
const SnapshotResponseSchema = z.object({
  snapshotId: z.string(),
  timestamp: z.string(),
  activeApp: z.object({
    pid: z.number(),
    title: z.string().optional(),
    appId: z.string().optional(),
    bounds: z
      .object({
        x: z.number(),
        y: z.number(),
        w: z.number(),
        h: z.number(),
      })
      .optional(),
  }),
  tree: z.any().nullable(), // Can be null if windowId not found
  driver: DriverDescriptorSchema,
});

// Expected schema for action result response
const ActionResultSchema = z.object({
  status: z.enum(['success', 'error']),
  driver: DriverDescriptorSchema.optional(),
  message: z.string().optional(),
});

// Sample responses that the sidecar should produce
const sampleSnapshotResponse = {
  snapshotId: 'abc123',
  timestamp: '2026-01-02T10:00:00.000Z',
  activeApp: {
    pid: 1234,
    title: 'Firefox',
    bounds: { x: 0, y: 0, w: 1920, h: 1080 },
  },
  tree: { id: 'root', role: 'desktop', children: [] },
  driver: {
    name: 'linux-atspi',
    kind: 'native',
    version: '1.0.0',
    capabilities: {
      canSnapshot: true,
      canClick: true,
      canType: true,
      canScroll: false,
      canKey: false,
      canOcr: false,
      canScreenshot: false,
      canInjectInput: true,
    },
  },
};

const sampleActionResponse = {
  status: 'success',
  driver: {
    name: 'linux-atspi',
    kind: 'native',
    version: '1.0.0',
    capabilities: {
      canSnapshot: true,
      canClick: true,
      canType: true,
      canScroll: false,
      canKey: false,
      canOcr: false,
      canScreenshot: false,
      canInjectInput: true,
    },
  },
  message: 'Clicked at 100, 200',
};

describe('Linux Sidecar Contract Tests', () => {
  describe('Snapshot Response Shape', () => {
    it('validates correct snapshot response', () => {
      const result = SnapshotResponseSchema.safeParse(sampleSnapshotResponse);
      expect(result.success).toBe(true);
    });

    it('requires driver field in snapshot', () => {
      const { driver: _driver, ...invalidResponse } = sampleSnapshotResponse;
      const result = SnapshotResponseSchema.safeParse(invalidResponse);
      expect(result.success).toBe(false);
    });

    it('allows null tree when window not found', () => {
      const responseWithNullTree = { ...sampleSnapshotResponse, tree: null };
      const result = SnapshotResponseSchema.safeParse(responseWithNullTree);
      expect(result.success).toBe(true);
    });
  });

  describe('Action Result Shape', () => {
    it('validates correct action response', () => {
      const result = ActionResultSchema.safeParse(sampleActionResponse);
      expect(result.success).toBe(true);
    });

    it('allows success status', () => {
      const result = ActionResultSchema.safeParse({ status: 'success' });
      expect(result.success).toBe(true);
    });

    it('allows error status with message', () => {
      const result = ActionResultSchema.safeParse({
        status: 'error',
        message: 'Element not found',
      });
      expect(result.success).toBe(true);
    });
  });

  describe('Driver Descriptor Shape', () => {
    it('validates correct driver descriptor', () => {
      const result = DriverDescriptorSchema.safeParse(
        sampleSnapshotResponse.driver,
      );
      expect(result.success).toBe(true);
    });

    it('requires all capability fields', () => {
      const incompleteDriver = {
        name: 'test',
        kind: 'native',
        version: '1.0',
        capabilities: { canSnapshot: true }, // Missing other fields
      };
      const result = DriverDescriptorSchema.safeParse(incompleteDriver);
      expect(result.success).toBe(false);
    });

    it('validates kind enum', () => {
      const invalidKind = {
        ...sampleSnapshotResponse.driver,
        kind: 'invalid',
      };
      const result = DriverDescriptorSchema.safeParse(invalidKind);
      expect(result.success).toBe(false);
    });
  });
});
