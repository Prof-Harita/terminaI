# terminaI Maintainer Guide

This document explains how to maintain the **terminaI** fork of `gemini-cli`.

## 1. Philosophies

- **terminaI** is the "Community/Pro" edition.
- We support features that Google cannot or will not support (e.g., local
  models, autonomous "YOLO" agents, deeper integration).
- We maintain compatibility with `gemini-cli` where possible to allow easy
  syncing.

## 2. Syncing with Upstream

We are a fork of
[google-gemini/gemini-cli](https://github.com/google-gemini/gemini-cli). We want
to pull in their bug fixes and features regularly.

**To sync your fork:**

```bash
./scripts/sync_upstream.sh
```

**If there are merge conflicts:**

1. Git will pause and tell you which files conflict.
2. Edit those files to resolve the conflicts (decide whether to keep our changes
   or theirs).
3. Run `git add <file>` for fixed files.
4. Run `git commit` to finish the merge.
5. Run `git push origin main`.

## 3. Releases

- Our releases are independent of Google's.
- When we have a stable build with new terminaI features (like Voice or Web
  Remote), we create a new release on GitHub.
