/**
 * @license
 * Copyright 2025 Google LLC
 * Portions Copyright 2025 TerminaI Authors
 * SPDX-License-Identifier: Apache-2.0
 */

#pragma once

#ifdef _WIN32

#include <napi.h>
#include <windows.h>
#include <string>

namespace TerminAI {

class SecurePipeServer : public Napi::ObjectWrap<SecurePipeServer> {
public:
    static Napi::Object Init(Napi::Env env, Napi::Object exports);
    SecurePipeServer(const Napi::CallbackInfo& info);
    ~SecurePipeServer();

private:
    Napi::Value Listen(const Napi::CallbackInfo& info);
    Napi::Value AcceptConnection(const Napi::CallbackInfo& info);
    Napi::Value Read(const Napi::CallbackInfo& info);
    Napi::Value Write(const Napi::CallbackInfo& info);
    Napi::Value Close(const Napi::CallbackInfo& info);
    Napi::Value IsConnected(const Napi::CallbackInfo& info);
    Napi::Value GetPipePath(const Napi::CallbackInfo& info);

    std::wstring pipePath_;
    std::wstring appContainerSid_;
    HANDLE pipeHandle_;
    bool connected_;
};

Napi::Value VerifyPipeDacl(const Napi::CallbackInfo& info);

} // namespace TerminAI

#endif // _WIN32
