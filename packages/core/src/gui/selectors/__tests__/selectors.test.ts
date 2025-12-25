import { describe, it, expect } from 'vitest';
import { parseSelector } from '../parser';
import { matchSelector } from '../matcher';
import { resolveSelector } from '../resolve';
import { ElementNode, VisualDOMSnapshot } from '../../protocol/types';

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
        capabilities: {} as any,
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
