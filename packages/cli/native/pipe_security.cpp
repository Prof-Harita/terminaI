/**
 * @license
 * Copyright 2025 Google LLC
 * Portions Copyright 2025 TerminaI Authors
 * SPDX-License-Identifier: Apache-2.0
 */

#ifdef _WIN32

#include "pipe_security.h"
#include "appcontainer_manager.h"
#include <sddl.h>
#include <aclapi.h>
#include <vector>

namespace TerminAI {

namespace {

std::wstring GetCurrentUserSidString() {
    HANDLE token = nullptr;
    if (!OpenProcessToken(GetCurrentProcess(), TOKEN_QUERY, &token)) {
        return L"";
    }

    DWORD size = 0;
    GetTokenInformation(token, TokenUser, nullptr, 0, &size);
    if (size == 0) {
        CloseHandle(token);
        return L"";
    }

    std::vector<BYTE> buffer(size);
    if (!GetTokenInformation(token, TokenUser, buffer.data(), size, &size)) {
        CloseHandle(token);
        return L"";
    }

    CloseHandle(token);

    TOKEN_USER* user = reinterpret_cast<TOKEN_USER*>(buffer.data());
    LPWSTR sidString = nullptr;
    if (!ConvertSidToStringSidW(user->User.Sid, &sidString)) {
        return L"";
    }
    std::wstring result = sidString;
    LocalFree(sidString);
    return result;
}

bool BuildPipeSecurityDescriptor(
    const std::wstring& appContainerSid,
    PSECURITY_DESCRIPTOR* outSd
) {
    PSID appSid = nullptr;
    PSID userSid = nullptr;
    PACL pAcl = nullptr;
    PSECURITY_DESCRIPTOR pSD = nullptr;

    std::wstring userSidString = GetCurrentUserSidString();
    if (!ConvertStringSidToSidW(appContainerSid.c_str(), &appSid)) {
        return false;
    }
    if (!userSidString.empty()) {
        ConvertStringSidToSidW(userSidString.c_str(), &userSid);
    }

    EXPLICIT_ACCESS_W ea[2] = {};
    ea[0].grfAccessPermissions = GENERIC_READ | GENERIC_WRITE;
    ea[0].grfAccessMode = GRANT_ACCESS;
    ea[0].grfInheritance = NO_INHERITANCE;
    ea[0].Trustee.TrusteeForm = TRUSTEE_IS_SID;
    ea[0].Trustee.TrusteeType = TRUSTEE_IS_WELL_KNOWN_GROUP;
    ea[0].Trustee.ptstrName = (LPWSTR)appSid;

    DWORD eaCount = 1;
    if (userSid != nullptr) {
        ea[1].grfAccessPermissions = GENERIC_READ | GENERIC_WRITE;
        ea[1].grfAccessMode = GRANT_ACCESS;
        ea[1].grfInheritance = NO_INHERITANCE;
        ea[1].Trustee.TrusteeForm = TRUSTEE_IS_SID;
        ea[1].Trustee.TrusteeType = TRUSTEE_IS_USER;
        ea[1].Trustee.ptstrName = (LPWSTR)userSid;
        eaCount = 2;
    }

    DWORD result = SetEntriesInAclW(eaCount, ea, nullptr, &pAcl);
    if (result != ERROR_SUCCESS) {
        if (appSid) LocalFree(appSid);
        if (userSid) LocalFree(userSid);
        return false;
    }

    pSD = (PSECURITY_DESCRIPTOR)LocalAlloc(LPTR, SECURITY_DESCRIPTOR_MIN_LENGTH);
    if (!InitializeSecurityDescriptor(pSD, SECURITY_DESCRIPTOR_REVISION)) {
        if (pAcl) LocalFree(pAcl);
        if (appSid) LocalFree(appSid);
        if (userSid) LocalFree(userSid);
        if (pSD) LocalFree(pSD);
        return false;
    }

    if (!SetSecurityDescriptorDacl(pSD, TRUE, pAcl, FALSE)) {
        if (pAcl) LocalFree(pAcl);
        if (appSid) LocalFree(appSid);
        if (userSid) LocalFree(userSid);
        if (pSD) LocalFree(pSD);
        return false;
    }

    if (appSid) LocalFree(appSid);
    if (userSid) LocalFree(userSid);

    *outSd = pSD;
    return true;
}

bool SidInAcl(PACL dacl, PSID sid) {
    if (!dacl || !sid) return false;
    for (DWORD i = 0; i < dacl->AceCount; i++) {
        LPVOID ace = nullptr;
        if (!GetAce(dacl, i, &ace) || !ace) {
            continue;
        }
        ACE_HEADER* header = reinterpret_cast<ACE_HEADER*>(ace);
        if (header->AceType == ACCESS_ALLOWED_ACE_TYPE) {
            ACCESS_ALLOWED_ACE* allowed = reinterpret_cast<ACCESS_ALLOWED_ACE*>(ace);
            PSID aceSid = reinterpret_cast<PSID>(&allowed->SidStart);
            if (EqualSid(aceSid, sid)) {
                return true;
            }
        } else if (header->AceType == ACCESS_ALLOWED_OBJECT_ACE_TYPE) {
            ACCESS_ALLOWED_OBJECT_ACE* allowed = reinterpret_cast<ACCESS_ALLOWED_OBJECT_ACE*>(ace);
            PSID aceSid = reinterpret_cast<PSID>(&allowed->SidStart);
            if (EqualSid(aceSid, sid)) {
                return true;
            }
        }
    }
    return false;
}

class PipeAsyncWorker : public Napi::AsyncWorker {
public:
    explicit PipeAsyncWorker(Napi::Env env)
        : Napi::AsyncWorker(env), deferred(Napi::Promise::Deferred::New(env)) {}

    Napi::Promise GetPromise() { return deferred.Promise(); }

protected:
    Napi::Promise::Deferred deferred;
    std::string errorMessage;
};

class PipeAcceptWorker : public PipeAsyncWorker {
public:
    PipeAcceptWorker(Napi::Env env, HANDLE pipe, bool* connected)
        : PipeAsyncWorker(env), pipeHandle(pipe), connectedRef(connected) {}

    void Execute() override {
        BOOL ok = ConnectNamedPipe(pipeHandle, nullptr);
        if (!ok) {
            DWORD err = GetLastError();
            if (err == ERROR_PIPE_CONNECTED) {
                ok = TRUE;
            } else {
                errorMessage = GetWindowsErrorMessage(err);
                return;
            }
        }
        *connectedRef = true;
    }

    void OnOK() override { deferred.Resolve(Env().Undefined()); }
    void OnError(const Napi::Error& error) override {
        deferred.Reject(Napi::Error::New(Env(), errorMessage).Value());
    }

private:
    HANDLE pipeHandle;
    bool* connectedRef;
};

class PipeReadWorker : public PipeAsyncWorker {
public:
    PipeReadWorker(Napi::Env env, HANDLE pipe, bool* connected)
        : PipeAsyncWorker(env), pipeHandle(pipe), connectedRef(connected) {}

    void Execute() override {
        const DWORD bufferSize = 64 * 1024;
        std::string result;
        while (true) {
            char buffer[bufferSize];
            DWORD bytesRead = 0;
            BOOL ok = ReadFile(pipeHandle, buffer, bufferSize, &bytesRead, nullptr);
            if (!ok) {
                DWORD err = GetLastError();
                if (err == ERROR_BROKEN_PIPE) {
                    *connectedRef = false;
                    return;
                }
                if (err == ERROR_MORE_DATA) {
                    result.append(buffer, bytesRead);
                    continue;
                }
                errorMessage = GetWindowsErrorMessage(err);
                return;
            }
            if (bytesRead > 0) {
                result.append(buffer, bytesRead);
            }
            break;
        }
        data = result;
    }

    void OnOK() override {
        deferred.Resolve(Napi::String::New(Env(), data));
    }

    void OnError(const Napi::Error& error) override {
        deferred.Reject(Napi::Error::New(Env(), errorMessage).Value());
    }

private:
    HANDLE pipeHandle;
    bool* connectedRef;
    std::string data;
};

class PipeWriteWorker : public PipeAsyncWorker {
public:
    PipeWriteWorker(Napi::Env env, HANDLE pipe, const std::string& data)
        : PipeAsyncWorker(env), pipeHandle(pipe), data(data) {}

    void Execute() override {
        DWORD bytesWritten = 0;
        BOOL ok = WriteFile(pipeHandle, data.data(), static_cast<DWORD>(data.size()), &bytesWritten, nullptr);
        if (!ok) {
            errorMessage = GetWindowsErrorMessage(GetLastError());
            return;
        }
    }

    void OnOK() override { deferred.Resolve(Env().Undefined()); }
    void OnError(const Napi::Error& error) override {
        deferred.Reject(Napi::Error::New(Env(), errorMessage).Value());
    }

private:
    HANDLE pipeHandle;
    std::string data;
};

} // namespace

Napi::Object SecurePipeServer::Init(Napi::Env env, Napi::Object exports) {
    Napi::Function func = DefineClass(
        env,
        "SecurePipeServer",
        {
            InstanceMethod("listen", &SecurePipeServer::Listen),
            InstanceMethod("acceptConnection", &SecurePipeServer::AcceptConnection),
            InstanceMethod("read", &SecurePipeServer::Read),
            InstanceMethod("write", &SecurePipeServer::Write),
            InstanceMethod("close", &SecurePipeServer::Close),
            InstanceMethod("isConnected", &SecurePipeServer::IsConnected),
            InstanceMethod("getPipePath", &SecurePipeServer::GetPipePath),
        }
    );

    exports.Set("SecurePipeServer", func);
    return exports;
}

SecurePipeServer::SecurePipeServer(const Napi::CallbackInfo& info)
    : Napi::ObjectWrap<SecurePipeServer>(info),
      pipeHandle_(INVALID_HANDLE_VALUE),
      connected_(false) {
    if (info.Length() < 2 || !info[0].IsString() || !info[1].IsString()) {
        Napi::TypeError::New(info.Env(), "pipePath and appContainerSid required")
            .ThrowAsJavaScriptException();
        return;
    }

    pipePath_ = Utf8ToWide(info[0].As<Napi::String>().Utf8Value());
    appContainerSid_ = Utf8ToWide(info[1].As<Napi::String>().Utf8Value());
}

SecurePipeServer::~SecurePipeServer() {
    if (pipeHandle_ != INVALID_HANDLE_VALUE) {
        CloseHandle(pipeHandle_);
        pipeHandle_ = INVALID_HANDLE_VALUE;
    }
}

Napi::Value SecurePipeServer::Listen(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();

    if (pipeHandle_ != INVALID_HANDLE_VALUE) {
        Napi::Error::New(env, "Pipe already listening").ThrowAsJavaScriptException();
        return env.Null();
    }

    PSECURITY_DESCRIPTOR pSD = nullptr;
    if (!BuildPipeSecurityDescriptor(appContainerSid_, &pSD)) {
        Napi::Error::New(env, "Failed to build pipe security descriptor")
            .ThrowAsJavaScriptException();
        return env.Null();
    }

    SECURITY_ATTRIBUTES sa = {};
    sa.nLength = sizeof(SECURITY_ATTRIBUTES);
    sa.lpSecurityDescriptor = pSD;
    sa.bInheritHandle = FALSE;

    pipeHandle_ = CreateNamedPipeW(
        pipePath_.c_str(),
        PIPE_ACCESS_DUPLEX,
        PIPE_TYPE_MESSAGE | PIPE_READMODE_MESSAGE | PIPE_WAIT,
        1,
        65536,
        65536,
        0,
        &sa
    );

    if (pSD) {
        PACL dacl = nullptr;
        BOOL daclPresent = FALSE;
        BOOL daclDefaulted = FALSE;
        if (GetSecurityDescriptorDacl(pSD, &daclPresent, &dacl, &daclDefaulted)) {
            if (dacl) LocalFree(dacl);
        }
        LocalFree(pSD);
    }

    if (pipeHandle_ == INVALID_HANDLE_VALUE) {
        Napi::Error::New(env, "Failed to create named pipe")
            .ThrowAsJavaScriptException();
        return env.Null();
    }

    return env.Undefined();
}

Napi::Value SecurePipeServer::AcceptConnection(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();
    if (pipeHandle_ == INVALID_HANDLE_VALUE) {
        Napi::Error::New(env, "Pipe not listening").ThrowAsJavaScriptException();
        return env.Null();
    }

    auto* worker = new PipeAcceptWorker(env, pipeHandle_, &connected_);
    auto promise = worker->GetPromise();
    worker->Queue();
    return promise;
}

Napi::Value SecurePipeServer::Read(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();
    if (pipeHandle_ == INVALID_HANDLE_VALUE) {
        Napi::Error::New(env, "Pipe not listening").ThrowAsJavaScriptException();
        return env.Null();
    }
    if (!connected_) {
        Napi::Error::New(env, "Pipe not connected").ThrowAsJavaScriptException();
        return env.Null();
    }

    auto* worker = new PipeReadWorker(env, pipeHandle_, &connected_);
    auto promise = worker->GetPromise();
    worker->Queue();
    return promise;
}

Napi::Value SecurePipeServer::Write(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();
    if (pipeHandle_ == INVALID_HANDLE_VALUE) {
        Napi::Error::New(env, "Pipe not listening").ThrowAsJavaScriptException();
        return env.Null();
    }
    if (!connected_) {
        Napi::Error::New(env, "Pipe not connected").ThrowAsJavaScriptException();
        return env.Null();
    }
    if (info.Length() < 1 || !info[0].IsString()) {
        Napi::TypeError::New(env, "data string required").ThrowAsJavaScriptException();
        return env.Null();
    }

    std::string data = info[0].As<Napi::String>().Utf8Value();
    auto* worker = new PipeWriteWorker(env, pipeHandle_, data);
    auto promise = worker->GetPromise();
    worker->Queue();
    return promise;
}

Napi::Value SecurePipeServer::Close(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();
    if (pipeHandle_ != INVALID_HANDLE_VALUE) {
        CloseHandle(pipeHandle_);
        pipeHandle_ = INVALID_HANDLE_VALUE;
        connected_ = false;
    }
    return env.Undefined();
}

Napi::Value SecurePipeServer::IsConnected(const Napi::CallbackInfo& info) {
    return Napi::Boolean::New(info.Env(), connected_);
}

Napi::Value SecurePipeServer::GetPipePath(const Napi::CallbackInfo& info) {
    return Napi::String::New(info.Env(), WideToUtf8(pipePath_));
}

Napi::Value VerifyPipeDacl(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();
    if (info.Length() < 2 || !info[0].IsString() || !info[1].IsString()) {
        Napi::TypeError::New(env, "pipePath and appContainerSid required")
            .ThrowAsJavaScriptException();
        return env.Null();
    }

    std::wstring pipePath = Utf8ToWide(info[0].As<Napi::String>().Utf8Value());
    std::wstring appSidString = Utf8ToWide(info[1].As<Napi::String>().Utf8Value());

    PSECURITY_DESCRIPTOR pSD = nullptr;
    PACL dacl = nullptr;
    DWORD result = GetNamedSecurityInfoW(
        pipePath.c_str(),
        SE_KERNEL_OBJECT,
        DACL_SECURITY_INFORMATION,
        nullptr,
        nullptr,
        &dacl,
        nullptr,
        &pSD
    );

    if (result != ERROR_SUCCESS) {
        Napi::Object response = Napi::Object::New(env);
        response.Set("ok", Napi::Boolean::New(env, false));
        response.Set("details", Napi::String::New(env, GetWindowsErrorMessage(result)));
        return response;
    }

    PSID appSid = nullptr;
    if (!ConvertStringSidToSidW(appSidString.c_str(), &appSid)) {
        if (pSD) LocalFree(pSD);
        Napi::Object response = Napi::Object::New(env);
        response.Set("ok", Napi::Boolean::New(env, false));
        response.Set("details", Napi::String::New(env, "Invalid AppContainer SID"));
        return response;
    }

    std::wstring userSidString = GetCurrentUserSidString();
    PSID userSid = nullptr;
    if (!userSidString.empty()) {
        ConvertStringSidToSidW(userSidString.c_str(), &userSid);
    }

    bool hasApp = SidInAcl(dacl, appSid);
    bool hasUser = userSid ? SidInAcl(dacl, userSid) : false;

    Napi::Array missing = Napi::Array::New(env);
    uint32_t idx = 0;
    if (!hasApp) {
        missing.Set(idx++, Napi::String::New(env, "appcontainer"));
    }
    if (userSid && !hasUser) {
        missing.Set(idx++, Napi::String::New(env, "user"));
    }

    Napi::Object response = Napi::Object::New(env);
    response.Set("ok", Napi::Boolean::New(env, hasApp && (!userSid || hasUser)));
    if (missing.Length() > 0) {
        response.Set("missing", missing);
        response.Set("details", Napi::String::New(env, "Required SID entries missing"));
    } else {
        response.Set("details", Napi::String::New(env, "DACL ok"));
    }

    if (appSid) LocalFree(appSid);
    if (userSid) LocalFree(userSid);
    if (pSD) LocalFree(pSD);

    return response;
}

} // namespace TerminAI

#endif // _WIN32
