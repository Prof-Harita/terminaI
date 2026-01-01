/**
 * @license
 * Copyright 2025 Google LLC
 * Portions Copyright 2025 TerminaI Authors
 * SPDX-License-Identifier: Apache-2.0
 */

import path from 'node:path';
import { promises as fs } from 'node:fs';
import type { Content } from '@google/genai';
import type { AuthType } from './contentGenerator.js';
import { Storage } from '../config/storage.js';
import { debugLogger } from '../utils/debugLogger.js';
import { coreEvents } from '../utils/events.js';

const LOG_FILE_NAME = 'logs.jsonl';

export enum MessageSenderType {
  USER = 'user',
}

export interface LogEntry {
  sessionId: string;
  messageId: number;
  timestamp: string;
  type: MessageSenderType;
  message: string;
}

export type EventType =
  | 'user_prompt'
  | 'model_response'
  | 'thought'
  | 'tool_call'
  | 'tool_result'
  | 'approval'
  | 'error'
  | 'session_start'
  | 'session_end'
  | 'evaluation';

export interface TerminaILogEvent {
  version: '1.0';
  sessionId: string;
  timestamp: string;
  eventType: EventType;
  payload: Record<string, unknown>;
}

export interface Checkpoint {
  history: Content[];
  authType?: AuthType;
}

// This regex matches any character that is NOT a letter (a-z, A-Z),
// a number (0-9), a hyphen (-), an underscore (_), or a dot (.).

/**
 * Encodes a string to be safe for use as a filename.
 *
 * It replaces any characters that are not alphanumeric or one of `_`, `-`, `.`
 * with a URL-like percent-encoding (`%` followed by the 2-digit hex code).
 *
 * @param str The input string to encode.
 * @returns The encoded, filename-safe string.
 */
export function encodeTagName(str: string): string {
  return encodeURIComponent(str);
}

/**
 * Decodes a string that was encoded with the `encode` function.
 *
 * It finds any percent-encoded characters and converts them back to their
 * original representation.
 *
 * @param str The encoded string to decode.
 * @returns The decoded, original string.
 */
export function decodeTagName(str: string): string {
  try {
    return decodeURIComponent(str);
  } catch (_e) {
    // Fallback for old, potentially malformed encoding
    return str.replace(/%([0-9A-F]{2})/g, (_, hex) =>
      String.fromCharCode(parseInt(hex, 16)),
    );
  }
}

export class Logger {
  private geminiDir: string | undefined;
  private logFilePath: string | undefined;
  private logFilePathFull: string | undefined;
  private sessionId: string | undefined;
  private messageId = 0; // Instance-specific counter for the next messageId
  private initialized = false;

  constructor(
    sessionId: string,
    private readonly storage: Storage,
  ) {
    this.sessionId = sessionId;
  }

  private async _readLogFile(): Promise<LogEntry[]> {
    if (!this.logFilePath) {
      throw new Error('Log file path not set during read attempt.');
    }
    try {
      const content = await fs.readFile(this.logFilePath, 'utf-8');
      const lines = content
        .trim()
        .split('\n')
        .filter((line) => line.length > 0);
      return lines
        .map((line) => {
          try {
            return JSON.parse(line) as LogEntry;
          } catch {
            return null;
          }
        })
        .filter((entry): entry is LogEntry => entry !== null);
    } catch (error) {
      const nodeError = error as NodeJS.ErrnoException;
      if (nodeError.code === 'ENOENT') {
        return [];
      }
      throw error;
    }
  }

  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    this.geminiDir = this.storage.getProjectTempDir();
    this.logFilePath = path.join(this.geminiDir, LOG_FILE_NAME);
    this.logFilePathFull = path.join(
      Storage.getGlobalLogsDir(),
      `${this.sessionId}.jsonl`,
    );

    try {
      await fs.mkdir(this.geminiDir, { recursive: true });

      // Migrate legacy logs.json if it exists
      const legacyPath = path.join(this.geminiDir, 'logs.json');
      try {
        const legacyContent = await fs.readFile(legacyPath, 'utf-8');
        const legacyLogs = JSON.parse(legacyContent);
        if (Array.isArray(legacyLogs) && legacyLogs.length > 0) {
          const jsonlContent =
            legacyLogs.map((entry) => JSON.stringify(entry)).join('\n') + '\n';
          await fs.appendFile(this.logFilePath, jsonlContent, 'utf-8');
          await fs.rename(legacyPath, legacyPath + '.migrated');
          debugLogger.debug('Migrated legacy logs.json to logs.jsonl');
        }
      } catch {
        // No legacy file or already migrated
      }

      const logs = await this._readLogFile();
      const logsDirFull = path.dirname(this.logFilePathFull);
      await fs.mkdir(logsDirFull, { recursive: true });

      const sessionLogs = logs.filter(
        (entry) => entry.sessionId === this.sessionId,
      );
      this.messageId =
        sessionLogs.length > 0
          ? Math.max(...sessionLogs.map((entry) => entry.messageId)) + 1
          : 0;

      this.initialized = true;
    } catch (err) {
      coreEvents.emitFeedback('error', 'Failed to initialize logger:', err);
      this.initialized = false;
    }
  }

  private async _appendLogEntry(entry: LogEntry): Promise<void> {
    if (!this.logFilePath) {
      throw new Error('Log file path not set during append attempt.');
    }
    await fs.appendFile(
      this.logFilePath,
      JSON.stringify(entry) + '\n',
      'utf-8',
    );
  }

  async getPreviousUserMessages(): Promise<string[]> {
    if (!this.initialized) return [];
    const logs = await this._readLogFile();
    return logs
      .filter((entry) => entry.type === MessageSenderType.USER)
      .sort((a, b) => {
        const dateA = new Date(a.timestamp).getTime();
        const dateB = new Date(b.timestamp).getTime();
        return dateB - dateA;
      })
      .map((entry) => entry.message);
  }

  async logMessage(type: MessageSenderType, message: string): Promise<void> {
    if (!this.initialized || this.sessionId === undefined) {
      debugLogger.debug('Logger not initialized. Cannot log message.');
      return;
    }

    const entry: LogEntry = {
      sessionId: this.sessionId,
      messageId: this.messageId++,
      type,
      message,
      timestamp: new Date().toISOString(),
    };

    try {
      await this._appendLogEntry(entry);
    } catch (error) {
      debugLogger.debug('Error appending to log file:', error);
    }
  }

  async logEventFull(
    eventType: EventType,
    payload: Record<string, unknown>,
  ): Promise<void> {
    if (!this.initialized || !this.logFilePathFull) {
      return;
    }

    const event: TerminaILogEvent = {
      version: '1.0',
      sessionId: this.sessionId!,
      timestamp: new Date().toISOString(),
      eventType,
      payload,
    };

    try {
      await fs.appendFile(
        this.logFilePathFull,
        JSON.stringify(event) + '\n',
        'utf-8',
      );
    } catch (err) {
      debugLogger.error(`Failed to write to full log file: ${err}`);
    }
  }

  private _checkpointPath(tag: string): string {
    if (!tag.length) {
      throw new Error('No checkpoint tag specified.');
    }
    if (!this.geminiDir) {
      throw new Error('Checkpoint file path not set.');
    }
    // Encode the tag to handle all special characters safely.
    const encodedTag = encodeTagName(tag);
    return path.join(this.geminiDir, `checkpoint-${encodedTag}.json`);
  }

  private async _getCheckpointPath(tag: string): Promise<string> {
    // 1. Check for the new encoded path first.
    const newPath = this._checkpointPath(tag);
    try {
      await fs.access(newPath);
      return newPath; // Found it, use the new path.
    } catch (error) {
      const nodeError = error as NodeJS.ErrnoException;
      if (nodeError.code !== 'ENOENT') {
        throw error; // A real error occurred, rethrow it.
      }
      // It was not found, so we'll check the old path next.
    }

    // 2. Fallback for backward compatibility: check for the old raw path.
    const oldPath = path.join(this.geminiDir!, `checkpoint-${tag}.json`);
    try {
      await fs.access(oldPath);
      return oldPath; // Found it, use the old path.
    } catch (error) {
      const nodeError = error as NodeJS.ErrnoException;
      if (nodeError.code !== 'ENOENT') {
        throw error; // A real error occurred, rethrow it.
      }
    }

    // 3. If neither path exists, return the new encoded path as the canonical one.
    return newPath;
  }

  async saveCheckpoint(checkpoint: Checkpoint, tag: string): Promise<void> {
    if (!this.initialized) {
      debugLogger.error(
        'Logger not initialized or checkpoint file path not set. Cannot save a checkpoint.',
      );
      return;
    }
    // Always save with the new encoded path.
    const path = this._checkpointPath(tag);
    try {
      await fs.writeFile(path, JSON.stringify(checkpoint, null, 2), 'utf-8');
    } catch (error) {
      debugLogger.error('Error writing to checkpoint file:', error);
    }
  }

  async loadCheckpoint(tag: string): Promise<Checkpoint> {
    if (!this.initialized) {
      debugLogger.error(
        'Logger not initialized or checkpoint file path not set. Cannot load checkpoint.',
      );
      return { history: [] };
    }

    const path = await this._getCheckpointPath(tag);
    try {
      const fileContent = await fs.readFile(path, 'utf-8');
      const parsedContent = JSON.parse(fileContent);

      // Handle legacy format (just an array of Content)
      if (Array.isArray(parsedContent)) {
        return { history: parsedContent as Content[] };
      }

      if (
        typeof parsedContent === 'object' &&
        parsedContent !== null &&
        'history' in parsedContent
      ) {
        return parsedContent as Checkpoint;
      }

      debugLogger.warn(
        `Checkpoint file at ${path} has an unknown format. Returning empty checkpoint.`,
      );
      return { history: [] };
    } catch (error) {
      const nodeError = error as NodeJS.ErrnoException;
      if (nodeError.code === 'ENOENT') {
        // This is okay, it just means the checkpoint doesn't exist in either format.
        return { history: [] };
      }
      debugLogger.error(
        `Failed to read or parse checkpoint file ${path}:`,
        error,
      );
      return { history: [] };
    }
  }

  async deleteCheckpoint(tag: string): Promise<boolean> {
    if (!this.initialized || !this.geminiDir) {
      debugLogger.error(
        'Logger not initialized or checkpoint file path not set. Cannot delete checkpoint.',
      );
      return false;
    }

    let deletedSomething = false;

    // 1. Attempt to delete the new encoded path.
    const newPath = this._checkpointPath(tag);
    try {
      await fs.unlink(newPath);
      deletedSomething = true;
    } catch (error) {
      const nodeError = error as NodeJS.ErrnoException;
      if (nodeError.code !== 'ENOENT') {
        debugLogger.error(
          `Failed to delete checkpoint file ${newPath}:`,
          error,
        );
        throw error; // Rethrow unexpected errors
      }
      // It's okay if it doesn't exist.
    }

    // 2. Attempt to delete the old raw path for backward compatibility.
    const oldPath = path.join(this.geminiDir, `checkpoint-${tag}.json`);
    if (newPath !== oldPath) {
      try {
        await fs.unlink(oldPath);
        deletedSomething = true;
      } catch (error) {
        const nodeError = error as NodeJS.ErrnoException;
        if (nodeError.code !== 'ENOENT') {
          debugLogger.error(
            `Failed to delete checkpoint file ${oldPath}:`,
            error,
          );
          throw error; // Rethrow unexpected errors
        }
        // It's okay if it doesn't exist.
      }
    }

    return deletedSomething;
  }

  async checkpointExists(tag: string): Promise<boolean> {
    if (!this.initialized) {
      throw new Error(
        'Logger not initialized. Cannot check for checkpoint existence.',
      );
    }
    let filePath: string | undefined;
    try {
      filePath = await this._getCheckpointPath(tag);
      // We need to check for existence again, because _getCheckpointPath
      // returns a canonical path even if it doesn't exist yet.
      await fs.access(filePath);
      return true;
    } catch (error) {
      const nodeError = error as NodeJS.ErrnoException;
      if (nodeError.code === 'ENOENT') {
        return false; // It truly doesn't exist in either format.
      }
      // A different error occurred.
      debugLogger.error(
        `Failed to check checkpoint existence for ${
          filePath ?? `path for tag "${tag}"`
        }:`,
        error,
      );
      throw error;
    }
  }

  close(): void {
    this.initialized = false;
    this.logFilePath = undefined;
    this.sessionId = undefined;
    this.messageId = 0;
  }
}
