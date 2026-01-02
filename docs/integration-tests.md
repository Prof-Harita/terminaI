# Integration Tests

> **TerminaI Note:** Integration tests are **not run** in TerminaI CI/CD. These
> tests validate upstream Gemini CLI functionality, which is already tested by
> Google. Since TerminaI syncs weekly from upstream, we rely on their testing.
>
> See [upstream_maintenance.md](../docs-terminai/upstream_maintenance.md) for
> our sync strategy.

---

## For Local Development Only

If you need to run integration tests locally (e.g., to debug a specific tool),
the upstream documentation below remains valid. However, the
`integration-tests/` directory and related scripts have been removed from
TerminaI to reduce CI costs.

To run integration tests, you can:

1. Clone the upstream
   [google-gemini/gemini-cli](https://github.com/google-gemini/gemini-cli)
2. Run their integration tests there

---

## Original Upstream Documentation

This document provides information about the integration testing framework used
in the original Gemini CLI project.

### Overview

The integration tests are designed to validate the end-to-end functionality of
the Gemini CLI. They execute the built binary in a controlled environment and
verify that it behaves as expected when interacting with the file system.

### Running the tests (in upstream repo)

```bash
npm run bundle
npm run test:integration:all
```

### Sandbox matrix

- `sandbox:none`: Runs the tests without any sandboxing.
- `sandbox:docker`: Runs the tests in a Docker container.
- `sandbox:podman`: Runs the tests in a Podman container.

For full documentation, see the
[upstream docs](https://github.com/google-gemini/gemini-cli/blob/main/docs/integration-tests.md).
