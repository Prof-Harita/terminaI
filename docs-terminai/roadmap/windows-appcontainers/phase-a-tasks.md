# Phase A: Infrastructure — Implementation Tasks

> **Spec Reference**:
> [phase-a-infrastructure-spec.md](./phase-a-infrastructure-spec.md) (v1.1)  
> **Date**: 2026-01-23  
> **Scope**: W1 (Launch), W2 (Secure Pipe), W3 (IPC Correctness)  
> **Blocker Fixes Applied**: Native env-block, Native pipe server with DACL

---

## Implementation Checklist

### Phase 1: Foundation (Schema & Types)

- [ ] Task 1: Add `id` field to BrokerSchema requests
- [ ] Task 2: Add `id` field to BrokerSchema responses
- [ ] Task 3: Add HelloRequest/HelloResponse schemas
- [ ] Task 4: Add BrokerErrorCode enum with new error codes
- [ ] Task 5: Add BrokerSession interface

### Phase 2: Native Module Extensions (Blocker Fixes)

- [ ] Task 6: Implement `createAppContainerSandboxWithEnv` in native module
- [ ] Task 7: Export `createAppContainerSandboxWithEnv` in native.ts
- [ ] Task 8: Implement `SecurePipeServer` class in native module
- [ ] Task 9: Export `SecurePipeServer` interface in native.ts

### Phase 3: IPC Correctness (W3)

- [ ] Task 10: Implement request-ID tracking in BrokerClient
- [ ] Task 11: Add per-request timeout handling in BrokerClient
- [ ] Task 12: Echo request ID in BrokerServer responses
- [ ] Task 13: Add unit tests for request-ID matching

### Phase 4: Secure Pipe (W2)

- [ ] Task 14: Refactor BrokerServer to use SecurePipeServer
- [ ] Task 15: Generate handshake token in WindowsBrokerContext
- [ ] Task 16: Implement hello handshake validation in BrokerServer
- [ ] Task 17: Update BrokerClient to send hello on connect
- [ ] Task 18: Add DACL hard-fail with TERMINAI_UNSAFE_OPEN_PIPE escape hatch
- [ ] Task 19: Add unit tests for handshake flow

### Phase 5: Brain Launch (W1)

- [ ] Task 20: Create agent-brain.ts headless entrypoint
- [ ] Task 21: Add agent-brain bundle target to esbuild
- [ ] Task 22: Implement Brain spawn logic using
      `createAppContainerSandboxWithEnv`
- [ ] Task 23: Add startup coordination (wait for hello)
- [ ] Task 24: Add integration test for full initialization

### Phase 6: Testing & Polish

- [ ] Task 25: Add Windows-specific integration tests
- [ ] Task 26: Add doctor diagnostic for AppContainer
- [ ] Task 27: Update documentation

---

## Detailed Task Specifications

---

### Task 1: Add `id` field to BrokerSchema requests

**Objective**: Extend all request schemas with a required UUID `id` field.

**Prerequisites**: None

**Files to modify**:

- `packages/cli/src/runtime/windows/BrokerSchema.ts`

**Detailed steps**:

1. Add `BaseRequestSchema`:

```typescript
export const BaseRequestSchema = z.object({
  /** Unique request identifier (UUID v4) */
  id: z.string().uuid(),
});
```

2. Update each request schema to extend BaseRequestSchema instead of z.object.

**Definition of done**:

- [ ] All request schemas include `id: z.string().uuid()`
- [ ] TypeScript compiles: `npm run build -w @terminai/cli`

---

### Task 6: Implement `createAppContainerSandboxWithEnv` in native module

**Objective**: Extend native module to accept custom environment block for Brain
process.

**Prerequisites**: None (can parallel with schema tasks)

**Files to modify**:

- `packages/cli/native/appcontainer_manager.cpp`
- `packages/cli/native/appcontainer_manager.h`

**Detailed steps**:

1. Add new NAPI function that accepts 4 arguments:

```cpp
Napi::Value CreateAppContainerSandboxWithEnv(const Napi::CallbackInfo& info) {
    // Args: commandLine (string), workspacePath (string),
    //       enableInternet (bool), env (object)

    if (info.Length() < 4) {
        return Napi::Number::New(env, -4); // InvalidArguments
    }

    // Convert JS object to Windows environment block
    Napi::Object envObj = info[3].As<Napi::Object>();
    Napi::Array keys = envObj.GetPropertyNames();

    std::wstring envBlock;
    for (uint32_t i = 0; i < keys.Length(); i++) {
        std::string key = keys.Get(i).As<Napi::String>().Utf8Value();
        std::string val = envObj.Get(key).As<Napi::String>().Utf8Value();
        envBlock += Utf8ToWide(key) + L"=" + Utf8ToWide(val) + L'\0';
    }
    envBlock += L'\0'; // Double null terminator

    // Use in CreateProcessW
    BOOL success = CreateProcessW(
        ...,
        EXTENDED_STARTUPINFO_PRESENT | CREATE_UNICODE_ENVIRONMENT,
        (LPVOID)envBlock.c_str(),  // lpEnvironment - was nullptr!
        ...
    );
}
```

2. Register function in module init:

```cpp
exports.Set("createAppContainerSandboxWithEnv",
    Napi::Function::New(env, CreateAppContainerSandboxWithEnv));
```

**Definition of done**:

- [ ] Native function compiles on Windows
- [ ] Accepts env object and passes to CreateProcessW
- [ ] `npm run build:native` succeeds

**Potential issues**:

- Environment block must be properly null-terminated
- Unicode conversion must be correct

---

### Task 8: Implement `SecurePipeServer` class in native module

**Objective**: Create native pipe server with DACL and I/O operations.

**Prerequisites**: None

**Files to modify**:

- `packages/cli/native/pipe_security.cpp` — **[NEW]**
- `packages/cli/native/pipe_security.h` — **[NEW]**
- `packages/cli/native/binding.gyp`

**Detailed steps**:

1. Create `pipe_security.h`:

```cpp
#pragma once
#ifdef _WIN32
#include <napi.h>
#include <windows.h>

namespace TerminAI {

class SecurePipeServer : public Napi::ObjectWrap<SecurePipeServer> {
public:
    static Napi::Object Init(Napi::Env env, Napi::Object exports);
    SecurePipeServer(const Napi::CallbackInfo& info);
    ~SecurePipeServer();

private:
    Napi::Value Listen(const Napi::CallbackInfo& info);
    Napi::Value AcceptConnection(const Napi::CallbackInfo& info);
    Napi::Value Read(const Napi::CallbackInfo& info);
    Napi::Value Write(const Napi::CallbackInfo& info);
    Napi::Value Close(const Napi::CallbackInfo& info);
    Napi::Value IsConnected(const Napi::CallbackInfo& info);
    Napi::Value GetPipePath(const Napi::CallbackInfo& info);

    bool CreatePipeWithDACL();

    HANDLE hPipe = INVALID_HANDLE_VALUE;
    std::wstring pipeName;
    PSID appContainerSid = nullptr;
    bool connected = false;
};

} // namespace TerminAI
#endif
```

2. Implement `SecurePipeServer` in `pipe_security.cpp` with DACL setup as
   specified in spec section 3.2.4.

3. Update `binding.gyp`:

```json
{
  "sources": [
    "appcontainer_manager.cpp",
    "amsi_scanner.cpp",
    "pipe_security.cpp"
  ]
}
```

**Definition of done**:

- [ ] SecurePipeServer class compiles
- [ ] DACL is applied to pipe (visible via `accesschk.exe` or similar)
- [ ] Read/Write operations work
- [ ] `npm run build:native` succeeds

**Potential issues**:

- DACL APIs are complex
- Need to retrieve current user SID for broker access

---

### Task 14: Refactor BrokerServer to use SecurePipeServer

**Objective**: Replace Node.js net.Server with native SecurePipeServer.

**Prerequisites**: Task 8, Task 9

**Files to modify**:

- `packages/cli/src/runtime/windows/BrokerServer.ts`

**Detailed steps**:

1. Remove net.Server usage:

```typescript
// OLD
private server: net.Server | null = null;

// NEW
private securePipe: SecurePipeServer | null = null;
```

2. Update start method:

```typescript
async start(): Promise<void> {
  const appContainerSid = await getAppContainerSid();
  if (!appContainerSid) {
    throw new Error('AppContainer profile not created');
  }

  this.securePipe = createSecurePipeServer(
    this.pipePath,
    appContainerSid
  );

  if (!this.securePipe.listen()) {
    // Check for DACL failure
    if (!process.env.TERMINAI_UNSAFE_OPEN_PIPE) {
      throw new Error(
        'Failed to create secure pipe with DACL. ' +
        'Set TERMINAI_UNSAFE_OPEN_PIPE=true to bypass (dev only).'
      );
    }
  }

  // Start read loop
  this.startReadLoop();
}
```

3. Implement read loop using native read():

```typescript
private async startReadLoop(): Promise<void> {
  while (this.securePipe?.isConnected()) {
    const message = await this.securePipe.read();
    if (message === null) break;
    this.handleMessage(message);
  }
}
```

**Definition of done**:

- [ ] BrokerServer uses SecurePipeServer
- [ ] DACL is enforced (test: connection from another process fails)
- [ ] Read/write operations work correctly

---

### Task 20: Create agent-brain.ts headless entrypoint

**Objective**: Create dedicated Brain runtime without UI dependencies.

**Prerequisites**: Task 17

**Files to modify**:

- `packages/cli/src/runtime/windows/agent-brain.ts` — **[NEW]**

**Detailed steps**:

1. Create minimal headless entrypoint:

```typescript
/**
 * Agent Brain Entrypoint for Windows AppContainer
 *
 * This is a DEDICATED HEADLESS RUNTIME:
 * - Connects to broker pipe
 * - Authenticates via handshake
 * - Runs agent loop (relays tool execution)
 * - NO UI/TTY assumptions
 */

import { BrokerClient } from './BrokerClient.js';

async function main(): Promise<void> {
  const pipePath = process.env.TERMINAI_PIPE_PATH;
  const workspace = process.env.TERMINAI_WORKSPACE;

  if (!pipePath) {
    console.error('[Brain] TERMINAI_PIPE_PATH not set');
    process.exit(1);
  }

  console.log('[Brain] Starting headless runtime...');
  console.log('[Brain] Pipe:', pipePath);
  console.log('[Brain] Workspace:', workspace);

  const client = new BrokerClient({ pipePath });

  try {
    await client.connect();
    console.log('[Brain] Connected and authenticated');

    // Verify connection
    const ping = await client.ping();
    console.log('[Brain] Ping OK:', ping);

    // TODO: In future, run agent event loop here
    console.log('[Brain] Waiting for requests...');

    // Keep alive
    await new Promise(() => {});
  } catch (error) {
    console.error('[Brain] Fatal:', error);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('[Brain] Unhandled:', err);
  process.exit(1);
});
```

**Definition of done**:

- [ ] Entrypoint has no UI/TTY dependencies
- [ ] Reads config from environment variables
- [ ] Connects and authenticates successfully

---

### Task 22: Implement Brain spawn logic using `createAppContainerSandboxWithEnv`

**Objective**: Spawn Brain with handshake token via environment.

**Prerequisites**: Task 6, Task 7, Task 15, Task 21

**Files to modify**:

- `packages/cli/src/runtime/windows/WindowsBrokerContext.ts`

**Detailed steps**:

1. Update spawn logic:

```typescript
private async spawnBrain(): Promise<void> {
  const brainPath = this.resolveBrainPath();
  const nodeExe = process.execPath;
  const commandLine = `"${nodeExe}" "${brainPath}"`;

  // Build environment with handshake token
  const brainEnv: Record<string, string> = {
    TERMINAI_HANDSHAKE_TOKEN: this.handshakeToken,
    TERMINAI_PIPE_PATH: this.server.pipePath,
    TERMINAI_WORKSPACE: this.workspacePath,
  };

  // Add inherited environment (selective)
  const inheritedVars = ['PATH', 'SYSTEMROOT', 'TEMP', 'TMP'];
  for (const key of inheritedVars) {
    if (process.env[key]) {
      brainEnv[key] = process.env[key]!;
    }
  }

  const { createAppContainerSandboxWithEnv } = await import('./native.js');

  const pid = createAppContainerSandboxWithEnv(
    commandLine,
    this.workspacePath,
    true, // enableInternet
    brainEnv
  );

  if (pid < 0) {
    throw new Error(this.getErrorMessage(pid));
  }

  this.brainPid = pid;
  console.log(`[Broker] Spawned Brain PID ${pid}`);
}
```

**Definition of done**:

- [ ] Brain receives environment variables
- [ ] Handshake token is in environment (verify via Process Explorer)
- [ ] Token is NOT in command line arguments

---

## Summary

This task breakdown provides **27 tasks** organized into 6 phases:

1. **Foundation (5 tasks)**: Schema and type definitions
2. **Native Extensions (4 tasks)**: Env-block spawn, SecurePipeServer with DACL
3. **IPC Correctness (4 tasks)**: Request-ID matching for concurrency
4. **Secure Pipe (6 tasks)**: Native pipe integration, handshake authentication
5. **Brain Launch (5 tasks)**: Headless entrypoint, spawn with env
6. **Testing & Polish (3 tasks)**: Integration tests, doctor, docs

**Key Changes from v1.0:**

- Added Task 6-9 for native module extensions (blocker fixes)
- Updated Task 20-22 to use new native APIs
- Added Task 18 for DACL hard-fail with escape hatch

**Does this sequence make sense? Any tasks missing?**
