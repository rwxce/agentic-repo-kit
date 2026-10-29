<!--
TEMPLATE: docs/blueprint.md — inventory of what the repo HAS (architecture, tests, tools, agents,
rules), with the technical name and path of each piece. Generated for every repo; filled by the
bootstrap from what it actually created plus what already exists. Keep it an inventory, not a manual.
-->
# <Project> blueprint

What this repo **has** — architecture, test kinds, tooling, agents, working rules — with the
technical name of each piece and the path where it lives. It is an inventory, not a manual: follow
the path for the detail. Use it as the reference base when starting a new project.

Keeping it current: adding or removing an agent, skill, hook, custom lint rule, CI workflow, test
kind or architecture rule means updating this file **in the same PR**.

## 1. Stack

<!-- fill with: framework, language/version, data layer, auth, billing, queues, hosting, secrets
     manager, observability. One bullet each, name + version + where configured. -->
- <technology> — <role> (`<config path>`)

## 2. Layers and boundaries

<!-- fill with: the directory map and the dependency rules between layers (who may import whom). -->
- <layer> (`<path>`) — <responsibility>; may import: <…>; must not import: <…>

## 3. Architecture as code (fitness functions)

Rules that fail CI when broken.

| Rule | What it enforces | Where |
|---|---|---|
| <e.g. layer boundaries> | <`A` never imports `B`> | `<lint rule / arch test path>` |

## 4. Tests

| Kind | What it covers | Command | Path |
|---|---|---|---|
| <unit / integration / e2e / arch / hook tests> | <scope> | `<cmd>` | `<path>` |

## 5. CI/CD and branches

| Workflow | Trigger | Purpose |
|---|---|---|
| `<.github/workflows/…>` | <push/PR/schedule> | <lint, tests, rule-sync check, deploy> |

Branch flow: <branches and what each accepts>.

## 6. Quality gates and supply chain

<!-- fill with: dependency pinning/age policy, audit, secret scanning, license checks. -->
- <gate> — `<where>`

## 7. AI tooling

### Agents (`.rulesync/subagents/`)

| Agent | Role | Model | Domain |
|---|---|---|---|
| `<name>` | implementer / reviewer / reference | <model> | <scope> |

### Skills (`.rulesync/skills/`)

| Skill | Trigger | Purpose |
|---|---|---|
| `plan-feature` | feature request | size, sweep, docs-first, registry walk, invariants, handoff |

### Hooks (`<hooks config>`)

| Hook | Event | Purpose | Blocking? |
|---|---|---|---|
| `<script>` | <event> | <what it detects/enforces> | advisory / blocking |

### Custom lint rules

| Rule | Prevents | Where |
|---|---|---|
| `<rule name>` | <failure it stops> | `<path>` |

### Registries

`docs/side-effect-registry.md` (planning), `docs/environment-variables.md` (env vars),
`<compliance inventory>` (legal promises).

## 8. Working rules

Where the root rule lives (`<path>`) and which sections matter most: plan-before-code, docs-first,
review lanes, verification, git policy.

## 9. Reference documents (`docs/`)

| Doc | What it answers |
|---|---|
| `<docs/…>` | <question> |

## 10. Project-specific (not part of the reusable base)

<!-- fill with: pieces that only make sense for this product, so they are not copied blindly. -->
