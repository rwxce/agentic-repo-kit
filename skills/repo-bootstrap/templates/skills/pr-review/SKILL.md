<!--
TEMPLATE: pr-review skill (lean, diff-based). Generate when the repo uses pull requests on a code
host with a CLI (`gh`/`glab`). The hard rules and the procedure live once in
`references/pr-review.md`; this file only points there. Fill the `<…>` placeholders in both
files: host CLI commands, base branch, the repo's review checklist, sensitive paths and standards
files. Strip this comment when writing the file.
-->
---
name: pr-review
description: >-
  Professional PR review based on the real diff, prioritizing security and regressions, without
  touching local code. Returns the review in the conversation; publishes only with the user's
  explicit authorization.
targets: ["*"]
---

# PR Review (without touching the code)

Reply in the user's language. Be direct; if something is serious, say so plainly.

The hard rules (no code changes, remote refs only, private by default, no nits, lane detection,
never approve) and the full procedure live in one place: **read and follow
`references/pr-review.md`**. Always load `<review checklist path>` as part of the review (§6 of
the reference) — some tools do not load it automatically.

## Minimum input

- PR URL (or the PR associated with the current branch, `<host CLI> pr view --json number,url`,
  read-only)

## Flow (high level)

1) Repo preflight + `git status --short`
2) PR metadata with `<host CLI> pr view … --json …`, get the head SHA and detect the lane
3) `git fetch origin <base> <head>`
4) Commits + changed files + stats (`git log`, `git diff --name-status`, `git diff --stat`).
   A review that will write the seal reads the snapshot diff from `review-seal.mjs fingerprint`
   instead of the remote refs, in this step and in the block review (see the end of this file)
5) Load the repo standards, then review by block — depth according to the lane. For
   flow-sensitive PRs prefer the `<diff-reviewer>` agent (fresh context, strongest model), then
   verify its findings yourself
6) Executive summary + findings by severity + final recommendation

## Output format

Use the private final format defined in `references/pr-review.md` (§11).

The review's first line states who reviewed:
- `Type: independent (fresh context, diff <seal hash>)` — a context that did not write the code: a
  new subagent, or another agent, given the diff, not the author's conclusions. Only this counts as
  the independent review a flow-sensitive PR needs.
- `Type: self-check` — the session that wrote the code. A second pass by the same agent is still a
  self-check.

An independent reviewer that will write the seal starts with
`node scripts/review-seal.mjs fingerprint <base>`, which saves the exact diff it fingerprints
(merge-base → the author's working tree, unpushed and uncommitted work included) to
`.context/pr-review/<branch>.diff`. **That file is the diff to review** — not
`origin/<base>..origin/<head>` (`references/pr-review.md` §3) — so the reviewed code is the sealed
code. It ends with `node scripts/review-seal.mjs write <base> --expect <that fingerprint>`. Both
run from the author's worktree (a reviewer in another checkout `cd`s there first). The write
refuses if the diff changed during the review, the seal goes stale as soon as the diff changes
later, and the PR-creation command and the PR preflight warn on a flow-sensitive diff without a
fresh seal. A self-check never writes it.
