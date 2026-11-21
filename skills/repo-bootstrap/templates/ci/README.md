# ci

Workflows are sketches in GitHub Actions syntax; the mechanisms port to any CI. Every file starts
with WHAT / REPO SIGNAL / CONFIGURE. Copy only what the repo's signals justify.

| File | Destination | Prevents | Repo signal |
|---|---|---|---|
| `ci.yml` | `.github/workflows/ci.yml` | Merging code that fails lint/types/tests, or drifted generated AI config. | Always. `run --if-present` makes missing scripts a no-op. |
| `list-guard-tests.mjs` (+ test) | `scripts/` | A PR that breaks a guard test (one that reads files from disk, e.g. "every page is registered") going green because changed-only test runs follow imports and never select it. `ci.yml` runs the list on every PR. | Changed-only tests on PRs and at least one test that reads the repo from disk. |
| `check-deploy-artifact.mjs` (+ test) | `scripts/` | A deploy that builds green and crashes on its first run: an import that only resolves after codegen or through an alias the deploy bundler ignores, or a package that reads a file next to its own JS (`.wasm`, fonts) and breaks once bundled. Bundles the real entry points with the deploy tool's own bundler and options, then optionally runs a smoke entry from the built output. `ci.yml` runs it after codegen. | A deploy step that bundles code itself (workers, serverless, edge) and has no CI-usable dry run; native or file-reading packages in that bundle. |
| `branch-policy-guard.yml` | `.github/workflows/` | PRs into the wrong protected branch. | A dev -> stage -> prod flow. |
| `migration-contract-gate.yml` | `.github/workflows/` | Expand/migrate/contract with a forgotten "contract" step. | Migration registry file + a deprecation process. |
| `contract-issue.yml` | `.github/workflows/` | After merge, a migration whose destructive "contract" step nobody tracks (the safety net when the pre-merge gate was bypassed). | Same as above; pair the two. |
| `plan-folder/` (`check-plan-close.mjs` + test, `plan-folder-gate.yml`, `plan-folder-stale.yml`) | script to `scripts/`, workflows to `.github/workflows/` | A finished plan folder lingering as stale "truth", a folder deleted half-way (decision log lost), or a `Closes-plan` marker with a typo. The stale check opens an issue for folders untouched for N days; it never deletes. | Multi-PR initiatives with a plan folder and decision log (plan-feature `references/plan-folder.md`). |
| `smoke-deploy.yml` | `.github/workflows/` | A deploy that built fine but fails at runtime, shipped without anyone hitting it. Runs `automations/smoke-deploy.mjs` on a URL. | Deploys outside CI (host Git integration), so CI never learns the URL. |
| `review-routing/` | script to `.github/scripts/`, workflow to `.github/workflows/` | Risky changes approved on a self-declared "trivial". | Small team, agent-authored PRs. |
| `pull_request_template.md` | `.github/` | Missing evidence, unlabelled lane. Machine-read by review-routing. | Same. |
| `CODEOWNERS.example` | `.github/CODEOWNERS` | Sensitive paths changed without the right eyes. | Same. |

## Hard-won rules baked into the templates

- **`pull_request_target` for guards**: the workflow that runs is the one on the *base* branch, so a PR
  cannot edit the guard to pass itself. In exchange the job must never check out or execute PR code,
  and PR-controlled strings (branch names, titles, body) go through `env:`, never `${{ }}` inside a
  `run:` script. Review-routing checks out the base sha, sparse, for the same reason.
- **`fetch-depth: 0`** when anything computes a merge-base; **fetch the base with an explicit
  destination ref** (`git fetch origin b:refs/remotes/origin/b`), because a bare fetch only fills
  FETCH_HEAD. If that fetch fails, fall back to the full suite loudly, never silently.
- **`--changed` on PRs, full suite on push** to the integration branch: changed-only misses tests
  broken indirectly via mocks or untraced dependencies; the push run is the safety net. Guard tests
  (they read files instead of importing them) run on every PR on top of the changed set.
- **Fail closed**: unknown author, ambiguous lane, API response without a `patch` (huge diff) all
  mean "needs a human", never "skip".
- **Generated config check** (`rulesync:check` or equivalent) in CI turns "never hand-edit generated
  files" from prose into a failing build.
- **Codegen against a throwaway backend**, not a deploy key (see the hook in `ci.yml`).
- **Node version from one file** (`.nvmrc`, else `engines.node`), shared by every workflow.
- **Package manager enforcement** lives in `package.json` (`"preinstall": "npx only-allow pnpm"`),
  not in CI, so it also stops local mistakes and agents running `npm install`.

## Rollout

1. `ci.yml` first, as a required status check. 2. Template + review routing in `warn` mode (labels
only) for a week. 3. Branch guard together with rulesets (required checks, no force-push, no direct
pushes). 4. Gates that read PR bodies re-run on `edited`; say so in the failure message.
5. Update the repo's blueprint doc when adding/removing a workflow.
