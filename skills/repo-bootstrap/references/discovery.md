# Phase 1 — discovery lenses (existing project)

Launch the chosen lenses **in one message, in parallel**, as read-only subagents (an Explore-type
agent if available; a cheaper model is fine for enumeration). Each returns only its table — no
prose dumps — so the orchestrator's context stays small. Add to every prompt:

```text
READ-ONLY: do not edit, create or delete files; no mutating commands; no installs; no network writes.
Prefer a code index if one exists (graph/LSP/ctags), else `rg -n` with targeted patterns, reading
only the relevant line ranges. Every row must cite file:line or a config path. No speculation:
write "unknown" when not verified. Max ~600 words.
```

## Lens 1 — Stack and infrastructure
```text
Identify: languages and frameworks (with versions from manifests/lockfiles), package manager,
runtime version source (.nvmrc/engines/.tool-versions), monorepo layout, database/ORM, auth provider,
billing/payments, queues/background jobs, file storage, email, analytics, error monitoring, hosting
and deploy mechanism, environments (dev/stage/prod, preview), secrets management.
Return: Concern | Choice | Evidence (file:line) | Notes.
```

## Lens 2 — Sensitive domains and flows
```text
Find code paths that move money, grant or check access, store or send personal data, publish to
external platforms, receive webhooks, run scheduled jobs, or make promises in legal/marketing copy.
For each: entry points (routes, handlers, server actions, jobs), the central helpers they rely on
(auth checks, payment parsing, consent gates), and the implicit registries (route lists, env lists,
message catalogs, error codes).
Return: Domain | Entry points | Central helpers | Registries | Evidence.
```

## Lens 3 — Dev workflow
```text
Map CI (workflows, jobs, what blocks), test runner(s) and where tests live (colocated? dirs?),
coverage of key layers (count test files per top-level dir), lint/format/typecheck configs and
scripts, branching and release model (protected branches, release workflows, tags), PR template,
CODEOWNERS, pre-commit tooling, dev scripts (dev servers, tunnels, seeds), docs for contributors.
Return: Area | Current state | Evidence | Gap.
```

## Lens 4 — External services and their tooling
```text
List every external service the code talks to (SDK imports, HTTP base URLs, env var prefixes,
webhook handlers). For each: SDK + version, CLI if any, whether a sandbox/test mode exists, and
whether the vendor publishes an OFFICIAL MCP server (check the vendor's docs site, not third-party
lists; give the URL or "none found").
Return: Service | Used for | SDK/CLI | Sandbox | Official MCP (url) | Evidence.
```

## Lens 5 — Code and architecture
```text
Describe the real architecture: layers/modules and the actual import directions between them
(sample imports; note violations), cross-cutting conventions (error handling, logging, validation,
i18n, config access), house helpers that must be used instead of raw APIs, heavy/native deps and
where they are imported, implicit registries that could drift from the filesystem, duplicated
patterns, and code style (formatter/linter configured? dominant style by sampling 20 files:
quotes, semicolons, naming, file naming, export style, max line length, comment density).
Return two tables: (1) Rule/convention | Evidence | Violations found (file:line, count);
(2) Style dimension | Dominant | Share | Outliers (file:line).
```

## Lens 6 — Existing AI config audit (only if config exists)
```text
Read in full: root rules (CLAUDE.md/AGENTS.md/.rulesync/rules), every agent, skill, command, hook
script and permission file. Report with file:line, format Problem | Solution | Why:
1. CONFLICTS between files (one concern owned by several agents; contradictory rules).
2. STALE facts — verify each against the code (hosting, DB, auth, helper names in examples, paths,
   counts, team members).
3. BLOAT — pasted vendor docs, rules repeated across files, content that could load on demand.
4. DESCRIPTIONS — vague triggers, missing model/tools, skills that would never auto-load.
5. SAFETY — instructions that could hit production, publish, send real email, run secret CLIs,
   or bypass consent; hooks that fail open where they should fail closed (and vice versa).
Give solutions, not only errors. Max ~900 words.
```

After the lenses return, merge them into `.context/repo-bootstrap/discovery.md` (tables only).
