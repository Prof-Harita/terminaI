/**
 * @license
 * Copyright 2025 Google LLC
 * Portions Copyright 2025 TerminaI Authors
 * SPDX-License-Identifier: Apache-2.0
 */

export function truncateOutput(output: string, maxLines: number = 200): string {
  const lines = output.split('\n');
  if (lines.length <= maxLines) return output;
  const headCount = Math.floor(maxLines * 0.6);
  const tailCount = maxLines - headCount;
  const hidden = lines.length - maxLines;
  return [
    ...lines.slice(0, headCount),
    `\n... [${hidden} lines hidden] ...\n`,
    ...lines.slice(-tailCount),
  ].join('\n');
}
