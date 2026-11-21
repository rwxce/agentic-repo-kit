# Review lanes and an independent-review seal

**Origin: proven.** Enforced in the production project this kit was distilled from (generalized, project names removed).

## Problem

Reviewing every PR the same way is too slow for copy changes or too shallow for billing and auth. With one maintainer, "someone else looked at it" is not available, and an agent that reviews its own diff confirms its own assumptions. Agents with write access can approve or publish without the human deciding.

## Principle

Classify each PR into a lane by the files it touches: demonstrable changes are approved on evidence; flow-sensitive ones need a review in a fresh context, verified by a human. Record which exact diff that review saw, and warn when the diff moved since. Agents never approve.

## When it applies

- Any PR workflow, especially solo or small teams using agents.

## When it doesn't

- A team with several engineers would replace the fresh-context agent with a human reviewer.

## Typical mistakes

- Lane chosen by the author without path rules.
- A review that saw an older diff passed off as current.
- Agents with permission to approve or to call mutating GitHub APIs.

## The check that verifies it

A CI job that labels the lane from sensitive-path lists; a seal storing the diff fingerprint the review saw; a fail-closed hook blocking approvals and mutating API calls.

## Canonical source

- [Google Engineering Practices: Code Review](https://google.github.io/eng-practices/review/)

## Variants per stack

- **GitHub:** CODEOWNERS plus a labeller workflow that never checks out PR code.
- **GitLab:** approval rules per path.

## Related

[agent-guardrail-hooks](agent-guardrail-hooks.md) · [change-completeness-preflight](change-completeness-preflight.md)
