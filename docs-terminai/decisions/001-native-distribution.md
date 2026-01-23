# Decision: Native Module Distribution

**Status:** Accepted **Date:** 2026-01-23

## Context

We need to distribute `terminai_native.node` (and potentially other native
artifacts) without requiring users to have a C++ toolchain (Visual Studio,
Xcode, make/g++) installed. We also must strictly avoid committing binary
artifacts to the git repository (see CI Hardening Day 9).

## Decision

We will use **Platform-Specific Prebuilds** distributed via **GitHub Releases**.

1.  **CI Build:**
    - The Release workflow will compile `terminai_native` for supported targets:
      - `win32-x64`
      - `darwin-x64`
      - `darwin-arm64`
      - `linux-x64`
    - Artifacts will be uploaded as assets to the GitHub Release (e.g.
      `terminai-native-v1.2.3-win32-x64.tar.gz`).

2.  **Runtime Loading:**
    - **Dev Mode:** Tries to load from
      `packages/cli/build/Release/terminai_native.node` (local build).
    - **Production/Distribution:** The `npm` package will either:
      - Include the prebuilds (if size permits), OR
      - Download the appropriate prebuild during `postinstall`.
    - **Selected Strategy:** `postinstall` download is preferred to keep npm
      package size small and platform-agnostic, OR using `optionalDependencies`
      with platform-specific packages (requires more npm publishing
      coordination).
    - **Recommendation:** Start with `prebuild-install` or similar `postinstall`
      script fetching from GitHub Releases.

## Consequences

- **Pros:** Clean repo, no toolchain requirement for users, standard Node.js
  native pattern.
- **Cons:** Release workflow complexity increases (must build on 3 OSes).
- **Mitigation:** We already have Matrix CI. We just need to add the asset
  upload step.
