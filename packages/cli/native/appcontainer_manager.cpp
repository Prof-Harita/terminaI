/**
 * @license
 * Copyright 2025 Google LLC
 * Portions Copyright 2025 TerminaI Authors
 * SPDX-License-Identifier: Apache-2.0
 *
 * Task 42 & 42b: Native Module - AppContainerManager Implementation
 *
 * This module implements Windows AppContainer sandbox functionality using
 * the official Windows APIs. AppContainers are the same technology used by
 * UWP apps and Microsoft Edge - they are trusted by Windows Defender.
 *
 * Key difference from Low Integrity (which we explicitly DON'T use):
 * - Low Integrity: Just restricts write access, still suspicious to AV
 * - AppContainer: Full sandboxing with explicit capabilities, trusted by OS
 *
 * @see docs-terminai/architecture-sovereign-runtime.md Appendix M.6
 */

#ifdef _WIN32

#include "appcontainer_manager.h"
#include <iostream>
#include <sstream>

namespace TerminAI {

// ============================================================================
// Constants Definition
// ============================================================================

const wchar_t* const CAPABILITY_INTERNET_CLIENT = L"S-1-15-3-1";
const wchar_t* const CAPABILITY_PRIVATE_NETWORK = L"S-1-15-3-3";
const wchar_t* const ALL_APPLICATION_PACKAGES_SID = L"S-1-15-2-1";

const wchar_t* const CONTAINER_PROFILE_NAME = L"TerminAI_Brain_Sandbox";
const wchar_t* const CONTAINER_DISPLAY_NAME = L"TerminAI Agent Runtime";
const wchar_t* const CONTAINER_DESCRIPTION = L"Sandboxed environment for TerminAI agent";

// Cached AppContainer SID (created once per session)
static PSID g_appContainerSid = nullptr;

// ============================================================================
// Helper Functions
// ============================================================================

std::wstring Utf8ToWide(const std::string& str) {
    if (str.empty()) return L"";

    int size = MultiByteToWideChar(CP_UTF8, 0, str.c_str(), -1, nullptr, 0);
    if (size == 0) return L"";

    std::wstring result(size, 0);
    MultiByteToWideChar(CP_UTF8, 0, str.c_str(), -1, &result[0], size);

    // Remove trailing null
    if (!result.empty() && result.back() == L'\0') {
        result.pop_back();
    }

    return result;
}

std::string WideToUtf8(const std::wstring& wstr) {
    if (wstr.empty()) return "";

    int size = WideCharToMultiByte(CP_UTF8, 0, wstr.c_str(), -1, nullptr, 0, nullptr, nullptr);
    if (size == 0) return "";

    std::string result(size, 0);
    WideCharToMultiByte(CP_UTF8, 0, wstr.c_str(), -1, &result[0], size, nullptr, nullptr);

    // Remove trailing null
    if (!result.empty() && result.back() == '\0') {
        result.pop_back();
    }

    return result;
}

std::string GetWindowsErrorMessage(DWORD error) {
    LPWSTR buffer = nullptr;
    DWORD size = FormatMessageW(
        FORMAT_MESSAGE_ALLOCATE_BUFFER | FORMAT_MESSAGE_FROM_SYSTEM | FORMAT_MESSAGE_IGNORE_INSERTS,
        nullptr,
        error,
        MAKELANGID(LANG_NEUTRAL, SUBLANG_DEFAULT),
        (LPWSTR)&buffer,
        0,
        nullptr
    );

    if (size == 0 || buffer == nullptr) {
        return "Unknown error code: " + std::to_string(error);
    }

    std::string message = WideToUtf8(buffer);
    LocalFree(buffer);

    // Remove trailing newlines
    while (!message.empty() && (message.back() == '\n' || message.back() == '\r')) {
        message.pop_back();
    }

    return message;
}

bool EnsureAppContainerProfile(PSID* outSid) {
    if (g_appContainerSid != nullptr) {
        *outSid = g_appContainerSid;
        return true;
    }

    HRESULT hr = CreateAppContainerProfile(
        CONTAINER_PROFILE_NAME,
        CONTAINER_DISPLAY_NAME,
        CONTAINER_DESCRIPTION,
        nullptr, 0,
        &g_appContainerSid
    );

    if (FAILED(hr)) {
        if (hr == HRESULT_FROM_WIN32(ERROR_ALREADY_EXISTS)) {
            hr = DeriveAppContainerSidFromAppContainerName(
                CONTAINER_PROFILE_NAME,
                &g_appContainerSid
            );
        }
        if (FAILED(hr)) {
            return false;
        }
    }

    *outSid = g_appContainerSid;
    return true;
}

int32_t CreateSandboxProcess(
    const std::wstring& commandLine,
    const std::wstring& workspacePath,
    bool enableInternet,
    const wchar_t* environmentBlock
) {
    PSID appContainerSid = nullptr;

    if (!EnsureAppContainerProfile(&appContainerSid)) {
        return static_cast<int32_t>(AppContainerError::ProfileCreationFailed);
    }

    if (!GrantWorkspaceAccess(workspacePath, appContainerSid)) {
        return static_cast<int32_t>(AppContainerError::AclFailure);
    }

    std::vector<SID_AND_ATTRIBUTES> capabilities;
    PSID internetClientSid = nullptr;
    PSID privateNetworkSid = nullptr;

    if (enableInternet) {
        if (ConvertStringSidToSidW(CAPABILITY_INTERNET_CLIENT, &internetClientSid)) {
            capabilities.push_back({ internetClientSid, SE_GROUP_ENABLED });
        } else {
            return static_cast<int32_t>(AppContainerError::CapabilityError);
        }

        if (ConvertStringSidToSidW(CAPABILITY_PRIVATE_NETWORK, &privateNetworkSid)) {
            capabilities.push_back({ privateNetworkSid, SE_GROUP_ENABLED });
        }
    }

    SECURITY_CAPABILITIES secCaps = {};
    secCaps.AppContainerSid = appContainerSid;
    secCaps.Capabilities = capabilities.empty() ? nullptr : capabilities.data();
    secCaps.CapabilityCount = static_cast<DWORD>(capabilities.size());

    SIZE_T attrListSize = 0;
    InitializeProcThreadAttributeList(nullptr, 1, 0, &attrListSize);

    std::vector<BYTE> attrListBuffer(attrListSize);
    LPPROC_THREAD_ATTRIBUTE_LIST attrList =
        reinterpret_cast<LPPROC_THREAD_ATTRIBUTE_LIST>(attrListBuffer.data());

    if (!InitializeProcThreadAttributeList(attrList, 1, 0, &attrListSize)) {
        if (internetClientSid) LocalFree(internetClientSid);
        if (privateNetworkSid) LocalFree(privateNetworkSid);
        return static_cast<int32_t>(AppContainerError::ProcessCreationFailed);
    }

    if (!UpdateProcThreadAttribute(
        attrList, 0,
        PROC_THREAD_ATTRIBUTE_SECURITY_CAPABILITIES,
        &secCaps, sizeof(secCaps),
        nullptr, nullptr
    )) {
        DeleteProcThreadAttributeList(attrList);
        if (internetClientSid) LocalFree(internetClientSid);
        if (privateNetworkSid) LocalFree(privateNetworkSid);
        return static_cast<int32_t>(AppContainerError::ProcessCreationFailed);
    }

    STARTUPINFOEXW si = {};
    si.StartupInfo.cb = sizeof(si);
    si.lpAttributeList = attrList;

    PROCESS_INFORMATION pi = {};

    std::vector<wchar_t> cmdLine(commandLine.begin(), commandLine.end());
    cmdLine.push_back(L'\0');

    DWORD creationFlags = EXTENDED_STARTUPINFO_PRESENT | CREATE_NEW_CONSOLE;
    if (environmentBlock != nullptr) {
        creationFlags |= CREATE_UNICODE_ENVIRONMENT;
    }

    BOOL success = CreateProcessW(
        nullptr,
        cmdLine.data(),
        nullptr, nullptr,
        FALSE,
        creationFlags,
        environmentBlock ? (LPVOID)environmentBlock : nullptr,
        workspacePath.c_str(),
        reinterpret_cast<LPSTARTUPINFOW>(&si),
        &pi
    );

    DeleteProcThreadAttributeList(attrList);
    if (internetClientSid) LocalFree(internetClientSid);
    if (privateNetworkSid) LocalFree(privateNetworkSid);

    if (!success) {
        return static_cast<int32_t>(AppContainerError::ProcessCreationFailed);
    }

    CloseHandle(pi.hThread);
    CloseHandle(pi.hProcess);

    return static_cast<int32_t>(pi.dwProcessId);
}

// ============================================================================
// Task 42b: GrantWorkspaceAccess Implementation
// ============================================================================

bool GrantWorkspaceAccess(const std::wstring& workspacePath, PSID appContainerSid) {
    if (workspacePath.empty() || appContainerSid == nullptr) {
        std::cerr << "[AppContainerManager] Invalid arguments to GrantWorkspaceAccess" << std::endl;
        return false;
    }

    // Convert SID to string for logging
    LPWSTR sidString = nullptr;
    if (ConvertSidToStringSidW(appContainerSid, &sidString)) {
        std::wcout << L"[AppContainerManager] Granting access to " << sidString
                   << L" on " << workspacePath << std::endl;
    }

    // Set up EXPLICIT_ACCESS structure
    EXPLICIT_ACCESS_W ea = {};
    ea.grfAccessPermissions = GENERIC_READ | GENERIC_WRITE | GENERIC_EXECUTE;
    ea.grfAccessMode = GRANT_ACCESS;
    ea.grfInheritance = SUB_CONTAINERS_AND_OBJECTS_INHERIT;
    ea.Trustee.TrusteeForm = TRUSTEE_IS_SID;
    ea.Trustee.TrusteeType = TRUSTEE_IS_WELL_KNOWN_GROUP;
    ea.Trustee.ptstrName = (LPWSTR)appContainerSid;

    // Get existing DACL
    PACL pOldDacl = nullptr;
    PSECURITY_DESCRIPTOR pSD = nullptr;
    DWORD result = GetNamedSecurityInfoW(
        workspacePath.c_str(),
        SE_FILE_OBJECT,
        DACL_SECURITY_INFORMATION,
        nullptr, nullptr,
        &pOldDacl,
        nullptr,
        &pSD
    );

    if (result != ERROR_SUCCESS) {
        std::cerr << "[AppContainerManager] GetNamedSecurityInfo failed: "
                  << GetWindowsErrorMessage(result) << std::endl;
        if (sidString) LocalFree(sidString);
        return false;
    }

    // Create new DACL with AppContainer access
    PACL pNewDacl = nullptr;
    result = SetEntriesInAclW(1, &ea, pOldDacl, &pNewDacl);

    if (result != ERROR_SUCCESS) {
        std::cerr << "[AppContainerManager] SetEntriesInAcl failed: "
                  << GetWindowsErrorMessage(result) << std::endl;
        if (pSD) LocalFree(pSD);
        if (sidString) LocalFree(sidString);
        return false;
    }

    // Apply new DACL
    result = SetNamedSecurityInfoW(
        (LPWSTR)workspacePath.c_str(),
        SE_FILE_OBJECT,
        DACL_SECURITY_INFORMATION,
        nullptr, nullptr,
        pNewDacl,
        nullptr
    );

    // Cleanup
    if (pNewDacl) LocalFree(pNewDacl);
    if (pSD) LocalFree(pSD);
    if (sidString) LocalFree(sidString);

    if (result != ERROR_SUCCESS) {
        std::cerr << "[AppContainerManager] SetNamedSecurityInfo failed: "
                  << GetWindowsErrorMessage(result) << std::endl;
        return false;
    }

    std::cout << "[AppContainerManager] Workspace access granted successfully" << std::endl;
    return true;
}

// ============================================================================
// Main NAPI Export: CreateAppContainerSandbox
// ============================================================================

Napi::Value CreateAppContainerSandbox(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();

    // Validate arguments
    if (info.Length() < 2 || !info[0].IsString() || !info[1].IsString()) {
        return Napi::Number::New(env, static_cast<int32_t>(AppContainerError::InvalidArguments));
    }

    std::string commandLineUtf8 = info[0].As<Napi::String>().Utf8Value();
    std::string workspacePathUtf8 = info[1].As<Napi::String>().Utf8Value();
    bool enableInternet = info.Length() > 2 && info[2].IsBoolean()
        ? info[2].As<Napi::Boolean>().Value()
        : true; // Default: enable internet for LLM access

    std::wstring commandLine = Utf8ToWide(commandLineUtf8);
    std::wstring workspacePath = Utf8ToWide(workspacePathUtf8);

    int32_t result = CreateSandboxProcess(commandLine, workspacePath, enableInternet, nullptr);
    return Napi::Number::New(env, static_cast<int32_t>(result));
}

Napi::Value CreateAppContainerSandboxWithEnv(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();

    if (info.Length() < 4 || !info[0].IsString() || !info[1].IsString() || !info[3].IsObject()) {
        return Napi::Number::New(env, static_cast<int32_t>(AppContainerError::InvalidArguments));
    }

    std::string commandLineUtf8 = info[0].As<Napi::String>().Utf8Value();
    std::string workspacePathUtf8 = info[1].As<Napi::String>().Utf8Value();
    bool enableInternet = info.Length() > 2 && info[2].IsBoolean()
        ? info[2].As<Napi::Boolean>().Value()
        : true;

    std::wstring commandLine = Utf8ToWide(commandLineUtf8);
    std::wstring workspacePath = Utf8ToWide(workspacePathUtf8);

    Napi::Object envObj = info[3].As<Napi::Object>();
    Napi::Array keys = envObj.GetPropertyNames();

    std::wstring envBlock;
    for (uint32_t i = 0; i < keys.Length(); i++) {
        std::string key = keys.Get(i).As<Napi::String>().Utf8Value();
        std::string val = envObj.Get(key).As<Napi::Value>().ToString().Utf8Value();
        envBlock += Utf8ToWide(key);
        envBlock += L"=";
        envBlock += Utf8ToWide(val);
        envBlock += L'\0';
    }
    envBlock += L'\0';

    int32_t result = CreateSandboxProcess(
        commandLine,
        workspacePath,
        enableInternet,
        envBlock.c_str()
    );
    return Napi::Number::New(env, static_cast<int32_t>(result));
}

Napi::Value EnsureAppContainerProfile(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();
    PSID sid = nullptr;
    if (!EnsureAppContainerProfile(&sid) || sid == nullptr) {
        return Napi::String::New(env, "");
    }
    LPWSTR sidString = nullptr;
    if (!ConvertSidToStringSidW(sid, &sidString)) {
        return Napi::String::New(env, "");
    }
    std::string result = WideToUtf8(sidString);
    LocalFree(sidString);
    return Napi::String::New(env, result);
}

// ============================================================================
// GetAppContainerSid Export
// ============================================================================

Napi::Value GetAppContainerSid(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();

    PSID sid = nullptr;
    HRESULT hr = DeriveAppContainerSidFromAppContainerName(CONTAINER_PROFILE_NAME, &sid);

    if (FAILED(hr)) {
        return Napi::String::New(env, "");
    }

    LPWSTR sidString = nullptr;
    if (!ConvertSidToStringSidW(sid, &sidString)) {
        FreeSid(sid);
        return Napi::String::New(env, "");
    }

    std::string result = WideToUtf8(sidString);

    LocalFree(sidString);
    FreeSid(sid);

    return Napi::String::New(env, result);
}

// ============================================================================
// DeleteAppContainerProfile Export
// ============================================================================

Napi::Value DeleteAppContainerProfile(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();

    HRESULT hr = ::DeleteAppContainerProfile(CONTAINER_PROFILE_NAME);

    // Clear cached SID
    if (g_appContainerSid != nullptr) {
        FreeSid(g_appContainerSid);
        g_appContainerSid = nullptr;
    }

    // Success or profile didn't exist
    return Napi::Boolean::New(env, SUCCEEDED(hr) || hr == HRESULT_FROM_WIN32(ERROR_NOT_FOUND));
}

} // namespace TerminAI

#endif // _WIN32
