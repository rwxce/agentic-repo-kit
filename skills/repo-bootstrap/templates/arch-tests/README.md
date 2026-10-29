# arch-tests

Architecture tests are ordinary unit tests that assert a *repo-wide invariant* instead of a
function's behaviour. Each one turns a "remember to also update X" convention into a failing test.
They are cheap (file-system reads, no network), run in the normal test command, and give agents a
precise failure message instead of a production incident.

Every file starts with a header (what / repo signal / what to configure) and a `CONFIG` block. Fill
the config, delete the tests whose signal is absent from the repo. Vitest is shown; for Jest drop
the `vitest` import (globals) and replace `it.skipIf` with a conditional `it`/`it.skip`. For
Python/Go/Ruby the mechanism is identical: walk the directory, query the registry, assert.

| Template | Drift it prevents | Repo signal that justifies it | Framework-agnostic notes |
|---|---|---|---|
| `dir-registry-parity.test.ts` | A new page/module/feature directory ships without being added to a hand-maintained registry (unprotected route, unmounted module, missing permission entry). | A list of prefixes/names that gates behaviour (auth middleware matcher, router mount list, permissions table) next to a conventional folder. | Call the registry's real predicate, never a copy. Always assert `segments.length > 0` (a renamed root otherwise passes vacuously) and pin the prefix false-positive (`/dash` vs `/dashboard`). |
| `route-registry-exists.test.ts` | A central route/nav/sitemap entry points at a page that does not exist (404 link). | A `routes.ts`/`urls.py`/nav config used instead of hard-coded paths. | Default scanner models file-system routing. For code-defined routers, dump the router table instead and compare against the registry. |
| `content-assets-exist.test.ts` | Content index and disk disagree: duplicate slug, missing image/og asset, missing locale text, item absent from sitemap/llms.txt. | A content array (blog, docs, changelog) referencing files outside itself. | Works for any "index file + assets" pair (CMS exports, product catalogues). |
| `unique-codes.test.ts` | Two domains define the same error/event code (dashboards merge unrelated failures); inconsistent format; helper that does not recognise a new code. | `as const` code groups sent to monitoring/analytics or stored. | Swap the format regex per convention (event names, flag keys, permission strings). |
| `i18n-parity.mjs` | A key exists in one locale file but not another (blank UI strings in one language). | Two or more `*.json`/`*.po` locale files. | Zero-dependency Node script, not a test: wire as `check:i18n` (below). `i18n-parity.test.mjs` shows how to unit test it with `node --test`. |

## Wiring `check:i18n`

```jsonc
// package.json
{ "scripts": { "check:i18n": "node scripts/i18n-parity.mjs" } }
```

CI (`../ci/ci.yml`) runs `pnpm run --if-present check:i18n`, so the step is a no-op until the script
exists. Override with `I18N_DIR`/`I18N_SOURCE`. A stray locale file nobody registered in the app's
locale config is *not* caught by this script (it only compares files to each other); pair it with a
type-level `satisfies Record<Locale, ...>` check if your i18n lib supports it.

## Rollout

1. Add one test at a time, in the PR that fixes the first real instance of the drift.
2. If the test fails on day one, the registry already drifted: fix the registry, do not loosen the test.
3. Keep failure messages naming the offending item (`expect(x, label)`), since agents read them.
4. When you add or retire one, update the repo's blueprint/registry doc listing enforced invariants.
