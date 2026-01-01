# Architecture: Memory Optimization (JSONL Migration)

## Overview

This document describes the refactoring of `Logger.ts` to fix a critical memory
leak inherited from Gemini CLI.

## Problem Statement

The current `Logger` class uses a **single JSON array** (`logs.json`) for
storing user message history. Every `logMessage()` call triggers:

1. Read entire file into memory
2. Parse JSON array
3. Push new entry
4. Stringify entire array
5. Write entire file

This is **O(N)** complexity where N = number of log entries. After ~1000
entries, memory usage becomes problematic. After ~10,000, the CLI crashes.

## Solution

Migrate from **JSON Array** to **JSONL (JSON Lines)**:

- Each log entry is a single line: `{...}\n`
- Writing is **O(1)**: `fs.appendFile()`
- Reading is streaming: process line-by-line

## Affected Files

### Primary Target

| File                                                                                | Change     | Reason                                                  |
| ----------------------------------------------------------------------------------- | ---------- | ------------------------------------------------------- |
| [logger.ts](file:///home/profharita/Code/terminaI/packages/core/src/core/logger.ts) | **MODIFY** | Core fix: replace `_updateLogFile` with `fs.appendFile` |

### Direct Consumers (Update Tests Only)

| File                                                                                          | Change     | Reason                              |
| --------------------------------------------------------------------------------------------- | ---------- | ----------------------------------- |
| [logger.test.ts](file:///home/profharita/Code/terminaI/packages/core/src/core/logger.test.ts) | **MODIFY** | Update tests to expect JSONL format |

### Interface Consumers (No Code Changes Required)

| File                                                                                                                 | Uses                               | Status           |
| -------------------------------------------------------------------------------------------------------------------- | ---------------------------------- | ---------------- |
| [useLogger.ts](file:///home/profharita/Code/terminaI/packages/cli/src/ui/hooks/useLogger.ts)                         | `new Logger()`                     | ✅ No change     |
| [slashCommandProcessor.ts](file:///home/profharita/Code/terminaI/packages/cli/src/ui/hooks/slashCommandProcessor.ts) | `new Logger()`                     | ✅ No change     |
| [useInputHistoryStore.ts](file:///home/profharita/Code/terminaI/packages/cli/src/ui/hooks/useInputHistoryStore.ts)   | `logger.getPreviousUserMessages()` | ✅ No change     |
| [AppContainer.tsx](file:///home/profharita/Code/terminaI/packages/cli/src/ui/AppContainer.tsx)                       | `logger` (via hook)                | ✅ No change     |
| [thinkingOrchestrator.ts](file:///home/profharita/Code/terminaI/packages/core/src/brain/thinkingOrchestrator.ts)     | `logger.logEventFull()`            | ✅ Already JSONL |
| [sessionEvaluator.ts](file:///home/profharita/Code/terminaI/packages/core/src/evaluation/sessionEvaluator.ts)        | `TerminaILogEvent` type            | ✅ No change     |

### Independent Systems (Not Affected)

| File                                                                                                                | Status                                 |
| ------------------------------------------------------------------------------------------------------------------- | -------------------------------------- |
| [chatRecordingService.ts](file:///home/profharita/Code/terminaI/packages/core/src/services/chatRecordingService.ts) | Uses own JSON files, not Logger        |
| `packages/evolution-lab/*`                                                                                          | Zero Logger dependencies               |
| `packages/a2a-server/*`                                                                                             | Uses separate `logger.ts` (pino-based) |

## Logger Methods Analysis

| Method                      | Current               | After Fix             | Notes                         |
| --------------------------- | --------------------- | --------------------- | ----------------------------- |
| `logMessage()`              | O(N) JSON rewrite     | **O(1) JSONL append** | THE FIX                       |
| `logEventFull()`            | O(1) JSONL append     | O(1)                  | Already correct               |
| `getPreviousUserMessages()` | O(N) in-memory filter | O(N) stream parse     | Same complexity, lower memory |
| `saveCheckpoint()`          | JSON write            | No change             | Infrequent, not a leak        |
| `loadCheckpoint()`          | JSON read             | No change             | Infrequent, not a leak        |

## Migration Strategy

1. Change file extension: `logs.json` → `logs.jsonl`
2. On initialization, detect legacy `logs.json`:
   - Read and convert to JSONL
   - Rename `logs.json` → `logs.json.bak`
3. All new writes use `fs.appendFile()`

## Verification

- Run existing `logger.test.ts` (update assertions for JSONL)
- Stress test: 10,000 log writes, memory should stay flat
