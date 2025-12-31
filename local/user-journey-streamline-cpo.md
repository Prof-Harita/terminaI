# CPO Strategic UX Review: TerminaI (Deep Dive)

**Date:** 2025-12-29 **Reviewer:** CPO (Details Obsessed Persona) **Status:**
FINAL RIGOROUS REVIEW

---

## 1. The "pixel-perfect" Gap Analysis

I have reviewed the `user-journey-streamline.md` proposal. While architecturally
sound, it lacks **interaction fidelity**. It describes _what_ users see, but not
_how_ they feel the physics of the software.

We claim "99% of functionality in 1-2 clicks". I have audited this claim against
the physics of our current Tauri implementation. The claim is **FALSE** in 4
critical daily workflows due to unmanaged focus states and mouse dependency.

### Journey A: The First-Timer (The "Empty Room" Problem)

**Current Proposal:** "Add first-run modal with setup steps." **Gap Analysis:**

1.  **The Binary Gap:** User downloads binary. runs `./terminai`. What happens?
    - _Reality:_ Terminal window opens. Blank screen? Loading spinner?
    - _Failure:_ If the agent takes 2 seconds to boot, the user sees a broken
      app.
    - _Required Fix:_ Immediate "Shell" render. The UI frame must load in <50ms.
      The "Agent" connects asynchronously. "Connecting to Neural Core..."
      indicator in the header.
2.  **The Auth Cliff:** User clicks "Connect". They need an API key.
    - _Reality:_ They likely don't have one handy. They have to switch to
      Chrome, go to a URL, login, generate, copy, switch back.
    - _Context Loss:_ When they switch back, does the Input Field auto-focus? If
      not, that's an extra click.
    - _Rigor:_ The "Get Key" link must open the default browser. The app must
      listen for window focus `window.onfocus`. When focus returns,
      **AUTO-FOCUS** the API Key input field.

### Journey B: The Daily Driver (The "Focus" Tax)

**Current Proposal:** "Cmd+K Command Palette". **Gap Analysis:**

1.  **The Focus Trap:** I press `Cmd+K`. The palette opens. I select "Switch
    Model". I press Enter.
    - _The Trap:_ Does focus return to the Chat Input? Or does it stay on the
      (now closed) palette button?
    - _Rigor:_ **Every** slash command or palette action must explicitly return
      `focus()` to the main chat input. If I change the model, I want to type my
      prompt immediately. If I have to click the text box, you have failed.
2.  **The "Thinking" Blindness:** I send a message. The agent is thinking.
    - _Reality:_ The input box clears. I stare.
    - _The Friction:_ Did it send? Is it lagging?
    - _Rigor:_ The input box must "lock" (grey out) while sending, then
      immediately transition to a "Streaming" state. There must be **0ms**
      ambiguity about state.

---

## 2. Rigorous Audit of the "1-2 Click" Claim

I have traced the interaction steps for the top 5 daily actions.

| Action            | Proposed Steps      | Actual Physical Interaction (The Truth)                                                                                          | Friction Score           | Fix Required                                                                 |
| :---------------- | :------------------ | :------------------------------------------------------------------------------------------------------------------------------- | :----------------------- | :--------------------------------------------------------------------------- |
| **New Chat**      | 1. Click "New"      | 1. Move mouse to sidebar <br> 2. Click "New" <br> 3. **WAIT** for old context to clear <br> 4. **CLICK** input box to type       | **High** (Target missed) | `Cmd+N` must: Clear state AND Focus input.                                   |
| **Approve Tool**  | 1. Click "Approve"  | 1. Alert sound plays <br> 2. Locate dialog <br> 3. Move mouse <br> 4. Click "Allow" <br> 5. **CLICK** input box to resume typing | **Critical**             | `Cmd+Enter` (Allow) and `Esc` (Deny) global hotkeys. Auto-focus input after. |
| **Switch Model**  | 2. Header -> Select | 1. Move mouse to header <br> 2. Click Dropdown <br> 3. Scroll user's list <br> 4. Click Model                                    | **Medium**               | Reassign `Ctrl+M` to cycle recent models.                                    |
| **Copy Code**     | 2. Hover -> Copy    | 1. Scroll to code block <br> 2. Hover header <br> 3. Click "Copy"                                                                | **Low**                  | Acceptable.                                                                  |
| **Edit Last Msg** | ? (Not defined)     | 1. Scroll up <br> 2. Copy text <br> 3. Paste in box <br> 4. Edit                                                                 | **High**                 | Up-Arrow in empty input box MUST populate with last prompt.                  |

**Verdict:** The proposal ignores the "Return to Home" cost (clicking the input
box). We are bleeding clicks everywhere.

---

## 3. Deep Dive: Settings Architecture (The "Logic" Check)

I reviewed your L2-L4 hierarchy. There are logic errors in the categorical
buckets.

### The "Tools" vs "Integrations" Confusion

- **Current:** `Tools -> GUI Automation` vs `Integrations -> MCP`.
- **Critique:** "MCP" provides "Tools". "GUI Automation" is a "Tool". Why are
  they in different top-level buckets?
- **The User Mental Model:** Users don't care about the _source_ of the tool
  (Native vs MCP). They care about _capability_.
- **Fix:** Merge `Tools` and `Integrations`.
  - **New L2 Category:** `Capabilities`
    - L3: `Native Tools` (Shell, File Edit)
    - L3: `Plugins (MCP)` (Github, Brave)
    - L3: `Automation` (GUI, Hooks)

### The "Voice" Ghetto

- **Current:** Top-level `Voice` category.
- **Critique:** Voice is an _Input Method_, not a feature silo.
- **Fix:**
  - Move `STT Provider`, `Whisper Path` to `Capabilities -> Audio`.
  - Move `Push to Talk Key` to `General -> Input & Hotkeys`.
  - **Why?** Users looking for keybindings look in "General". Users configuring
    AI models look in "Capabilities". Splitting them by "Voice" fragments the
    configuration.

### The "Context" Orphan

- **Current:** Top-level `Context` category.
- **Critique:** Context settings (`.gitignore`, `Memory File`) are fundamentally
  about **Project Configuration**.
- **Fix:** Rename `Context` to `Project`.
  - This aligns with standard IDE mental models (VS Code "Workspace Settings").

---

## 4. Failure State & Error Recovery Specifications

The document ignores what happens when things break.

### Scenario: The "Zombie" Process

- **State:** User runs a command. `npm install` hangs. The Spinner spins
  forever.
- **Current UX:** ?
- **Required Rigor:**
  - **The "Stop" Interaction:** A generic "Stop" button is insufficient.
  - **Visual Feedback:** When "Stop" is clicked:
    1.  UI must immediately show "Sending SIGINT...".
    2.  If process persists > 2s, button changes to "Force Kill (SIGKILL)".
    3.  Color shifts Orange -> Red.
  - _Why?_ Users panic when "Stop" doesn't work instantly. Give them the nuclear
    option explicitly.

### Scenario: The Token Limit Cliff

- **State:** Session exceeds `model.maxSessionTurns` or context window.
- **Current UX:** The model returns a generic API error or hallucinated "I can't
  remember".
- **Required Rigor:**
  - **Pre-emptive Warning:** When context > 90%, the "Context Indicator" in
    header must pulse Yellow.
  - **The "Context Bankruptcy" Flow:** When limit is hit, do NOT show an error.
  - **Actionable Modal:** "Context Limit Reached. Options: [Summarize &
    Continue] OR [Start New Chat]".

### Scenario: The Disconnected Relay

- **State:** Network drops. WebSocket disconnects.
- **Current UX:** UI freezes.
- **Required Rigor:**
  - **Skeleton State:** The chat UI must remain visible (read-only). Do not
    blank the screen.
  - **Toast:** "Connection Lost. Retrying in 3s..." (Persistent at top).
  - **Optimistic Updates:** Disable the Input Box. Do not let user type message
    that will fail.

---

## 5. Precise Implementation Specs (The "How")

### Spec: "Living Onboarding" Script

This is the **exact text** and logic for the onboarding flow. No rigid modals.

**Phase 1: Boot**

- _Agent:_ (System Message) "Booting TerminaI Core... [OK]"
- _Agent:_ (System Message) "Checking Neural Connection... [Missing Key]"

**Phase 2: The Ask**

- _Agent:_ "Welcome, User. I am your Terminal Agent. To operate, I need a Neural
  Engine (LLM) connection."
- _Agent:_ "Please paste your **Google Gemini API Key** below."
- _UI:_ [Button: Get Key for Free] (Opens browser)

**Phase 3: The Validation**

- _User:_ Pastes `AIzaSy...`
- _UI Logic:_ RegEx confirm `^AIza[0-9A-Za-z-_]{35}$`.
- _UI:_ Show "Verifying..." spinner inline.
- _Agent:_ "Key Validated. Model: `gemini-pro-1.5`. I am ready."

**Phase 4: The Introduction**

- _Agent:_ "I have full access to this directory: `/home/user`. Try asking me
  to: `explain what this repo does`."

### Spec: Unified Command Palette Ranking Algorithm

When user types "Voice" in `Cmd+K`:

**Priority 1: Actions (Verbs)**

- `Toggle Voice Mode` (Action) -> Top Result

**Priority 2: Settings (Nouns)**

- `Open Voice Settings` (Navigation) -> 2nd Result

**Priority 3: Related Commands**

- `/voice` (Slash Command) -> 3rd Result

**Priority 4: Content**

- `Resume Chat: Voice Experiment` (History) -> 4th Result

_Constraint:_ Search must be fuzzy (`voce` matches `voice`). Search must match
aliases (`mic` matches `voice`).

---

## 6. Strategic "Wiggle Room" (No Backend Changes)

We are constrained to NO BACKEND changes. Here is how we cheat to achieve better
UX:

1.  **Client-Side "Aliases":** The backend doesn't support `/theme`. The Backend
    doesn't need to.
    - _Trick:_ The Frontend intercepts `/theme dark`. It does NOT send it to the
      agent. It sets the local state `setTheme('dark')` and inserts a fake
      "System Message" saying "Theme set to Dark".
    - _Benefit:_ zero-latency, no backend work required actions.

2.  **Optimistic "Approvals":**
    - _Trick:_ When user presses `Cmd+Enter` on a confirmation, the UI
      immediately marks it "Approved" and fades the specific confirmation block,
      _before_ the backend ACK returns.
    - _Benefit:_ Perceived latency drops from 100ms to 0ms.

3.  **Local "Context Checking":**
    - _Trick:_ The frontend knows the file size of files dropped. It can warn
      "File too large (10MB)" _before_ uploading to the backend context.
    - _Benefit:_ Prevents backend error throws.

---

## 7. Revised Prioritized Recommendations

### P0 (The "Must Fix Now" - Critical Experience Breakers)

1.  **Focus Management:** Implement `focus()` recapture on **every** tool
    completion and modal close. (Effort: Medium)
2.  **Global Hotkeys:** `Cmd+N` (New), `Cmd+K` (Palette), `Cmd+Enter` (Approve).
    (Effort: Low)
3.  **Client-Side Command Interception:** Implement the middleware to trap
    `/theme`, `/voice` purely in frontend. (Effort: Medium)

### P1 (The "Structure Fixes" - Mental Model Alignment)

4.  **Refactor Settings Hierarchy:** Merge Tools/Integrations -> `Capabilities`.
    Rename Context -> `Project`. (Effort: Low)
5.  **"Shell-First" Boot:** Ensure the UI frame renders instantly before Agent
    connection. (Effort: Medium)
6.  **Up-Arrow History:** Implement command history navigation in the Input Box.
    (Effort: Low)

### P2 (The "Delight" - Physics)

7.  **Smart Expand:** Auto-collapse outputs > 10 lines. (Effort: Medium)
8.  **Voice State UI:** `Idle` vs `Processing` distinct visual states. (Effort:
    Medium)

---

## 8. Final Directive

The previous proposal was a **Map**. This document is the **Physics Engine**.

We are not just reorganizing menus. We are managing **milliseconds of latency**
and **pixels of focus**.

**Execute the "Rigorous Audit" items first.** A pretty settings menu is useless
if the user has to click the input box 50 times a day.
