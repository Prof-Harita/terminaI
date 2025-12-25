/**
 * Selector Matcher
 *
 * Matches an ElementNode against a SelectorNode (single segment, not chain).
 * Returns a confidence score if matched, or 0 if not.
 */

import { ElementNode } from '../protocol/types';
import { SelectorNode, ConditionNode } from './ast';

export interface MatchResult {
  matches: boolean;
  confidence: number; // 0.0 to 1.0
}

export function matchSelector(
  element: ElementNode,
  selector: SelectorNode,
): MatchResult {
  // 1. Check Prefix compatibility (optional optimization)
  // For 'uia:', we might define that it MUST have platformIds.automationId?
  // For v1 let's be permissive unless 'atspi' is requested on Windows etc,
  // but here we just have the element, so we check conditions.

  if (selector.type !== 'selector') return { matches: false, confidence: 0 };

  let totalConfidence = 1.0;
  let hasStrongIdentity = false;

  for (const cond of selector.conditions) {
    const result = matchCondition(element, cond);
    if (!result.matches) {
      return { matches: false, confidence: 0 };
    }

    // Accumulate confidence
    // If we match on stable ID, confidence is high.
    // If we match on name, it's medium.
    if (result.isStrongIdentity) hasStrongIdentity = true;
  }

  // Base confidence adjustments
  if (hasStrongIdentity) {
    totalConfidence = 1.0;
  } else {
    // Name only? 0.8
    totalConfidence = 0.8;
  }

  // OCR prefix might lower confidence in future
  if (selector.prefix === 'ocr') {
    totalConfidence *= 0.7;
  }

  return { matches: true, confidence: totalConfidence };
}

function matchCondition(
  element: ElementNode,
  cond: ConditionNode,
): { matches: boolean; isStrongIdentity: boolean } {
  if (cond.type === 'boolean') {
    const states = element.states || {};
    let actual = false;
    if (cond.name === 'enabled') actual = states.enabled ?? true; // default enabled?
    if (cond.name === 'visible') actual = true; // In snapshot, assumed visible usually
    // TODO: better state mapping from ElementNode

    // For now, if state is missing, we assume false unless 'enabled' (default true-ish)
    if (cond.name === 'enabled' && element.states?.enabled === undefined)
      actual = true;

    if (cond.name === 'focused') actual = states.focused || false;

    return { matches: actual === cond.value, isStrongIdentity: false };
  }

  if (cond.type === 'attribute') {
    const val = getAttributeValue(element, cond.name);
    if (val === undefined) return { matches: false, isStrongIdentity: false };

    const matches = checkOperator(
      String(val),
      String(cond.value),
      cond.operator,
    );

    // Determine strength
    const strongAttrs = [
      'automationId',
      'runtimeId',
      'legacyId',
      'atspiPath',
      'axId',
      'sapId',
    ];
    const isStrong = strongAttrs.includes(cond.name);

    return { matches, isStrongIdentity: isStrong };
  }

  return { matches: false, isStrongIdentity: false };
}

function getAttributeValue(
  element: ElementNode,
  attr: string,
): string | number | boolean | undefined {
  switch (attr) {
    case 'role':
      return element.role;
    case 'name':
      return element.name;
    case 'value':
      return element.value;
    case 'automationId':
      return element.platformIds?.automationId;
    case 'runtimeId':
      return element.platformIds?.runtimeId;
    case 'legacyId':
      return element.platformIds?.legacyId;
    case 'atspiPath':
      return element.platformIds?.atspiPath;
    // ... add others
  }
  return undefined;
}

function checkOperator(actual: string, expected: string, op: string): boolean {
  // Case insensitive for most things? Architecture says:
  // "role" case-insensitive normalized
  // "name" exact + case-insensitive contains usually

  // For v1 implementation:
  const a = actual.toLowerCase();
  const b = expected.toLowerCase();

  switch (op) {
    case '=':
      return a === b;
    case '~=':
      return a.includes(b);
    case '^=':
      return a.startsWith(b);
    case '$=':
      return a.endsWith(b);
    default:
      return false;
  }
}
