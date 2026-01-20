# Sandbox Environment Variables

TerminAI uses environment variables to configure its sandbox environment.

## Principal Variables

| Variable                             | Description                                                  | Default       |
| ------------------------------------ | ------------------------------------------------------------ | ------------- |
| `TERMINAI_SANDBOX`                   | Sandbox command to use (`docker`, `podman`, `sandbox-exec`). | Auto-detected |
| `TERMINAI_SKIP_SANDBOX_HEALTH_CHECK` | If set to `true`, skips the boot-time health check.          | `false`       |
| `TERMINAI_SANDBOX_PROXY_COMMAND`     | Command to run as a proxy for network access.                | None          |

## Resource Mounts & Flags

| Variable                  | Description                                                          |
| ------------------------- | -------------------------------------------------------------------- |
| `TERMINAI_SANDBOX_FLAGS`  | Additional flags to pass to the sandbox command (e.g. `--gpus all`). |
| `TERMINAI_SANDBOX_MOUNTS` | Comma-separated list of `from:to:opts` path mounts.                  |
| `TERMINAI_SANDBOX_ENV`    | Comma-separated list of `KEY=VALUE` pairs to pass into the sandbox.  |

## Legacy Support

The following legacy `GEMINI_*` variables are still supported but deprecated:

- `GEMINI_SANDBOX`
- `GEMINI_SANDBOX_PROXY_COMMAND`
- `SANDBOX_FLAGS`
- `SANDBOX_MOUNTS`
- `SANDBOX_ENV`
