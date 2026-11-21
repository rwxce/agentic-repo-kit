# Signed OAuth state

**Origin: proven.** Enforced in the production project this kit was distilled from (generalized, project names removed).

## Problem

An OAuth callback can be forged or replayed: an attacker makes a victim's browser finish a connection that binds the attacker's account to the victim's tenant, or the reverse.

## Principle

The state that leaves for the provider is signed and short-lived, and it binds the tenant and the intent. The callback verifies it before doing anything, and the code that writes the binding verifies it again instead of trusting the URL.

## When it applies

- "Connect your account" flows (social publishing, calendars, storage, payments onboarding).

## When it doesn't

- Sign-in handled entirely by an auth provider SDK that already manages state and PKCE.

## Typical mistakes

- A random state stored nowhere, so it is never checked.
- A state that does not bind the tenant, so any logged-in user can complete it.
- No expiry, so a leaked callback URL works forever.

## The check that verifies it

Unit tests for a tampered, expired and wrong-tenant state; the binding mutation rejects a state that fails verification.

## Canonical source

- [RFC 9700 Best Current Practice for OAuth 2.0 Security](https://www.rfc-editor.org/rfc/rfc9700)

## Variants per stack

- **Web Crypto (any JS runtime):** HMAC-SHA256 over `{tenant, intent, exp}`, base64url.
- **Python:** `itsdangerous` timed serializer.
- **Mobile:** PKCE plus state through the system browser (ASWebAuthenticationSession, Custom Tabs).

## Related

[authorization-at-the-data-boundary](authorization-at-the-data-boundary.md) · [secrets-management](secrets-management.md)
