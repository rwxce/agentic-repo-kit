# Authorization at the data boundary

**Origin: proven.** Enforced in the production project this kit was distilled from (generalized, project names removed).

## Problem

A verified login says who the caller is, not what they may touch. A public function that loads a record by a client-supplied id leaks or edits another tenant's data.

## Principle

Authentication and authorization are separate steps, and both run where the data lives. Every public function resolves the caller from the verified token, never from an argument, then checks ownership of the tenant the record belongs to.

## When it applies

- Multi-tenant apps (workspaces, teams, organisations).
- Any public API that takes record ids from the client.

## When it doesn't

- Internal functions reachable only from other server code (they get a different guard, see shared-secret bridges).
- Single-user local tools.

## Typical mistakes

- Taking `userId` or `workspaceId` as an argument and trusting it.
- Checking ownership of the parent but not that the child belongs to that parent.
- Guarding the page but not the query or mutation behind it.
- Treating a resource being deleted as still live.

## The check that verifies it

A coverage matrix per public function: unauthenticated, wrong tenant, valid input, domain error. A diff reviewer in a fresh context on changes to public functions. Optionally a lint rule or test that every public function calls a guard first.

## Canonical source

- [OWASP Top 10:2021 A01 Broken Access Control](https://owasp.org/Top10/A01_2021-Broken_Access_Control/)
- [OWASP Authorization Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html)

## Variants per stack

- **Convex:** `requireIdentity` / `requireWorkspaceAccess` helpers called first in every public `query`/`mutation`/`action`; everything else `internal*`.
- **Supabase / Postgres:** Row Level Security policies keyed on `auth.uid()`; never the service key from the client.
- **Django / Rails:** scope every queryset by the current tenant (`request.user.workspace`), never `Model.objects.get(pk=...)` alone.
- **Firebase:** Security Rules that compare `request.auth.uid` with the document owner.
- **GraphQL:** authorization in resolvers or the data layer, not only in the gateway.

## Related

[default-deny-routes](default-deny-routes.md) · [shared-secret-bridges](shared-secret-bridges.md) · [review-lanes](review-lanes.md)
