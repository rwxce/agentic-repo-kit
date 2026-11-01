<!--
TEMPLATE: loop protocol for plan-feature steps 10-11. Fill: the state dir (default `.context/`),
the dev server command, the domain agents, the diff reviewer, the typecheck/codegen step.
Strip this comment when writing the file.
-->
# Loop roadmap (steps 10-11 and the loop itself)

A plan becomes a loop in three moves: the roadmap is validated in plan mode, the pre-loop
questions are asked before the "go", and the loop runs with `/loop` (dynamic, `ScheduleWakeup`)
from a state file until the last item is done. The user should be able to leave after the "go"
and come back to one final report.

## 1. Roadmap (in the plan, validated in plan mode)

Every size gets one. Small work is a 1-2 row table in the same format.

| id | Content | Agent | Lane | Branch ← base | Depends on | Done when | Verification | Stops the loop? |
|---|---|---|---|---|---|---|---|---|
| F0 | App shell | `<ui implementer>` | Demonstrable | `<topic>/f0-shell` ← `origin/<integration branch>` | — | lint/test green, shots seen | shots per breakpoint across the locales and themes the repo supports | no |
| F3b | Approve + reschedule | `<backend implementer>` | Flow-sensitive | `<topic>/f3b` ← `<topic>/f3a` | F3a | diff-reviewer findings fixed | `verify-integration`: the real path end to end | no |

- **Branch topology:** independent items branch from `origin/<integration branch>`; dependent items stack on the
  previous branch. Each PR's base is that previous branch; retarget to `<integration branch>` as each merges.
- **Waves:** items touching disjoint files can run in parallel; stacked items run in order.

## 2. Pre-loop questions (step 11, before the "go")

Walk every item and collect what would stop the loop:

- product or copy decisions the plan didn't close;
- rate-limit rows for new public entry points (root rule);
- compliance triggers (root rule);
- dashboard or secret work only the user can do (auth, billing, secrets store, deploy keys);
- tools: every MCP the verification needs, pointing at the right deployment (run one read
  against it now and check it sees real data);
- dev server mode (local or tunnel) for each verification;
- push / PR / comment permissions for the run;
- checks only a human can do (a real browser engine the tools cannot emulate, a real device).

Ask with the question tool, max 4 per round, as many rounds as needed. Each question carries a
recommendation, which is the **default**. Record in the roadmap: answered → the decision;
unanswered → "default applied, decide at the end". A question with no reasonable default blocks
only its item.

## 3. Start

After the "go":

1. Create `<state dir>/<slug>-roadmap.md` (state file): plan path, topology, one row per item
   (state, branch, commits, PR, findings, shots), the recorded defaults.
2. Create each worktree yourself:
   `git worktree add <worktrees dir>/<item> -b <topic>/<item> <base>`, then
   `<install command>`. Do **not** use `isolation: "worktree"`: it
   branches from the main checkout (often `main`), not from `origin/<integration branch>`.
3. Start `/loop continue the roadmap in .context/<slug>-roadmap.md`.

## 4. Each iteration (one wakeup)

1. Read the state file and `git log` of each open branch.
2. Pick the next unblocked item (or launch the next parallel wave in the background).
3. Delegate with a Handoff brief (`handoff-brief.md`) giving the absolute worktree path.
4. When it returns: `<lint>`, `<typecheck>` (run any codegen it needs first), `<test>`.
5. UI items: see it in the running app (`<dev server command>` + a test login) with shots at 375/768/1440, en/es,
   light/dark. **An item with UI is not done without shots.** One dev server at a time; stop it.
6. Flow-sensitive items: `<diff reviewer>` on the strongest model in a fresh context; fix
   material findings.
7. Commit per logical step and push; open the PR (lane marked, shots attached or linked).
8. Update the state file (findings, defaults applied, shots, what wasn't verified).
9. `ScheduleWakeup`: ≥1200 s as a fallback while background agents or CI run (agents re-invoke
   the loop on completion); `stop` after the last item.

Rules learnt the hard way:

- Translations for every locale and the legal/compliance text a change makes stale go in the
  **same PR**, never as placeholders or follow-ups.
- Commit only the item's files; untracked files you didn't create are reported, not committed.
- Check the recipient before every message to a running agent.
- A stop condition (CI red after 2 attempts, plan doesn't fit the code, a question without a
  default) blocks the item, records why, and the loop moves on.

## 5. Close

1. Write the final report (below).
2. **Delete `<state dir>/<slug>-roadmap.md`**: everything worth keeping is in the report.
3. `ScheduleWakeup` with `stop: true`.

## 6. Final report (one message)

- PRs: link, base, lane, CI state.
- Findings per item (review findings and how they were fixed).
- Shots, embedded (or a temporary local HTML gallery when there are many; delete it once seen).
- What was not verified and why, and what only tests cover.
- **Pending for you (outside code):** defaults applied (confirm or change), actions only you
  can take (dashboards, real browsers, merges, secrets), things to know (shared environments touched,
  data seeded, merge conflicts ahead).
