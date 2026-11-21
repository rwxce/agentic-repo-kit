# One route registry

**Origin: proven.** Enforced in the production project this kit was distilled from (generalized, project names removed).

## Problem

Paths hardcoded across components drift: a renamed page leaves dead links, a link ships before its page exists, and locale prefixes are built by hand in different ways.

## Principle

Every app path is declared once, with an un-prefixed form for links and a prefixed form for redirects. Lint fails when a declared path has no page and when code hardcodes a prefixed path.

## When it applies

- Web or mobile apps with more than a handful of screens, especially with locale prefixes or deep links.

## When it doesn't

- Tiny apps with two or three routes.

## Typical mistakes

- Building locale prefixes by string concatenation in many places.
- A registry that nothing checks against the file system.

## The check that verifies it

A lint rule or test that each registered path has a page; a lint ban on string literals that start with a locale prefix.

## Canonical source

- None found. No official or primary source describes this exact pattern; the principle above is the reference.

## Variants per stack

- **Next.js:** a `routes.ts` object with `.path` and `.href(locale)`; typed routes where available.
- **React Router / TanStack Router:** typed route objects generated from the route tree.
- **Android:** Navigation type-safe routes. **iOS:** an enum of destinations.

## Related

[default-deny-routes](default-deny-routes.md) · [guard-tests](guard-tests.md)
