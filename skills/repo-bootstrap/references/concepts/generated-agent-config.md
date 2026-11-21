# One source for agent configuration

**Origin: proven.** Enforced in the production project this kit was distilled from (generalized, project names removed).

## Problem

Each AI editor reads its own rules, hooks and permissions file. Edited by hand, they drift, and an agent in one tool follows rules the others dropped. Skills grow until nobody reads them.

## Principle

Write rules, agents, skills, hooks and permissions once and generate every editor file from that source. CI fails when the generated files differ from what the source produces. Lint the skills for the fields routing depends on, and for size.

## When it applies

- Teams (or one person) using more than one agent tool.

## When it doesn't

- A project using a single editor gains little from a generator.

## Typical mistakes

- Hand-editing generated files.
- Root rules that exceed a host size limit (for example, a byte cap on `AGENTS.md`).
- Skills without a description, which are never routed to.

## The check that verifies it

A CI sync check (`rulesync` check mode); a skill lint for frontmatter, line count and description length.

## Canonical source

- [rulesync](https://github.com/dyoshikawa/rulesync)
- [AGENTS.md format](https://agents.md/)

## Variants per stack

- **rulesync:** `.rulesync/` source generating `CLAUDE.md`, `AGENTS.md`, `.cursor/`, `.codex/`, `.opencode/`.
- **Single tool:** native files plus the skill lint only.

## Related

[agent-guardrail-hooks](agent-guardrail-hooks.md) · [corrections-become-rules](corrections-become-rules.md)
