/**
 * @license
 * Copyright 2025 Google LLC
 * Portions Copyright 2025 TerminaI Authors
 * SPDX-License-Identifier: Apache-2.0
 *
 * Stub Implementation for Non-Windows Platforms
 *
 * This file provides stub implementations for Linux and macOS.
 * The Windows-specific functionality is not available on these platforms.
 */

#ifndef _WIN32

#include <napi.h>
#include "appcontainer_manager.h"
#include "amsi_scanner.h"

namespace TerminAI {

// ============================================================================
// AppContainer Stubs
// ============================================================================

Napi::Value CreateAppContainerSandbox(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();
    Napi::Error::New(env, "AppContainer is only available on Windows")
        .ThrowAsJavaScriptException();
    return env.Null();
}

Napi::Value CreateAppContainerSandboxWithEnv(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();
    Napi::Error::New(env, "AppContainer is only available on Windows")
        .ThrowAsJavaScriptException();
    return env.Null();
}

Napi::Value EnsureAppContainerProfile(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();
    return Napi::String::New(env, "");
}

Napi::Value GetAppContainerSid(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();
    return Napi::String::New(env, "");
}

Napi::Value DeleteAppContainerProfile(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();
    return Napi::Boolean::New(env, true);
}

// ============================================================================
// AMSI Stubs
// ============================================================================

bool InitializeAmsi() {
    return false;
}

void UninitializeAmsi() {
    // No-op on non-Windows
}

bool IsAmsiInitialized() {
    return false;
}

Napi::Value AmsiScanBuffer(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();

    Napi::Object result = Napi::Object::New(env);
    result.Set("clean", Napi::Boolean::New(env, true));
    result.Set("result", Napi::Number::New(env, 0));
    result.Set("description", Napi::String::New(env, "AMSI not available (non-Windows platform)"));

    return result;
}

Napi::Value AmsiScanFile(const Napi::CallbackInfo& info) {
    return AmsiScanBuffer(info);
}

} // namespace TerminAI

#endif // !_WIN32
