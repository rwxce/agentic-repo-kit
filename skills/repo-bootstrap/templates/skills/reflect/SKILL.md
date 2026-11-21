<!--
TEMPLATE: reflect skill (turn user corrections into lasting checks, rules or memories). Always
generated; it is what makes the setup improve over time. Fill: the rules home paths, the memory
location, the hook path, the regenerate command, and the repo's homes for each rung of the
ladder in `references/checks.md`. Strip this comment when writing the file.
-->
---
name: reflect
description: >-
  Turn the user's corrections into lasting checks, rules or memories so the same mistake does not
  come back — a check (type, lint rule, test, CI gate) first, prose only as a last resort. Use
  proactively, without being asked, whenever the user corrects you ("I told you", "you did it
  again", "no, always/never…", a reverted action) and whenever the user runs /reflect. Also prunes
  rules and memories a check made redundant. Proposes; writes only after a yes.
targets: ["*"]
---

# Reflect

A correction the user has to repeat is a rule nobody wrote down — and a rule nobody enforces is a
wish. This skill finds the corrections that matter, tries to turn each into a check that fails on
the mistake, and only falls back to prose when no check can catch it. It never edits on its own.

Method: Lauren Tan's `/correct` approach — climb to a check, class-level on the second repeat,
ratchet widespread patterns, exceptions expire. Her team's results are self-reported, not a
controlled experiment. Detail: `references/checks.md`.

## When it runs

- <optional: a prompt hook (`<path>`) adds a note to the turn when the prompt looks like a
  correction, and logs it to `<local gitignored log, e.g. .context/reflect/corrections.jsonl>`.>
- The root rule says to apply this skill after any correction, for tools where no hook runs.
- The user can run it by hand (`/reflect`) to sweep the whole session, or `/reflect prune` for
  prune mode (below).

First do what the user asked. Reflect comes after the fix, in the same turn, and adds at most a
few lines to the answer.

## Steps

1. **Name the correction** in one sentence, as a rule: what to do or avoid, not the incident.
   "Push straight to main in repo X", not "you opened a PR".
2. **Is it worth keeping?** Keep it if any is true:
   - the same correction appears earlier in this session, in the corrections log, or in memory;
   - the user states it as a standing preference ("always", "never", "from now on");
   - it would change how future, unrelated tasks are done.
   Skip one-off taste calls about this task only, and anything the code or git history already
   records. If you skip, say nothing.
3. **Check it is not already written or enforced.** Search the root rule, `.rulesync/subagents/`,
   `.rulesync/skills/`, `docs/`, the memory index, and the existing checks (custom lint rules,
   `scripts/check-*`, tests, CI workflows). If a rule exists but was ignored, that is the signal
   to escalate it to a check (step 4), not to add a duplicate.
4. **Can a check catch it?** Climb the ladder from the top and stop at the first rung that can
   catch the mistake mechanically:
   1. type or schema;
   2. an API that makes the mistake impossible (a helper that is the only way in);
   3. lint rule;
   4. architecture test (imports, file layout, registry coverage);
   5. test (unit, integration, e2e);
   6. CI gate (a `scripts/check-*` run in a workflow or hook);
   7. monitor (error alert, smoke check) — for what only shows in production;
   8. review checklist item (`pr-review`, the diff reviewer, `plan-reviewer`);
   9. prose (rule, skill or memory) — last resort, for taste and judgement calls.
   - **First time** a correction appears, a narrow check for that instance is enough.
   - **Second time** (same correction in session history, the corrections log or memory),
     escalate to a **class-level** check that catches every variant, not just this file.
   - **Widespread pattern** (the check would flag existing code): ratchet it — a committed
     baseline that can only shrink.
   - **Exceptions** to a check each carry an owner and an expiry date.
   Rungs, ratchet and exception formats: `references/checks.md`.
5. **Prove the check fails on the original mistake.** Reproduce the mistake (or revert the fix)
   and show the check red, then green with the fix. A check that never failed on the real error
   does not count; say so instead of shipping it.
6. **Pick the home** for whatever stays prose (rung 9, or the one-line pointer to a check):
   | Kind | Home |
   |---|---|
   | Applies to every agent and tool in this repo | the root rule, in the section it belongs to |
   | Applies to one domain | that subagent (`## Build rules`) or skill |
   | About how this user likes to work, or not derivable from the repo | a `feedback` memory (with **Why** and **How to apply**) |
7. **Propose it** in the answer: the rung chosen (and why higher ones cannot catch it), the check
   or the exact lines as a short diff, and how step 5 will show it red. One proposal per
   correction, never a pile. A new lint rule, CI workflow, test kind or hook also updates
   `docs/blueprint.md`.
8. **On a yes**, apply it. Edit only the source of truth for rules (`.rulesync/`, never generated
   files), then run `<regenerate command>`. A check is code: it follows the normal PR flow. Mark
   the entry in the corrections log as consolidated.

## Prune mode

Run with `/reflect prune`, or offer it after a check lands. For each rule, skill passage or
memory that a check now enforces: name the check, show it fails on the mistake the prose warned
about, and propose removing the prose — or shrinking it to a one-line pointer to the check. Fill
the "Trim with audit" table from the root rule (block, keep/remove/rewrite, why) and remove
nothing without a yes. When in doubt, keep.

## Rules

- Rules and agent files are written in the repo's artifact language, whatever language the
  conversation is in.
- Keep a rule to one or two lines, phrased as the instruction, with the reason when it is not
  obvious.
- Never weaken or delete an existing rule because it was inconvenient; raise the conflict
  instead. Removal happens only in prune mode, when a check already enforces it.
