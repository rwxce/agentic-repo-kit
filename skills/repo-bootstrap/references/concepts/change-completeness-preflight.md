# Preflight for incomplete changes

**Origin: proven.** Enforced in the production project this kit was distilled from (generalized, project names removed).

## Problem

Some diffs are already broken in production without anything else being touched: an env file committed, a secret path not ignored, a 50 MB video in the repo, a new environment variable nobody documented or synced to the runtime that reads it.

## Principle

Check the diff against its base for completions it must carry, not for extensions. Block in CI; warn at the end of an agent turn, where half-done work is normal.

## When it applies

- Every repo with a PR workflow.

## When it doesn't

- Style or scope questions, which belong to review.

## Typical mistakes

- Only checking at the end of a session, so CI never blocks.
- An env check that sees code references but not variables added to the secrets store alone.

## The check that verifies it

A CI preflight (blocking) for env files, `.gitignore` and heavy binaries; an advisory Stop hook running the same checks plus env-docs parity.

## Canonical source

- [GitHub Docs: Secret scanning](https://docs.github.com/en/code-security/concepts/secret-security/secret-scanning)

## Variants per stack

- **Secret scanning:** GitHub push protection, gitleaks, trufflehog.
- **Heavy files:** a size check in CI, or Git LFS for assets that must live in the repo.

## Related

[secrets-management](secrets-management.md) · [review-lanes](review-lanes.md)
