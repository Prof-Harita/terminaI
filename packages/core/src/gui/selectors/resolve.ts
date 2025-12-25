/**
 * Selector Resolver
 *
 * Resolves a selector string or AST against a VisualDOMSnapshot tree.
 */

import { ElementNode, VisualDOMSnapshot } from '../protocol/types';
import { parseSelector } from './parser';
import { matchSelector } from './matcher';
import { SelectorNode } from './ast';

export interface ResolvedElement {
  node: ElementNode;
  confidence: number;
}

export function resolveSelector(
  snapshot: VisualDOMSnapshot,
  selector: string | SelectorNode,
): ResolvedElement[] {
  const root = snapshot.tree;
  if (!root) return [];

  const ast = typeof selector === 'string' ? parseSelector(selector) : selector;

  return resolveNode(root, ast);
}

function resolveNode(scope: ElementNode, ast: SelectorNode): ResolvedElement[] {
  // Handle Fallback (A ?? B)
  if (ast.fallback) {
    // Break the fallback chain: verify if A matches anything
    // We need to clone the AST without the fallback to test 'A'
    const primaryAst = { ...ast, fallback: undefined };
    const primaryMatches = resolveSingleChain(
      scope,
      primaryAst as SelectorNode,
    );

    if (primaryMatches.length > 0) {
      return primaryMatches;
    }
    // Fallback
    return resolveNode(scope, ast.fallback);
  }

  return resolveSingleChain(scope, ast);
}

function resolveSingleChain(
  scope: ElementNode,
  ast: SelectorNode,
): ResolvedElement[] {
  // Find matches for the current node first (DFS)
  const matches = findMatchesInSubtree(scope, ast);

  // If there's a next node in the chain (>>), we must resolve it
  // scoped to the subtrees of the matches we found.
  if (ast.next) {
    const nextAst = ast.next.node;
    if (ast.next.combinator === 'descendant') {
      const chainedMatches: ResolvedElement[] = [];
      for (const match of matches) {
        if (!match.node.children) continue;
        for (const child of match.node.children) {
          const subMatches = resolveNode(child, nextAst);
          chainedMatches.push(...subMatches);
        }
      }
      return chainedMatches;
    }
    // TODO: implement other combinators if needed
  }

  return matches;
}

function findMatchesInSubtree(
  root: ElementNode,
  selector: SelectorNode,
): ResolvedElement[] {
  const results: ResolvedElement[] = [];

  // DFS
  const stack = [root];
  while (stack.length > 0) {
    const node = stack.pop()!;

    const result = matchSelector(node, selector);
    if (result.matches) {
      results.push({ node, confidence: result.confidence });
    }

    if (node.children) {
      // Push children in reverse for natural order?
      // Actually standard stack is fine, we just want to find all.
      for (let i = node.children.length - 1; i >= 0; i--) {
        stack.push(node.children[i]);
      }
    }
  }

  return results;
}
