# Logging & Analysis Architecture

> **Objective**: Capture complete interaction logs and provide an on-demand
> analysis tool that synthesizes insights for continuous improvement.

---

## Overview

| Component             | Status    | Purpose                                  |
| --------------------- | --------- | ---------------------------------------- |
| **Full Local Logs**   | 🆕 New    | Capture every event to JSONL             |
| **Log Analysis Tool** | 🆕 New    | Synthesize insights on-demand or daily   |
| **Cloud Telemetry**   | 🔮 Future | Anonymized telemetry to TerminaI servers |

> [!IMPORTANT] **Regression Fix**: This architecture standardizes on the
> `~/.terminai/` directory (replacing legacy `~/.gemini/`). This migration was
> the root cause of the recent logging "loss" (regression on Dec 22nd). By
> explicitly defining the path in this spec, we prevent future location
> confusion.

---

## Part 1: Full Local Logs

### What Already Exists

| Component       | File                                        | Current Behavior                                  |
| --------------- | ------------------------------------------- | ------------------------------------------------- |
| `Logger` class  | `packages/core/src/core/logger.ts`          | Stores user messages to `logs.json`               |
| OTEL Telemetry  | `packages/core/src/telemetry/loggers.ts`    | 40+ event types (tool calls, API responses, etc.) |
| History Tracker | `packages/core/src/brain/historyTracker.ts` | Tracks `ActionOutcome` and `ApproachOutcome`      |

### What's Missing

1. **Model responses** — not logged locally
2. **Reasoning traces** — framework selection, advisor proposals
3. **Approval decisions** — allow/deny/cancel with mode context
4. **Error context** — full stack traces with surrounding events
5. **Unified format** — events scattered across multiple systems

### Design

#### Event Schema

```typescript
interface TerminaILogEvent {
  version: '1.0';
  sessionId: string;
  timestamp: string; // ISO 8601
  eventType: EventType;
  payload: Record<string, unknown>;
}

type EventType =
  | 'user_prompt' // User input
  | 'model_response' // Agent output (full text)
  | 'thought' // Reasoning trace (framework selection, advisor)
  | 'tool_call' // Tool invocation (name, args, duration)
  | 'tool_result' // Tool output (success/failure, result)
  | 'approval' // Approval decision (allow/deny, mode)
  | 'error' // Error with stack trace
  | 'session_start' // Session metadata
  | 'session_end'; // Session summary
```

#### Storage

| Setting       | Value                                           |
| ------------- | ----------------------------------------------- |
| **Location**  | `~/.terminai/logs/<session_id>.jsonl`           |
| **Format**    | JSON Lines (one event per line)                 |
| **Retention** | 7 days (configurable via `logs.retention.days`) |
| **Pruning**   | On CLI startup                                  |

#### Files to Modify

| File                                              | Change                                         | Effort |
| ------------------------------------------------- | ---------------------------------------------- | ------ |
| `packages/core/src/core/logger.ts`                | Add `logEvent(event: TerminaILogEvent)` method | Low    |
| `packages/cli/src/ui/hooks/useGeminiStream.ts`    | Log `model_response`, `approval` events        | Low    |
| `packages/core/src/brain/thinkingOrchestrator.ts` | Log `thought` events                           | Low    |
| `packages/cli/src/gemini.tsx`                     | Prune old logs on startup                      | Low    |
| `packages/cli/src/config/settingsSchema.ts`       | Add `logs.retention.days`                      | Low    |

---

## Part 2: Log Analysis Tool

### What Already Exists

| Component           | File                                        | Current Behavior                               |
| ------------------- | ------------------------------------------- | ---------------------------------------------- |
| `historyTracker.ts` | `packages/core/src/brain/historyTracker.ts` | Computes success rates, confidence adjustments |
| Slash command infra | `packages/cli/src/commands/`                | Pattern for adding `/evaluate`                 |

### Design

#### Trigger Modes

| Mode                 | Setting                                | Behavior                                              |
| -------------------- | -------------------------------------- | ----------------------------------------------------- |
| **Manual**           | (default)                              | Run `/evaluate` anytime                               |
| **After N sessions** | `evaluation.autoTrigger.afterSessions` | Auto-run after N sessions                             |
| **Daily**            | `evaluation.autoTrigger.daily`         | Run once per day (on first CLI launch after midnight) |
| **On exit**          | `evaluation.autoTrigger.onExit`        | Run when CLI exits                                    |

#### Evaluation Dimensions

| Dimension      | Question                  | Signals                      |
| -------------- | ------------------------- | ---------------------------- |
| **Outcome**    | Did we solve the problem? | Task completion, no cancel   |
| **Efficiency** | How many steps?           | Step count, wasted calls     |
| **Failures**   | What broke and why?       | Error types, root cause      |
| **Recovery**   | Did we self-heal?         | Retry success, config offers |
| **Reasoning**  | Was the approach correct? | Framework accuracy           |

#### Insight Output

The tool produces a **self-sufficient synthesis** with embedded evidence:

```typescript
interface Insight {
  // Metadata
  generatedAt: string;
  sessionsAnalyzed: number;
  timeRange: { from: string; to: string };

  // The ONE highest-impact finding
  topIssue: {
    component: string; // e.g., "PACLoop", "edit_file"
    pattern: string; // e.g., "Verification fails on large files"
    frequency: number; // Sessions affected
    impact: 'high' | 'medium' | 'low';
    rootCause: string; // LLM diagnosis
    suggestedFix: string; // Actionable recommendation
    evidence: Evidence[]; // Log snippets proving the pattern
  };

  // Summary stats
  health: {
    successRate: number;
    avgSteps: number;
    errorRate: number;
    recoveryRate: number;
  };
}

interface Evidence {
  sessionId: string;
  timestamp: string;
  eventType: string;
  snippet: string; // Relevant portion of the event
}
```

#### Storage

| Artifact        | Location                            |
| --------------- | ----------------------------------- |
| Markdown Report | `~/.terminai/evaluations/<date>.md` |

#### Files Created

| File                                               | Purpose                   |
| -------------------------------------------------- | ------------------------- |
| `packages/core/src/evaluation/sessionEvaluator.ts` | Core eval logic & reports |
| `packages/cli/src/ui/commands/evaluateCommand.ts`  | `/evaluate` slash command |

---

## Part 3: Cloud Telemetry (Future)

### Scope

- **Setting**: `telemetry.terminaiCloud.enabled` (default: `false`)
- **Data**: Anonymized insights only (never raw prompts/responses)
- **Endpoint**: TBD (`https://telemetry.terminai.org/v1/ingest`)

### Implementation Notes

Reuse existing OTEL infrastructure in `packages/core/src/telemetry/sdk.ts`:

- Add TerminaI Cloud exporter when enabled
- Anonymize before export (strip PII, file contents)

---

## Settings Schema

```json
{
  "logs": {
    "retention": {
      "days": 7
    }
  },
  "evaluation": {
    "autoTrigger": {
      "afterSessions": null,
      "daily": true,
      "onExit": false
    }
  },
  "telemetry": {
    "terminaiCloud": {
      "enabled": false
    }
  }
}
```

---

## Summary

| What                  | Status         | Files                                                        |
| --------------------- | -------------- | ------------------------------------------------------------ |
| Event logging         | 🆕 New         | `logger.ts`, `useGeminiStream.ts`, `thinkingOrchestrator.ts` |
| 7-day retention       | 🆕 New         | `gemini.tsx` (startup pruning)                               |
| `/evaluate` command   | ✅ Implemented | `ui/commands/evaluateCommand.ts`                             |
| Session evaluator     | ✅ Implemented | `evaluation/sessionEvaluator.ts`                             |
| Auto-trigger settings | 🆕 New         | `settingsSchema.ts`                                          |
| Cloud telemetry       | 🔮 Future      | `sdk.ts`                                                     |
