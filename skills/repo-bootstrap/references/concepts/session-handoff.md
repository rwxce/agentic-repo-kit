# Automatic session handoff

**Origin: proven.** Enforced in the production project this kit was distilled from (generalized, project names removed).

## Problem

A new chat or a context compaction loses the branch state, the active plan and what was left to do, and the person has to paste it back by hand.

## Principle

At the end of every turn and before compaction, write a short handoff file from the repo state and the agent's last "pending" block. At session start, point the agent at it only when it belongs to the current branch and is recent.

## When it applies

- Long sessions; work resumed across chats or worktrees.

## When it doesn't

- Short one-off sessions.

## Typical mistakes

- Loading a handoff from another branch or from days ago.
- Treating the handoff as truth: it records what the agent said was pending, not whether it is true.
- Committing the handoff file (it belongs in an ignored scratch folder).

## The check that verifies it

Tests for the save and load hooks (branch match, age limit, compaction case).

## Canonical source

- [Claude Code Docs: Hooks reference (Stop, PreCompact, SessionStart)](https://code.claude.com/docs/en/hooks)

## Variants per stack

- **Claude Code:** Stop + PreCompact write, SessionStart read.
- **OpenCode:** a plugin that feeds the last message, since there is no transcript file.

## Related

[planning-gate](planning-gate.md) · [corrections-become-rules](corrections-become-rules.md)
