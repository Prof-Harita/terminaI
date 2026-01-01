/**
 * @license
 * Copyright 2025 Google LLC
 * Portions Copyright 2025 TerminaI Authors
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Selector Engine AST
 *
 * Represents the parsed structure of a GUI selector string.
 */

export type SelectorPrefix =
  | 'any'
  | 'uia'
  | 'atspi'
  | 'ax'
  | 'sap'
  | 'ocr'
  | 'win32';

export interface SelectorNode {
  type: 'selector';
  prefix: SelectorPrefix;
  conditions: ConditionNode[];
  next?: {
    combinator:
      | 'descendant'
      | 'right-of'
      | 'left-of'
      | 'above'
      | 'below'
      | 'near';
    node: SelectorNode;
  };
  fallback?: SelectorNode; // The right-hand side of '??'
}

export type ConditionNode = AttributeCondition | BooleanCondition;

export interface AttributeCondition {
  type: 'attribute';
  name: string; // role, name, automationId, etc.
  operator: '=' | '~=' | '^=' | '$='; // exact, contains, starts-with, ends-with
  value: string | number | boolean;
}

export interface BooleanCondition {
  type: 'boolean';
  name: 'enabled' | 'visible' | 'focused';
  value: boolean;
}
