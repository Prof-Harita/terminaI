/**
 * @license
 * Copyright 2025 Google LLC
 * Portions Copyright 2025 TerminaI Authors
 * SPDX-License-Identifier: Apache-2.0
 */

export * from './src/index.js';
export { detectIdeFromEnv } from './src/ide/detect-ide.js';
export {
  logExtensionEnable,
  logIdeConnection,
  logExtensionDisable,
} from './src/telemetry/loggers.js';

export {
  IdeConnectionEvent,
  IdeConnectionType,
  ExtensionInstallEvent,
  ExtensionDisableEvent,
  ExtensionEnableEvent,
  ExtensionUninstallEvent,
  ExtensionUpdateEvent,
  ModelSlashCommandEvent,
} from './src/telemetry/types.js';
export * from './src/utils/pathReader.js';
export { logModelSlashCommand } from './src/telemetry/loggers.js';
export { KeychainTokenStorage } from './src/mcp/token-storage/keychain-token-storage.js';
export * from './src/utils/googleQuotaErrors.js';
export type { GoogleApiError } from './src/utils/googleErrors.js';
export { getCodeAssistServer } from './src/code_assist/codeAssist.js';
export { getExperiments } from './src/code_assist/experiments/experiments.js';
export { getErrorStatus, ModelNotFoundError } from './src/utils/httpErrors.js';
