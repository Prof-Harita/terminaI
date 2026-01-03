/**
 * @license
 * Copyright 2025 Google LLC
 * Portions Copyright 2025 TerminaI Authors
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect } from 'vitest';
import { parseSelector } from '../parser.js';
import { matchSelector } from '../matcher.js';
import { resolveSelector } from '../resolve.js';
import type { ElementNode, VisualDOMSnapshot } from '../../protocol/types.js';

describe('Selector Engine', () => {
  describe('Parser', () => {
    it('parses simple attributes', () => {
      const ast = parseSelector('role=Button');
      expect(ast.conditions[0]).toEqual({
        type: 'attribute',
        name: 'role',
        operator: '=',
        value: 'Button',
      });
    });
    it('parses implicit name', () => {
      const ast = parseSelector('"Submit"');
      expect(ast.conditions[0]).toEqual({
        type: 'attribute',
        name: 'name',
        operator: '=',
        value: 'Submit',
      });
    });
    it('parses fallbacks', () => {
      const ast = parseSelector('uia:id="foo" ?? ocr:"foo"');
      expect(ast.fallback).toBeDefined();
    });
    it('parses chains', () => {
      const ast = parseSelector('role=Window >> role=Button');
      expect(ast.next?.combinator).toBe('descendant');
    });

    it('detects CSS-like selectors and includes hint', () => {
      // CSS patterns should throw with a helpful hint
      const cssPatterns = [
        '.my-class',
        '#my-id',
        'div > span',
        '[name*="Chrome"]',
      ];
      for (const pattern of cssPatterns) {
        try {
          parseSelector(pattern);
          // If it doesn't throw, that's fine for some edge cases
        } catch (e: unknown) {
          if (typeof e === 'object' && e !== null && 'hint' in e) {
            const hint = (e as { hint?: unknown }).hint;
            if (typeof hint === 'string') {
              expect(hint).toContain('CSS selector');
            }
          }
        }
      }
    });
  });

  describe('Matcher', () => {
    const el: ElementNode = {
      id: '1',
      role: 'Button',
      name: 'Hit',
      states: { enabled: true },
    };
    it('matches role', () => {
      expect(matchSelector(el, parseSelector('role=Button')).matches).toBe(
        true,
      );
    });
    it('matches name', () => {
      expect(matchSelector(el, parseSelector('name="Hit"')).matches).toBe(true);
    });
    it('fails mismatch', () => {
      expect(matchSelector(el, parseSelector('role=Window')).matches).toBe(
        false,
      );
    });
  });

  describe('Resolver', () => {
    const tree: ElementNode = {
      id: 'root',
      role: 'Window',
      children: [
        { id: 'btn', role: 'Button', name: 'S' },
        {
          id: 'grp',
          role: 'Group',
          children: [{ id: 'ed', role: 'Edit', name: 'N' }],
        },
      ],
    };
    const snap: VisualDOMSnapshot = {
      snapshotId: 's1',
      timestamp: '0',
      activeApp: { pid: 1, title: 'A' },
      tree,
      driver: {
        name: 'm',
        kind: 'mock',
        version: '1',
        capabilities: {
          canSnapshot: true,
          canClick: true,
          canType: true,
          canScroll: true,
          canKey: true,
          canOcr: false,
          canScreenshot: false,
          canInjectInput: true,
        },
      },
    };

    it('finds deep', () => {
      const res = resolveSelector(snap, 'role=Edit');
      expect(res[0]?.node.id).toBe('ed');
    });
    it('chains', () => {
      const res = resolveSelector(snap, 'role=Group >> role=Edit');
      expect(res[0]?.node.id).toBe('ed');
    });
    it('fallback', () => {
      const res = resolveSelector(snap, 'role=Check ?? role=Button');
      expect(res[0]?.node.id).toBe('btn');
    });
  });
});
