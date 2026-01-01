# TerminaI "Brain" Architecture: Before, OI, and Proposed

> A simple comparison of how TerminaI solves problems today, how Open
> Interpreter does it, and how TerminaI will do it after this upgrade.

---

## Comparison Table

| Problem                               | **Gemini CLI forked**                                         | **Open Interpreter**                                                       | **TerminaI**                                                                    |
| ------------------------------------- | ------------------------------------------------------------- | -------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| **How does it run code?**             | Runs one command, forgets everything, starts fresh next time. | Keeps a "notebook" open—variables and imports stay alive.                  | Same as OI: persistent sessions that remember everything.                       |
| **How does it think?**                | "Let me call a tool for that." Treats code as a last resort.  | "Let me try some code, see what happens, and adjust." Code is the default. | Adaptive: uses tools for simple tasks, escalates to code when needed.           |
| **Does it remember what it defined?** | No. If you say "use the data from before," it's confused.     | Yes. It knows `df` exists because it defined it earlier.                   | Yes. After each code run, it gets a summary: "You have: `df`, `config`."        |
| **What if code fails?**               | Shows the error. Might try again, might give up.              | Reads the error, understands it, fixes it, tries again.                    | Same as OI, plus explicit guidance: "Read the error and try a fix."             |
| **Is it safe?**                       | Runs commands only after you approve dangerous ones.          | Asks "Run this?" for everything, or runs everything automatically.         | Best of both: Safe commands run automatically. Dangerous ones require approval. |
| **Can it crash your system?**         | Low risk—each command is isolated.                            | Higher risk—installing packages affects your whole system.                 | Low risk—Python runs in an isolated sandbox (virtual environment).              |
| **What if it gets stuck in a loop?**  | You have to manually stop it.                                 | You have to manually stop it.                                              | Auto-detects runaway code and stops it after 30 seconds.                        |
| **Does it flood you with output?**    | Sometimes long outputs fill the screen.                       | Sometimes long outputs fill the screen.                                    | Smart truncation: shows the start and end, hides the middle.                    |

---

## The Key Insight

**Before**: TerminaI is a chatbot that can run commands.

**After**: TerminaI is an intelligent operator that picks the right tool for the
job—sometimes a simple command, sometimes exploratory code—and knows when to ask
for permission.

---

## Adaptive Intelligence: When to Use What

The upgraded TerminaI doesn't blindly use code for everything. It adapts:

| Task Type               | Best Approach                     | Example                                                                                |
| ----------------------- | --------------------------------- | -------------------------------------------------------------------------------------- |
| **System query**        | Tool                              | "What's my IP?" → Use `shell` tool directly.                                           |
| **Simple operation**    | Tool                              | "Delete file X" → Use `shell` tool.                                                    |
| **Unknown problem**     | Diagnose first, escalate if stuck | "Fix my wifi" → Run `nmcli`, `ping`. If that doesn't work, write code to analyze logs. |
| **Data transformation** | Evaluate options                  | "Convert docs to PDF" → Check for `libreoffice`, offer to install, or write code.      |
| **Exploration**         | Code-first                        | "Analyze this log file" → Load into Python, inspect, iterate.                          |

---

## What Makes This "Proposed" Version Better Than OI?

1. **Adaptive, Not Dogmatic**: OI defaults to code for everything. TerminaI uses
   the simplest solution that works.

2. **Safety First**: OI is either "ask for everything" or "run everything."
   TerminaI uses smart risk detection—safe code runs, dangerous code asks.

3. **Isolation**: OI installs packages directly to your system. TerminaI uses a
   sandbox, so experiments don't pollute your environment.

4. **Loop Detection**: OI can get stuck. TerminaI will automatically stop
   runaway code.

5. **Modern Infrastructure**: OI is Python-only. TerminaI is built on a modern
   TypeScript stack with proper tooling.

---

## Implementation

See [tasks_oi.md](../.local/tasks_oi.md) for the detailed implementation plan.
