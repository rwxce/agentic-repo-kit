# Hook templates

Zero-dependency (Node >= 20, ESM) Claude Code hook scripts, generalized from a production
setup. Each script has a `CONFIG` block at the top, exported pure functions (unit-tested), and a
`runHook()` / CLI entry guarded by `import.meta.url === pathToFileURL(process.argv[1]).href`.
Malformed stdin always exits 0: a broken payload must never become a blanket outage.

Output contract used here (official hooks docs): `PreToolUse` prints
`hookSpecificOutput.permissionDecision` (`ask`) or exits 2 with stderr (block);
`UserPromptSubmit` / `SessionStart` print `hookSpecificOutput.additionalContext` (or plain
stdout, which SessionStart also adds to context); `Stop` / `PreCompact` hooks print plain advisory
text and always exit 0 (except `pr-preflight --strict`).

## The hooks

| Hook | Event | Mode | What it prevents | Signal in a repo that justifies it | CONFIG keys |
|---|---|---|---|---|---|
| `block-outward-writes.mjs` | PreToolUse `Bash` | **blocking** (exit 2, fail-closed) | Agent approving PRs, mutating `gh api` / GraphQL mutations, curl writes to GitHub comments/reviews | GitHub remote + `gh` CLI in use; human-only review policy | `extraPatterns`, `message` |
| `protect-branches.mjs` | PreToolUse `Bash` | **blocking** (exit 2) | An agent deleting, renaming, force-pushing or resetting a protected branch, or removing its worktree; history rewrites while on a base branch | Parallel agents / worktrees running cleanup steps; long-lived branches | `baseBranches`, `gitConfigKey` (per-machine extra list via `git config --add`) |
| `guard-dangerous-commands.mjs` | PreToolUse `Bash` | **ask** (with preview) | Recursive delete, force push / reset --hard / rebase, deploys, secrets-CLI use, `gh pr merge`, `sudo`, SQL drops | Any repo; stronger with deploy/infra CLIs or a secrets manager (both lists ship empty: fill them) | `protectedBranches`, `secretsClis`, `deployCommands`, `previewBudgetMs` |
| `detect-feature-intent.mjs` | UserPromptSubmit | advisory | Jumping into code for a new feature without a plan | A planning skill / plan-first convention (`plan-feature`) | `skill`, `context`, `PATTERNS` (per language), `ENABLED_LANGUAGES` (default `['en']`; `es` ships as an opt-in example) |
| `detect-correction.mjs` | UserPromptSubmit | advisory (+ local log) | The same correction being repeated across sessions | A `reflect`-style skill and an agent-config dir to hold lasting rules | `skill`, `logPath`, `context`, `PATTERNS`, `ENABLED_LANGUAGES` |
| `lint-if-changed.mjs` | Stop | advisory | Ending a turn with lint errors, without paying lint on doc-only turns | A `lint` script in `package.json` (or any linter command) | `command`, `sourceExt`, `tailLines`, `timeoutMs` |
| `check-env-docs.mjs` | Stop | advisory | New env var read in code but missing from the env docs | An env docs file (`docs/environment-variables.md`, `.env.example` docs...) | `docsPath`, `baseRefs`, `readers`, `excludedPath`, `sourceExt`, `hint` |
| `compliance-tripwire.mjs` | Stop | advisory | Shipping tracking SDKs, cookies/storage, consent bypasses, new tables, new outbound hosts without a compliance look | Published legal texts, a `compliance/` dir, analytics or auth/PII handling | `contentTripwires`, `pathTripwires`, `vendoredPath`, `excludedPath`, `reminder`, `baseRefs` |
| `branch-policy.mjs` | Stop | advisory | Local commits made directly on protected branches | Protected `main`/`release` branches, PR-only flow | `remote`, `protectedBranches`, `integrationBranches`, `docsPath` |
| `pr-preflight.mjs` | Stop (advisory) / CI (`--strict`, exit 1) | advisory or blocking | Committed `.env*`, `.env` dropped from `.gitignore`, oversized files, media masters; in advisory mode, a flow-sensitive diff with no fresh independent-review seal | Any repo with secrets in dotenv files; repos that keep media elsewhere; a review-lane policy | `baseRefs`, `maxBytes`, `sizeExemptPrefixes`, `mediaMasters`, `envAllowed`, `heavyFileAdvice`, `sensitivePaths`, `reviewHint` |
| `session-start-status.mjs` | SessionStart | advisory | Starting to code on a fresh branch before planning; not knowing the code index state | A code index (graph, ctags, SCIP) and a plan-first convention | `INDEX_PATH`, `INDEX_BUILD_LOG`, `INDEX_CLI`, `INDEX_INSTALL_HINT`, `baseRefs`, `longLivedBranch`, `planNudge`, `index` (or `null`) |
| `index-reminder.mjs` | PreToolUse `Grep\|Glob` | advisory, once per session | Blind grepping when a code index exists | Same index as above | `INDEX_PATH`, `INDEX_QUERY_HINT`, `markerPrefix` |
| `index-refresh.mjs` | Stop | advisory | A code index going stale after edits, without paying its update cost on every turn | Same index as above | `indexDir`, `indexFile`, `updateCommand`, `sourceExt`, `timeoutMs` |
| `save-handoff.mjs` | Stop + PreCompact | advisory | A new chat or a compacted session losing the branch state, the active plan and what was left pending | Long sessions; work picked up across chats or worktrees | `planDirs`, `pendingHeading`; env `HANDOFF_CONTEXT_TOKENS`, optional `HANDOFF_STATUS_CMD` |
| `load-handoff.mjs` | SessionStart | advisory | Starting a session without reading the previous one's hand off | Same as above | `MAX_AGE_MS` |

### CLIs used by skills (not wired as hooks)

| Script | Usage | What it prevents |
|---|---|---|
| `pr-precheck-seal.mjs` | `node scripts/pr-precheck-seal.mjs check [base]` (exit 0 fresh, 1 stale/missing, 2 error) · `write [base]` | Re-running the pr-scope precheck on an unchanged diff, or skipping it after the diff changed. Fingerprint = working tree vs merge-base with `origin/<base>` (default `CONFIG.defaultBase`), so staging/committing the same change keeps it fresh |
| `review-seal.mjs` | `node scripts/review-seal.mjs check [base]` · `fingerprint [base]` (saves the exact diff to review) · `write [base] --expect <fp>` (refuses if the diff moved during the review; same exit codes; imports `pr-precheck-seal.mjs`) | Opening a flow-sensitive PR with no independent (fresh-context) review of this exact diff. The reviewer writes it; `pr-preflight` (advisory) and the PR-creation command check it |

Skills referenced by name (`plan-feature`, `reflect`) are conventions: point `skill` at whatever
your repo calls them, or drop the hook if you have none.

## Install

1. Copy the hooks you want (plus nothing else; each file is standalone) into `scripts/`:
   `cp block-outward-writes.mjs guard-dangerous-commands.mjs ... <repo>/scripts/`.
   Do **not** copy `_helpers.mjs` or `*.test.mjs` unless you want the tests in the repo.
   `review-seal.mjs` needs `pr-precheck-seal.mjs` next to it; `pr-preflight.mjs` loads
   `review-seal.mjs` only if present (the seal notice is skipped otherwise).
2. Edit the `CONFIG` block of each script (branches, deploy/secrets CLIs, docs path, patterns,
   code-index paths, enabled languages).
3. Wire them, with one of:
   - **rulesync**: merge `hooks.rulesync.json` into `.rulesync/hooks.json`, then run `rulesync generate`.
   - **plain Claude Code**: merge `settings.hooks.json` into `.claude/settings.json`.
   Keep `failClosed` / `onFailure: "block"` **only** on `block-outward-writes`.
   Stop / SessionStart / PreCompact commands `cd` to the project root first, so scripts that
   resolve paths from `process.cwd()` work from any subdirectory.
4. Run the tests: `node --test scripts/*.test.mjs` (pass the files explicitly via the shell
   glob; Node 22+ no longer accepts a bare directory). Add that line to CI. In CI also run
   `node scripts/pr-preflight.mjs --strict` on pull requests (set `GITHUB_BASE_REF`, or
   `PUSH_BEFORE_SHA` for push events).
5. Gitignore `.context/`: workspace scratch for the correction log (`detect-correction`), the
   hand off (`save-handoff`), the seals (`pr-precheck-seal`, `review-seal`) and index build logs.
   The seals rely on it being ignored: `git add -A` must skip them.

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
