# Guardrail hooks for agent tool calls

**Origin: proven.** Enforced in the production project this kit was distilled from (generalized, project names removed).

## Problem

An agent with a shell can delete branches, force-push, deploy, read secrets or spend paid API credits in one confident step. Rules in prose are read, then forgotten under pressure.

## Principle

Put irreversible actions behind hooks that run before the tool call: block what must never happen, ask for what needs a human, and show what the command would change. Keep the same list as permissions for tools that do not run hooks.

## When it applies

- Any repo where agents run shell commands.

## When it doesn't

- Read-only and reversible commands should stay unprompted, or people learn to click "yes".

## Typical mistakes

- Treating pattern-matching hooks as a sandbox (they catch mistakes, not attackers).
- Resolving the hook path with `git rev-parse` alone, which breaks in nested repos and, for a fail-closed hook, blocks every command.
- Hosts that cannot "ask" silently allowing instead of refusing.

## The check that verifies it

Tests for every hook; the generated hook configs checked by the rulesync sync job in CI; one real trigger of each hook during setup.

## Canonical source

- [Claude Code Docs: Hooks reference](https://code.claude.com/docs/en/hooks)

## Variants per stack

- **Claude Code / Cursor / Codex:** PreToolUse-style hooks generated from one source.
- **OpenCode:** a plugin that turns "ask" into a refusal.
- **Any host:** layered permissions (deny / ask / allow) as the first layer.

## Related

[generated-agent-config](generated-agent-config.md) · [supply-chain-hygiene](supply-chain-hygiene.md) · [review-lanes](review-lanes.md)
