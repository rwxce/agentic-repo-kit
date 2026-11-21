# Supply-chain hygiene

**Origin: proven.** Enforced in the production project this kit was distilled from (generalized, project names removed).

## Problem

A dependency range pulls a compromised or broken release the day it is published; a freshly installed skill, MCP server or repo runs code with the agent's permissions; hidden Unicode smuggles instructions into an agent's context.

## Principle

Pin exact versions and refuse releases younger than a few days. Let a bot propose updates on a schedule, grouped so packages that must match move together. Read third-party code before installing it. Strip invisible characters from what the agent reads.

## When it applies

- Every project with third-party dependencies; every repo where agents install tools.

## When it doesn't

- Nothing is exempt, but a security fix may bypass the age gate deliberately and visibly.

## Typical mistakes

- Caret ranges in manifests.
- Install scripts allowed for every package.
- Installing an MCP server or skill straight from a README command.

## The check that verifies it

The package manager age gate itself; `--frozen-lockfile` installs in CI; a dependency-families check; quarantine plus an `ask` permission on install commands.

## Canonical source

- [pnpm settings (minimumReleaseAge, onlyBuiltDependencies)](https://pnpm.io/settings)
- [OpenSSF Scorecard](https://scorecard.dev/)

## Variants per stack

- **pnpm:** `minimumReleaseAge`, `save-exact`, `onlyBuiltDependencies`. **npm:** `save-exact`, `npm ci`.
- **Renovate / Dependabot:** grouped, scheduled updates with a minimum release age; security alerts bypass the schedule.
- **Python:** `uv` or `pip-tools` lockfiles with hashes. **Go:** `go.sum`. **Rust:** `Cargo.lock` plus `cargo-deny`.

## Related

[sbom-and-provenance](sbom-and-provenance.md) · [agent-guardrail-hooks](agent-guardrail-hooks.md)
