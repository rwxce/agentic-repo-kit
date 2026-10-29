<!--
TEMPLATE: reflect skill (turn user corrections into lasting rules). Always generated; it is what
makes the setup improve over time. Fill: the rules home paths, the memory location, the hook path.
Strip this comment when writing the file.
-->
---
name: reflect
description: >-
  Turn the user's corrections into lasting rules or memories so the same mistake does not come
  back. Use proactively, without being asked, whenever the user corrects you ("I told you",
  "you did it again", "no, always/never…", a reverted action) and whenever the user runs
  /reflect. Proposes; writes only after a yes.
targets: ["*"]
---

# Reflect

A correction the user has to repeat is a rule nobody wrote down. This skill finds the ones that
matter and proposes where each belongs. It never edits on its own.

## When it runs

- <optional: a prompt hook (`<path>`) adds a note to the turn when the prompt looks like a
  correction, and logs it to `<local gitignored log>`.>
- The root rule says to apply this skill after any correction, for tools where no hook runs.
- The user can run it by hand (`/reflect`) to sweep the whole session.

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
3. **Check it is not already written.** Search the root rule, `.rulesync/subagents/`,
   `.rulesync/skills/`, `docs/`, and the memory index. If a rule exists but was ignored, the fix is
   to make that rule sharper, not to add a duplicate.
4. **Pick the home:**
   | Kind | Home |
   |---|---|
   | Applies to every agent and tool in this repo | the root rule, in the section it belongs to |
   | Applies to one domain | that subagent (`## Build rules`) or skill |
   | About how this user likes to work, or not derivable from the repo | a `feedback` memory (with **Why** and **How to apply**) |
5. **Propose it** in the answer: the home, and the exact lines to add or change as a short diff.
   One proposal per correction, never a pile.
6. **On a yes**, apply it. Edit only the source of truth (`.rulesync/`, never generated files),
   then run `<regenerate command>`. Mark the entry in the corrections log as consolidated.

## Rules

- Rules and agent files are written in the repo's artifact language, whatever language the
  conversation is in.
- Keep a rule to one or two lines, phrased as the instruction, with the reason when it is not
  obvious.
- Never weaken or delete an existing rule through reflect; raise the conflict instead.
