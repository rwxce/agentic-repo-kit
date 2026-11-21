# Recommended third-party skills, tools and language adapters

The kit does **not** bundle any of these. It proposes them in Phase 4 when the repo shows the need,
and each one is installed only after the user's OK, through the quarantine step below. Every row
was in daily use in the SaaS the kit was distilled from. "Version tested" is the pin that repo runs.
Origins and licenses were checked against the upstream repo on 2026-11-21. Re-check them at run
time: repos move, and licenses and skill lists change.

## Quarantine step (before any install)

1. Clone or download the source into a scratch folder that is gitignored, such as
   `.context/quarantine/<name>/`. Never clone straight into `.claude/skills/` or run its installer.
2. Read `SKILL.md` and every file it points to. Also read hooks, `scripts/`, any binary launcher,
   the `package.json` install scripts (`preinstall`, `postinstall`, `prepare`) and the MCP config.
3. Tell the user in one paragraph what it runs (commands, downloaded binaries, background
   processes) and what it can reach (network hosts, files outside the repo, env vars, tokens).
4. Install only after their OK, at an exact version or commit at least 5 days old. Vendored skills
   carry a `Source: <spec>@<version>` line so `automations/check-vendored.mjs` can track them.
   Write repo overrides in a short `## Repo overrides` block at the top, not by editing upstream
   text throughout.

The install command itself (`npx skills add`, `claude mcp add`, `git clone`, `uv tool install`,
`pip install`…) belongs in the permission `ask` layer.

## Skills

| Need | Skill | Origin | Version tested | License | What we override |
|---|---|---|---|---|---|
| In-app product UI: design, critique, audit, polish | `impeccable` | <https://github.com/pbakaus/impeccable> | `skill-v4.7.0` | Apache-2.0 | House tone rules beat its example copy. Adds a Safari rendering rule (no large blur plus transform at rest on rounded surfaces). Routed to in-app UI only. Its launcher downloads a sha256-verified engine binary on first use, so mention it in the quarantine summary; `IMPECCABLE_BIN` points to a preinstalled one. |
| Marketing pages and full redesigns | `taste-skill` (`design-taste-frontend`) | <https://github.com/Leonxlnx/taste-skill> | `v2.1.4` | MIT | Same tone and Safari overrides, plus the positioning doc. Routed to marketing only; its `--app` route is ignored. Suggested dependencies (GSAP, Lenis…) follow the exact-pin and 5-day rule. Script output goes to untracked paths. |
| Landing playbooks, scroll motion, reference capture | `designcode-web` (curated subset) | <https://github.com/MengTo/Skills> | snapshot 2026-08-28 (upstream has no release tags) | MIT | Vendored subset only: each upstream `SKILL.md` becomes one reference file; demo folders are left out. |
| Convex backend (schema, functions, auth, migrations, tests, crons, workflow…) | `convex-*` | <https://github.com/convex/convex-backend-skill> (formerly `get-convex/…`) | `1.14.0` (plugin version; upstream is now 1.18.0) | Apache-2.0 (in `skills/design/LICENSE.txt`, no root `LICENSE`) | Strips the "pitch Convex" and quickstart material. Adds repo notes for the chosen auth, billing, AI and job runtimes, and for who implements backend work. |
| Security review and audits | `security-audit` | <https://github.com/cloudflare/security-audit-skill> | commit `c1c8a8c` (2026-09-14) | MIT | None; vendored as is. |
| Background jobs on Trigger.dev | `trigger-*` | <https://github.com/triggerdotdev/skills> (mirror of `triggerdotdev/trigger.dev`, `packages/cli-v3/skills`) | unpinned (lock file holds a hash only); SDK `4.5.9` | Apache-2.0 via the monorepo; the mirror has no `LICENSE` file | None in the skill. A root rule limits Trigger.dev to native binaries and heavy CPU/RAM work. Note: `trigger-agents` and `trigger-config` are no longer in the upstream mirror. |
| Web search and scraping | `firecrawl` | <https://github.com/firecrawl/skills> (`skills/core/firecrawl`; also shipped in `firecrawl/cli`) | unpinned | ISC | A root rule plus a blocking hook: the local, keyless MCP goes first, and the keyed cloud server is used only after it. |
| Product analytics setup | PostHog `integration-nextjs-app-router` | <https://github.com/PostHog/skills> | unpinned | MIT | None. The compliance stop-check applies (consent gate before any capture). |
| Code graph for multi-module analysis | `graphify` (skill + CLI) | <https://github.com/Graphify-Labs/graphify> (formerly `safishamsi/graphify`) | PyPI `graphifyy==0.9.94` | Apache-2.0 | Made the first step of non-trivial analysis. Never load the whole graph file; pass subagents query results. A Stop hook refreshes the graph. |
| One source for every agent tool's config | `rulesync` (CLI + skill) | <https://github.com/dyoshikawa/rulesync> | npm `40.2.0` | MIT | Repo note: edit only `.rulesync/`, regenerate, and CI fails on drift. See `references/rulesync.md`. |

`interview-me` is not listed because the kit already ships it as a template, adapted from
`addyosmani/agent-skills` (MIT) with the attribution kept.

## MCP servers

Propose these through `references/mcp-discovery.md`. The pin column is the risk to flag.

| Need | Server (as configured) | Origin | Version tested | License | Pin | What we override |
|---|---|---|---|---|---|---|
| Browser checks and screenshots | `npx -y @playwright/mcp@latest` | <https://github.com/microsoft/playwright-mcp> | `@latest` | Apache-2.0 | **Risk: `@latest`** | None |
| Job runs and logs | `npx trigger.dev@latest mcp` | <https://github.com/triggerdotdev/trigger.dev> | `@latest` | Apache-2.0 | **Risk: `@latest`** | None |
| Backend data, logs, function runs | `npx -y convex@latest mcp start --disable-tools envSet,envRemove,envGet,envList` | <https://github.com/convex/convex-js> | `@latest` | Apache-2.0 | **Risk: `@latest`** | Env-var tools disabled. Started through the secrets manager against the dev environment only. |
| Deploy status and logs | `npx -y @netlify/mcp` | <https://github.com/netlify/netlify-mcp> | none (resolves to latest; 1.22.1 on 2026-11-21) | ISC (in `package.json`; no `LICENSE` file) | **Risk: unpinned, same as `@latest`** | None |
| Cloud resources | `npx -y @azure/mcp@3.0.0 server start` | <https://github.com/microsoft/mcp> | `3.0.0` | MIT | Exact | None |
| Keyless local scraping | `firecrawl-mcp` via a local wrapper with `--public-only` | <https://github.com/firecrawl/firecrawl-mcp-server> | `3.40.0` | MIT | Exact | Public pages only. Must be tried before the cloud server (hook-enforced). |
| Errors, billing (prod + sandbox), issues, email, cloud scraping | Vendor-hosted HTTP endpoints (Sentry, Polar, Linear, Brevo, Firecrawl) | Vendor docs | Set by the vendor | Not applicable (hosted) | Cannot be pinned | Separate prod and sandbox entries. Secrets go through `${VAR}` and are never written into the file. Mutating tools sit in the permission `ask` layer. |

**Why `@latest` is a risk.** `npx …@latest` runs whatever was published most recently, every time
the server starts. It skips the exact-pin and 5-day rules, so a compromised or broken release
reaches the agent the same day it ships. To fix it, pin an exact version that is at least 5 days
old (for example, `@playwright/mcp@<x.y.z>`) and bump it through the same update flow as other
dependencies. Hosted servers cannot be pinned: treat their tool list as changeable, and keep
mutating tools behind `ask`.

## Language adapters: lint rule + architecture test

The kit's own guardrails are TypeScript: ESLint rules in `templates/lint/` plus architecture tests
in `templates/arch-tests/`. For other stacks, these tools fill the same two roles. A **lint rule**
gives the editor- and CI-time error for a forbidden import or call, such as a gateway, a banned
API or a native dependency outside its runtime. An **architecture test** asserts the dependency
graph between layers and runs in the normal test suite. Where the build system can enforce a
boundary (modules, targets, crates, `internal/`), prefer it; the tools cover what remains inside
one module. Roll out in the same order as `templates/lint/README.md`: warn, fix or exempt with a
reason, then error, and write each message as an instruction.

| Language | Lint rule (forbidden import / call, gateways) | Architecture test (layers, allowed edges) | Compile-time boundary |
|---|---|---|---|
| TypeScript (kit reference) | ESLint: `no-restricted-imports`, `local/import-only-from`, `local/must-use-wrapper` (`templates/lint/`) | `boundaries/dependencies` + `import-x/no-cycle`, and the tests in `templates/arch-tests/` | Workspace packages |
| Swift | [SwiftLint](https://realm.github.io/SwiftLint/) `custom_rules` (regex with `included`/`excluded` paths, e.g. a vendor SDK import outside its gateway folder). SwiftSyntax-based custom rules need a Bazel build. | [Harmonize](https://github.com/perrystreetsoftware/Harmonize) (Apache-2.0, an ArchUnit-style library for Swift) in XCTest, for rules inside one target | [SwiftPM](https://www.swift.org/documentation/package-manager/) targets: an import missing from `dependencies:` does not compile |
| Kotlin | [detekt](https://detekt.dev/) [`ForbiddenImport`](https://detekt.dev/docs/rules/style/#forbiddenimport) and custom rule sets ([extensions](https://detekt.dev/docs/introduction/extensions/)) | [Konsist](https://docs.konsist.lemonappdev.com/) [`assertArchitecture`](https://docs.konsist.lemonappdev.com/writing-tests/architecture-assert) (`domain.dependsOnNothing()`, `data.dependsOn(domain)`) in JUnit or Kotest | Gradle modules |
| Python | [Ruff](https://docs.astral.sh/ruff/) [`banned-api` (TID251)](https://docs.astral.sh/ruff/rules/banned-api/): a module or member with a message saying what to call instead | [Import Linter](https://import-linter.readthedocs.io/) [contracts](https://import-linter.readthedocs.io/en/stable/contract_types/) (`layers`, `forbidden`, `independence`) via `lint-imports` in CI | Separate packages, if any |
| Go | [golangci-lint](https://golangci-lint.run/) `depguard` ([linter settings](https://golangci-lint.run/docs/linters/configuration/)): deny lists per file glob | [go-arch-lint](https://github.com/fe3dback/go-arch-lint) (MIT), or a `go test` that runs `go list -deps` and asserts edges | [`internal/` packages](https://go.dev/doc/go1.4#internalpackages) |
| Rust | [Clippy](https://doc.rust-lang.org/clippy/) [`disallowed-methods` / `disallowed-types`](https://doc.rust-lang.org/clippy/lint_configuration.html) in `clippy.toml`, with a `reason` per entry | [cargo-deny](https://embarkstudios.github.io/cargo-deny/) `bans` on the crate graph (which crate may depend on which) | Workspace crates |
| Dart / Flutter | [Dart analyzer](https://dart.dev/tools/analysis) [linter rules](https://dart.dev/tools/linter-rules) (`implementation_imports`, `avoid_relative_lib_imports`) plus custom rules as [analyzer plugins](https://dart.dev/tools/analyzer-plugins) (`analysis_server_plugin`) | A `package:test` test that parses imports with [`package:analyzer`](https://pub.dev/packages/analyzer) and asserts allowed layer edges | Packages in a pub workspace |

None of these adapters has been run end to end by the kit. Treat each row as a starting point:
read the linked docs at run time, pin the tool exactly, and write a test that reproduces the
real violation before you trust the rule.
