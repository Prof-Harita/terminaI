# Web fetch tool (`web_fetch`)

This document describes the `web_fetch` tool for the Gemini CLI.

## Description

Use `web_fetch` to summarize, compare, or extract information from web pages.
The `web_fetch` tool processes content from one or more URLs (up to 20) embedded
in a prompt. `web_fetch` takes a natural language prompt and returns a generated
response.

### Arguments

`web_fetch` takes one argument:

- `prompt` (string, required): A comprehensive prompt that includes the URL(s)
  (up to 20) to fetch and specific instructions on how to process their content.
  For example:
  `"Summarize https://example.com/article and extract key points from https://another.com/data"`.
  The prompt must contain at least one URL starting with `http://` or
  `https://`.

## How to use `web_fetch` with the Gemini CLI

To use `web_fetch` with the Gemini CLI, provide a natural language prompt that
contains URLs. The tool will ask for confirmation before fetching any URLs. Once
confirmed, the tool will process URLs through Gemini API's `urlContext`.

If the Gemini API cannot access the URL, the tool will fall back to fetching
content directly from the local machine. The tool will format the response,
including source attribution and citations where possible. The tool will then
provide the response to the user.

Usage:

```
web_fetch(prompt="Your prompt, including a URL such as https://google.com.")
```

## Operator tips (TerminaI)

- Use `web_fetch` when you already have specific URLs. If you need to discover
  sources first, use `google_web_search`.
- Ask for a concise answer and citations when accuracy matters (for example:
  "summarize in 3 bullets and cite sources").
- If a URL is inaccessible to the Gemini API, `web_fetch` falls back to a local
  fetch and then summarizes the content. Keep prompts clear and specific so the
  summary stays tight and relevant.

## `web_fetch` examples

Summarize a single article:

```
web_fetch(prompt="Can you summarize the main points of https://example.com/news/latest")
```

Compare two articles:

```
web_fetch(prompt="What are the differences in the conclusions of these two papers: https://arxiv.org/abs/2401.0001 and https://arxiv.org/abs/2401.0002?")
```

## Important notes

- **URL processing:** `web_fetch` relies on the Gemini API's ability to access
  and process the given URLs.
- **Output quality:** The quality of the output will depend on the clarity of
  the instructions in the prompt.
