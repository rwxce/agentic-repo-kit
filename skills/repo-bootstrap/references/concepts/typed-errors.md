# Typed domain errors

**Origin: proven.** Enforced in the production project this kit was distilled from (generalized, project names removed).

## Problem

Free-text errors leak provider details to users, cannot be translated, and make the UI guess what went wrong from a message string.

## Principle

Errors that cross a boundary are a closed set of codes. Provider errors are mapped to a code at the edge and never passed through. The caller branches on the code and translates it.

## When it applies

- Apps with a UI that shows errors, especially with i18n.
- APIs consumed by other teams or clients.

## When it doesn't

- Internal logs, which may keep the raw provider error.
- Throwaway scripts.

## Typical mistakes

- Passing a provider error message straight to the user.
- Codes as free strings instead of a closed union or enum.
- Mixing user-facing codes with monitoring codes in one vocabulary.

## The check that verifies it

The code type is a union/enum so an unknown code does not compile; a lint rule bans `throw new Error()` and raw error returns inside the action wrapper; a test checks every code has a translation.

## Canonical source

- [RFC 9457 Problem Details for HTTP APIs](https://www.rfc-editor.org/rfc/rfc9457)

## Variants per stack

- **TypeScript:** `CodedError("CODE")` with an `ErrorCode` union and an action wrapper that returns `{ ok, error: code }`.
- **HTTP APIs:** `application/problem+json` with a stable `type` URI per error.
- **Kotlin / Swift:** sealed classes / enums with associated values.
- **Go:** sentinel errors plus `errors.Is` at the boundary.

## Related

[every-catch-reports](every-catch-reports.md) · [input-validation-at-the-boundary](input-validation-at-the-boundary.md)
