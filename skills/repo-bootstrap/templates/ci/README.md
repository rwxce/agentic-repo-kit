# ci

Workflows are sketches in GitHub Actions syntax; the mechanisms port to any CI. Every file starts
with WHAT / REPO SIGNAL / CONFIGURE. Copy only what the repo's signals justify.

| File | Destination | Prevents | Repo signal |
|---|---|---|---|
| `ci.yml` | `.github/workflows/ci.yml` | Merging code that fails lint/types/tests, or drifted generated AI config. | Always. `run --if-present` makes missing scripts a no-op. |
| `branch-policy-guard.yml` | `.github/workflows/` | PRs into the wrong protected branch. | A dev -> stage -> prod flow. |
| `migration-contract-gate.yml` | `.github/workflows/` | Expand/migrate/contract with a forgotten "contract" step. | Migration registry file + a deprecation process. |
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
  broken indirectly via mocks or untraced dependencies; the push run is the safety net.
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
