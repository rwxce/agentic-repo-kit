<!--
TEMPLATE: pr-scope reference — the canonical procedure (baseline, classification, record format,
pre-code PR map, precheck loop, triage). Fill: <base> (the default PR base), the release-branch
rule if any, the preflight script path, the review checklist, the code-index "affected" command
(or drop round C), the compliance tracker paths (or drop §5). Strip this comment when writing the file.
-->
# PR scope — canonical document

Full procedure to freeze a PR's scope and route the findings that fall outside it. This file is
the source; `SKILL.md` is only its summary. The catalog of finding classes the §6.1 loop looks for
in round B lives in `adversarial-review.md` — do not duplicate it here.

---

## 1. The baseline

The **baseline** is the set of files the PR touched before anyone reviewed it. It is the
objective fact that turns "this is out of scope" into a check, not an opinion you will lose every
time.

### 1.1 Pre-PR mode (the PR does not exist yet)

```bash
git fetch origin <base>:refs/remotes/origin/<base>
git diff --name-only origin/<base>...HEAD
```

In the chained precheck the work is not committed yet and `...HEAD` would not see it. There the
baseline is the working tree against the merge-base, plus the task's untracked files:

```bash
git diff --name-only "$(git merge-base origin/<base> HEAD)"
git ls-files --others --exclude-standard
```

`<base>` is this branch's real base branch (the default PR base normally; a release branch only
when prechecking a release). The explicit `origin/<base>:refs/remotes/origin/<base>` form is the
robust one: a shallow clone or a custom `remote.origin.fetch` does not guarantee that a bare
`git fetch origin <base>` updates the remote-tracking ref.

### 1.2 Triage mode (PR already open) — retroactive derivation

No stored state is needed: the boundary is derived from the API, so it works on old PRs.

```bash
gh pr view <N> --json number,title,state,createdAt,baseRefName,headRefName,additions,deletions
gh api repos/<owner>/<repo>/pulls/<N>/commits --paginate \
  --jq '.[]|[.sha,.commit.committer.date,(.commit.message|split("\n")[0])]|@tsv'
gh api repos/<owner>/<repo>/pulls/<N>/comments --paginate \
  --jq '.[]|[.created_at,.user.login,.path,.id,(.commit_id // .original_commit_id)]|@tsv'
gh api repos/<owner>/<repo>/pulls/<N>/reviews --paginate \
  --jq '.[]|[.submitted_at,.user.login,.state,.commit_id]|@tsv'
gh api repos/<owner>/<repo>/issues/<N>/comments --paginate \
  --jq '.[]|[.created_at,.user.login]|@tsv'
```

**The boundary** is the oldest feedback event across the three lists. The baseline is **not**
frozen by dates: a commit made before the first comment but pushed after keeps an earlier
`committer.date`, and a rebase can invert it. What does not lie is **which SHA was HEAD when the
first feedback arrived** — the `commit_id` (or `original_commit_id`) of the oldest comment/review.

```bash
git fetch origin <headRefName>
git diff --name-only <pr-base-sha> <boundary-sha>
```

General (non-inline) comments carry no `commit_id`. If the first feedback is one of them, take the
`commit_id` of the first later inline event, or the last commit before that comment's
`created_at` — the criterion is still "which SHA was the reviewer looking at".

> **`--paginate` is mandatory.** Without it the API cuts at 30 results and the count is wrong.

### 1.3 Metrics to always compute

| Metric | How | What it means |
|---|---|---|
| % reactive | commits after the boundary / total commits | >70% = the review is driving the PR |
| New files per round | files commented on for the first time, grouped by day | not trending to 0 = the PR **diverges** |
| Review rounds | feedback events separated by gaps > 4 h | >3 = too big to stabilize |
| Scope growth | current files / baseline files | >2× = no longer the same PR |

---

## 2.0 Completion vs extension

Applied **before** §2, because the hard rule alone would misclassify a missing configuration: it
lives outside the baseline (an environment variable, a provider setting, a bundler include) but
it is not optional.

- **Completion** — without it, the code **already in the diff** does not work in production →
  **always in scope**, wherever the fix lives. Examples: an unprovisioned variable or secret, a
  template the bundler does not ship, a test mock misaligned with the new payload. This is a
  deliberate exception to condition 2 of §2, limited to completions.
- **Extension** — the diff works, but something adjacent is left inconsistent → **deferrable**,
  follows §2. Examples: a link to a page that does not exist yet, a preference not persisted, a
  new surface not localized.

**Test:** *"if I merge this alone, does it break or does it just look bad?"* Breaks → completion.
Looks bad → extension.

## 2. The hard classification rule

Apply it **before** looking at severity and **after** §2.0. Severity only decides the follow-up's
urgency, never whether it gets into this PR.

A finding is **IN SCOPE** (fixed now) only if **all three** hold:

1. The defect is in a file already in the baseline, **and**
2. the fix creates **none** of: new file, new column / table / migration, new route or page, new
   dependency, new outbound host or vendor, **and**
3. the fix does **not** require changing published legal texts or compliance docs beyond recording
   a fact that already exists.

If any fails — and it is not a completion — the finding is **DEFERRED**.

### 2.1 `blocker`

A deferred finding is `blocker: true` when merging this PR without it would leave production
worse than now. It does **not** mean "fix it here": **the follow-up PR must merge before this one**.
This is what lets you say no to a P1 without leaving it unattended.

### 2.2 The exception: real holes

If the PR **as it stands** exposes an exploitable vulnerability or breaks a published legal
promise, the right action is to **remove the affected functionality** (`verdict: descoped`), not
to grow the PR. Example: an email promising "reply to this address" when nobody reads replies →
remove the promise, do not build an inbox in the same PR.

### 2.3 Round limit

If P1s inside the baseline still appear in the **3rd round**, the problem is the size, not the
code. Merge what is green; new branch for the rest. Say so explicitly in the summary.

### 2.4 Quick decision table

| The reviewer asks for… | Verdict |
|---|---|
| Fixing logic in a baseline file | **in-scope** |
| Adding a test for baseline code | **in-scope** |
| A new column / table / migration | **deferred** |
| A page or route that does not exist | **deferred** |
| Migrating to a different library | **deferred** |
| Localizing a new surface | **deferred** |
| A new dependency or vendor | **deferred** (plus: compliance) |
| Refactoring a file outside the baseline | **deferred** |
| Removing a false promise from the product | **in-scope** (remove, do not build) |
| Defending a feature with a hole by adding code | **descoped** — remove the feature |
| Unprovisioned variable, unbundled asset, unprovisioned secret | **in-scope (completion)** |

### 2.5 Mechanical detection

Turn the most frequent completions and extensions into checks that run before the loop: a lint
rule for assets the bundler will not ship, a route-registry arch test for dead links (usually an
extension, so `warn`), the PR preflight for `.env` and heavy files. Remote configuration cannot
be proven mechanically: check it against the env registry.

---

## 3. Output structure

**The record is private: conversation or session scratchpad, never GitHub (unless the user
explicitly authorizes publishing) and never repo files.** A scope record committed inside the PR
it analyzes pollutes that PR's diff — a skill that exists to stop scope growth cannot be a source
of it.

```
# Scope and review record — PR #<N>

## Index           internal links to each block
## Triage          boundary, metrics (§1.3), verdict table, split plan
## Baseline        frozen file list
## Findings        one block per deferred, discarded or descoped finding
```

- Each finding keeps an `fNN-slug` id and the §4.2 frontmatter.
- The record is returned to the user, not written as text ready to paste into GitHub: the human
  reviewer must understand, verify and rephrase it.
- **Findings resolved inside the PR get no block** — only a row in the verdict table.
- In pre-PR mode, concise follow-ups go into the `## Follow-ups` section of the PR body.
- A later round returns a new private version with the verdict timeline. It never creates or
  edits GitHub comments.

---

## 4. Block format

### 4.1 Baseline

```markdown
# Baseline — PR #<N>

- Base: `<base>` · Head: `<head branch>`
- Boundary (first review event): `<timestamp>` at `<boundary-sha>`
- Commits before the boundary: <n>

## Baseline files
- src/orders/checkout.ts
- src/billing/invoice.ts

## Metrics
| Metric | Value |
|---|---|
| % reactive commits | <x>% |
| Review rounds | <n> |
| Scope growth | <a> → <b> files |
```

### 4.2 Finding — `fNN-<slug>`

```markdown
---
id: f01
severity: P1                 # reviewer's badge; if none, "P?-assigned"
risk: security               # legal | privacy | security | product | docs
verdict: deferred            # deferred | discarded | descoped
blocker: true                # the follow-up PR goes before this one's merge
source: <comment permalink>
reviewer: <login>
files:
  - src/billing/invoice.ts
followup: FU-1               # split-plan group, or "—"
---

## Finding
The reviewer's literal quote, without reinterpreting it.

## Why it is out of scope
Which of the three conditions fails, with evidence (`file:line`, or "not in the baseline").

## Acceptance criteria
What must be true for it to count as resolved. Verifiable, not an intention.

## Verification
A concrete test or command that proves it.
```

For `verdict: discarded` replace "Why it is out of scope" with **"Why it is discarded"**.
Discarding without a written reason is not an option.

### 4.3 Triage — the split plan

```markdown
# Review scope — PR #<N> · feat: send invoice reminders

## Status
Baseline 8 files → 40 current (5×) · 6 rounds (limit 3 exceeded) · 90% reactive commits.
**Recommendation: merge what's green and split the rest.**

## Findings
| id | severity | risk | verdict | goes to |
|---|---|---|---|---|
| — | P2 | product | resolved in the PR | commit <sha> |
| f01 | P1 | security | deferred (blocker) | FU-1 |
| f02 | P2 | privacy | deferred | FU-2 |
| f03 | P2 | docs | discarded | — |

## Split plan

### FU-1 — `feat: persist the customer's locale` · blocks the merge
Findings: f01, f04
Grouping reason: both touch the `customer` table and the same migration.

### FU-2 — `feat: localized reminder templates` · does not block
Findings: f02
Reason: depends on FU-1 (needs the persisted locale).

## Discarded
- **f03** — asks to document a field already documented in the compliance inventory.
```

---

## 5. Link with compliance

<!-- optional: include if the repo keeps compliance trackers -->
Every finding with `risk: legal` or `risk: privacy` is **referenced** (never duplicated) in the
repo's compliance tracker (`<discrepancies path>` or `<compliance todo path>`). The reference goes
both ways: the private block points to the tracker entry, and the tracker entry cites the PR and
the finding id — never an invented permalink or a record path, because the record is not a file.
A lawful basis is the user's decision: a deferred finding that implies choosing one is
`blocker: true`, said in the summary.

---

## 6. Execution flow

### 6.0 Pre-code PR map — before writing code

Run inside `plan-feature`. Goal: no PR is born with more than one theme. Read-only (`<code index
query>`, `git log`, `rg`); no repo files, branches or `gh` writes.

```
1. Themes — decompose by demonstrable OUTCOME, not by layer.
   "Auth", "backend", "UI" are not themes. "Cancelling an order releases its stock" is.
   For each theme: PR title (conventional commit, without "and"), outcome in one sentence
   ("after merge, X happens / stops happening"), expected files, estimated size, new surface
   (table, column, route, dependency, vendor, legal text → compliance), review lane, and a short
   Mermaid diagram (3-8 nodes, type from plan-feature's diagram-picker) only when the theme has
   flow logic.

2. Dependencies — for each pair of themes:
   REAL  → without the other it does not compile or does not work in production. Justifies a stack.
   ORDER → only convenience or chronology. Goes against <base>, in parallel.
   When in doubt, it is ORDER. Stack only on a real dependency.

3. Waves — what ships now against <base>, what waits for which merge.

4. Hard rules:
   - theme > ~15 files or > ~800 lines → split it
   - title with "and" → split it
   - theme that depends on an open product decision → `blocked`; no code on top of it until it
     is resolved (a product disagreement is not closed with a commit)
   - backend without UI is valid if the PR body says where the UI will live; UI without its
     backend call is not

5. Ask which theme to start with and propose the branch from the right base. It ends here: the
   code is written in a new session scoped to that theme, closed by the PR-creation command
   (which runs the precheck).
```

Output: theme table, dependency graph + waves, blocked themes with the decision that unblocks
them, and the final question — in the conversation, or in a plan folder's `plan.md`.

Signs the map was skipped: titles "Part N of #X", "merge risk — please read" sections, `fix:
precheck round N` commits touching many files, a `feat` and its `revert` in the same PR, or a body
spending more lines on "deliberately not in scope" than on what is.

### 6.1 Precheck — adversarial loop before creating or pushing to the PR

Goal: the PR arrives with nothing to comment on. One pass does not get there — round 1's fixes
create round 2's findings — so it is a loop with a limit, not a checklist. It runs chained at two
moments:

- **The PR-creation command**, before committing or pushing, on the whole diff (new PR or new
  commits on an open one).
- **`/pr-triage`**, step 5 of §6.2, on the files the fixes just touched.

Both share a seal: `node scripts/pr-precheck-seal.mjs check|write <base>` — a hash of the whole
working tree against the merge-base, stored in `.context/` (git-ignored, excluded from the hash).
Fresh seal → the precheck already ran on this exact diff and is skipped.

**Chained mode** does not stop between rounds (the command is authorized end to end): it applies
completions and in-scope fixes, moves extensions to `## Follow-ups`, and only stops for a blocker.
**Triage mode** shows each round's proposal before applying anything.

```
0. git status --short and git fetch origin <base>.
   Compute the baseline (§1.1). Already > ~15 files or ~800 lines → warn before continuing.

Pass 0 — mechanical (cheap, first, stops if it blocks):
   node scripts/pr-preflight.mjs (plus the lint rules that already run in <lint>)

Round N (3 subagents in parallel; at most 3 rounds):
   A. Generic checklist → the pr-review skill's checklist
   B. Empirical catalog → adversarial-review.md, every class against the diff
   C. Coherence         → for each exported symbol modified this round, its direct callers
                          (<code index "affected" command>, depth 1, calls only). No index →
                          warn and skip round C, do not fail.
   Consolidate → classify each finding with §2.0 and §2:
     - completion           → apply now, even outside the baseline
     - in scope             → apply now
     - deferrable extension → do NOT apply; write its finding block (§4.2)
   Repeat if this round applied any fix. Stop when a round adds nothing new, or at 3 rounds
   (something in scope in the 3rd round = the PR's size is the problem, §2.3).

Final:
   node scripts/pr-precheck-seal.mjs write <base>   (only if no blocker remains)
   Write the record (§3) outside the repo. Propose what stays in the PR and what becomes a
   follow-up. Chained mode continues; triage mode stops for the user. Only concise follow-ups go
   into the PR body. Nothing is published to GitHub.
```

Precheck output: the baseline and its metrics; a warning if the PR is born too big; per round,
what was found, applied (completion / in scope) and deferred (extension); the private record; the
final proposal.

Rules: only completions and in-scope findings are fixed in code; extensions are never applied
automatically. No `git pull`, `merge` or `rebase`. The precheck itself never commits or pushes.
Code-index results: always an explicit shallow depth and the "calls" relation (a deep default
crosses re-export barrels and returns false dependents); "no dependents" and "symbol not in the
index" can look identical — that is not "verified". Subagents get the concrete diff files, never
the whole index file.

### 6.2 `/pr-triage <PR>` — on an open PR

1. Preflight: right repo, clean `git status --short`.
2. Derive the baseline and the boundary (§1.2). Compute the metrics (§1.3).
3. Read **all** comments with `--paginate` and keep the unresolved ones (GraphQL
   `reviewThreads { isResolved }` is a read).
4. <!-- optional: if docs/use-case-matrix.md exists --> Check each finding against the product
   rules and transitions in `docs/use-case-matrix.md`: one that contradicts a rule is
   **discarded** ("contradicts: <rule>"), and a fix must hold in every state and transition the
   matrix lists for that surface. Then classify each with §2.0 and §2. Group the deferred ones
   into follow-up PRs by **technical dependency**, not severity: "what would force touching the
   same file or migration twice".
5. Run the §6.1 precheck in triage mode on the fixes step 4 applied (Pass 0 + rounds restricted to
   the files they touched; at most 3 rounds). Write the seal only if no blocker remains, the seal
   was fresh before the fixes, and `git status --porcelain` shows nothing but the fix files.
   Otherwise leave it stale: the PR-creation command reruns the full precheck before the push.
6. Return the full proposal in the conversation or private scratchpad. Do not publish it.
7. Legal/privacy risks → update the compliance tracker (§5) through the normal change process.
8. Final summary: continue, or partial-merge-and-split if the round limit was exceeded.

## 7. Execution hard rules

- Do not modify product code from these flows, except fixes classified as completion or in scope.
- **No record file inside the repo.** On disk, only in the session scratchpad.
- No GitHub comments, inline findings or reviews without the user's explicit authorization for
  that publication. The `gh` commands here are read-only.
- No `git pull`, `merge` or `rebase`.
- No automatic commit or push, except inside the PR-creation command, which is authorized end to
  end.
- If critical information is missing (the real base, which threads are resolved), stop and ask.
