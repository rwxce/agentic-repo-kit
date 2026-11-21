# Corrections become rules

**Origin: proven.** Enforced in the production project this kit was distilled from (generalized, project names removed).

## Problem

The person corrects the agent, the agent apologises, and the same mistake returns in the next session because nothing outside that conversation changed.

## Principle

Detect corrections when they happen, log them, and at the second occurrence of a class turn it into a lasting rule or memory. The agent proposes; it writes only after a yes.

## When it applies

- Any repo used daily with agents.

## When it doesn't

- First-time instructions, which are not corrections.

## Typical mistakes

- Writing a rule for every one-off correction, bloating the root rules.
- Writing rules without the person approving them.
- Stopping at prose when the class could become a lint rule or test.

## The check that verifies it

A prompt hook that spots correction cues and logs them locally; the reflect skill proposes a rule after the second occurrence; root rules covering hosts without hooks.

## Canonical source

- [Claude Code Docs: How Claude remembers your project](https://code.claude.com/docs/en/memory)

## Variants per stack

- **Claude Code:** `UserPromptSubmit` hook plus memory files.
- **Other hosts:** a root-rule section that asks the agent to run the reflect step.

## Related

[generated-agent-config](generated-agent-config.md) · [session-handoff](session-handoff.md)
