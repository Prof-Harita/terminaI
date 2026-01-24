# Windows AppContainer — Windows‑Side Execution Plan

**Date:** 2026-01-24  
**Purpose:** Concrete Windows-only steps to finish AppContainer readiness and
validate all Phase A–C behavior that cannot be verified on Linux.

---

## 1) Build & Install (Windows)

1. **Install build dependencies**
   - Visual Studio Build Tools (C++ workload) + Windows 10/11 SDK
   - Python 3.10+ (for build scripts)
2. **Install repo deps**
   - `npm install`
3. **Build native module**
   - `npm run build --workspace @terminai/cli`
   - `node-gyp rebuild` (or your existing native build script)
4. **Verify native load**
   - Run `terminai /doctor windows-appcontainer`
   - Expect: `Native module load ✅`, `AppContainer profile ✅`

---

## 2) Secure Pipe + ACL Validation

1. **Run doctor check**
   - `terminai /doctor windows-appcontainer`
2. **Validate results**
   - `Secure pipe ✅`
   - `Pipe ACL ✅`
   - `Workspace ACL ✅`
3. **If Pipe ACL fails**
   - Ensure you are not using `TERMINAI_UNSAFE_OPEN_PIPE=1`
   - Rebuild native module if the new `verifyPipeDacl` export is missing

---

## 3) Brain↔Hands End‑to‑End

1. **Ensure `agent-brain` exists**
   - `packages/cli/dist/agent-brain.js` must exist (built by `esbuild.config.js`)
2. **Run doctor handshake**
   - Expect `Brain↔Hands (real AppContainer) ✅`
3. **If handshake fails**
   - Check AppContainer profile exists
   - Check Node runtime ACL (BrokerServer will try to grant)
   - Ensure `TERMINAI_HANDSHAKE_TOKEN` is passed and broker is reachable

---

## 4) AMSI Validation

1. **Run doctor AMSI checks**
   - Expect `AMSI available ✅`
   - Expect `AMSI scan ✅`
   - Expect `AMSI block test ✅` (EICAR sample blocked)
2. **If AMSI block test fails**
   - Confirm AMSI is enabled on the machine
   - Verify no antivirus exclusions on the TerminAI process

---

## 5) Approval Flow (Hands‑Side)

1. **Run any command outside workspace**
   - Should prompt for approval (Level B)
2. **Run shell mode command**
   - Should prompt for approval + PIN (Level C)
3. **Verify PIN**
   - Default PIN is `000000` unless configured

---

## 6) Remaining Tests (Windows‑Only)

1. **Handshake tests**
   - `npm test -- packages/cli/src/runtime/__tests__/windows-appcontainer.test.ts`
   - Ensure `rejects invalid handshake token` passes
2. **Concurrency tests**
   - Ensure `handles concurrent requests` passes
3. **Full init integration test**
  - Broker start → secure pipe → brain spawn → hello → ping
   - Run with `TERMINAI_RUN_WINDOWS_INTEGRATION=1`

---

## 7) Prebuild & CI (Windows)

1. **Build `.node` prebuilds**
   - Run `native-prebuild-win32` GitHub Actions workflow (x64)
   - Arm64 requires separate runner or cross‑compile step
2. **Sign binaries**
3. **Publish optional deps**
   - `@terminai/native-win32-x64`
   - `@terminai/native-win32-arm64`
4. **Verify install**
   - `npm install -g @terminai/cli` on clean Windows VM
   - `terminai /doctor windows-appcontainer` passes

---

## 8) Release Readiness Checklist

- `terminai /doctor windows-appcontainer` all green
- Approvals enforced in Hands (B/C)
- AMSI blocks EICAR sample
- Pipe ACL verified
- Runtime banner shows AppContainer isolation
