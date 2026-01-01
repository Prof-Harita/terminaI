/**
 * @license
 * Copyright 2025 Google LLC
 * Portions Copyright 2025 TerminaI Authors
 * SPDX-License-Identifier: Apache-2.0
 */

import { hmacSha256Hex, sha256Hex } from './webCrypto';

export async function buildSignedHeaders(input: {
  token: string;
  method: string;
  pathWithQuery: string;
  bodyString: string;
}) {
  const nonce = crypto.randomUUID();
  const bodyHash = await sha256Hex(input.bodyString);
  const payload = [
    input.method.toUpperCase(),
    input.pathWithQuery,
    bodyHash,
    nonce,
  ].join('\n');
  const signature = await hmacSha256Hex(input.token, payload);
  return {
    Authorization: `Bearer ${input.token}`,
    'X-Gemini-Nonce': nonce,
    'X-Gemini-Signature': signature,
  };
}

export async function postToAgent(
  baseUrl: string,
  token: string,
  body: Record<string, unknown>,
  abortSignal?: AbortSignal,
): Promise<ReadableStream<Uint8Array>> {
  const bodyString = JSON.stringify(body);
  const signedHeaders = await buildSignedHeaders({
    token,
    method: 'POST',
    pathWithQuery: '/',
    bodyString,
  });

  const res = await fetch(`${baseUrl}/`, {
    method: 'POST',
    headers: {
      ...signedHeaders,
      'Content-Type': 'application/json',
      Accept: 'text/event-stream',
      Connection: 'keep-alive',
    },
    body: bodyString,
    signal: abortSignal,
    keepalive: true,
  });

  if (!res.ok || !res.body) {
    throw new Error(`Agent request failed: ${res.status} ${res.statusText}`);
  }

  return res.body;
}
