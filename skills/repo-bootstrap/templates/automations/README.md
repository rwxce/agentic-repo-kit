# automations

| File | Does | Repo signal | Configure |
|---|---|---|---|
| `workspace-setup.sh` | Installs deps (self-heals a corrupted package-store entry once), runs a codegen hook, then builds or copies the code index in the background. Index failures never fail setup. Seeds the main checkout's index so later worktrees copy instead of rebuild. | Parallel worktrees (Conductor, `git worktree`, Codespaces); a code index/graph; generated types. | `INSTALL_CMD`, `CODEGEN_CMD`, `INDEX_*` env vars or edit the defaults. |
| `release-flow.md` | The dev -> stage -> main promotion model with 3 workflow sketches (prepare, promote by fast-forward, validate+deploy+smoke with deployed-commit check). | A staging environment and branch-triggered deploys. | Branch names, bot identity, deploy/smoke steps. |
| `check-vendored.mjs` | Every vendored skill/rule must carry `Source: <spec>@<version>`; reports newer upstream releases, honoring a min-age of N days (default 5). `--strict` fails on unpinned or outdated items. | A directory of copied third-party skills/rules plus a lock file with hashes only. | `VENDORED_DIRS`, `VENDORED_ENTRY`, `VENDORED_LOCK`, `MIN_AGE_DAYS`. Wire as `check:vendored`. |
| `check-vendored.test.mjs` | Zero-dependency tests for the parsing and min-age logic. | | `node --test automations/` |

## Principles

- **Best effort vs blocking**: only things that make the checkout unusable (deps, codegen) may fail
  setup. Anything speculative (indexes, caches) runs detached (`nohup ... &`) with a log file.
- **Idempotent**: every script is safe to re-run on a half-set-up worktree.
- **Dependency age gate**: the same min-age rule should apply to `pnpm-workspace.yaml`
  `minimumReleaseAge` (or the equivalent) and to exact-pinned versions, so an agent cannot install
  the package published an hour ago.
- **No secrets in scripts**: environment comes from the secret manager at runtime; setup never writes
  a local `.env` with real values.
