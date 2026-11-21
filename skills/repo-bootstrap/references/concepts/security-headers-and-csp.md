# Security headers and Content Security Policy

**Origin: external.** Established practice from the canonical source below; not yet proven in the project this kit came from. Treat its checks as a proposal to validate.

## Problem

Without response headers that restrict what a page may load and who may frame it, a single injection becomes script execution, clickjacking or data exfiltration.

## Principle

Send a baseline of security headers on every response, and a Content Security Policy that allows only the origins the app needs. Roll out in report-only mode first and watch the reports.

## When it applies

- Any web app serving HTML, especially with user content or third-party scripts.

## When it doesn't

- Pure JSON APIs need only a minimal set (no CSP for documents they never serve).

## Typical mistakes

- `'unsafe-inline'` and wildcards that make the CSP decorative.
- Enforcing a new policy without a report-only phase, breaking analytics or payments.
- Setting headers in one layer (framework) while another (CDN) overrides them.

## The check that verifies it

A test or smoke check that fetches key pages and asserts the headers; CSP violation reports collected and rate-limited.

## Canonical source

- [OWASP HTTP Headers Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/HTTP_Headers_Cheat_Sheet.html)
- [MDN Content Security Policy guide](https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/CSP)

## Variants per stack

- **Next.js:** `headers()` in `next.config` or nonces from middleware for strict CSP.
- **Express:** `helmet`.
- **Django:** `SecurityMiddleware` plus `django-csp`.
- **CDN / edge:** header rules at the edge, kept in the repo.

## Related

[rate-limit-by-cost](rate-limit-by-cost.md)
