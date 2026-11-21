# A local code graph as the first step of analysis

**Origin: proven.** Enforced in the production project this kit was distilled from (generalized, project names removed).

## Problem

Agents explore a large repo with text search, read too many files, and miss relationships that are not visible in one file (who calls what across layers).

## Principle

Keep a local, offline graph of the code and query it before broad text search. Keep it fresh cheaply, and treat the source as the truth when the two disagree.

## When it applies

- Medium and large codebases explored by agents.

## When it doesn't

- When the target file is already known, read it directly.
- Small repos where search is instant and complete.

## Typical mistakes

- Loading the whole graph file into the context.
- Trusting a stale graph over the code.
- Rebuilding the full graph on every edit instead of incrementally.

## The check that verifies it

A once-per-session reminder hook on search tools; a Stop hook that refreshes the graph only when source files changed.

## Canonical source

- [Tree-sitter documentation](https://tree-sitter.github.io/tree-sitter/)

## Variants per stack

- **Graph tools:** tree-sitter based graphs (for example Graphify), ctags, LSP servers, Sourcegraph / SCIP indexes.

## Related

[planning-gate](planning-gate.md)
