# automations

| File | Does | Repo signal | Configure |
|---|---|---|---|
| `workspace-setup.sh` | Installs deps (self-heals a corrupted package-store entry once), runs a codegen hook, then builds or copies the code index in the background. Index failures never fail setup. Seeds the main checkout's index so later worktrees copy instead of rebuild. | Parallel worktrees (your ADE, `git worktree`, Codespaces); a code index/graph; generated types. | `INSTALL_CMD`, `CODEGEN_CMD`, `INDEX_*` env vars or edit the defaults. |
| `release-flow.md` | The dev -> stage -> main promotion model with 3 workflow sketches (prepare, promote by fast-forward, validate+deploy+smoke with deployed-commit check). | A staging environment and branch-triggered deploys. | Branch names, bot identity, deploy/smoke steps. |
| `check-vendored.mjs` | Every vendored skill/rule must carry `Source: <spec>@<version>`; reports newer upstream releases, honoring a min-age of N days (default 5). `--strict` fails on unpinned or outdated items. | A directory of copied third-party skills/rules plus a lock file with hashes only. | `VENDORED_DIRS`, `VENDORED_ENTRY`, `VENDORED_LOCK`, `MIN_AGE_DAYS`. Wire as `check:vendored`. |
| `check-vendored.test.mjs` | Zero-dependency tests for the parsing and min-age logic. | | `node --test automations/` |
| `check-dependency-families.mjs` (+ test) | Fails when packages that must move together (an SDK and its CLI, a framework and its plugins) are pinned to different versions, reading `package.json` and workspace overrides. Prevents a one-package security bump leaving its sibling behind and breaking a build or deploy step. | An update bot that groups families for normal updates but ships security fixes one package at a time. | `CONFIG.families` (neutral examples to replace). Wire as `check:deps` in CI. |
| `check-skills.mjs` (+ test) | Skill lint: every skill has frontmatter with `name` and `description`; own skills stay under a line and description-word budget. Prevents skills that never route (no description) and skills that cost context every session (oversized). | A skills directory several people or agents edit. | `CONFIG.skillsDir`, `MAX_LINES`, `MAX_DESCRIPTION_WORDS`, `VENDORED` (empty by default; list third-party skills). Wire as `check:skills`. |
| `skill-routing.cases.json` + `skill-routing.test.mjs` | Routing regression pack: prompts that must (or must not) trigger the feature-intent hook, plus the trigger phrases each own skill's description must name. Prevents a tightened regex or a trimmed description silently stopping routing. `knownFalsePositive` documents accepted misses. | A prompt hook that routes to a planning skill and several own skills. | Cases file; `SKILLS_DIR`; the hook import path (all three files live in `scripts/` in the target repo). |
| `smoke-deploy.mjs` (+ test) | Post-deploy smoke test: GETs a short list of paths with retries and exits 1 unless each answers 200. Catches the build-passes-but-runtime-fails class (a dependency that cannot load in the serverless/edge runtime). Does not exercise mutations. | Deploys that happen outside CI, so no job learns the URL. | `CONFIG.checks`, retries, timeout. Run by `ci/smoke-deploy.yml` or a deploy hook. |

## Principles

- **Best effort vs blocking**: only things that make the checkout unusable (deps, codegen) may fail
  setup. Anything speculative (indexes, caches) runs detached (`nohup ... &`) with a log file.
- **Idempotent**: every script is safe to re-run on a half-set-up worktree.
- **Dependency age gate**: the same min-age rule should apply to `pnpm-workspace.yaml`
  `minimumReleaseAge` (or the equivalent) and to exact-pinned versions, so an agent cannot install
  the package published an hour ago.
- **No secrets in scripts**: environment comes from the secret manager at runtime; setup never writes
  a local `.env` with real values.
