/**
 * @license
 * Copyright 2025 Google LLC
 * Portions Copyright 2025 TerminaI Authors
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Resolves environment variables in a configuration value.
 * Supports syntax: $VAR, ${VAR}
 * Recursively processes objects and arrays.
 * Leaves unresolved variables as-is.
 */
export function resolveEnvVars<T>(
  value: T,
  env: NodeJS.ProcessEnv = process.env,
): T {
  if (typeof value === 'string') {
    return resolveString(value, env) as unknown as T;
  }

  if (Array.isArray(value)) {
    return value.map((item) => resolveEnvVars(item, env)) as unknown as T;
  }

  if (value !== null && typeof value === 'object') {
    const result: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value)) {
      result[key] = resolveEnvVars(val, env);
    }
    return result as unknown as T;
  }

  return value;
}

function resolveString(value: string, env: NodeJS.ProcessEnv): string {
  // Regex to match ${VAR} or $VAR
  const envVarRegex =
    /\$\{([a-zA-Z_][a-zA-Z0-9_]*)\}|\$([a-zA-Z_][a-zA-Z0-9_]*)/g;

  return value.replace(envVarRegex, (match, p1, p2) => {
    const varName = p1 || p2;
    const envValue = env[varName];
    return envValue !== undefined ? envValue : match;
  });
}
