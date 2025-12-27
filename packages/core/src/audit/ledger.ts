/**
 * @license
 * Copyright 2025 Google LLC
 * Portions Copyright 2025 TerminaI Authors
 * SPDX-License-Identifier: Apache-2.0
 */

import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { computeHash, verifyHashChain } from './hashChain.js';
import { redactEvent, type RedactionOptions } from './redaction.js';
import type { AuditEvent } from './schema.js';
import { applyExportRedaction, type AuditExportRedaction } from './export.js';

export interface AuditWriteOptions {
  redactWriteTime: boolean;
}

export interface AuditQueryOptions {
  limit: number;
  since?: string;
  toolName?: string;
  eventTypes?: string[];
}

export interface AuditExportOptions {
  format: 'jsonl' | 'json';
  redaction: AuditExportRedaction;
}

export interface AuditLedger {
  append(event: AuditEvent): Promise<void>;
  query(opts: AuditQueryOptions): Promise<AuditEvent[]>;
  verifyHashChain(): Promise<{ ok: boolean; error?: string }>;
  export(opts: AuditExportOptions): Promise<string>;
}

export class FileAuditLedger implements AuditLedger {
  private lastHash: string = '';
  private initialized = false;

  constructor(
    private readonly filePath: string,
    private readonly redactionOptions: RedactionOptions,
  ) {}

  private async ensureInitialized(): Promise<void> {
    if (this.initialized) return;
    await fs.mkdir(path.dirname(this.filePath), { recursive: true });
    try {
      const data = await fs.readFile(this.filePath, 'utf-8');
      const lines = data.split('\n').filter((line) => line.trim().length > 0);
      if (lines.length > 0) {
        const lastLine = JSON.parse(lines[lines.length - 1]) as AuditEvent;
        this.lastHash = lastLine.hash ?? '';
      }
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        throw error;
      }
    }
    this.initialized = true;
  }

  async append(event: AuditEvent): Promise<void> {
    await this.ensureInitialized();
    const redacted = redactEvent(event, this.redactionOptions);
    const finalized: AuditEvent = {
      ...redacted,
      version: 1,
      timestamp: new Date().toISOString(),
    };
    const { hash, prevHash } = computeHash(finalized, this.lastHash);
    const toWrite: AuditEvent = { ...finalized, hash, prevHash };
    await fs.appendFile(
      this.filePath,
      JSON.stringify(toWrite, null, 0) + '\n',
      'utf-8',
    );
    this.lastHash = hash;
  }

  async query(opts: AuditQueryOptions): Promise<AuditEvent[]> {
    await this.ensureInitialized();
    const { limit, since, toolName, eventTypes } = opts;
    let lines: string[] = [];
    try {
      const data = await fs.readFile(this.filePath, 'utf-8');
      lines = data.split('\n').filter((line) => line.trim().length > 0);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        return [];
      }
      throw error;
    }

    const events: AuditEvent[] = [];
    for (let i = lines.length - 1; i >= 0; i--) {
      const parsed = JSON.parse(lines[i]) as AuditEvent;
      if (since && parsed.timestamp < since) {
        continue;
      }
      if (toolName && parsed.tool?.toolName !== toolName) {
        continue;
      }
      if (eventTypes && !eventTypes.includes(parsed.eventType)) {
        continue;
      }
      events.push(parsed);
      if (events.length >= limit) {
        break;
      }
    }
    return events.reverse();
  }

  async verifyHashChain(): Promise<{ ok: boolean; error?: string }> {
    await this.ensureInitialized();
    let events: AuditEvent[] = [];
    try {
      const data = await fs.readFile(this.filePath, 'utf-8');
      events = data
        .split('\n')
        .filter((line) => line.trim().length > 0)
        .map((line) => JSON.parse(line) as AuditEvent);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        return { ok: true };
      }
      throw error;
    }
    return verifyHashChain(events);
  }

  async export(opts: AuditExportOptions): Promise<string> {
    const events = await this.query({ limit: Number.MAX_SAFE_INTEGER });
    const redacted = applyExportRedaction(events, opts.redaction);
    if (opts.format === 'json') {
      return JSON.stringify(redacted, null, 2);
    }
    return redacted.map((event) => JSON.stringify(event)).join('\n');
  }
}
