# Guard tests: tests that read the repo

**Origin: proven.** Enforced in the production project this kit was distilled from (generalized, project names removed).

## Problem

Some rules are about the whole repo, not one module: every page is classified, every surface is inventoried, every lint rule is documented. Import-based test selection never runs these tests when only the watched files change, so a PR breaks them and stays green.

## Principle

Write repo-wide invariants as tests that read the file system and compare it with an inventory. Each failure names the missing entry. CI always runs these tests on pull requests, on top of the tests affected by the change.

## When it applies

- Any registry that must list every file of a kind (routes, pages, surfaces, rules, workflows).

## When it doesn't

- Rules that a type checker or a lint rule can express directly.

## Typical mistakes

- Running only affected tests on PRs, so guard tests never run.
- Guard tests that check presence and are mistaken for quality checks.

## The check that verifies it

CI selects and always runs the guard tests on every PR (for example, the tests whose source reads the file system), with a test for the selector itself.

## Canonical source

- [Thoughtworks Technology Radar: Architectural fitness function](https://www.thoughtworks.com/radar/techniques/architectural-fitness-function)

## Variants per stack

- **Vitest / Jest:** a list script that greps test sources for `fs` reads, run after `--changed`.
- **pytest:** a `guard` marker always selected in CI.
- **JVM:** ArchUnit tests in the default suite.

## Related

[default-deny-routes](default-deny-routes.md) · [layout-guard-and-ui-inventory](layout-guard-and-ui-inventory.md) · [layer-boundaries-as-lint](layer-boundaries-as-lint.md)
