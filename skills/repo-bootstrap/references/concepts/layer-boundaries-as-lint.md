# Layer boundaries as lint rules

**Origin: proven.** Enforced in the production project this kit was distilled from (generalized, project names removed).

## Problem

Architecture written in a document erodes one convenient import at a time: the UI reaches into the data layer, a use case imports the action that calls it, modules import each other in a circle.

## Principle

Encode the allowed dependencies as lint rules that fail the build (default disallow), each with a message that says what to do instead. Lint runs in the editor, at the end of every agent turn and in CI.

## When it applies

- Codebases with identifiable layers or modules and more than one contributor (people or agents).

## When it doesn't

- Small single-module codebases where the rules would only describe one folder.

## Typical mistakes

- Default-allow configurations that only list a few forbidden edges.
- Exempting so many files that the rule protects nothing.
- Forgetting that boundaries see static imports only.

## The check that verifies it

The lint rules themselves in CI (blocking) and an advisory lint run at the end of each agent turn; new rules start as `warn` until the code complies.

## Canonical source

- [JS Boundaries (eslint-plugin-boundaries)](https://www.jsboundaries.dev/)
- [ArchUnit User Guide](https://www.archunit.org/userguide/html/000_Index.html)

## Variants per stack

- **JS/TS:** `eslint-plugin-boundaries`, `import-x/no-cycle`, `dependency-cruiser`.
- **Python:** Import Linter contracts.
- **JVM:** ArchUnit tests; Konsist for Kotlin.
- **Go:** internal packages plus `depguard` in golangci-lint.
- **.NET:** NetArchTest.

## Related

[guard-tests](guard-tests.md) · [native-binaries-in-workers](native-binaries-in-workers.md) · [single-client-read-gateway](single-client-read-gateway.md)
