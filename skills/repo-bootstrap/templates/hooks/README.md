# Hook templates

Zero-dependency (Node >= 20, ESM) Claude Code hook scripts, generalized from a production
setup. Each script has a `CONFIG` block at the top, exported pure functions (unit-tested), and a
`runHook()` / CLI entry guarded by `import.meta.url === pathToFileURL(process.argv[1]).href`.
Malformed stdin always exits 0: a broken payload must never become a blanket outage.

Output contract used here (official hooks docs): `PreToolUse` prints
`hookSpecificOutput.permissionDecision` (`ask`) or exits 2 with stderr (block);
`UserPromptSubmit` / `SessionStart` print `hookSpecificOutput.additionalContext`; `Stop` hooks
print plain advisory text and always exit 0 (except `pr-preflight --strict`).

## The hooks

| Hook | Event | Mode | What it prevents | Signal in a repo that justifies it | CONFIG keys |
|---|---|---|---|---|---|
| `block-outward-writes.mjs` | PreToolUse `Bash` | **blocking** (exit 2, fail-closed) | Agent approving PRs, mutating `gh api` / GraphQL mutations, curl writes to GitHub comments/reviews | GitHub remote + `gh` CLI in use; human-only review policy | `extraPatterns`, `message` |
| `guard-dangerous-commands.mjs` | PreToolUse `Bash` | **ask** (with preview) | Recursive delete, force push / reset --hard / rebase, deploys, secrets-CLI use, `gh pr merge`, `sudo`, SQL drops | Any repo; stronger with deploy CLIs (`wrangler`, `terraform`, `kubectl`...) or a secrets manager | `protectedBranches`, `secretsClis`, `deployCommands`, `previewBudgetMs` |
| `detect-feature-intent.mjs` | UserPromptSubmit | advisory | Jumping into code for a new feature without a plan | A planning skill / plan-first convention (`plan-feature`); en/es/ca teams | `skill`, `context`, `patterns` |
| `detect-correction.mjs` | UserPromptSubmit | advisory (+ local log) | The same correction being repeated across sessions | A `reflect`-style skill and an agent-config dir to hold lasting rules | `skill`, `logPath`, `context`, `patterns` |
| `lint-if-changed.mjs` | Stop | advisory | Ending a turn with lint errors, without paying lint on doc-only turns | A `lint` script in `package.json` (or any linter command) | `command`, `sourceExt`, `tailLines`, `timeoutMs` |
| `check-env-docs.mjs` | Stop | advisory | New env var read in code but missing from the env docs | An env docs file (`docs/environment-variables.md`, `.env.example` docs...) | `docsPath`, `baseRefs`, `readers`, `excludedPath`, `sourceExt`, `hint` |
| `compliance-tripwire.mjs` | Stop | advisory | Shipping tracking SDKs, cookies/storage, consent bypasses, new tables, new outbound hosts without a compliance look | Published legal texts, a `compliance/` dir, analytics or auth/PII handling | `contentTripwires`, `pathTripwires`, `vendoredPath`, `excludedPath`, `reminder`, `baseRefs` |
| `branch-policy.mjs` | Stop | advisory | Local commits made directly on protected branches | Protected `main`/`release` branches, PR-only flow | `remote`, `protectedBranches`, `integrationBranches`, `docsPath` |
| `pr-preflight.mjs` | Stop (advisory) / CI (`--strict`, exit 1) | advisory or blocking | Committed `.env*`, `.env` dropped from `.gitignore`, oversized files, media masters | Any repo with secrets in dotenv files; repos that keep media elsewhere | `baseRefs`, `maxBytes`, `sizeExemptPrefixes`, `mediaMasters`, `envAllowed`, `heavyFileAdvice` |
| `session-start-status.mjs` | SessionStart | advisory | Starting to code on a fresh branch before planning; not knowing the code index state | A code index (graph, ctags, SCIP) and a plan-first convention | `baseRefs`, `longLivedBranch`, `planNudge`, `index` (or `null`) |
| `index-reminder.mjs` | PreToolUse `Grep\|Glob` | advisory, once per session | Blind grepping when a code index exists | Same index as above | `indexPath`, `reminder`, `markerPrefix` |

Skills referenced by name (`plan-feature`, `reflect`) are conventions: point `skill` at whatever
your repo calls them, or drop the hook if you have none.

## Install

1. Copy the hooks you want (plus nothing else; each file is standalone) into `scripts/`:
   `cp block-outward-writes.mjs guard-dangerous-commands.mjs ... <repo>/scripts/`.
   Do **not** copy `_helpers.mjs` or `*.test.mjs` unless you want the tests in the repo.
2. Edit the `CONFIG` block of each script (branches, deploy/secrets CLIs, docs path, patterns).
3. Wire them, with one of:
   - **rulesync**: merge `hooks.rulesync.json` into `.rulesync/hooks.json`, then run `rulesync generate`.
   - **plain Claude Code**: merge `settings.hooks.json` into `.claude/settings.json`.
   Keep `failClosed` / `onFailure: "block"` **only** on `block-outward-writes`.
4. Run the tests: `node --test scripts/*.test.mjs` (pass the files explicitly via the shell
   glob; Node 22+ no longer accepts a bare directory). Add that line to CI. In CI also run
   `node scripts/pr-preflight.mjs --strict` on pull requests (set `GITHUB_BASE_REF`, or
   `PUSH_BEFORE_SHA` for push events).
5. Gitignore the local log: `.context/reflect/` (used by `detect-correction`).

## Lesson: never resolve the script with `git rev-parse` alone

A hook command such as `node "$(git rev-parse --show-toplevel)/scripts/x.mjs"` breaks when the
session's cwd is a **nested repo or submodule**: `--show-toplevel` then returns the *inner*
repo, the script does not exist there, node exits 1, and a fail-closed PreToolUse hook then
**blocks every Bash call** — a deadlock the agent cannot fix, since it needs Bash to fix it.

All commands here use
`node "${CLAUDE_PROJECT_DIR:-$(git rev-parse --show-toplevel)}/scripts/<hook>.mjs"`:
`CLAUDE_PROJECT_DIR` is set by Claude Code to the directory the session was started in, and
the git fallback only applies to hosts that do not set it. Even so, keep `onFailure: "block"`
to the single hook where a silent skip would be worse than a stop, and make every script exit 0
on bad input. If you work inside nested repos, also test the hook from inside one.

## Notes

- Stop hooks print plain text; it is shown to the user in the transcript, not injected into the
  model's context. If you want the agent to react, change the output to a `{"decision":"block",
  "reason": ...}` payload (note that this forces another turn).
- `check-env-docs` and `compliance-tripwire` compare against the merge-base with the first
  resolvable ref in `baseRefs`, falling back to `HEAD` (uncommitted changes only) in repos with
  no remote.
- Tests: `_helpers.mjs` creates throwaway git repos in the OS temp dir; nothing touches the repo
  under test.
