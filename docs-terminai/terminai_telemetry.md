# Telemetry Removal Architecture

> **Purpose:** How TerminaI removed external telemetry from the Gemini CLI
> fork  
> **Privacy Promise:** No data leaves your machine. No usage statistics. No
> phone home.  
> **Status:** Designed, pending implementation  
> **Last Updated:** 2026-01-16

---

## Executive Summary

TerminaI's core value proposition is **absolute privacy**. The only network
traffic the application makes is to your chosen LLM provider—and even that can
be eliminated by using a local model.

This document details the complete removal of all external telemetry from the
upstream Gemini CLI, covering:

1. **Clearcut Logger** — Google's analytics service (sends to
   `play.googleapis.com`)
2. **GCP Exporters** — Cloud Trace, Cloud Monitoring, Cloud Logging
3. **Remote OTLP Endpoints** — Configurable remote telemetry collectors
4. **Telemetry Scripts** — GCP telemetry setup automation

**Local telemetry is preserved** for debugging (file-based logs, local Jaeger,
console output).

---

## What Was Removed

### 1. Clearcut Logger (Google Analytics)

**Location:** `packages/core/src/telemetry/clearcut-logger/`

Clearcut is Google's internal analytics service. The upstream Gemini CLI sends
usage events (session starts, tool calls, API requests, etc.) to
`play.googleapis.com`.

**Files Deleted:**

- clearcut-logger.ts — ~1500 lines of event logging
- event-metadata-key.ts — Event key enums
- clearcut-logger.test.ts — Tests

**Interim State:** Prior to deletion, the singleton was disabled:

```typescript
// clearcut-logger.ts, line 238-241
static getInstance(_config?: Config): ClearcutLogger | undefined {
  // Disabled for sovereign fork
  return undefined;
}
```

This interim state is **not sufficient** because:

- The code remains in the bundle (supply chain risk)
- The URL `https://play.googleapis.com/log` is still in source
- Import statements and logging calls create maintenance burden

**Final State:** Complete deletion of the `clearcut-logger/` directory.

---

### 2. GCP Exporters (Cloud Services)

**Location:** `packages/core/src/telemetry/gcp-exporters.ts`

These classes export telemetry directly to Google Cloud services using service
account credentials or ADC (Application Default Credentials).

**Classes Removed:** | Class | Sends To | Data Type |
|-------|----------|-----------| | `GcpTraceExporter` | Cloud Trace |
Distributed traces | | `GcpMetricExporter` | Cloud Monitoring | Metrics
(counters, histograms) | | `GcpLogExporter` | Cloud Logging | Structured logs |

**Files Deleted:**

- gcp-exporters.ts
- gcp-exporters.test.ts

---

### 3. TelemetryTarget.GCP Enum

**Location:** `packages/core/src/telemetry/index.ts`

The `TelemetryTarget` enum included a `GCP` option that enabled direct-to-cloud
export.

**Before:**

```typescript
export enum TelemetryTarget {
  GCP = 'gcp',
  LOCAL = 'local',
}
```

**After:**

```typescript
export enum TelemetryTarget {
  LOCAL = 'local',
}
```

---

### 4. Remote OTLP Endpoint Validation

**Location:** `packages/core/src/telemetry/sdk.ts`

The SDK previously allowed any OTLP endpoint URL, enabling data to be sent to
remote collectors.

**Change:** Added localhost-only validation:

```typescript
function isLocalEndpoint(endpoint: string): boolean {
  try {
    const url = new URL(endpoint);
    return (
      url.hostname === 'localhost' ||
      url.hostname === '127.0.0.1' ||
      url.hostname === '::1'
    );
  } catch {
    return false;
  }
}

// In initializeTelemetry():
if (otlpEndpoint && !isLocalEndpoint(otlpEndpoint)) {
  debugLogger.warn(
    'Remote OTLP endpoints are not supported in TerminaI. ' +
      'Telemetry will only be sent locally. ' +
      'Set otlpEndpoint to localhost or remove it.',
  );
  return; // Telemetry disabled
}
```

---

### 5. GCP Telemetry Script

**Location:** `scripts/telemetry_gcp.js`

This script automated the setup of an OpenTelemetry collector configured to
forward data to Google Cloud.

**File Deleted:** telemetry_gcp.js

**Updated:** [telemetry.js](../scripts/telemetry.js) — Removed `gcp` target
handling

---

### 6. Dependencies Removed

**Location:** `packages/core/package.json`

| Package                                                 | Version | Purpose                   | Status     |
| ------------------------------------------------------- | ------- | ------------------------- | ---------- |
| `@google-cloud/logging`                                 | ^11.2.1 | Cloud Logging client      | **REMOVE** |
| `@google-cloud/opentelemetry-cloud-monitoring-exporter` | ^0.21.0 | Cloud Monitoring exporter | **REMOVE** |
| `@google-cloud/opentelemetry-cloud-trace-exporter`      | ^3.0.0  | Cloud Trace exporter      | **REMOVE** |

> **Note:** `google-auth-library` is **kept** — it's required for Gemini API
> authentication, not telemetry.

---

## What Was Preserved

### Local Telemetry (For Debugging)

TerminaI preserves the ability to capture telemetry locally for debugging
purposes:

| Exporter                   | Output                       | Use Case                 |
| -------------------------- | ---------------------------- | ------------------------ |
| `FileSpanExporter`         | `.terminai/telemetry.log`    | Local trace debugging    |
| `FileLogExporter`          | `.terminai/telemetry.log`    | Local log capture        |
| `FileMetricExporter`       | `.terminai/telemetry.log`    | Local metrics            |
| `ConsoleSpanExporter`      | stdout                       | Development debugging    |
| `ConsoleLogRecordExporter` | stdout                       | Development debugging    |
| `ConsoleMetricExporter`    | stdout                       | Development debugging    |
| Local OTLP (Jaeger)        | `localhost:4317` → Jaeger UI | Full trace visualization |

### Local Telemetry Setup

```bash
npm run telemetry -- --target=local
```

This downloads Jaeger and `otelcol-contrib` to
`~/.terminai/tmp/<hash>/otel/bin/` and provides:

- Jaeger UI at `http://localhost:16686`
- Collector logs at `~/.terminai/tmp/<hash>/otel/collector.log`

---

## Files Modified

### Core Telemetry

| File                                                    | Change                                                                     |
| ------------------------------------------------------- | -------------------------------------------------------------------------- |
| [sdk.ts](../packages/core/src/telemetry/sdk.ts)         | Remove GCP imports, add localhost validation, remove Clearcut shutdown     |
| [loggers.ts](../packages/core/src/telemetry/loggers.ts) | Remove all `ClearcutLogger.getInstance()?.` calls                          |
| [index.ts](../packages/core/src/telemetry/index.ts)     | Remove GCP exports, remove Clearcut exports, simplify TelemetryTarget enum |
| [config.ts](../packages/core/src/telemetry/config.ts)   | Remove GCP target parsing                                                  |

### Settings Schema

| File                                                                    | Change                           |
| ----------------------------------------------------------------------- | -------------------------------- |
| [schema.ts (core)](../packages/core/src/config/settings/schema.ts)      | Remove `gcp` from target options |
| [settingsSchema.ts (cli)](../packages/cli/src/config/settingsSchema.ts) | Remove `gcp` from target options |

### Scripts

| File                                    | Change                       |
| --------------------------------------- | ---------------------------- |
| [telemetry.js](../scripts/telemetry.js) | Remove `gcp` target handling |

### Package.json

| File                                                 | Change                             |
| ---------------------------------------------------- | ---------------------------------- |
| [package.json (core)](../packages/core/package.json) | Remove 3 Google Cloud dependencies |

---

## Documentation Updated

### FORK_ZONES.md

The file already correctly classifies telemetry as SKIP:

```markdown
## ⚪ SKIP — Irrelevant to TerminaI

| Category         | Examples                                      |
| ---------------- | --------------------------------------------- |
| Google telemetry | `clearcut/*`, proprietary telemetry endpoints |
```

**Update:** Add explicit note that telemetry code is now **deleted**, not just
skipped during sync.

---

### UPSTREAM_SCRUB_RULES.md

Already correct:

```markdown
| Google-internal (telemetry, etc.) | ⚪ SKIP | Ignore |
```

---

### docs/cli/telemetry.md (Upstream Doc)

This file is 794 lines of upstream telemetry documentation that describes GCP
setup, Clearcut, etc.

**Action:** Replace entirely with a minimal local-only telemetry guide or
delete.

The new `docs-terminai/terminai_telemetry.md` (this file) replaces it for
TerminaI.

---

### README.md

Already correct:

```markdown
| Privacy | Varies. | Zero telemetry. Works great with local-hosted models |
```

---

## Verification Plan

### Automated Tests

1. **Unit Tests:**
   - Verify `ClearcutLogger` module is not importable
   - Verify `GcpTraceExporter` etc. are not importable
   - Verify `TelemetryTarget.GCP` does not exist
   - Verify non-localhost OTLP endpoints are rejected

2. **Build Verification:**

   ```bash
   turbo run build
   npm test
   # Ensure no reference errors for deleted modules
   ```

3. **Bundle Analysis:**
   ```bash
   grep -r "play.googleapis.com" bundle/
   grep -r "cloud-trace" bundle/
   grep -r "cloud-monitoring" bundle/
   grep -r "cloud-logging" bundle/
   # Should return zero results
   ```

### Network Traffic Verification

1. **tcpdump Method:**

   ```bash
   # In one terminal:
   sudo tcpdump -i any host googleapis.com or host play.googleapis.com -w capture.pcap

   # In another terminal:
   terminai
   # Use the CLI normally

   # Analyze:
   tcpdump -r capture.pcap
   # Should show zero packets
   ```

2. **DNS Verification:**
   ```bash
   sudo tcpdump -i any port 53 and host googleapis.com
   # Should show no DNS lookups during normal operation
   ```

### Manual Verification

1. Enable local file telemetry:

   ```json
   {
     "telemetry": {
       "enabled": true,
       "target": "local",
       "outfile": ".terminai/telemetry.log"
     }
   }
   ```

2. Run CLI with `--debug` flag
3. Send some prompts
4. Verify `.terminai/telemetry.log` contains local traces
5. Verify no network connections to Google endpoints

---

## Migration Notes

### For Users with GCP Telemetry Configured

If a user has this in their `settings.json`:

```json
{
  "telemetry": {
    "enabled": true,
    "target": "gcp"
  }
}
```

**Behavior:** The CLI will log a warning and telemetry will be disabled:

```
Warning: GCP telemetry target is no longer supported.
Telemetry disabled. Use target: "local" for file-based logging.
```

### For Users with Remote OTLP Endpoints

If a user has configured a remote endpoint:

```json
{
  "telemetry": {
    "enabled": true,
    "otlpEndpoint": "https://otel.example.com:4317"
  }
}
```

**Behavior:** The CLI will log a warning and telemetry will be disabled:

```
Warning: Remote OTLP endpoints are not supported in TerminaI.
Telemetry will only be sent locally. Set otlpEndpoint to localhost or remove it.
```

---

## Security Rationale

### Why Full Deletion vs. Disabling?

1. **Supply Chain Security:** Dead code in the bundle is attack surface
2. **Dependency Reduction:** Fewer packages = fewer CVEs to track
3. **Audit Clarity:** "No telemetry code" is easier to verify than "disabled
   telemetry code"
4. **Trust Signal:** Users can verify the claim via source inspection

### What About Future Re-enablement?

If TerminaI ever needs to re-introduce telemetry (opt-in, local-only, etc.), it
will be:

1. Documented publicly before implementation
2. Opt-in only (never default-on)
3. Local-first (no remote transmission without explicit configuration)
4. Auditable (open source, verifiable)

---

## Open Questions

### A2A Server GCS Persistence

The `packages/a2a-server/src/persistence/gcs.ts` file uses
`@google-cloud/storage` for cloud persistence. This is **separate from
telemetry** and is:

- Opt-in (user must configure GCS bucket)
- Not enabled by default
- Only used when running A2A server with cloud persistence

**Recommendation:** Document in A2A server docs, not telemetry removal.

### Genkit Telemetry

The `scripts/telemetry_genkit.js` script starts Genkit which may have its own
telemetry.

**Status:** Genkit is not used in production TerminaI. The script exists for
development experimentation only.

**Recommendation:** Remove `telemetry_genkit.js` for clarity.

---

## Summary

| Category                  | Removed               | Preserved |
| ------------------------- | --------------------- | --------- |
| Clearcut Logger           | ✅ Deleted            | —         |
| GCP Exporters             | ✅ Deleted            | —         |
| GCP Telemetry Script      | ✅ Deleted            | —         |
| Remote OTLP               | ✅ Blocked            | —         |
| TelemetryTarget.GCP       | ✅ Removed            | —         |
| Google Cloud Dependencies | ✅ 3 packages removed | —         |
| File-based Telemetry      | —                     | ✅ Works  |
| Console Telemetry         | —                     | ✅ Works  |
| Local Jaeger              | —                     | ✅ Works  |

**Total Lines Removed:** ~2000+ (including tests)  
**Dependencies Removed:** 3  
**Network Endpoints Blocked:** 2+ (googleapis.com domains)

---

## Changelog

| Date       | Author      | Change                             |
| ---------- | ----------- | ---------------------------------- |
| 2026-01-16 | Antigravity | Initial architecture specification |
