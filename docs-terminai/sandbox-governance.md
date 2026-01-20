# Sovereign Sandbox Governance

The Sovereign Sandbox is a critical security boundary for TerminAI. Its
governance ensures that runtime drift is eliminated and all contract
interactions are versioned and audited.

## Ownership & Authority

1.  **Image Ownership**: The sandbox image is owned and pushed exclusively by
    the `Prof-Harita/terminaI` repository to `ghcr.io`.
2.  **Contract Enforcement**: All interactions between the CLI and the Sandbox
    MUST use the `terminai_apts` Python package.
3.  **Preflight Checks**: Every sandbox startup MUST execute
    `contract_checks.sh` to verify compatibility.

## Deployment Policy

- **Publishing**: Sandbox images are only published after passing the full
  contract test suite in CI.
- **Signing**: All published images are signed with `cosign` using the project's
  OIDC identity.
- **Auditing**: Every image includes a CycloneDX SBOM for supply chain
  transparency.

## Runtime Drift Prevention

The CLI performs a boot-time health check on the sandbox. If the image is found
to be incompatible (missing mandatory `terminai_apts` symbols), the CLI will
refuse to start the sandbox unless explicitly overridden by the user for
debugging purposes (`TERMINAI_SKIP_SANDBOX_HEALTH_CHECK`).
