/**
 * @license
 * Copyright 2025 Google LLC
 * Portions Copyright 2025 TerminaI Authors
 * SPDX-License-Identifier: Apache-2.0
 */

import winston from 'winston';
import { redactSecrets } from './redactSecrets.js';

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    // First, add a timestamp to the log info object
    winston.format.timestamp({
      format: 'YYYY-MM-DD HH:mm:ss.SSS A', // Custom timestamp format
    }),
    // Here we define the custom output format
    winston.format.printf((info) => {
      const { level, timestamp, message, ...rest } = info;
      const sanitizedRest = redactSecrets(rest);
      return (
        `[${level.toUpperCase()}] ${timestamp} -- ${message}` +
        `${Object.keys(sanitizedRest).length > 0 ? `\n${JSON.stringify(sanitizedRest, null, 2)}` : ''}`
      ); // Only print ...rest if present
    }),
  ),
  transports: [new winston.transports.Console()],
});

export { logger };
