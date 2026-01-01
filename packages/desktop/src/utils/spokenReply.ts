/**
 * @license
 * Copyright 2025 Google LLC
 * Portions Copyright 2025 TerminaI Authors
 * SPDX-License-Identifier: Apache-2.0
 */

function normalizeWhitespace(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}

function firstSentence(text: string): string {
  const match = text.match(/^[^.!?]+[.!?]+/);
  return match ? match[0].trim() : text;
}

function truncateWords(text: string, maxWords: number): string {
  if (maxWords <= 0) {
    return '';
  }
  const words = text.split(' ');
  if (words.length <= maxWords) {
    return text;
  }
  return `${words.slice(0, maxWords).join(' ')}...`;
}

export function deriveSpokenReply(text: string, maxWords = 30): string {
  const normalized = normalizeWhitespace(text);
  if (!normalized) {
    return '';
  }
  return truncateWords(firstSentence(normalized), maxWords);
}
