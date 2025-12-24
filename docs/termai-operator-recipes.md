# TerminaI Operator Recipes

This page contains practical, safe prompts for common terminal tasks. Each
recipe is designed to be concise, observable, and confirmable.

## Safe pattern (recommended)

1. **Preview:** Ask for a plan before execution.
2. **Explain:** Ask for a short explanation of any command that modifies files.
3. **Confirm:** Approve only the exact commands you expect.
4. **Recap:** Ask for a brief summary of what changed.

## System triage

**CPU usage**

```
What is using my CPU right now? Summarize the top 5 processes and suggest a safe next step.
```

**Disk usage**

```
Why is my disk full? Show the largest directories and recommend a safe cleanup plan.
```

## Search files and content

**Find files by pattern**

```
Find all *.log files under the current workspace and list the most recently modified ones.
```

**Search for text**

```
Search the workspace for "TODO" and show file paths with line numbers.
```

## Organize files safely

**Create folders and organize**

```
Create an "archive" folder and move all *.log files into it. Show a plan first.
```

**Back up a directory**

```
Copy the "assets" folder into "backup/assets". Ask for confirmation before any overwrite.
```

**Compress large files**

```
Find the largest files over 1GB and compress them into an archive. Show a plan first.
```

**Organize Downloads**

```
Organize my Downloads folder by file type into subfolders (images, docs, archives). Show a plan first.
```

## Get latest online info (with sources)

**Discover sources**

```
Find the latest release notes for Kubernetes and cite sources.
```

**Deep read a specific page**

```
Summarize https://kubernetes.io/docs/home/ in 5 bullets and cite sources.
```

## Logs and summaries

**Tail logs and summarize**

```
Tail the last 200 lines of server.log and summarize errors by type.
```

**Explain an error**

```
Explain this error and suggest safe next steps: <paste error text>
```
