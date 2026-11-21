# The LLM boundary: configured models, safe schemas, measured quality

**Origin: proven.** Enforced in the production project this kit was distilled from (generalized, project names removed).

## Problem

Model ids hardcoded in code cannot change per environment; an unapproved provider slips in; structured-output schemas one provider accepts, another rejects; nobody knows what a feature costs or whether a prompt change made it better.

## Principle

Resolve model ids from per-environment config with no default and an allow list of providers. Emit schemas every strict-mode provider accepts. Version prompts, log cost per feature, and compare models with a blind judge before switching.

## When it applies

- Products that call LLMs in production features.

## When it doesn't

- One-off scripts or internal prototypes.

## Typical mistakes

- A silent default model when the env var is missing.
- Providers added without updating the subprocessor list.
- Switching models on vibes instead of an eval set.
- Untrusted text (web pages, user files) concatenated into prompts with tool access (prompt injection).

## The check that verifies it

A lint rule that rejects raw structured-output calls without the safe-schema wrapper; a test that the model resolver throws when unset and rejects unlisted providers; an eval harness run before model changes.

## Canonical source

- [Anthropic docs: Define success criteria and build evaluations](https://platform.claude.com/docs/en/test-and-evaluate/develop-tests)
- [OWASP Top 10 for LLM Applications](https://genai.owasp.org/llm-top-10/)

## Variants per stack

- **AI SDK (TypeScript):** `generateObject` / `Output.object` with a schema wrapper; OpenRouter or direct providers.
- **Python:** pydantic models for structured output; LiteLLM for provider routing.
- **Evals:** a versioned dataset plus a blind LLM judge; promptfoo or an in-repo harness.

## Related

[compliance-by-evidence](compliance-by-evidence.md) · [every-catch-reports](every-catch-reports.md) · [rate-limit-by-cost](rate-limit-by-cost.md)
