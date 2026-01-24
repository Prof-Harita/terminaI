/**
 * @license
 * Copyright 2025 Google LLC
 * Portions Copyright 2025 TerminaI Authors
 * SPDX-License-Identifier: Apache-2.0
 *
 * Native Module Entry Point
 *
 * This file registers all native module exports with Node.js N-API.
 * The module provides Windows-specific functionality:
 * - AppContainer sandbox creation (Tasks 42, 42b)
 * - AMSI malware scanning (Task 43)
 */

#include <napi.h>

#ifdef _WIN32
#include "appcontainer_manager.h"
#include "amsi_scanner.h"
#include "pipe_security.h"
#endif

// Module initialization
Napi::Object Init(Napi::Env env, Napi::Object exports) {
#ifdef _WIN32
    // Initialize AMSI on module load
    TerminAI::InitializeAmsi();

    // ========================================================================
    // Task 42: AppContainer Sandbox
    // ========================================================================

    exports.Set(
        Napi::String::New(env, "createAppContainerSandbox"),
        Napi::Function::New(env, TerminAI::CreateAppContainerSandbox)
    );

    exports.Set(
        Napi::String::New(env, "createAppContainerSandboxWithEnv"),
        Napi::Function::New(env, TerminAI::CreateAppContainerSandboxWithEnv)
    );

    exports.Set(
        Napi::String::New(env, "ensureAppContainerProfile"),
        Napi::Function::New(env, TerminAI::EnsureAppContainerProfile)
    );

    exports.Set(
        Napi::String::New(env, "getAppContainerSid"),
        Napi::Function::New(env, TerminAI::GetAppContainerSid)
    );

    exports.Set(
        Napi::String::New(env, "deleteAppContainerProfile"),
        Napi::Function::New(env, TerminAI::DeleteAppContainerProfile)
    );

    // ========================================================================
    // Task 43: AMSI Scanner
    // ========================================================================

    exports.Set(
        Napi::String::New(env, "amsiScanBuffer"),
        Napi::Function::New(env, TerminAI::AmsiScanBuffer)
    );

    exports.Set(
        Napi::String::New(env, "amsiScanFile"),
        Napi::Function::New(env, TerminAI::AmsiScanFile)
    );

    // ========================================================================
    // Platform Info
    // ========================================================================

    exports.Set(
        Napi::String::New(env, "isWindows"),
        Napi::Boolean::New(env, true)
    );

    exports.Set(
        Napi::String::New(env, "isAmsiAvailable"),
        Napi::Boolean::New(env, TerminAI::IsAmsiInitialized())
    );

    // ========================================================================
    // Secure Pipe Server
    // ========================================================================

    TerminAI::SecurePipeServer::Init(env, exports);
    exports.Set(
        Napi::String::New(env, "verifyPipeDacl"),
        Napi::Function::New(env, TerminAI::VerifyPipeDacl)
    );

    exports.Set(
        Napi::String::New(env, "version"),
        Napi::String::New(env, "0.28.0")
    );

#else
    // Non-Windows: Export stubs and platform info
    exports.Set(
        Napi::String::New(env, "isWindows"),
        Napi::Boolean::New(env, false)
    );

    exports.Set(
        Napi::String::New(env, "isAmsiAvailable"),
        Napi::Boolean::New(env, false)
    );
#endif

    return exports;
}

// Register the module
NODE_API_MODULE(terminai_native, Init)
