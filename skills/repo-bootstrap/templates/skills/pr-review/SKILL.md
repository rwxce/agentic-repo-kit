<!--
TEMPLATE: pr-review skill (lean, diff-based). Generate when the repo uses pull requests on a code
host with a CLI (`gh`/`glab`). Fill: host CLI commands, base branch, the repo's sensitive paths and
standards file. Strip this comment when writing the file.
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

## Hard rules

- Do not modify code or files. No `git pull`/`merge`/`rebase`; no destructive checkout. If there
  are pending local changes, warn before touching anything.
- Work against remote refs (`origin/<base>`, `origin/<head>`) and the real diff only. Do not
  comment on unchanged lines or files outside the PR.
- **Private by default.** The review ends in the conversation. Publish comments or reviews to the
  host only if the user explicitly authorizes that publication. **Never approve a PR.** Never use
  mutating API calls.
- **No nits.** No style, naming, adjacent refactors, speculative cleanup, generic "add tests". If it
  does not change the merge decision, it is noise.
- Separate **facts**, **risks**, **hypotheses** and **opinions**; do not invent problems. Block on
  real risk, never on taste.
- If critical information is missing, stop and ask.

## Input

The PR URL, or the PR of the current branch (`<host CLI> pr view --json number,url`, read-only).

## Flow

1. Preflight: right repo, `git status --short`.
2. PR metadata (`<host CLI> pr view … --json …`): base/head refs, head SHA, changed files.
   **Detect the lane** from the root rule's review policy: *demonstrable* (check the evidence and
   CI, do not review the implementation) or *flow-sensitive* (full review). A missing or ambiguous
   lane, or any sensitive path (<globs>), is flow-sensitive.
3. `git fetch origin <base> <head>`; list commits, changed files and stats.
4. Load the repo's standards (root rule, `<sensitive-areas checklist or diff-reviewer agent>`) and
   review block by block. Priorities, in order: **security** (authn/authz, injection, secrets,
   privacy) → **regressions** (changed contracts, callers, migrations, idempotency) → data
   integrity and cost → consequential UX.
5. For flow-sensitive PRs prefer running the `<diff-reviewer>` agent (fresh context, strongest
   model) over reviewing inline, then verify its findings yourself.

## Output

- **Summary:** what the PR does and the lane, 2-3 lines.
- **Findings** by severity (Critical / Important), each with `file:line`, why it matters, and a
  one-line suggested fix.
- **Unverified** items, if any, and what evidence would settle them.
- **Recommendation:** merge / merge after fixes / do not merge, with the one deciding reason.

If the PR holds up, say so in one line. Do not pad the list.
