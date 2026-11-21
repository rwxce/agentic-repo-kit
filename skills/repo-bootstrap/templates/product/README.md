# Product module templates

Opt-in modules, proposed only when the repo shows their signal (`../../references/product-modules.md`).
Each folder's README lists piece → lands as → signal → what it prevents.

| Dir | Module | Checks it ships (zero-dependency, each with a `node --test` suite) |
|---|---|---|
| `design/` | PRODUCT.md, DESIGN.md, DTCG tokens, UI surfaces inventory, design flow, skill overrides (agent: `../agents/ui-router.md`) | `check-tokens.mjs`, `check-ui-surfaces.mjs` |
| `legal/` | pointer to `../skills/legal-compliance/` | — (the skill plus the existing compliance tripwire hook) |
| `content/` | typed content registry (skills: `../skills/content-writing/`, `../skills/changelog-entry/`) | `content-registry.test.mjs` |
| `copy/` | positioning, tone, translation glossary | `check-glossary.mjs` |
| `ai/` | model ids per environment, strict schema, prompt version, cost per feature, blind-judge eval | `model-ids.test.mjs`, `strict-json-schema.mjs` |
| `growth/` | plans as data, server-side gating, limit → feature table | `plans.test.mjs`, `check-hardcoded-prices.mjs` |
| `dev-env/` | local vs tunnel, secrets folder per provider (skill: `../skills/test-login/`) | `dev-local.mjs` |

The `.ts` templates use erasable TypeScript only, so their `.test.mjs` suites run on plain Node
(≥ 22.18, which strips types) as well as under Vitest or Jest.
