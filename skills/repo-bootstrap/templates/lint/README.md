# lint

`eslint.local-rules.mjs` is a zero-dependency ESLint plugin (flat config) with five rules, all
configured through rule options. `eslint.config.snippet.mjs` is a menu of config blocks (layer
graph, no-cycle, SDK gateways, logger-only output, scoped rules). `eslint.local-rules.test.mjs`
runs the rules through ESLint's `RuleTester` with `node --test` (it skips itself if `eslint` is not
installed): `node --test lint/`.

Lint rules beat prose rules for agents: the error appears in the editor and in CI, names the file or
call at fault, and the message can say what to do instead. Write the message as an instruction.

| Rule | Prevents | Repo signal that justifies it | Notes / edge cases |
|---|---|---|---|
| `local/require-test-file` | Units shipped with no test. | Services/use-cases/pipelines dirs where most files already have a sibling `*.test.*`. | Ignores `index`, `types`, `*.types`, tests, `__tests__`. Options: `extensions`, `testSuffixes`, `testDirs`, `ignoreBasenames`, `ignoreSuffixes`. Cheap proxy: it checks existence, not quality. |
| `local/catch-must-report` | Errors swallowed into a toast/silent return that never reach monitoring. | A monitoring SDK in use and incidents found only by users. | No "does this call the network" heuristic (bypassed by a helper). Detects client files by directive or client-only hook import, so browser code can require a consent-gated reporter. Checks inline `.catch(fn)` too; named handler references are not inspected. `allowRethrow` counts `throw` as handling. |
| `local/import-only-from` | A native/heavy package (image libs with prebuilt binaries, headless browser) reaching a bundle that cannot load it, usually via a barrel re-export. | An incident of "could not load <binary>" in serverless, or a package that is only valid in workers. | Transitive taint over value imports, follows `export * from` and barrels, ignores `import type` / all-inline `{ type X }`, ignores tests, scans `rootFiles` outside the root dirs, resolves modules outside `roots`. Reads source, not the bundle: dynamic specifiers and third-party packages that pull the dep in escape it. |
| `local/must-use-wrapper` | Raw calls to an API for which the house wrapper adds required behaviour (schema normalisation, timeouts, tracking). | A wrapper whose docstring says "never call X directly", or a bug traced to a raw call. | Matches `A.b` / `fn` / `new X`. Exempt the wrapper's own file with config `ignores`. |
| `local/registry-path-exists` | A registry entry (route, nav item) pointing at a page that does not exist. | A central routes module + "dead link" review comments. | File-system routing model by default; template literals become `*`. Pair with `arch-tests/route-registry-exists.test.ts` as the CI backstop. |
| `boundaries/dependencies` (snippet 1) | Layer violations (UI importing DB, services importing handlers). | A folder structure with an intended direction; `default: "disallow"` forces a decision for every new edge. | Allow type-only edges narrowly with `dependency: { kind: "type" }`. |
| `import-x/no-cycle` (snippet 2) | Import cycles. | Any TS repo past ~50 modules. | `maxDepth: 10` keeps lint time sane. |
| `no-restricted-imports` gateway (snippet 3) | Bypassing the wrapper around a vendor SDK. | A `lib/<vendor>.ts` helper and direct SDK imports elsewhere. | Flat config does not merge this rule: one block per file. Exclude the gateway via `ignores`. |
| `no-console` -> logger (snippet 4) | Unredacted, unmonitored output. | A logger module exists. | Exempt the logger/reporter and `scripts/`. |
| `no-restricted-syntax` literal paths (snippet 5) | Hard-coded route/locale paths bypassing the registry. | A routes registry. | Build the locale alternation from the translation files. |

## Rollout

1. Add the rule at `warn` in a PR of its own; count the findings (`eslint --format json | jq`).
2. Fix existing violations (or exempt a named, commented list), then flip to `error` in the same PR.
3. Every inline disable needs a reason comment: `// eslint-disable-next-line local/catch-must-report -- <why>`.
4. Keep the rule message actionable (what to call instead, which file). Agents read it verbatim.
5. Adding or removing a custom rule: update the repo's blueprint/architecture doc in the same change.
6. Test each rule you configure with project-specific options by adding a case to the RuleTester file.
