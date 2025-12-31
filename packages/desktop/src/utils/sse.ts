/**
 * @license
 * Copyright 2025 Google LLC
 * Portions Copyright 2025 TerminaI Authors
 * SPDX-License-Identifier: Apache-2.0
 */

export type SseMessage = {
  data: string;
};

function* splitSseChunks(buffer: string): Generator<string> {
  const chunks = buffer.split('\n\n');
  for (let i = 0; i < chunks.length - 1; i += 1) {
    const chunk = chunks[i];
    if (chunk) {
      yield chunk;
    }
  }
}

export function parseSseDataLines(chunk: string): SseMessage[] {
  const lines = chunk.split('\n');
  const messages: SseMessage[] = [];
  for (const line of lines) {
    if (!line.startsWith('data:')) {
      continue;
    }
    const data = line.slice('data:'.length).trimStart();
    messages.push({ data });
  }
  return messages;
}

export async function readSseStream(
  stream: ReadableStream<Uint8Array>,
  onMessage: (msg: SseMessage) => void,
): Promise<void> {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) {
        break;
      }
      buffer += decoder.decode(value, { stream: true });

      for (const chunk of splitSseChunks(buffer)) {
        const messages = parseSseDataLines(chunk);
        for (const msg of messages) {
          onMessage(msg);
        }
      }

      const lastSeparator = buffer.lastIndexOf('\n\n');
      if (lastSeparator !== -1) {
        buffer = buffer.slice(lastSeparator + 2);
      }
    }

    // Flush any remaining complete chunk.
    const leftoverChunks = buffer.split('\n\n').filter(Boolean);
    for (const chunk of leftoverChunks) {
      const messages = parseSseDataLines(chunk);
      for (const msg of messages) {
        onMessage(msg);
      }
    }
  } finally {
    reader.releaseLock();
  }
}
