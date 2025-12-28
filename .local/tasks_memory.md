# TASKS: Memory Optimization (Logger JSONL Migration)

This task list enables any LLM agent (including Flash) to implement the Logger
memory fix.

---

## Pre-Implementation Checklist

- [ ] Read
      [architecture_memory_optimization.md](file:///home/profharita/Code/terminaI/docs-terminai/architecture_memory_optimization.md)
- [ ] Review current
      [logger.ts](file:///home/profharita/Code/terminaI/packages/core/src/core/logger.ts)
      implementation

---

## Task 1: Update `LOG_FILE_NAME` constant

**File:** `packages/core/src/core/logger.ts` **Line:** ~16

```diff
- const LOG_FILE_NAME = 'logs.json';
+ const LOG_FILE_NAME = 'logs.jsonl';
```

---

## Task 2: Replace `_updateLogFile` with append-only write

**File:** `packages/core/src/core/logger.ts` **Lines:** 201-265

**Delete** the entire `_updateLogFile` method and replace with:

```typescript
private async _appendLogEntry(entry: LogEntry): Promise<void> {
  if (!this.logFilePath) {
    throw new Error('Log file path not set.');
  }
  await fs.appendFile(
    this.logFilePath,
    JSON.stringify(entry) + '\n',
    'utf-8'
  );
}
```

---

## Task 3: Update `logMessage` to use append

**File:** `packages/core/src/core/logger.ts` **Lines:** 279-307

Replace the body of `logMessage` with:

```typescript
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
```

---

## Task 4: Update `_readLogFile` for JSONL format

**File:** `packages/core/src/core/logger.ts` **Lines:** 107-148

Replace with streaming JSONL parser:

```typescript
private async _readLogFile(): Promise<LogEntry[]> {
  if (!this.logFilePath) {
    throw new Error('Log file path not set.');
  }
  try {
    const content = await fs.readFile(this.logFilePath, 'utf-8');
    const lines = content.trim().split('\n').filter(line => line.length > 0);
    return lines.map(line => {
      try {
        return JSON.parse(line) as LogEntry;
      } catch {
        return null;
      }
    }).filter((entry): entry is LogEntry => entry !== null);
  } catch (error) {
    const nodeError = error as NodeJS.ErrnoException;
    if (nodeError.code === 'ENOENT') {
      return [];
    }
    throw error;
  }
}
```

---

## Task 5: Add legacy migration in `initialize`

**File:** `packages/core/src/core/logger.ts` **Lines:** 161-199

Add before `this.initialized = true`:

```typescript
// Migrate legacy logs.json if it exists
const legacyPath = path.join(this.geminiDir, 'logs.json');
try {
  const legacyContent = await fs.readFile(legacyPath, 'utf-8');
  const legacyLogs = JSON.parse(legacyContent);
  if (Array.isArray(legacyLogs) && legacyLogs.length > 0) {
    // Convert to JSONL
    const jsonlContent =
      legacyLogs.map((entry) => JSON.stringify(entry)).join('\n') + '\n';
    await fs.appendFile(this.logFilePath, jsonlContent, 'utf-8');
    // Backup old file
    await fs.rename(legacyPath, legacyPath + '.migrated');
    debugLogger.debug('Migrated legacy logs.json to logs.jsonl');
  }
} catch {
  // No legacy file or already migrated - this is fine
}
```

---

## Task 6: Remove `this.logs` in-memory cache

**File:** `packages/core/src/core/logger.ts` **Line:** 98

```diff
- private logs: LogEntry[] = []; // In-memory cache
```

Update `getPreviousUserMessages` to read from file:

```typescript
async getPreviousUserMessages(): Promise<string[]> {
  if (!this.initialized) return [];
  const logs = await this._readLogFile();
  return logs
    .filter((entry) => entry.type === MessageSenderType.USER)
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .map((entry) => entry.message);
}
```

---

## Task 7: Update tests

**File:** `packages/core/src/core/logger.test.ts`

Update test assertions to:

- Expect JSONL format (one JSON object per line)
- Remove assumptions about in-memory `logs` array

---

## Verification Commands

```bash
# Build
cd /home/profharita/Code/terminaI
npm run build --workspace @terminai/core

# Run tests
npm run test --workspace @terminai/core -- --grep logger

# Manual verification
node -e "
const fs = require('fs');
const path = require('path');
const logPath = path.join(process.env.HOME, '.gemini/tmp/test/logs.jsonl');
// Stress test: write 1000 entries
for (let i = 0; i < 1000; i++) {
  fs.appendFileSync(logPath, JSON.stringify({test: i}) + '\\n');
}
console.log('Memory:', process.memoryUsage().heapUsed / 1024 / 1024, 'MB');
"
```

---

## ⚠️ CRITICAL GAPS IDENTIFIED (Paranoia Check)

### Task 8: Fix `initialize()` empty file creation

**File:** `packages/core/src/core/logger.ts` **Lines:** 182-184

Current code creates an empty `[]` JSON array. Change to create empty file:

```diff
- if (!fileExisted && this.logs.length === 0) {
-   await fs.writeFile(this.logFilePath, '[]', 'utf-8');
- }
+ // JSONL files don't need initialization - they can be empty
+ // fs.appendFile will create the file on first write
```

### Task 9: Update `close()` method

**File:** `packages/core/src/core/logger.ts` **Lines:** 516-522

Remove reference to `this.logs`:

```diff
  close(): void {
    this.initialized = false;
    this.logFilePath = undefined;
-   this.logs = [];
    this.sessionId = undefined;
    this.messageId = 0;
  }
```

### Task 10: Update `_backupCorruptedLogFile` (if keeping)

**File:** `packages/core/src/core/logger.ts` **Lines:** 150-159

Decide: Keep for corrupted JSONL handling, or remove entirely since JSONL is
more resilient.

### Task 11: Update test file `LOG_FILE_NAME` constant

**File:** `packages/core/src/core/logger.test.ts` **Line:** 35

```diff
- const LOG_FILE_NAME = 'logs.json';
+ const LOG_FILE_NAME = 'logs.jsonl';
```

### Task 12: Update test helper `readLogFile()`

**File:** `packages/core/src/core/logger.test.ts` **Lines:** 71-81

```typescript
async function readLogFile(): Promise<LogEntry[]> {
  try {
    const content = await fs.readFile(TEST_LOG_FILE_PATH, 'utf-8');
    const lines = content
      .trim()
      .split('\n')
      .filter((line) => line.length > 0);
    return lines.map((line) => JSON.parse(line) as LogEntry);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return [];
    }
    throw error;
  }
}
```

### Task 13: Update tests that check `logger['logs']` internal state

**File:** `packages/core/src/core/logger.test.ts`

Multiple tests access `logger['logs']` which will no longer exist. Search and
update:

- Line 177: `expect(newLogger['logs']).toEqual(existingLogs);`
- Line 204: `const initialLogCount = logger['logs'].length;`
- Line 280: `expect(logger['logs'].length).toBe(1);`
- Line 363: `expect(logger['logs'].length).toBe(initialLogCount);`
- Line 372: `// Log not added to in-memory cache`
- Line 792: `expect(logger['logs']).toEqual([]);`

**Fix:** Remove these assertions OR read from file instead.

### Task 14: Update concurrent write test expectations

**File:** `packages/core/src/core/logger.test.ts` **Lines:** 314-355

Concurrent writes will now behave differently:

- JSONL append is atomic per line
- No more "recalculated messageId" logic
- Each logger instance increments its own counter

**Consider:** May need to accept that messageIds can have gaps/duplicates in
concurrent scenarios, OR add a file lock.

---

## Success Criteria

1. ✅ `logs.jsonl` is created instead of `logs.json`
2. ✅ Memory stays flat during 10,000 log writes
3. ✅ Old `logs.json` files are migrated automatically
4. ✅ All `logger.test.ts` tests pass
5. ✅ CLI still shows history after restart
6. ✅ `close()` method works without `this.logs`
7. ✅ Concurrent write tests updated or documented as behavior change
