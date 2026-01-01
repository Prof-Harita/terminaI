/**
 * @license
 * Copyright 2025 Google LLC
 * Portions Copyright 2025 TerminaI Authors
 * SPDX-License-Identifier: Apache-2.0
 */

export type SpokenReply = {
  spokenText: string;
  truncated: boolean;
};

function normalizeWhitespace(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}

function firstSentence(text: string): string {
  const match = text.match(/^[^.!?]+[.!?]+/);
  return match ? match[0].trim() : text;
}

function truncateWords(text: string, maxWords: number): SpokenReply {
  if (maxWords <= 0) {
    return { spokenText: '', truncated: false };
  }
  const words = text.split(' ');
  if (words.length <= maxWords) {
    return { spokenText: text, truncated: false };
  }
  return {
    spokenText: `${words.slice(0, maxWords).join(' ')}...`,
    truncated: true,
  };
}

export function deriveSpokenReply(
  text: string,
  maxWords: number = 30,
): SpokenReply {
  const normalized = normalizeWhitespace(text);
  if (!normalized) {
    return { spokenText: '', truncated: false };
  }
  const candidate = firstSentence(normalized);
  return truncateWords(candidate, maxWords);
}
