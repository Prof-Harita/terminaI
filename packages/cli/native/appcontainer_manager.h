/**
 * @license
 * Copyright 2025 Google LLC
 * Portions Copyright 2025 TerminaI Authors
 * SPDX-License-Identifier: Apache-2.0
 *
 * Task 42: Native Module - AppContainerManager Header
 *
 * This header defines the API for creating and managing Windows AppContainer
 * sandboxes. AppContainers provide process-level isolation similar to UWP apps
 * and Microsoft Edge - they are NOT flagged by Windows Defender.
 *
 * Key APIs used:
 * - CreateAppContainerProfile: Register sandbox profile with Windows
 * - DeriveAppContainerSidFromAppContainerName: Get existing profile SID
 * - PROC_THREAD_ATTRIBUTE_SECURITY_CAPABILITIES: Apply sandbox at process creation
 *
 * @see docs-terminai/architecture-sovereign-runtime.md Appendix M.6
 */

#pragma once

#ifdef _WIN32

#include <napi.h>
#include <windows.h>
#include <userenv.h>
#include <sddl.h>
#include <aclapi.h>
#include <string>
#include <vector>
#include <memory>

// Linker pragmas (safety net if binding.gyp fails to link)
#pragma comment(lib, "Userenv.lib")
#pragma comment(lib, "Advapi32.lib")

namespace TerminAI {

// ============================================================================
// Constants: Well-known Capability SIDs
// ============================================================================

/**
 * S-1-15-3-1: internetClient capability
 * Required for LLM API calls and npm/pip package downloads
 */
extern const wchar_t* const CAPABILITY_INTERNET_CLIENT;

/**
 * S-1-15-3-3: privateNetworkClientServer capability
 * Optional: for local network services (MCP servers, databases)
 */
extern const wchar_t* const CAPABILITY_PRIVATE_NETWORK;

/**
 * S-1-15-2-1: ALL APPLICATION PACKAGES (for file ACLs)
 * Used to grant file system access
 */
extern const wchar_t* const ALL_APPLICATION_PACKAGES_SID;

// ============================================================================
// Constants: Profile Names
// ============================================================================

/**
 * Fixed profile name - attaches to same container every run
 */
extern const wchar_t* const CONTAINER_PROFILE_NAME;

/**
 * Human-readable display name for the container
 */
extern const wchar_t* const CONTAINER_DISPLAY_NAME;

/**
 * Description shown in Windows Security Center
 */
extern const wchar_t* const CONTAINER_DESCRIPTION;

// ============================================================================
// Error Codes
// ============================================================================

/**
 * Error codes returned by CreateAppContainerSandbox
 */
enum class AppContainerError : int32_t {
  Success = 0,
  ProfileCreationFailed = -1,
  AclFailure = -2,
  ProcessCreationFailed = -3,
  InvalidArguments = -4,
  CapabilityError = -5,
};

// ============================================================================
// NAPI Exports
// ============================================================================

/**
 * Create a process running in AppContainer sandbox.
 *
 * Arguments:
 *   0: String - Command line (e.g., "node.exe agent.js")
 *   1: String - Workspace path (e.g., "C:\\Users\\Me\\.terminai\\workspace")
 *   2: Boolean (optional) - Enable internet access (default: true)
 *
 * Returns: Number
 *   - Positive: Process ID of spawned process
 *   - Negative: Error code (see AppContainerError enum)
 *     -1: Profile creation failed
 *     -2: ACL failure (workspace locked)
 *     -3: Process creation failed
 *     -4: Invalid arguments
 *     -5: Capability error
 *
 * @see architecture-sovereign-runtime.md Appendix M.6.1
 */
Napi::Value CreateAppContainerSandbox(const Napi::CallbackInfo& info);
Napi::Value CreateAppContainerSandboxWithEnv(const Napi::CallbackInfo& info);
Napi::Value EnsureAppContainerProfile(const Napi::CallbackInfo& info);

/**
 * Get the SID of the TerminAI AppContainer profile.
 *
 * Arguments: None
 *
 * Returns: String - SID in string format (e.g., "S-1-15-2-...")
 *          or empty string if profile doesn't exist
 */
Napi::Value GetAppContainerSid(const Napi::CallbackInfo& info);

/**
 * Delete the TerminAI AppContainer profile.
 * Call during uninstall or cleanup.
 *
 * Arguments: None
 *
 * Returns: Boolean - true if successful or profile didn't exist
 */
Napi::Value DeleteAppContainerProfile(const Napi::CallbackInfo& info);

// ============================================================================
// Internal Helpers
// ============================================================================

/**
 * Grant file system ACLs to AppContainer SID on a directory.
 * Without this, sandboxed process cannot read/write to workspace.
 *
 * @param workspacePath Path to directory to grant access
 * @param appContainerSid SID of the AppContainer profile
 * @return true on success, false on failure (ABORT LAUNCH!)
 *
 * @see architecture-sovereign-runtime.md Appendix M.6.2
 */
bool GrantWorkspaceAccess(const std::wstring& workspacePath, PSID appContainerSid);

/**
 * Check if a path is accessible by a given SID.
 *
 * @param path File or directory path
 * @param sid SID to check access for
 * @return true if accessible
 */
bool IsPathAccessible(const std::wstring& path, PSID sid);

/**
 * Convert UTF-8 string to UTF-16 (wstring).
 * Node.js passes UTF-8, Windows APIs want wchar_t.
 *
 * @param str UTF-8 encoded string
 * @return UTF-16 encoded wstring
 */
std::wstring Utf8ToWide(const std::string& str);

/**
 * Convert UTF-16 wstring to UTF-8 string.
 *
 * @param wstr UTF-16 encoded wstring
 * @return UTF-8 encoded string
 */
std::string WideToUtf8(const std::wstring& wstr);

/**
 * Get error message for HRESULT or GetLastError().
 *
 * @param error HRESULT or DWORD error code
 * @return Human-readable error message
 */
std::string GetWindowsErrorMessage(DWORD error);

} // namespace TerminAI

#else // Non-Windows platforms

#include <napi.h>

namespace TerminAI {

// Stub implementations for non-Windows platforms
Napi::Value CreateAppContainerSandbox(const Napi::CallbackInfo& info);
Napi::Value GetAppContainerSid(const Napi::CallbackInfo& info);
Napi::Value DeleteAppContainerProfile(const Napi::CallbackInfo& info);

} // namespace TerminAI

#endif // _WIN32
