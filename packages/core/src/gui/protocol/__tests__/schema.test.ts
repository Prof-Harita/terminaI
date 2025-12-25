import { describe, it, expect } from 'vitest';
import {
  UiClickSchema,
  UiTypeSchema,
  UiSnapshotSchema,
  UiQuerySchema,
} from '../schemas';

describe('DAP Schemas', () => {
  describe('UiClickSchema', () => {
    it('validates a minimal click request', () => {
      const input = { target: 'role=Button' };
      const parsed = UiClickSchema.safeParse(input);
      expect(parsed.success).toBe(true);
      if (parsed.success) {
        expect(parsed.data.button).toBe('left');
        expect(parsed.data.verify).toBe(true);
      }
    });

    it('validates a full click request', () => {
      const input = {
        target: 'role=Button',
        button: 'right',
        clickCount: 2,
        modifiers: ['ctrl', 'shift'],
        verify: false,
      };
      const parsed = UiClickSchema.safeParse(input);
      expect(parsed.success).toBe(true);
    });

    it('rejects invalid buttons', () => {
      const input = { target: 'foo', button: 'invalid' };
      const parsed = UiClickSchema.safeParse(input);
      expect(parsed.success).toBe(false);
    });
  });

  describe('UiTypeSchema', () => {
    it('validates a simple type request', () => {
      const input = { text: 'Hello', target: 'role=Edit' };
      const parsed = UiTypeSchema.safeParse(input);
      expect(parsed.success).toBe(true);
    });

    it('validates without target (focused element)', () => {
      const input = { text: 'Hello' };
      const parsed = UiTypeSchema.safeParse(input);
      expect(parsed.success).toBe(true);
    });
  });

  describe('UiSnapshotSchema', () => {
    it('validates defaults', () => {
      const parsed = UiSnapshotSchema.safeParse({});
      expect(parsed.success).toBe(true);
      if (parsed.success) {
        expect(parsed.data.includeTree).toBe(true);
        expect(parsed.data.includeScreenshot).toBe(false);
      }
    });
  });

  describe('UiQuerySchema', () => {
    it('validates required fields', () => {
      const parsed = UiQuerySchema.safeParse({ selector: 'role=Button' });
      expect(parsed.success).toBe(true);
    });

    it('rejects missing selector', () => {
      const parsed = UiQuerySchema.safeParse({});
      expect(parsed.success).toBe(false);
    });
  });
});
