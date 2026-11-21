# Input validation at the boundary

**Origin: external.** Established practice from the canonical source below; not yet proven in the project this kit came from. Treat its checks as a proposal to validate.

## Problem

Data from clients, webhooks, files and third-party APIs arrives in shapes the code does not expect. Unvalidated input reaches queries, templates and business logic, causing injection, crashes and corrupt records.

## Principle

Parse every input once at the trust boundary into a typed value with an allow-list schema (type, length, range, format), reject what does not fit, and pass only the parsed value inward.

## When it applies

- Every public entry point: API routes, server actions, functions, forms, webhooks, file uploads, queue messages.

## When it doesn't

- Values produced by your own code inside the same trust boundary (re-validating everywhere adds noise, not safety).

## Typical mistakes

- Deny-lists of "bad characters" instead of allow-list schemas.
- Validating on the client only.
- Validating, then using the raw input instead of the parsed value.
- Treating validation as a replacement for parameterised queries and output encoding.

## The check that verifies it

Every public entry point declares a schema (lint rule or framework requirement); tests send malformed, oversized and wrong-type payloads and expect a typed rejection.

## Canonical source

- [OWASP Input Validation Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Input_Validation_Cheat_Sheet.html)

## Variants per stack

- **TypeScript:** zod / valibot schemas at the route or action; Convex `args` validators.
- **Python:** pydantic models (FastAPI does it per route); Django forms/serializers.
- **Go:** decode into structs and validate (`go-playground/validator`).
- **JVM:** Bean Validation (`@Valid`, `jakarta.validation`).
- **Mobile:** validate deep-link and push payloads before routing.

## Related

[typed-errors](typed-errors.md) · [webhook-verify-dedupe-reread](webhook-verify-dedupe-reread.md) · [presigned-upload-to-worker](presigned-upload-to-worker.md)
