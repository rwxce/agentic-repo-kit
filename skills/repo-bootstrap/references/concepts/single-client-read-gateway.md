# One gateway for client data reads

**Origin: proven.** Enforced in the production project this kit was distilled from (generalized, project names removed).

## Problem

When components read data with the raw client hooks, each one handles auth timing, caching and loading states its own way: queries fire before the token exists, pages flash empty on return, and "skipped" looks like "loading".

## Principle

All reactive reads in the UI go through one wrapper that waits for auth, keeps a cache across navigation and returns an explicit status. The raw hooks are banned by lint, and a test proves the ban still fires.

## When it applies

- Client-rendered apps with authenticated reactive data.

## When it doesn't

- One-shot reads tied to a user action.
- Server components and route handlers, which read through a server helper.

## Typical mistakes

- A second `no-restricted-imports` block that silently replaces the first, disabling the ban.
- Tests that mock the raw client instead of the wrapper.

## The check that verifies it

A lint ban on the raw hooks in UI folders, and a test that lints sample imports and expects each restriction to fire.

## Canonical source

- None found. No official or primary source describes this exact pattern; the principle above is the reference.

## Variants per stack

- **Convex:** a `useAppQuery` wrapper over `useQuery` plus `ConvexQueryCacheProvider`.
- **REST / GraphQL:** TanStack Query or Apollo behind one project hook with auth gating.
- **Mobile:** one repository layer exposing state flows (Kotlin `StateFlow`, Swift `@Observable`).

## Related

[layer-boundaries-as-lint](layer-boundaries-as-lint.md)
