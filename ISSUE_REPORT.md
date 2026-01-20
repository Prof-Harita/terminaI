# Issue Report: CLI Crash - Maximum Update Depth Exceeded

## 1. Issue Description
A user reported a crash while using the CLI agent to clean up their downloads folder. The application terminates with a React error: `Error: Maximum update depth exceeded`. This error occurs during the "Thinking" or "Responding" phase of the agent's workflow, specifically when the UI is displaying a loading spinner.

**Screenshot Evidence:**
- File: `20260119_052003.jpg` (User provided)
- Error Message: `Error: Maximum update depth exceeded. This can happen when a component repeatedly calls setState inside componentWillUpdate or componentDidUpdate. React limits the number of nested updates to prevent infinite loops.`
- Stack Trace Location: `.../node_modules/ink-spinner/build/index.js:12:13` inside `react-reconciler`.

## 2. Code-Specific Analysis
**Root Cause:**
The crash is caused by an infinite update loop originating from the `ink-spinner` library within the React 19 + Ink 6 environment.

**Context:**
- **Package:** `@terminai/cli`
- **Component Chain:**
  `AppContainer` -> `App` -> `DefaultAppLayout` -> `Composer` -> `LoadingIndicator` -> `GeminiRespondingSpinner` -> `CliSpinner` -> `ink-spinner`.
- **Dependencies:**
  - `react`: `^19.2.0` (New, experimental features)
  - `ink`: `npm:@jrichman/ink@6.4.6` (Custom fork)
  - `ink-spinner`: `^5.0.0` (Standard package)

**Mechanism:**
1. The `CliSpinner.tsx` component renders `Spinner` from `ink-spinner`.
2. `ink-spinner` uses a `useEffect` hook to set up a `setInterval` timer (default 80ms) which calls `setState` to update the spinner frame.
3. In the specific combination of React 19 (which has stricter batching and effect timing) and the custom Ink fork, the state update triggered by `ink-spinner` appears to cause a synchronous re-render loop or a conflict in the reconciliation phase.
4. React detects this infinite loop and throws "Maximum update depth exceeded" to prevent the process from hanging.

**Trigger:**
The issue manifests when `StreamingState` is `Responding`, which activates the `GeminiRespondingSpinner`.

## 3. Proposed Fix
**Strategy:** Replace `ink-spinner` with a local implementation.

**Why:**
- `ink-spinner` is a small library causing a critical stability issue due to environment incompatibility.
- A local implementation using standard `useState` and `useEffect` allows us to control the update scheduling and ensure it plays nicely with React 19 / Ink 6.
- It removes an external dependency that is currently a point of failure.

**Implementation Plan:**
1.  **Modify `packages/cli/src/ui/components/CliSpinner.tsx`**:
    - Remove `import Spinner from 'ink-spinner'`.
    - Implement a simple spinner using `const [frame, setFrame] = useState(0)` and `setInterval`.
    - Use the standard "dots" frames: `["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"]`.
    - Preserve the existing `debugState` tracking logic (used for performance profiling).

2.  **Verify Tests**:
    - Update `packages/cli/src/ui/components/CliSpinner.test.tsx` to verify the local spinner renders frames correctly.
    - Ensure `GeminiRespondingSpinner.test.tsx` passes.

This fix addresses the root cause by removing the incompatible library code while preserving the visual functionality.
