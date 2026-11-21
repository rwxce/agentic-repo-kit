# Default-deny route protection

**Origin: proven.** Enforced in the production project this kit was distilled from (generalized, project names removed).

## Problem

A route list that names only the protected pages makes every new page public by accident. Nothing fails until someone notices private data behind an open URL.

## Principle

Classify every route explicitly as public or protected. Anything unclassified gets a real 404 for everyone, without reading the session. A test walks the page tree and fails when a page is in neither list.

## When it applies

- Web apps with file-system routing or many pages, where pages are added often.
- Any app that mixes public marketing pages and authenticated pages under one router.

## When it doesn't

- An API-only service where every endpoint already requires a token by framework default.
- A fully public static site.

## Typical mistakes

- Redirecting unclassified paths instead of rewriting to a 404: the redirect leaks which paths exist.
- Treating route protection as authorization: data access must still be checked where the data lives.
- Forgetting non-page paths (API, assets, monitoring tunnels) that need their own handling.

## The check that verifies it

A guard test that reads the page directory from disk and fails when a page is covered by neither the public nor the protected list; plus request tests for the redirect, the 404 rewrite and the signed-out case.

## Canonical source

- [OWASP Authorization Cheat Sheet (deny by default)](https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html)

## Variants per stack

- **Next.js:** `middleware.ts` (or `proxy.ts`) holding `publicRoutePrefixes` and `protectedRoutePrefixes`; unclassified paths rewritten to the not-found page.
- **Express / Fastify:** a global auth hook registered before routers, with an explicit public allow list.
- **Django:** `LoginRequiredMiddleware` (Django 5.1+) with `login_not_required` on the public views.
- **Spring Security:** `anyRequest().denyAll()` or `.authenticated()` as the last matcher.
- **Mobile:** a navigation guard that routes unknown deep links to a not-found screen.

## Related

[authorization-at-the-data-boundary](authorization-at-the-data-boundary.md) · [route-registry](route-registry.md) · [guard-tests](guard-tests.md)
