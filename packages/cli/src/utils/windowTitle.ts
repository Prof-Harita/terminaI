/**
 * @license
 * Copyright 2025 Google LLC
 * Portions Copyright 2025 TerminaI Authors
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Computes the window title for the TerminaI application.
 *
 * @param folderName - The name of the current folder/workspace to display in the title
 * @returns The computed window title, either from CLI_TITLE environment variable or the default TerminaI title
 */
export function computeWindowTitle(folderName: string): string {
  const title = process.env['CLI_TITLE'] || `TerminaI - ${folderName}`;

  // Remove control characters that could cause issues in terminal titles
  return title.replace(
    // eslint-disable-next-line no-control-regex
    /[\x00-\x1F\x7F]/g,
    '',
  );
}
