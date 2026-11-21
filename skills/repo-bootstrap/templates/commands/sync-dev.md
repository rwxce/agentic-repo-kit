<!--
TEMPLATE: /sync-dev command — bring the integration branch into the current branch and resolve the
  conflicts, without losing uncommitted work.
REPO SIGNAL: long-lived feature branches behind a busy integration branch; parallel worktrees
  sharing one git stash stack; generated files (AI config, lockfile, translations) that conflict.
FILL: <integration-branch>, the per-file conflict rules (generated-config command, lockfile and
  install command, translation files), the check commands. Rename to match the branch if useful.
Lands in `.rulesync/commands/sync-dev.md` (or `.claude/commands/`). Strip this comment.
-->
---
description: Bring origin/<integration-branch> into the current branch and resolve the conflicts, keeping local uncommitted work
targets:
  - '*'
---
Bring the latest `origin/<integration-branch>` into the current branch and resolve every conflict,
without losing the user's uncommitted work. Invoking this command authorizes exactly this sync
(fetch, tagged stash, fast-forward or merge commit, conflict resolution). It does not authorize a
push, a PR, or any other commit.

**Input**: none. `$ARGUMENTS` may name another base branch (default `<integration-branch>`).

**Steps**:

1. `git fetch origin <base>`. Report how far behind and ahead the branch is
   (`git rev-list --left-right --count origin/<base>...HEAD`). Not behind → say so and stop.
2. Dirty working tree → set it aside with a **tagged** stash. The stash stack is shared by every
   worktree and session: never a bare `git stash` / `pop`.
   `git stash push -u -m "sync-<branch>-<timestamp>"`, then capture its SHA with
   `git stash list --format='%H %gs'`.
3. Bring `origin/<base>` in:
   - No commits of its own → `git merge --ff-only origin/<base>`.
   - Commits of its own → `git merge --no-edit origin/<base>` (a merge commit, never a rebase: the
     branch may be pushed). Resolve conflicts now (step 5), `git add` them and finish with
     `git commit --no-edit` **before** touching the stash: git refuses to apply a stash over
     unmerged entries, and applying it mid-merge would fold local work into the merge commit.
4. Stash taken → `git stash apply <sha>` (never `pop`), resolve its conflicts (step 5), then
   `git restore --staged .` so the local work stays uncommitted.
5. Conflict rules (merge and stash alike): keep **both intents**.
   - Never drop upstream behaviour to make a conflict go away. When one side deleted or renamed a
     file the other side modified, port the changes into the surviving file and its tests.
   - Translation files: keep both sides' keys, then check every locale still parses.
   - Generated files (AI config generated from a source of truth, codegen output): take the
     `<base>` version, resolve only the source, then regenerate (`<generate command>`).
   - Lockfile: take the `<base>` version and run `<install command>`.
   - When the right resolution is a product or architecture decision (both sides changed the same
     behaviour incompatibly), stop and ask, describing each side in one line.
6. Verify: `<typecheck>`, `<lint>` and `<test>` whenever a conflict touched code. Report failures
   honestly; compare with `origin/<base>` before calling one pre-existing.
7. Only after the stash content is safely restored, drop **that** entry: re-find its current
   `stash@{n}` by its tag, then `git stash drop` it.

**Output**: one short summary: commits brought in, fast-forward or merge commit, each conflict and
how it was resolved, check results, anything left for the user to decide. Do not push.
