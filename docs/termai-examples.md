# What can TerminaI do?

TerminaI is designed for everyday terminal tasks, not just code. Here are
concrete examples you can copy-paste.

## System and ops

```text
What's eating my CPU right now? Show top offenders.
How much disk do I have left on this machine?
Find all files larger than 1 GB and suggest safe ways to shrink them.
```

## Files and organization

```text
Organize my Downloads folder by type. Preview the changes first.
Search this repo for any references to "deprecated" and summarize the files.
Compress large log files in ./logs and leave the originals intact.
```

## Web + latest info

```text
What's the weather in Austin today? Cite sources.
Find the latest release notes for Kubernetes 1.31 and summarize in 5 bullets.
Search for the latest CVEs related to OpenSSL and list the top 5.
```

## Process control

```text
Start "npm run dev" as devserver and tell me when it's ready.
Show me the last 50 lines from devserver.
Send Ctrl+C to devserver.
```

## Automation prompts

```text
Every 5 minutes, check if https://example.com is up and alert me if it fails.
Make a checklist for deploying the staging build, then run it step by step.
```

## Safe pattern

Ask for a preview, then confirm:

```text
Find and delete node_modules folders over 500 MB, but show me a preview first.
```
