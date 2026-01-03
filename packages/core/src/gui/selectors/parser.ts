/**
 * @license
 * Copyright 2025 Google LLC
 * Portions Copyright 2025 TerminaI Authors
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Selector Parser (v1)
 *
 * Parses a string selector into a SelectorNode AST.
 * Supports:
 * - Prefixes: any:, uia:, atspi:, win32:, etc.
 * - Conditions: role=X, name="Y", enabled=true
 * - Operators: &&
 * - Combinators: >> (descendant)
 * - Fallback: ??
 *
 * Example: `uia:role=Button && name="Submit" ?? ocr:"Submit"`
 */

import type { SelectorNode, ConditionNode, SelectorPrefix } from './ast.js';

export class SelectorParseError extends Error {
  hint?: string;
  position: number;

  constructor(message: string, position: number, hint?: string) {
    super(`Selector parse error at index ${position}: ${message}`);
    this.position = position;
    this.hint = hint;
  }
}

/**
 * Detect common CSS selector patterns and return a helpful hint.
 */
function detectCssSelectorHint(input: string): string | undefined {
  const cssPatterns = [
    /^\.[a-zA-Z_-]/, // .class
    /^#[a-zA-Z_-]/, // #id
    /^[a-z]+\s*>/, // tag >
    /\[.*=.*\]/, // [attr=value]
  ];
  for (const pattern of cssPatterns) {
    if (pattern.test(input.trim())) {
      return 'This looks like a CSS selector. UI selectors use a different syntax: name:"...", role=..., enabled=true, etc.';
    }
  }
  return undefined;
}

export function parseSelector(input: string): SelectorNode {
  const hint = detectCssSelectorHint(input);
  const parser = new Parser(input, hint);
  return parser.parse();
}

class Parser {
  private pos = 0;
  private len: number;

  constructor(
    private input: string,
    private hint?: string,
  ) {
    this.len = input.length;
  }

  parse(): SelectorNode {
    // Top level: Parse fallback chain (A ?? B)
    const left = this.parseChain();

    this.skipWhitespace();
    if (this.match('??')) {
      const right = this.parse(); // Recurse for right-associativity
      left.fallback = right;
    }

    return left;
  }

  private parseChain(): SelectorNode {
    // Parse combinator chain (A >> B)
    const left = this.parseSingleSelector();

    this.skipWhitespace();
    while (this.match('>>')) {
      // For v1 we only really support descendant '>>' as primary combinator
      // The AST supports 'right-of' etc but we parse '>>' as descendant
      const right = this.parseSingleSelector();

      // Link as 'next'
      // We need to walk to the end of the current 'left's 'next' chain if it exists
      // But parseSingleSelector returns a single node (maybe with its own next? no, parseSingle is one segment)

      // Wait, parseSingleSelector creates one node.
      // If we have A >> B >> C
      // left = A
      // match >>
      // right = B
      // A.next = { combinator: 'descendant', node: B }
      // Loop: match >>
      // right = C
      // But where to attach C? B.next.

      // Actually simpler: recursive structure handles this naturally usually,
      // but let's stick to iterative for the chain to keep it flat-ish or handle attaching to tail.

      // Let's do it recursively: A >> (Rest)
      // Implementation detail: The AST 'next' is on the SelectorNode.
      // So A.next -> B.

      // If we do iterative:
      let tail = left;
      while (tail.next) {
        tail = tail.next.node;
      }
      tail.next = { combinator: 'descendant', node: right };

      this.skipWhitespace();
    }

    return left;
  }

  private parseSingleSelector(): SelectorNode {
    this.skipWhitespace();

    // 1. Parse Prefix (optional, default 'any')
    let prefix: SelectorPrefix = 'any';
    const prefixMatch = this.input.slice(this.pos).match(/^([a-z0-9]+):/i);
    if (prefixMatch) {
      prefix = prefixMatch[1].toLowerCase() as SelectorPrefix;
      this.pos += prefixMatch[0].length;
    }

    // 2. Parse Conditions
    const conditions: ConditionNode[] = [];

    // If we just have `ocr:"Submit"`, that's a shortcut for `ocr:text="Submit"` or similar?
    // The spec says `ocr:"Submit"` is possible.
    // Let's handle generic `key=value` pairs separated by `&&`.
    // Special case: if prefix is 'ocr' and next token is a string literal, implies text match?
    // Let's stick to explicit `key=value` for now, or the architecture example `ocr:"Submit"` -> treating as name/text.

    // Allow parsing one string literal as an implicit "name" or "text" condition if format matches
    this.skipWhitespace();
    if (this.peek() === '"' || this.peek() === "'") {
      // Implicit name/text match
      const val = this.parseString();
      conditions.push({
        type: 'attribute',
        name: 'name',
        operator: '=',
        value: val,
      });
    } else {
      // Parse Key=Value && ...
      do {
        this.skipWhitespace();
        const condition = this.parseCondition();
        conditions.push(condition);
        this.skipWhitespace();
      } while (this.match('&&'));
    }

    return {
      type: 'selector',
      prefix,
      conditions,
    };
  }

  private parseCondition(): ConditionNode {
    // key op value
    const key = this.readIdentifier();
    this.skipWhitespace();

    let op = '=';
    if (this.match('~=')) op = '~=';
    else if (this.match('^=')) op = '^=';
    else if (this.match('$=')) op = '$=';
    else if (this.match('=')) op = '=';
    else
      throw new SelectorParseError(
        'Expected operator (=, ~=, ^=, $=)',
        this.pos,
        this.hint,
      );

    this.skipWhitespace();
    const value = this.parseValue();

    // Helper for boolean shortcuts
    if (key === 'enabled' || key === 'visible' || key === 'focused') {
      if (typeof value !== 'boolean') {
        // Try to coerce generic strings "true"/"false" if parsed as string
        if (value === 'true')
          return { type: 'boolean', name: key, value: true };
        if (value === 'false')
          return { type: 'boolean', name: key, value: false };
        throw new SelectorParseError(
          `${key} requires boolean value`,
          this.pos,
          this.hint,
        );
      }
      return { type: 'boolean', name: key, value };
    }

    return {
      type: 'attribute',
      name: key,
      operator: op as '=' | '~=' | '^=' | '$=',
      value,
    };
  }

  private parseValue(): string | number | boolean {
    if (this.peek() === '"' || this.peek() === "'") {
      return this.parseString();
    }

    const start = this.pos;
    // Read until whitespace or specialized char
    while (this.pos < this.len && !/[\s&>?)\]]/.test(this.input[this.pos])) {
      this.pos++;
    }
    const raw = this.input.slice(start, this.pos);

    if (raw === 'true') return true;
    if (raw === 'false') return false;
    const num = Number(raw);
    if (!isNaN(num) && raw.trim() !== '') return num;

    return raw;
  }

  private parseString(): string {
    const quote = this.input[this.pos];
    this.pos++; // skip quote
    let res = '';
    while (this.pos < this.len) {
      const char = this.input[this.pos];
      if (char === '\\') {
        this.pos++;
        res += this.input[this.pos];
      } else if (char === quote) {
        this.pos++;
        return res;
      } else {
        res += char;
      }
      this.pos++;
    }
    throw new SelectorParseError('Unterminated string', this.pos, this.hint);
  }

  private readIdentifier(): string {
    const start = this.pos;
    while (this.pos < this.len && /[a-zA-Z0-9_-]/.test(this.input[this.pos])) {
      this.pos++;
    }
    return this.input.slice(start, this.pos);
  }

  private skipWhitespace() {
    while (this.pos < this.len && /\s/.test(this.input[this.pos])) {
      this.pos++;
    }
  }

  private peek(): string {
    return this.input[this.pos];
  }

  private match(str: string): boolean {
    if (this.input.startsWith(str, this.pos)) {
      this.pos += str.length;
      return true;
    }
    return false;
  }
}
