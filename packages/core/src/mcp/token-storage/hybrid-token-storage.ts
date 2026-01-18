/**
 * @license
 * Copyright 2025 Google LLC
 * Portions Copyright 2025 TerminaI Authors
 * SPDX-License-Identifier: Apache-2.0
 */

import { BaseTokenStorage } from './base-token-storage.js';
import { FileTokenStorage } from './file-token-storage.js';
import type { TokenStorage, OAuthCredentials } from './types.js';
import { TokenStorageType } from './types.js';

const FORCE_FILE_STORAGE_ENV_VAR = 'GEMINI_FORCE_FILE_STORAGE';
const TERMINAI_FORCE_FILE_STORAGE_ENV_VAR = 'TERMINAI_FORCE_FILE_STORAGE';

export class HybridTokenStorage extends BaseTokenStorage {
  private storage: TokenStorage | null = null;
  private storageType: TokenStorageType | null = null;
  private storageInitPromise: Promise<TokenStorage> | null = null;

  constructor(serviceName: string) {
    super(serviceName);
  }

  private isFileStorageForced(): boolean {
    return (
      process.env[TERMINAI_FORCE_FILE_STORAGE_ENV_VAR] === 'true' ||
      process.env[FORCE_FILE_STORAGE_ENV_VAR] === 'true'
    );
  }

  private async fallbackToFileStorage(): Promise<TokenStorage> {
    this.storage = new FileTokenStorage(this.serviceName);
    this.storageType = TokenStorageType.ENCRYPTED_FILE;
    this.storageInitPromise = Promise.resolve(this.storage);
    return this.storage;
  }

  private async runWithFallback<T>(
    op: (storage: TokenStorage) => Promise<T>,
  ): Promise<T> {
    const storage = await this.getStorage();
    try {
      const result = await op(storage);
      return result;
    } catch (error: unknown) {
      if (
        !this.isFileStorageForced() &&
        this.storageType === TokenStorageType.KEYCHAIN
      ) {
        const fileStorage = await this.fallbackToFileStorage();
        const result = await op(fileStorage);
        return result;
      }
      throw error;
    }
  }

  private async initializeStorage(): Promise<TokenStorage> {
    const forceFileStorage = this.isFileStorageForced();

    if (!forceFileStorage) {
      try {
        const { KeychainTokenStorage } = await import(
          './keychain-token-storage.js'
        );
        const keychainStorage = new KeychainTokenStorage(this.serviceName);

        const isAvailable = await keychainStorage.isAvailable();
        if (isAvailable) {
          this.storage = keychainStorage;
          this.storageType = TokenStorageType.KEYCHAIN;
          return this.storage;
        }
      } catch (_e) {
        // Fallback to file storage if keychain fails to initialize
      }
    }

    this.storage = new FileTokenStorage(this.serviceName);
    this.storageType = TokenStorageType.ENCRYPTED_FILE;
    return this.storage;
  }

  private async getStorage(): Promise<TokenStorage> {
    if (this.storage !== null) {
      return this.storage;
    }

    // Use a single initialization promise to avoid race conditions
    if (!this.storageInitPromise) {
      this.storageInitPromise = this.initializeStorage();
    }

    // Wait for initialization to complete
    return this.storageInitPromise;
  }

  async getCredentials(serverName: string): Promise<OAuthCredentials | null> {
    return this.runWithFallback((storage) =>
      storage.getCredentials(serverName),
    );
  }

  async setCredentials(credentials: OAuthCredentials): Promise<void> {
    await this.runWithFallback((storage) =>
      storage.setCredentials(credentials),
    );
  }

  async deleteCredentials(serverName: string): Promise<void> {
    await this.runWithFallback((storage) =>
      storage.deleteCredentials(serverName),
    );
  }

  async listServers(): Promise<string[]> {
    return this.runWithFallback((storage) => storage.listServers());
  }

  async getAllCredentials(): Promise<Map<string, OAuthCredentials>> {
    return this.runWithFallback((storage) => storage.getAllCredentials());
  }

  async clearAll(): Promise<void> {
    await this.runWithFallback((storage) => storage.clearAll());
  }

  async getStorageType(): Promise<TokenStorageType> {
    await this.getStorage();
    return this.storageType!;
  }
}
