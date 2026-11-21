# Security policy

## Reporting a vulnerability

Please report vulnerabilities **privately**, not in a public issue:

1. Open <https://github.com/rwxce/agentic-repo-kit/security/advisories/new> (GitHub private vulnerability reporting).
2. Describe the problem, the affected file or template, how to reproduce it, and the impact you
   expect in a repository that uses the generated files.

Only the maintainers can see the report. We discuss the fix with you in the advisory and credit you
when it is published, unless you prefer to stay anonymous.

## Scope

In scope:

- The `/repo-bootstrap` skill (`skills/repo-bootstrap/SKILL.md` and `references/`), including
  instructions that could lead an agent to run something unsafe or leak secrets.
- Its templates (`skills/repo-bootstrap/templates/`): hooks, CI workflows, automations, lint
  rules, permissions and anything else the skill writes into a target repository. A hook or
  permission rule that can be bypassed, or a workflow that exposes secrets, is in scope.
- The project site (`site/`) and its Pages workflow.

Out of scope:

- Vulnerabilities in third-party tools the templates configure or mention (rulesync, MCP servers,
  agent tools, GitHub Actions). Report those upstream.
- Problems in a repository after its owner changed the generated files.
- Vendored assets listed in [`THIRD_PARTY.md`](THIRD_PARTY.md), unless the way we ship them adds
  the risk.

## What to expect

This is a small project maintained in spare time. We read every report and aim to acknowledge it
and share an assessment as soon as we can, but we do not promise a response or fix time (no SLA).
Fixes land on `main` and are noted in the [changelog](CHANGELOG.md). There are no older
supported versions: the latest `main` is the only one.
