# Gated release pipeline

**Origin: proven.** Enforced in the production project this kit was distilled from (generalized, project names removed).

## Problem

A release that skips staging, promotes a different commit from the one tested, or runs untrusted branch code with production secrets turns one bad merge into an outage or a leak. Hotfixes committed straight to a release branch get lost on the next release.

## Principle

Code moves in one direction through fixed branches, by buttons, not by hand. Production receives only the exact commit that passed a smoke test on staging, recorded as a marker. Each CI job gets only the secrets it needs, and jobs that run branch code get the fewest.

## When it applies

- Projects with more than one deployed environment.

## When it doesn't

- A solo project deploying from one branch needs a fraction of this.

## Typical mistakes

- `pull_request_target` or scheduled workflows that check out PR code with secrets.
- Promoting "latest" instead of the tested SHA.
- Third-party actions pinned by tag instead of commit SHA.
- Hotfixes applied to the release branch only.

## The check that verifies it

A branch-policy CI guard for PR sources and targets; promotion only of SHAs with a gate marker; a post-deploy smoke test; a protected-branch hook for agents.

## Canonical source

- [GitHub Docs: Secure use reference for GitHub Actions](https://docs.github.com/en/actions/reference/security/secure-use)

## Variants per stack

- **GitHub Actions:** environments with required reviewers and per-environment secrets; `refs/gated/<sha>` markers.
- **GitLab:** protected environments and deployment approvals.
- **Mobile:** TestFlight / internal testing tracks as the staging gate; phased rollout as the last step.

## Related

[health-checks](health-checks.md) · [expand-migrate-contract](expand-migrate-contract.md) · [secrets-management](secrets-management.md) · [sbom-and-provenance](sbom-and-provenance.md)
