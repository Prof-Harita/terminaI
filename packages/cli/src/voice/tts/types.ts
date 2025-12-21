/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

export type SpeakOptions = {
  signal?: AbortSignal;
  volume?: number;
};

export type TtsProvider = {
  name: string;
  speak: (text: string, options?: SpeakOptions) => Promise<void>;
  stop?: () => void;
};
