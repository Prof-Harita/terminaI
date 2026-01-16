/**
 * @license
 * Copyright 2025 Google LLC
 * Portions Copyright 2025 TerminaI Authors
 * SPDX-License-Identifier: Apache-2.0
 */

import type { LogRecord } from '@opentelemetry/api-logs';
import { logs } from '@opentelemetry/api-logs';
import type { Config } from '../config/config.js';
import { SERVICE_NAME } from './constants.js';
import {
  EVENT_API_ERROR,
  EVENT_API_RESPONSE,
  EVENT_TOOL_CALL,
} from './types.js';
import type {
  ApiErrorEvent,
  ApiRequestEvent,
  ApiResponseEvent,
  FileOperationEvent,
  IdeConnectionEvent,
  StartSessionEvent,
  ToolCallEvent,
  UserPromptEvent,
  FlashFallbackEvent,
  NextSpeakerCheckEvent,
  LoopDetectedEvent,
  LoopDetectionDisabledEvent,
  SlashCommandEvent,
  ConversationFinishedEvent,
  ChatCompressionEvent,
  MalformedJsonResponseEvent,
  InvalidChunkEvent,
  ContentRetryEvent,
  ContentRetryFailureEvent,
  RipgrepFallbackEvent,
  ToolOutputTruncatedEvent,
  ModelRoutingEvent,
  ExtensionDisableEvent,
  ExtensionEnableEvent,
  ExtensionUninstallEvent,
  ExtensionInstallEvent,
  ModelSlashCommandEvent,
  SmartEditStrategyEvent,
  SmartEditCorrectionEvent,
  AgentStartEvent,
  AgentFinishEvent,
  RecoveryAttemptEvent,
  WebFetchFallbackAttemptEvent,
  ExtensionUpdateEvent,
  LlmLoopCheckEvent,
  HookCallEvent,
  StartupStatsEvent,
} from './types.js';
import {
  recordApiErrorMetrics,
  recordToolCallMetrics,
  recordChatCompressionMetrics,
  recordFileOperationMetric,
  recordInvalidChunk,
  recordContentRetry,
  recordContentRetryFailure,
  recordModelRoutingMetrics,
  recordModelSlashCommand,
  getConventionAttributes,
  recordTokenUsageMetrics,
  recordApiResponseMetrics,
  recordAgentRunMetrics,
  recordRecoveryAttemptMetrics,
  recordLinesChanged,
  recordHookCallMetrics,
} from './metrics.js';
import { bufferTelemetryEvent } from './sdk.js';
import type { UiEvent } from './uiTelemetry.js';
import { uiTelemetryService } from './uiTelemetry.js';

export function logCliConfiguration(
  config: Config,
  event: StartSessionEvent,
): void {
  bufferTelemetryEvent(() => {
    const logger = logs.getLogger(SERVICE_NAME);
    const logRecord: LogRecord = {
      body: event.toLogBody(),
      attributes: event.toOpenTelemetryAttributes(config),
    };
    logger.emit(logRecord);
  });
}

export function logUserPrompt(config: Config, event: UserPromptEvent): void {
  bufferTelemetryEvent(() => {
    const logger = logs.getLogger(SERVICE_NAME);

    const logRecord: LogRecord = {
      body: event.toLogBody(),
      attributes: event.toOpenTelemetryAttributes(config),
    };
    logger.emit(logRecord);
  });
}

export function logToolCall(config: Config, event: ToolCallEvent): void {
  const uiEvent = {
    ...event,
    'event.name': EVENT_TOOL_CALL,
    'event.timestamp': new Date().toISOString(),
  } as UiEvent;
  uiTelemetryService.addEvent(uiEvent);
  bufferTelemetryEvent(() => {
    const logger = logs.getLogger(SERVICE_NAME);
    const logRecord: LogRecord = {
      body: event.toLogBody(),
      attributes: event.toOpenTelemetryAttributes(config),
    };
    logger.emit(logRecord);
    recordToolCallMetrics(config, event.duration_ms, {
      function_name: event.function_name,
      success: event.success,
      decision: event.decision,
      tool_type: event.tool_type,
    });

    if (event.metadata) {
      const added = event.metadata['model_added_lines'];
      if (typeof added === 'number' && added > 0) {
        recordLinesChanged(config, added, 'added', {
          function_name: event.function_name,
        });
      }
      const removed = event.metadata['model_removed_lines'];
      if (typeof removed === 'number' && removed > 0) {
        recordLinesChanged(config, removed, 'removed', {
          function_name: event.function_name,
        });
      }
    }
  });
}

export function logToolOutputTruncated(
  config: Config,
  event: ToolOutputTruncatedEvent,
): void {
  bufferTelemetryEvent(() => {
    const logger = logs.getLogger(SERVICE_NAME);
    const logRecord: LogRecord = {
      body: event.toLogBody(),
      attributes: event.toOpenTelemetryAttributes(config),
    };
    logger.emit(logRecord);
  });
}

export function logFileOperation(
  config: Config,
  event: FileOperationEvent,
): void {
  bufferTelemetryEvent(() => {
    const logger = logs.getLogger(SERVICE_NAME);
    const logRecord: LogRecord = {
      body: event.toLogBody(),
      attributes: event.toOpenTelemetryAttributes(config),
    };
    logger.emit(logRecord);

    recordFileOperationMetric(config, {
      operation: event.operation,
      lines: event.lines,
      mimetype: event.mimetype,
      extension: event.extension,
      programming_language: event.programming_language,
    });
  });
}

export function logApiRequest(config: Config, event: ApiRequestEvent): void {
  bufferTelemetryEvent(() => {
    const logger = logs.getLogger(SERVICE_NAME);
    logger.emit(event.toLogRecord(config));
    logger.emit(event.toSemanticLogRecord(config));
  });
}

export function logFlashFallback(
  config: Config,
  event: FlashFallbackEvent,
): void {
  bufferTelemetryEvent(() => {
    const logger = logs.getLogger(SERVICE_NAME);
    const logRecord: LogRecord = {
      body: event.toLogBody(),
      attributes: event.toOpenTelemetryAttributes(config),
    };
    logger.emit(logRecord);
  });
}

export function logRipgrepFallback(
  config: Config,
  event: RipgrepFallbackEvent,
): void {
  bufferTelemetryEvent(() => {
    const logger = logs.getLogger(SERVICE_NAME);
    const logRecord: LogRecord = {
      body: event.toLogBody(),
      attributes: event.toOpenTelemetryAttributes(config),
    };
    logger.emit(logRecord);
  });
}

export function logApiError(config: Config, event: ApiErrorEvent): void {
  const uiEvent = {
    ...event,
    'event.name': EVENT_API_ERROR,
    'event.timestamp': new Date().toISOString(),
  } as UiEvent;
  uiTelemetryService.addEvent(uiEvent);
  bufferTelemetryEvent(() => {
    const logger = logs.getLogger(SERVICE_NAME);
    logger.emit(event.toLogRecord(config));
    logger.emit(event.toSemanticLogRecord(config));

    recordApiErrorMetrics(config, event.duration_ms, {
      model: event.model,
      status_code: event.status_code,
      error_type: event.error_type,
    });

    // Record GenAI operation duration for errors
    recordApiResponseMetrics(config, event.duration_ms, {
      model: event.model,
      status_code: event.status_code,
      genAiAttributes: {
        ...getConventionAttributes(event),
        'error.type': event.error_type || 'unknown',
      },
    });
  });
}

export function logApiResponse(config: Config, event: ApiResponseEvent): void {
  const uiEvent = {
    ...event,
    'event.name': EVENT_API_RESPONSE,
    'event.timestamp': new Date().toISOString(),
  } as UiEvent;
  uiTelemetryService.addEvent(uiEvent);
  bufferTelemetryEvent(() => {
    const logger = logs.getLogger(SERVICE_NAME);
    logger.emit(event.toLogRecord(config));
    logger.emit(event.toSemanticLogRecord(config));

    const conventionAttributes = getConventionAttributes(event);

    recordApiResponseMetrics(config, event.duration_ms, {
      model: event.model,
      status_code: event.status_code,
      genAiAttributes: conventionAttributes,
    });

    const tokenUsageData = [
      { count: event.usage.input_token_count, type: 'input' as const },
      { count: event.usage.output_token_count, type: 'output' as const },
      { count: event.usage.cached_content_token_count, type: 'cache' as const },
      { count: event.usage.thoughts_token_count, type: 'thought' as const },
      { count: event.usage.tool_token_count, type: 'tool' as const },
    ];

    for (const { count, type } of tokenUsageData) {
      recordTokenUsageMetrics(config, count, {
        model: event.model,
        type,
        genAiAttributes: conventionAttributes,
      });
    }
  });
}

export function logLoopDetected(
  config: Config,
  event: LoopDetectedEvent,
): void {
  bufferTelemetryEvent(() => {
    const logger = logs.getLogger(SERVICE_NAME);
    const logRecord: LogRecord = {
      body: event.toLogBody(),
      attributes: event.toOpenTelemetryAttributes(config),
    };
    logger.emit(logRecord);
  });
}

export function logLoopDetectionDisabled(
  config: Config,
  event: LoopDetectionDisabledEvent,
): void {
  bufferTelemetryEvent(() => {
    const logger = logs.getLogger(SERVICE_NAME);
    const logRecord: LogRecord = {
      body: event.toLogBody(),
      attributes: event.toOpenTelemetryAttributes(config),
    };
    logger.emit(logRecord);
  });
}

export function logNextSpeakerCheck(
  config: Config,
  event: NextSpeakerCheckEvent,
): void {
  bufferTelemetryEvent(() => {
    const logger = logs.getLogger(SERVICE_NAME);
    const logRecord: LogRecord = {
      body: event.toLogBody(),
      attributes: event.toOpenTelemetryAttributes(config),
    };
    logger.emit(logRecord);
  });
}

export function logSlashCommand(
  config: Config,
  event: SlashCommandEvent,
): void {
  bufferTelemetryEvent(() => {
    const logger = logs.getLogger(SERVICE_NAME);
    const logRecord: LogRecord = {
      body: event.toLogBody(),
      attributes: event.toOpenTelemetryAttributes(config),
    };
    logger.emit(logRecord);
  });
}

export function logIdeConnection(
  config: Config,
  event: IdeConnectionEvent,
): void {
  bufferTelemetryEvent(() => {
    const logger = logs.getLogger(SERVICE_NAME);
    const logRecord: LogRecord = {
      body: event.toLogBody(),
      attributes: event.toOpenTelemetryAttributes(config),
    };
    logger.emit(logRecord);
  });
}

export function logConversationFinishedEvent(
  config: Config,
  event: ConversationFinishedEvent,
): void {
  bufferTelemetryEvent(() => {
    const logger = logs.getLogger(SERVICE_NAME);
    const logRecord: LogRecord = {
      body: event.toLogBody(),
      attributes: event.toOpenTelemetryAttributes(config),
    };
    logger.emit(logRecord);
  });
}

export function logChatCompression(
  config: Config,
  event: ChatCompressionEvent,
): void {
  const logger = logs.getLogger(SERVICE_NAME);
  const logRecord: LogRecord = {
    body: event.toLogBody(),
    attributes: event.toOpenTelemetryAttributes(config),
  };
  logger.emit(logRecord);

  recordChatCompressionMetrics(config, {
    tokens_before: event.tokens_before,
    tokens_after: event.tokens_after,
  });
}

export function logMalformedJsonResponse(
  config: Config,
  event: MalformedJsonResponseEvent,
): void {
  bufferTelemetryEvent(() => {
    const logger = logs.getLogger(SERVICE_NAME);
    const logRecord: LogRecord = {
      body: event.toLogBody(),
      attributes: event.toOpenTelemetryAttributes(config),
    };
    logger.emit(logRecord);
  });
}

export function logInvalidChunk(
  config: Config,
  event: InvalidChunkEvent,
): void {
  bufferTelemetryEvent(() => {
    const logger = logs.getLogger(SERVICE_NAME);
    const logRecord: LogRecord = {
      body: event.toLogBody(),
      attributes: event.toOpenTelemetryAttributes(config),
    };
    logger.emit(logRecord);
    recordInvalidChunk(config);
  });
}

export function logContentRetry(
  config: Config,
  event: ContentRetryEvent,
): void {
  bufferTelemetryEvent(() => {
    const logger = logs.getLogger(SERVICE_NAME);
    const logRecord: LogRecord = {
      body: event.toLogBody(),
      attributes: event.toOpenTelemetryAttributes(config),
    };
    logger.emit(logRecord);
    recordContentRetry(config);
  });
}

export function logContentRetryFailure(
  config: Config,
  event: ContentRetryFailureEvent,
): void {
  bufferTelemetryEvent(() => {
    const logger = logs.getLogger(SERVICE_NAME);
    const logRecord: LogRecord = {
      body: event.toLogBody(),
      attributes: event.toOpenTelemetryAttributes(config),
    };
    logger.emit(logRecord);
    recordContentRetryFailure(config);
  });
}

export function logModelRouting(
  config: Config,
  event: ModelRoutingEvent,
): void {
  bufferTelemetryEvent(() => {
    const logger = logs.getLogger(SERVICE_NAME);
    const logRecord: LogRecord = {
      body: event.toLogBody(),
      attributes: event.toOpenTelemetryAttributes(config),
    };
    logger.emit(logRecord);
    recordModelRoutingMetrics(config, event);
  });
}

export function logModelSlashCommand(
  config: Config,
  event: ModelSlashCommandEvent,
): void {
  bufferTelemetryEvent(() => {
    const logger = logs.getLogger(SERVICE_NAME);
    const logRecord: LogRecord = {
      body: event.toLogBody(),
      attributes: event.toOpenTelemetryAttributes(config),
    };
    logger.emit(logRecord);
    recordModelSlashCommand(config, event);
  });
}

export async function logExtensionInstallEvent(
  config: Config,
  event: ExtensionInstallEvent,
): Promise<void> {
  bufferTelemetryEvent(() => {
    const logger = logs.getLogger(SERVICE_NAME);
    const logRecord: LogRecord = {
      body: event.toLogBody(),
      attributes: event.toOpenTelemetryAttributes(config),
    };
    logger.emit(logRecord);
  });
}

export async function logExtensionUninstall(
  config: Config,
  event: ExtensionUninstallEvent,
): Promise<void> {
  bufferTelemetryEvent(() => {
    const logger = logs.getLogger(SERVICE_NAME);
    const logRecord: LogRecord = {
      body: event.toLogBody(),
      attributes: event.toOpenTelemetryAttributes(config),
    };
    logger.emit(logRecord);
  });
}

export async function logExtensionUpdateEvent(
  config: Config,
  event: ExtensionUpdateEvent,
): Promise<void> {
  bufferTelemetryEvent(() => {
    const logger = logs.getLogger(SERVICE_NAME);
    const logRecord: LogRecord = {
      body: event.toLogBody(),
      attributes: event.toOpenTelemetryAttributes(config),
    };
    logger.emit(logRecord);
  });
}

export async function logExtensionEnable(
  config: Config,
  event: ExtensionEnableEvent,
): Promise<void> {
  bufferTelemetryEvent(() => {
    const logger = logs.getLogger(SERVICE_NAME);
    const logRecord: LogRecord = {
      body: event.toLogBody(),
      attributes: event.toOpenTelemetryAttributes(config),
    };
    logger.emit(logRecord);
  });
}

export async function logExtensionDisable(
  config: Config,
  event: ExtensionDisableEvent,
): Promise<void> {
  bufferTelemetryEvent(() => {
    const logger = logs.getLogger(SERVICE_NAME);
    const logRecord: LogRecord = {
      body: event.toLogBody(),
      attributes: event.toOpenTelemetryAttributes(config),
    };
    logger.emit(logRecord);
  });
}

export function logSmartEditStrategy(
  config: Config,
  event: SmartEditStrategyEvent,
): void {
  bufferTelemetryEvent(() => {
    const logger = logs.getLogger(SERVICE_NAME);
    const logRecord: LogRecord = {
      body: event.toLogBody(),
      attributes: event.toOpenTelemetryAttributes(config),
    };
    logger.emit(logRecord);
  });
}

export function logSmartEditCorrectionEvent(
  config: Config,
  event: SmartEditCorrectionEvent,
): void {
  bufferTelemetryEvent(() => {
    const logger = logs.getLogger(SERVICE_NAME);
    const logRecord: LogRecord = {
      body: event.toLogBody(),
      attributes: event.toOpenTelemetryAttributes(config),
    };
    logger.emit(logRecord);
  });
}

export function logAgentStart(config: Config, event: AgentStartEvent): void {
  bufferTelemetryEvent(() => {
    const logger = logs.getLogger(SERVICE_NAME);
    const logRecord: LogRecord = {
      body: event.toLogBody(),
      attributes: event.toOpenTelemetryAttributes(config),
    };
    logger.emit(logRecord);
  });
}

export function logAgentFinish(config: Config, event: AgentFinishEvent): void {
  bufferTelemetryEvent(() => {
    const logger = logs.getLogger(SERVICE_NAME);
    const logRecord: LogRecord = {
      body: event.toLogBody(),
      attributes: event.toOpenTelemetryAttributes(config),
    };
    logger.emit(logRecord);

    recordAgentRunMetrics(config, event);
  });
}

export function logRecoveryAttempt(
  config: Config,
  event: RecoveryAttemptEvent,
): void {
  bufferTelemetryEvent(() => {
    const logger = logs.getLogger(SERVICE_NAME);
    const logRecord: LogRecord = {
      body: event.toLogBody(),
      attributes: event.toOpenTelemetryAttributes(config),
    };
    logger.emit(logRecord);

    recordRecoveryAttemptMetrics(config, event);
  });
}

export function logWebFetchFallbackAttempt(
  config: Config,
  event: WebFetchFallbackAttemptEvent,
): void {
  bufferTelemetryEvent(() => {
    const logger = logs.getLogger(SERVICE_NAME);
    const logRecord: LogRecord = {
      body: event.toLogBody(),
      attributes: event.toOpenTelemetryAttributes(config),
    };
    logger.emit(logRecord);
  });
}

export function logLlmLoopCheck(
  config: Config,
  event: LlmLoopCheckEvent,
): void {
  bufferTelemetryEvent(() => {
    const logger = logs.getLogger(SERVICE_NAME);
    const logRecord: LogRecord = {
      body: event.toLogBody(),
      attributes: event.toOpenTelemetryAttributes(config),
    };
    logger.emit(logRecord);
  });
}

export function logHookCall(config: Config, event: HookCallEvent): void {
  bufferTelemetryEvent(() => {
    const logger = logs.getLogger(SERVICE_NAME);
    const logRecord: LogRecord = {
      body: event.toLogBody(),
      attributes: event.toOpenTelemetryAttributes(config),
    };
    logger.emit(logRecord);

    recordHookCallMetrics(
      config,
      event.hook_event_name,
      event.hook_name,
      event.duration_ms,
      event.success,
    );
  });
}

export function logStartupStats(
  config: Config,
  event: StartupStatsEvent,
): void {
  bufferTelemetryEvent(() => {
    const logger = logs.getLogger(SERVICE_NAME);
    const logRecord: LogRecord = {
      body: event.toLogBody(),
      attributes: event.toOpenTelemetryAttributes(config),
    };
    logger.emit(logRecord);
  });
}
