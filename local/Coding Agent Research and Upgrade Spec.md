# **Architectural Divergence in Autonomous Coding Agents: A Comprehensive Analysis and Technical Specification for the Next-Generation Gemini CLI**

## **1\. The Paradigm Shift: From Syntax Generation to Flow State ("Vibe Coding")**

The discipline of software engineering is currently navigating a phase
transition of a magnitude comparable to the shift from punch cards to
interactive terminals, or from command-line interfaces to graphical user
interfaces. This transition is characterized by the evolution of Artificial
Intelligence from "Copilot" architectures—stochastic text completion engines
integrated into the editor loop—to "Autonomous Agents" or "Vibe Coding"
interfaces. In the former paradigm, the AI served as a sophisticated
autocomplete, offering syntactic suggestions while the human developer
maintained tight control over the implementation details. In the emerging "Vibe
Coding" paradigm, the human developer shifts from a writer of syntax to an
architect of intent, delegating the implementation, debugging, and execution
loops to an AI system that possesses agency, persistence, and tool use
capabilities.

"Vibe Coding" is not merely a marketing colloquialism; it represents a specific
mode of Human-Computer Interaction (HCI) where the friction of
implementation—the lookup of syntax, the writing of boilerplate, the manual
correction of linter errors—is abstracted away, allowing the developer to
maintain a continuous "flow state" focused solely on logic and architecture.
This state requires the AI agent to possess a high degree of autonomy and,
crucially, a reliability threshold that builds sufficient trust for the user to
look away while the agent works.

The market has bifurcated into "winners"—tools like Cursor, Aider, and Claude
Code that successfully induce this flow state through sophisticated peripheral
architectures—and "losers" (or laggards) like the current Gemini CLI and Cline,
which fail to achieve it. The distinction lies not necessarily in the underlying
Large Language Model (LLM) performance, as many use similar foundation models,
but in the engineering of the "Agentic Loop": the system of context management,
safety checks, and error correction that surrounds the model.

This report provides an exhaustive technical analysis of these architectures,
identifying the specific mechanisms that determine success. Following this
forensic analysis, the report presents a comprehensive technical specification
for "Gemini Prime," a proposed upgrade to the Gemini CLI that leverages Google's
specific advantages (Context Caching, 2M+ token windows) to surpass current
market leaders.

## ---

**2\. Architectural Forensics of Market Leaders**

To engineer a superior agent, one must first isolate the mechanisms that enable
the current leaders to outperform standard LLM interactions. The success of
Cursor, Aider, and Claude Code is attributed to their distinct resolutions of
three fundamental problems in AI coding: **Context Fragmentation**, **Execution
Safety**, and **Iterative Correction**.

### **2.1. Cursor: The Shadow Workspace and the Latency of Verification**

Cursor has captured significant market share by forking Microsoft's VS Code, a
strategic decision that allows it to control the editor runtime environment down
to the electron layer. While its integration of models like Claude 3.5 Sonnet is
notable, its "killer feature" is the implementation of the **Shadow Workspace**,
a mechanism designed to solve the problem of "Hallucinated Syntax."

#### **2.1.1. The Hallucination Problem in Static Environments**

Standard coding agents frequently generate code that is syntactically plausible
but semantically invalid—referencing undefined variables, hallucinating library
methods, or violating type constraints. In a standard "Copilot" workflow, the
user must visually inspect the code, accept it, wait for the Language Server
Protocol (LSP) to flag errors, and then manually prompt the AI to fix them. This
"accept-reject-fix" loop breaks the flow state.

#### **2.1.2. Technical Implementation of the Shadow Workspace**

Cursor addresses this by decoupling the AI's generation process from the user's
visible buffer.

- **Parallel Instantiation:** When the "Composer" or agent features are engaged,
  Cursor spawns a hidden window or background process that mirrors the user's
  current workspace state.1 This shadow instance loads the full project context,
  including LSP connections and compiler configurations.
- **LSP Interception and Verification:** When the background AI generates a code
  block, it is first applied to this shadow instance rather than the user's
  screen.2 The agent effectively "types" into the hidden window and immediately
  queries the LSP for diagnostics (lints, type errors, compiler warnings).
- **The Self-Correction Loop:** If the LSP reports errors—for example, an
  "Undefined Symbol" error because the AI guessed a method name—the agent
  captures this diagnostic feedback within the shadow environment. It then
  iterates on the code, effectively "debugging" its own output in the
  background.1
- **Presentation of Validated State:** Only after the code passes these
  automated checks (or reaches a confidence threshold) is it presented to the
  user. To the user, the AI appears "smarter" because the visible output is
  pre-validated.

The resource implications of this architecture are significant. Running a shadow
workspace effectively doubles the memory footprint of the IDE, as it may require
duplicate instances of language servers (e.g., tsserver, rust-analyzer) and file
watchers.1 However, the trade-off is acceptable to professional developers
because it minimizes **Verification Latency**—the time cost between receiving AI
output and verifying its correctness.

### **2.2. Aider: The Repository Map and Graph-Based Context Theory**

Aider, a command-line tool, dominates the "headless" coding niche. Lacking the
graphical affordances of an IDE, Aider cannot rely on user-initiated "tabs" or
visual cues. Instead, it solves the **Context Relevance** problem through a
sophisticated implementation of the **Repository Map** (Repo Map).

#### **2.2.1. The Failure of Naive RAG in Code**

Standard Retrieval Augmented Generation (RAG) relies on vector embeddings and
semantic similarity search (e.g., cosine similarity). This approach often fails
in software engineering because code semantics are not always linguistic. A
query about "Authentication" might semantically match auth.py, but the bug might
actually be in a User class in models.py or a configuration file in config/.
These files are linked by **syntactic dependency**, not semantic similarity.

#### **2.2.2. Tree-Sitter and the Abstract Syntax Tree (AST)**

Aider abandons vector search in favor of structural graph analysis. It utilizes
**Tree-sitter**, an incremental parsing system, to generate a concrete Abstract
Syntax Tree (AST) of the codebase.3

- **Extraction Strategy:** Aider parses source files to identify high-value
  identifiers: function signatures, class definitions, and type declarations.
  Crucially, it discards implementation details (function bodies) to compress
  the information density.3
- **The tags.scm Query System:** Aider relies on Scheme-based query files
  (tags.scm) derived from the Tree-sitter ecosystem to define what constitutes a
  "definition" or "reference" for each language.5 This allows distinct handling
  for different languages (e.g., capturing classes in Python vs. interfaces in
  TypeScript) without changing the core logic.6
- **Graph Construction and PageRank:** Aider builds a directed graph where nodes
  are symbols (classes, functions) and edges are relationships (calls, inherits,
  imports). It then applies a graph ranking algorithm, conceptually similar to
  PageRank, to determine the "centrality" or relevance of code snippets based on
  the user's current focus.3 If a user is editing Function A, the graph
  algorithm identifies that Function B (which calls A) and Class C (which A
  returns) are the most critical context pieces, regardless of their semantic
  text similarity.

This "Repo Map" is essentially a compressed skeleton of the codebase that fits
within the context window (1k-2k tokens) of the LLM, providing a map of the
territory without the token cost of reading every file.4 This structural
understanding allows Aider to perform complex refactors across files that
standard RAG systems miss.

### **2.3. Claude Code: The Strategic Agent and Persistent Memory**

Claude Code (and its "Plan Mode") introduces the concept of the **Strategic
Agent**. Unlike autocomplete, which is reactive, Claude Code is proactive,
utilizing distinct modes for architectural reasoning versus implementation.

#### **2.3.1. Plan Mode: System 2 Thinking in UX**

Claude Code implements a user experience that mimics the "Chain of Thought"
(CoT) prompting technique but elevates it to an interface paradigm.

- **Separation of Concerns:** The tool distinguishes between "Planning"
  (read-only analysis) and "Execution" (write operations).7 In "Plan Mode"
  (toggled via Shift+Tab), the agent is restricted from editing files. Instead,
  it consumes the project context and proposes a multi-step implementation
  strategy.8
- **User-in-the-Loop Validation:** This mode forces a synchronization point
  where the human architect verifies the _approach_ before any code is written.
  This prevents the "Rabbit Hole" effect where an agent writes thousands of
  lines of code based on a misunderstood requirement.

#### **2.3.2. CLAUDE.md: The External Memory**

Claude Code solves the "Amnesia" problem of stateless LLM sessions through the
CLAUDE.md file.

- **Persistent Context:** This markdown file acts as a repository for
  project-specific knowledge: architectural patterns, code style guidelines,
  testing commands, and "lessons learned" from previous sessions.9
- **Automatic Ingestion:** The agent automatically reads this file at the start
  of every session, effectively "priming" its latent space with the project's
  specific culture and constraints.7 This is a low-tech but highly effective
  form of long-term memory that is superior to vector stores for storing
  high-level directives (e.g., "Always use spaces, not tabs," or "Never touch
  the legacy billing module").

#### **2.3.3. The Model Context Protocol (MCP)**

Claude Code utilizes the **Model Context Protocol (MCP)** to standardize
connections to external tools. Acting as an MCP Client, it can connect to MCP
Servers (e.g., for GitHub, PostgreSQL, or Sentry).10 This moves the agent beyond
the filesystem, allowing it to interact with the broader DevOps
infrastructure—checking Jira tickets, querying database schemas, or reading
production logs—without requiring bespoke integrations for every tool.9

## ---

**3\. Pathology of the Underperformers: Gemini CLI and Cline**

Despite access to powerful models like Gemini 1.5 Pro and Claude 3.5 Sonnet, the
current Gemini CLI and Cline fail to capture the "winning" user experience due
to specific architectural deficits.

### **3.1. Gemini CLI: The "Stateless Pipe" Fallacy**

The current iteration of Gemini CLI functions primarily as a thin wrapper around
the Gemini API. While it offers generous free quotas and huge context windows,
its architecture limits its utility as an autonomous agent.

- **Lack of Agency:** The CLI defaults to a "Question-Answer" interaction model
  rather than a "Loop-Reason-Act" model. It does not natively support a
  persistent "Shadow Workspace" or a sophisticated "Repo Map".12 It relies on
  the user to manually pipe context (e.g., gemini \-p "Fix this" file1.py
  file2.py), shifting the burden of context selection back to the human.
- **The Safety Void:** Executing shell commands suggested by Gemini CLI is
  inherently risky. There is no transactional rollback mechanism; a hallucinated
  rm \-rf or a file overwrite is permanent.13 This lack of safety guarantees
  forces the user to scrutinize every output, preventing the "vibe" or flow
  state.
- **Tooling Isolation:** Unlike Claude Code's MCP integration, Gemini CLI has
  limited native extensibility, relying on basic built-in tools or custom
  extensions that lack a standardized protocol.14

### **3.2. Cline: The Economic Inefficiency of Naive Looping**

Cline (formerly Claude Dev) attempts to implement the agentic loop inside VS
Code but demonstrates the economic and performance risks of poor context
management.

- **Token Exhaustion:** Without a highly optimized Repo Map like Aider's, Cline
  often reads full files to understand context. When combined with the high
  token costs of Opus or Sonnet models, a single debugging session can cost
  between $0.50 and $2.00.15
- **Fragile Looping:** Cline frequently enters "correction loops," where it
  attempts to fix a bug, fails, reads the error, and tries again. Without the
  "Shadow Workspace" to filter these attempts, the user watches the agent flail,
  which degrades trust. The agent often decides a task is "done" prematurely or
  gets stuck oscillating between two incorrect solutions.15

## ---

**4\. The Horizon: Antigravity and the Mission Control Metaphor**

Google has recognized these limitations and is pivoting toward **Antigravity**
and **Project IDX**, which introduce a new metaphor for AI interaction.

### **4.1. From Text Editor to Agent Manager**

Antigravity represents a shift from "Text Editor with AI" to "Agent Management
Console."

- **Mission Control Interface:** Instead of a file tree, the primary interface
  is an "Agent Manager" where users assign high-level tasks (e.g., "Refactor
  Auth Module") to asynchronous agents.16
- **Asynchronous Parallelism:** Unlike the linear chat interfaces of Aider or
  Claude Code, Antigravity allows multiple agents to work on different parts of
  the codebase simultaneously.18 One agent might be updating documentation while
  another refactors a test suite.
- **Artifact-Centric Output:** Agents produce "Artifacts" (plans, diffs, docs)
  rather than just streaming text.16 This aligns with the "Artifacts" feature
  seen in Claude's web interface, providing a structured way to review agent
  output.

While Antigravity targets the "Full IDE" market, there remains a significant gap
for a **CLI-based Antigravity**—a tool that brings "Mission Control"
capabilities to the terminal for power users who prefer the speed and
composability of the shell.

## ---

**5\. Gemini Prime: Technical Specification for a State-of-the-Art Agent**

To transform the Gemini CLI into a top-tier "vibe coding" agent ("Gemini
Prime"), we must implement a **Transactional, Context-Aware, Agentic Shell**.
This specification details the architecture, leveraging Google's unique
advantages in context caching and model latency.

### **5.1. Core Philosophy: The Transactional Shell (OS-Level Safety)**

The single biggest barrier to trusting an AI agent in the terminal is fear of
destructive action. To solve this, Gemini Prime must implement **OS-Level
Undo**. The agent should operate inside a lightweight sandbox where every action
is reversible _instantly_.

#### **5.1.1. The "Phantom Fragment" Filesystem Strategy**

Instead of heavy virtualization (Docker), we propose virtualizing the
_filesystem state_ using native OS snapshot capabilities. This allows the agent
to see all local tools (compilers, git, databases) but allows the user to hit
"Undo" if the agent destroys the environment.

##### **Linux Implementation: Btrfs/OverlayFS**

- **Mechanism:** Before the agent executes a command sequence (e.g., pip
  install..., refactor.py), the CLI triggers a Btrfs subvolume snapshot.19
- **Performance:** Btrfs snapshots are atomic and near-instant (O(1)).
- **Recovery:** If the agent fails or hallucinates, the user issues /undo. The
  CLI mounts the snapshot and restores the subvolume state.21
- **Alternative (OverlayFS):** For non-Btrfs systems, use overlayfs to create a
  temporary "upper" directory. The agent writes to the upper dir. If accepted,
  changes are merged down. If rejected, the upper dir is discarded.22 This is
  effectively a "Copy-On-Write" layer for the shell.

##### **macOS Implementation: APFS Snapshots**

- **Mechanism:** Use tmutil localsnapshot to create an APFS snapshot before
  complex agent actions.23
- **Command Wrapper:** The CLI acts as a wrapper that manages these snapshots.

_Pseudocode for Safety Wrapper:_

Bash

\# gemini-exec-wrapper.sh  
function execute_safely(command) {  
 echo "Creating safety snapshot..."  
 SNAPSHOT_ID=$(tmutil localsnapshot | awk \-F'com.apple.TimeMachine.' '{print
$2}' | tr \-d '\])')

    \# Execute the agent's command
    eval "$command"
    EXIT\_CODE=$?

    if; then
        echo "Command failed with error. Initiating rollback..."
        tmutil restore\_snapshot "$SNAPSHOT\_ID"
    else
        read \-p "Keep changes? " confirm
        if \[ "$confirm" \== "n" \]; then
             tmutil restore\_snapshot "$SNAPSHOT\_ID"
        fi
    fi

}

#### **5.1.2. The "Dry Run" Simulator**

Before executing destructive commands (rm, mv, dd), Gemini Prime must simulate
the outcome.

- **Trace Mode:** Use strace (Linux) or dtruss (macOS) in a dry-run mode to see
  which files _would_ be touched.
- **Heuristic Blocking:** Block commands matching high-risk patterns (rm \-rf /,
  mkfs) regardless of context, utilizing a "Deny List" policy.25

### **5.2. The Memory Subsystem: Hybrid Graph-Vector Indexing**

Gemini 1.5 Pro features a 2-million token context window.26 This allows for a
more aggressive Repo Map than Aider's, but we still need structure to prevent
"lost in the middle" hallucinations and to optimize costs.

#### **5.2.1. The Neo-RepoMap Architecture**

We propose a three-layer context architecture that combines the precision of
Aider's graph with the scale of Gemini's context window.

| Layer  | Component        | Function                                       | Technology                      |
| :----- | :--------------- | :--------------------------------------------- | :------------------------------ |
| **L1** | **The Skeleton** | Dependency Graph (Classes, Functions, Imports) | tree-sitter, tags.scm, NetworkX |
| **L2** | **The Flesh**    | Full Source Code of Active Modules             | Gemini Context Caching (TTL 1h) |
| **L3** | **The Vector**   | Semantic Search for Docs/Config                | sqlite-vss or chromadb          |

- **L1 (The Skeleton):** We adopt Aider’s tags.scm approach to build a
  dependency graph.
  - _Implementation:_ Integrate tree-sitter-languages (Python package).
  - _Query:_ Use tags.scm to extract all classes, functions, and global
    variables.5
  - _Graph:_ Build a NetworkX graph where nodes are symbols and edges are
    calls/inheritances.
- **L2 (The Flesh):** Unlike Aider which summarizes implementation to save
  tokens, Gemini Prime will **cache the full source code** of the top 20% most
  active files using Gemini’s **Context Caching** API.28
  - _Cost Efficiency:_ Context caching reduces the cost of repeated input tokens
    by \~90%.29 This makes "keeping the whole core module in memory"
    economically viable. This solves the "Hallucination by Omission" problem
    where the AI guesses how a function works because it can only see the
    signature.
- **L3 (The Vector):** For massive repositories, use a local vector store to
  find relevant files that are _not_ connected via direct graph edges (e.g.,
  finding config.yaml when working on db_connection.py).30

#### **5.2.2. Dynamic Context Pruning Algorithm**

The agent must dynamically adjust the Repo Map based on the conversation turn.

Python

import tree_sitter  
import networkx as nx

class NeoRepoMap:  
 def \_\_init\_\_(self, root_dir):  
 self.graph \= nx.DiGraph()  
 self.parser \= self.\_init_parser()

    def scan\_file(self, file\_path):
        """
        Parses file using language-specific tags.scm.
        Nodes are defined by 'definition' captures.
        Edges are defined by 'reference' captures.
        """
        tree \= self.parser.parse(read\_file(file\_path))
        query \= self.load\_query(file\_path.extension) \# loads tags.scm

        captures \= query.captures(tree.root\_node)

        for node, tag in captures:
            if tag \== 'definition':
                self.graph.add\_node(node.text, type\='def', file=file\_path)
            elif tag \== 'reference':
                \# Link reference to the definition in the graph
                target \= self.resolve\_reference(node.text)
                if target:
                    self.graph.add\_edge(file\_path, target, type\='calls')

    def get\_context\_for\_query(self, user\_query, active\_file):
        """
        Uses PageRank to find most relevant connected code.
        """
        \# Seed the ranking with the active file and query terms
        personalization \= {active\_file: 1.0}

        \# Run PageRank on the dependency graph
        ranking \= nx.pagerank(self.graph, personalization=personalization)

        \# Select top nodes until token limit (e.g., 20k tokens)
        selected\_nodes \= sorted(ranking, key=ranking.get, reverse=True)
        return self.render\_tree(selected\_nodes)

Analysis of Algorithm:  
This approach leverages "Code as Graph" theory. Unlike text search, which finds
strings, this finds dependencies. If the user modifies a function in
active_file, the graph immediately identifies which other files import that
function, allowing the agent to preemptively check for breaking changes—a key
capability for autonomous refactoring.

### **5.3. The Executive Subsystem: ReAct Loops & MCP Host**

The "Brain" of Gemini Prime moves beyond a simple Chat Loop to a **Mission
Control Architecture**.

#### **5.3.1. Multi-Agent Topology (The "Antigravity" Model)**

Gemini Prime will spawn sub-agents for specific tasks. This prevents the
"Context Pollution" that happens when one chat thread tries to do everything.

- **The Architect (Manager):**
  - _Role:_ Parses user intent, plans the workflow, creates sub-tasks.
  - _Context:_ High-level README.md, GEMINI.md, file structure.
  - _Output:_ A JSON plan passed to Worker Agents.
- **The Coder (Worker):**
  - _Role:_ Implements a specific feature.
  - _Context:_ Specific source files \+ Repo Map of dependencies \+ Cached
    Context.
  - _Tools:_ File edit, Shell execute (sandboxed).
- **The Reviewer (QA):**
  - _Role:_ Runs tests, checks lints, critiques the Coder's diff.
  - _Context:_ Test results, linter output.

#### **5.3.2. Model Context Protocol (MCP) Host Implementation**

Gemini Prime must act as an **MCP Host**.9 This is critical for moving beyond
"files on disk" to "system awareness."

- **Extensibility:** By supporting MCP, Gemini Prime instantly gains access to
  GitHub, PostgreSQL, Sentry, and Slack without custom code.
- **Implementation:**
  - Include a strictly typed MCP Client in the CLI.
  - Allow users to define MCP servers in GEMINI.md or global config.
  - _Example Config:_  
    JSON  
    {  
     "mcpServers": {  
     "github": { "command": "npx", "args": \["-y",
    "@modelcontextprotocol/server-github"\] },  
     "postgres": { "command": "docker", "args": \["run", "mcp-pg"\] }  
     }  
    }

### **5.4. UX and TUI: The "Vibe" Layer**

To compete with Cursor, the CLI experience must be rich and visual, not just
streaming text.

- **TUI Framework:** Use Bubbletea (Go) or Textual (Python) for the interface.
- **Live Diffing:** Show colored diffs of proposed changes _before_ applying
  them.
- **Conversation Branching:** Allow the user to fork the conversation (e.g., "Go
  back to before we tried the async refactor") leveraging the internal state
  management.

## ---

**6\. Economic & Operational Analysis**

### **6.1. Economic Implications of Context Caching**

Gemini 1.5 Pro's pricing model fundamentally alters the architecture of coding
agents.

- **Standard Model (GPT-4o/Claude 3.5):** Every turn of the conversation
  re-sends the entire context (files, history, repo map).
  - _Cost:_ $O(N \\times T)$ where $N$ is turns and $T$ is tokens.
- **Cached Model (Gemini 1.5):** The "static" part of the context (the codebase)
  is cached.
  - _Cost:_ $O(T\_{cache}) \+ O(N \\times T\_{diff})$.
  - _Impact:_ This allows "Gemini Prime" to load a 100,000-line codebase (\~1M
    tokens) into the cache once. Subsequent queries are extremely cheap and
    fast. This enables "Global Reasoning" (e.g., "Check the entire repo for
    deprecated API usage") which is prohibitively expensive on other
    platforms.28

### **6.2. Comparative Feature Matrix**

| Feature                  | Gemini Prime (Proposed)           | Cursor                    | Aider                        | Claude Code               | Gemini CLI (Current) |
| :----------------------- | :-------------------------------- | :------------------------ | :--------------------------- | :------------------------ | :------------------- |
| **Context Architecture** | **Hybrid (Graph \+ 2M Cache)**    | RAG \+ Active File        | Tree-sitter Graph (Repo Map) | File Read / RAG           | Manual / Glob        |
| **Execution Safety**     | **OS-Level Snapshot (Undo)**      | Shadow Workspace (Linter) | Git Commits (Soft Undo)      | User Approval             | None (High Risk)     |
| **Agent Topology**       | **Mission Control (Multi-Agent)** | Single Loop               | Single Loop                  | Single Loop \+ Sub-agents | Stateless Request    |
| **External Tools**       | **Native MCP Host**               | Proprietary / Hardcoded   | Scripting / Run Cmd          | Native MCP Host           | Basic Tools          |
| **Cost Model**           | **Free (Pro Account) / Caching**  | Subscription              | User API Key                 | Usage Based               | Free / Quota         |

## ---

**7\. Conclusion**

The divergence in AI coding agent performance is driven by the depth of
integration with the development environment. **Cursor** wins by embedding the
AI into the editor's event loop (LSP) via a Shadow Workspace. **Aider** wins by
embedding the code's structure into the AI's context via a Tree-sitter Repo Map.
**Claude Code** wins by embedding the workflow into a persistent plan via
CLAUDE.md.

For **Gemini CLI** to leapfrog these competitors, it must not merely emulate
them but fundamentally rethink the relationship between the Shell and the Agent.
By implementing a **Transactional Shell** backed by filesystem snapshots, Gemini
Prime can offer the one thing no other agent currently provides: **Absolute
Safety**. The ability to undo a disastrous refactor or a destructive shell
command instantly changes the psychological relationship between developer and
agent—from cautious supervision to high-velocity "vibe coding." Combined with
Gemini 1.5 Pro's massive context window and a graph-aware Repo Map, this
architecture represents the state-of-the-art in autonomous software engineering.

#### **Works cited**

1. Shadow Workspace \- Learn Cursor, accessed December 21, 2025,
   [https://learn-cursor.com/en/docs/advanced/shadow-workspace](https://learn-cursor.com/en/docs/advanced/shadow-workspace)
2. Iterating with shadow workspaces \- Cursor, accessed December 21, 2025,
   [https://cursor.com/blog/shadow-workspace](https://cursor.com/blog/shadow-workspace)
3. Repository map \- Aider, accessed December 21, 2025,
   [https://aider.chat/docs/repomap.html](https://aider.chat/docs/repomap.html)
4. Building a better repository map with tree sitter \- Aider, accessed December
   21, 2025,
   [https://aider.chat/2023/10/22/repomap.html](https://aider.chat/2023/10/22/repomap.html)
5. aider/queries/tree-sitter-python-tags.scm · main \- GitLab, accessed December
   21, 2025,
   [https://gitlab.apertia.cz/external/aider/-/blob/main/aider/queries/tree-sitter-python-tags.scm](https://gitlab.apertia.cz/external/aider/-/blob/main/aider/queries/tree-sitter-python-tags.scm)
6. Supported languages | aider, accessed December 21, 2025,
   [https://aider.chat/docs/languages.html](https://aider.chat/docs/languages.html)
7. Claude Code Plan Mode | Developing with AI Tools \- Steve Kinney, accessed
   December 21, 2025,
   [https://stevekinney.com/courses/ai-development/claude-code-plan-mode](https://stevekinney.com/courses/ai-development/claude-code-plan-mode)
8. Claude Code Plan Mode: Revolutionizing the Senior Engineer's Workflow \-
   Medium, accessed December 21, 2025,
   [https://medium.com/@kuntal-c/claude-code-plan-mode-revolutionizing-the-senior-engineers-workflow-21d054ee3420](https://medium.com/@kuntal-c/claude-code-plan-mode-revolutionizing-the-senior-engineers-workflow-21d054ee3420)
9. Claude Code: Best practices for agentic coding \- Anthropic, accessed
   December 21, 2025,
   [https://www.anthropic.com/engineering/claude-code-best-practices](https://www.anthropic.com/engineering/claude-code-best-practices)
10. Connect Claude Code to tools via MCP, accessed December 21, 2025,
    [https://code.claude.com/docs/en/mcp](https://code.claude.com/docs/en/mcp)
11. Add MCP Servers to Claude Code with Docker MCP Toolkit (Docker Tutorial),
    accessed December 21, 2025,
    [https://www.youtube.com/watch?v=1Tu0c1zuz70](https://www.youtube.com/watch?v=1Tu0c1zuz70)
12. 2025s Best AI Coding Tools: Real Cost, Geeky Value & Honest Comparison,
    accessed December 21, 2025,
    [https://dev.to/stevengonsalvez/2025s-best-ai-coding-tools-real-cost-geeky-value-honest-comparison-4d63](https://dev.to/stevengonsalvez/2025s-best-ai-coding-tools-real-cost-geeky-value-honest-comparison-4d63)
13. How do I prevent accidental rm \-rf /\*? \- Server Fault, accessed December
    21, 2025,
    [https://serverfault.com/questions/337082/how-do-i-prevent-accidental-rm-rf](https://serverfault.com/questions/337082/how-do-i-prevent-accidental-rm-rf)
14. Hands-on with Gemini CLI \- Google Codelabs, accessed December 21, 2025,
    [https://codelabs.developers.google.com/gemini-cli-hands-on](https://codelabs.developers.google.com/gemini-cli-hands-on)
15. Claude, Cursor, Aider, Cline, Copilot: Which Is the Best One? | by Edwin
    Lisowski | Medium, accessed December 21, 2025,
    [https://medium.com/@elisowski/claude-cursor-aider-cline-copilot-which-is-the-best-one-ef1a47eaa1e6](https://medium.com/@elisowski/claude-cursor-aider-cline-copilot-which-is-the-best-one-ef1a47eaa1e6)
16. Google Antigravity: The “Cursor Killer” Has Arrived?, accessed December 21,
    2025,
    [https://timtech4u.medium.com/google-antigravity-the-cursor-killer-has-arrived-7c194f845f7d](https://timtech4u.medium.com/google-antigravity-the-cursor-killer-has-arrived-7c194f845f7d)
17. Getting Started with Google Antigravity, accessed December 21, 2025,
    [https://codelabs.developers.google.com/getting-started-google-antigravity](https://codelabs.developers.google.com/getting-started-google-antigravity)
18. Google Antigravity: What It Is & Why Every Developer Needs It \- Software
    Development Hub, accessed December 21, 2025,
    [https://sdh.global/blog/development/google-antigravity-what-it-is-and-why-every-developer-needs-it/](https://sdh.global/blog/development/google-antigravity-what-it-is-and-why-every-developer-needs-it/)
19. Simple Way to Restore System Snapshots : r/btrfs \- Reddit, accessed
    December 21, 2025,
    [https://www.reddit.com/r/btrfs/comments/1fg61cx/simple_way_to_restore_system_snapshots/](https://www.reddit.com/r/btrfs/comments/1fg61cx/simple_way_to_restore_system_snapshots/)
20. Working with Btrfs \- Snapshots \- Fedora Magazine, accessed December 21,
    2025,
    [https://fedoramagazine.org/working-with-btrfs-snapshots/](https://fedoramagazine.org/working-with-btrfs-snapshots/)
21. Snapper/BTRFS layout for easily restoring files, or entire system \- Arch
    Linux Forums, accessed December 21, 2025,
    [https://bbs.archlinux.org/viewtopic.php?id=194491](https://bbs.archlinux.org/viewtopic.php?id=194491)
22. Scaling Firecracker: Using OverlayFS to Save Disk Space \- E2B, accessed
    December 21, 2025,
    [https://e2b.dev/blog/scaling-firecracker-using-overlayfs-to-save-disk-space](https://e2b.dev/blog/scaling-firecracker-using-overlayfs-to-save-disk-space)
23. View APFS snapshots in Disk Utility on Mac \- Apple Support, accessed
    December 21, 2025,
    [https://support.apple.com/guide/disk-utility/view-apfs-snapshots-dskuf82354dc/mac](https://support.apple.com/guide/disk-utility/view-apfs-snapshots-dskuf82354dc/mac)
24. Did you know this? Apple Macs (APFS) can take snapshots and rollback\!? \-
    Reddit, accessed December 21, 2025,
    [https://www.reddit.com/r/homelab/comments/15r5g10/did_you_know_this_apple_macs_apfs_can_take/](https://www.reddit.com/r/homelab/comments/15r5g10/did_you_know_this_apple_macs_apfs_can_take/)
25. Fault-Tolerant Sandboxing for AI Coding Agents: A Transactional Approach to
    Safe Autonomous Execution \- arXiv, accessed December 21, 2025,
    [https://arxiv.org/pdf/2512.12806](https://arxiv.org/pdf/2512.12806)
26. Long context | Gemini API \- Google AI for Developers, accessed December 21,
    2025,
    [https://ai.google.dev/gemini-api/docs/long-context](https://ai.google.dev/gemini-api/docs/long-context)
27. Vertex AI I/O announcements: Gemini and Gemma models | Google Cloud Blog,
    accessed December 21, 2025,
    [https://cloud.google.com/blog/products/ai-machine-learning/vertex-ai-io-announcements](https://cloud.google.com/blog/products/ai-machine-learning/vertex-ai-io-announcements)
28. Context caching | Gemini API | Google AI for Developers, accessed December
    21, 2025,
    [https://ai.google.dev/gemini-api/docs/caching](https://ai.google.dev/gemini-api/docs/caching)
29. Context caching overview | Generative AI on Vertex AI \- Google Cloud
    Documentation, accessed December 21, 2025,
    [https://docs.cloud.google.com/vertex-ai/generative-ai/docs/context-cache/context-cache-overview](https://docs.cloud.google.com/vertex-ai/generative-ai/docs/context-cache/context-cache-overview)
30. A Function Index to Improve Gemini CLI's Code Context \- Wietse Venema's
    Weblog, accessed December 21, 2025,
    [https://wietsevenema.eu/blog/2025/gemini-cli-function-indexing/](https://wietsevenema.eu/blog/2025/gemini-cli-function-indexing/)
