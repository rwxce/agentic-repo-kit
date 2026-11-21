<!--
TEMPLATE: /git-clean command — delete every branch and worktree outside a protected list, locally
  and on origin, after one "go" on an inventory table, with a SHA backup.
REPO SIGNAL: agents and parallel worktrees leaving dozens of branches and worktrees behind. Pair it
  with hooks/protect-branches.mjs (it blocks agents from deleting a protected branch whatever this
  command says) and ci/prune-stale-branches.yml (the scheduled, remote-only version).
FILL: <long-lived branches>, the git config key (same as protect-branches CONFIG.gitConfigKey,
  default `agent-guard.protect`), and any workspace tool that archives worktrees on its own.
Lands in `.rulesync/commands/git-clean.md` (or `.claude/commands/`). Strip this comment.
-->
---
description: Delete every branch and worktree outside the protected list, locally and on origin, after one go on the inventory
targets:
  - '*'
---
Delete every local branch, remote branch and worktree that is not protected. Invoking this command
authorizes the inventory and the table; the deletion needs one explicit "go" on that table. It
authorizes no commit, PR or push of code.

**Protected** (never touched; `scripts/protect-branches.mjs` also blocks agents from deleting,
renaming or force-pushing them):
- `<long-lived branches>` (e.g. main and the integration and release branches);
- the current branch;
- `git config --get-all agent-guard.protect`: the branches the user is working on (local config,
  shared by every worktree, never committed);
- any branch in `$ARGUMENTS`: add each with `git config --add agent-guard.protect <branch>` first.
  If the list is empty or looks stale, ask which branches are still active before step 2;
- remote branches with an **open PR** whose head is a protected branch.

Everything else is disposable: unmerged work, closed PRs and other people's branches included.

**Steps**:

1. Inventory (read-only): `git fetch --prune origin`, `git worktree list`, `git branch`,
   `git ls-remote --heads origin`, and `git -C <path> status --porcelain` for each worktree.
2. Show one table: local branches, remote branches and worktrees to delete (counts and names), and
   the protected ones that stay. Flag every worktree with uncommitted changes and what they are
   (`M` edits of real files vs a half-removed worktree full of `D`), and every remote branch with
   an open PR (deleting it closes the PR). **Wait for the "go"**; each dirty worktree needs its own
   explicit ok.
3. Save `<branch> <sha>` for every local and remote ref, plus `git worktree list`, to
   `.context/git-clean-<date>.txt`, so any branch can be restored with `git branch <name> <sha>`.
4. Delete, in this order:
   - `git worktree remove <path>` for each unprotected worktree (`--force` only for the dirty ones
     the user approved);
   - `git branch -D <branch>` for each unprotected local branch;
   - `git push origin --delete <branch>`, **one branch per call** (a multi-branch push fails as a
     whole);
   - `git worktree prune` and `git remote prune origin`.
5. Report what was deleted, what stayed and why, and where the SHA backup is. GitHub keeps every
   PR's commits under `refs/pull/<n>/head`, so deleting a branch never removes a PR's diff; a
   closed PR can get its branch back with "Restore branch".
