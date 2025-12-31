/**
 * @license
 * Copyright 2025 Google LLC
 * Portions Copyright 2025 TerminaI Authors
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Resolves environment variables in a string.
 * Replaces $VAR_NAME and ${VAR_NAME} with their corresponding environment variable values.
 */
export function resolveEnvVarsInString(
  value: string,
  customEnv?: Record<string, string>,
): string {
  const envVarRegex = /\$(?:(\w+)|{([^}]+)})/g;
  return value.replace(envVarRegex, (match, varName1, varName2) => {
    const varName = varName1 || varName2;
    if (customEnv && typeof customEnv[varName] === 'string') {
      return customEnv[varName];
    }
    if (process && process.env && typeof process.env[varName] === 'string') {
      return process.env[varName];
    }
    return match;
  });
}

/**
 * Recursively resolves environment variables in an object of any type.
 */
export function resolveEnvVarsInObject<T>(
  obj: T,
  customEnv?: Record<string, string>,
): T {
  return resolveEnvVarsInObjectInternal(obj, new WeakSet(), customEnv);
}

function resolveEnvVarsInObjectInternal<T>(
  obj: T,
  visited: WeakSet<object>,
  customEnv?: Record<string, string>,
): T {
  if (
    obj === null ||
    obj === undefined ||
    typeof obj === 'boolean' ||
    typeof obj === 'number'
  ) {
    return obj;
  }

  if (typeof obj === 'string') {
    return resolveEnvVarsInString(obj, customEnv) as unknown as T;
  }

  if (Array.isArray(obj)) {
    if (visited.has(obj)) {
      return [...obj] as unknown as T;
    }
    visited.add(obj);
    const result = obj.map((item) =>
      resolveEnvVarsInObjectInternal(item, visited, customEnv),
    ) as unknown as T;
    visited.delete(obj);
    return result;
  }

  if (typeof obj === 'object') {
    if (visited.has(obj as object)) {
      return { ...obj } as T;
    }
    visited.add(obj as object);
    const newObj = { ...obj } as T;
    for (const key in newObj) {
      if (Object.prototype.hasOwnProperty.call(newObj, key)) {
        (newObj as any)[key] = resolveEnvVarsInObjectInternal(
          (newObj as any)[key],
          visited,
          customEnv,
        );
      }
    }
    visited.delete(obj as object);
    return newObj;
  }

  return obj;
}
