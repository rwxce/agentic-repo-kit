<!--
TEMPLATE: reflect reference — turning a correction into a check. Fill the "Home in this repo" and
"Example already here" columns from the repo's real checks; delete rungs the repo has no home for
yet (leave the rung, mark the home "none yet"). Strip this comment when writing the file.
-->
# Reflect — turning a correction into a check

Detail for steps 4-5 and prune mode of `reflect`. The idea: prose asks an agent to remember; a
check makes forgetting fail loudly. Source: Lauren Tan's `/correct` skill — climb to a check,
class-level on the second repeat, ratchet, expiring exceptions, the check must fail on the real
error. Her team's numbers are self-reported; other teams describe similar practice, but there is
no controlled experiment. Treat it as a sound default, not a proven law.

## The ladder

Stop at the first rung that can catch the mistake. Higher rungs fail earlier and cost less to
keep.

| # | Rung | Catches | Home in this repo | Example already here |
|---|---|---|---|---|
| 1 | Type or schema | wrong shape, missing field, impossible state | `<types, schema validators>` | `<…>` |
| 2 | API that makes it impossible | doing it the wrong way at all | a helper that is the only entry point | `<a route registry, a rate-limit helper…>` |
| 3 | Lint rule | a code pattern visible in one file or its imports | `<custom lint rules>` | `<…>` |
| 4 | Architecture test | layout, registries, cross-file coverage | a test that reads the tree | `<every page registered, directory ↔ registry parity…>` |
| 5 | Test | behaviour in a scenario | `<test runner>` | regression tests from `debugging` |
| 6 | CI gate | repo-wide state, generated files, policies | `scripts/check-*` wired into a workflow or hook | `<generated-config sync check, skill lint…>` |
| 7 | Monitor | what only shows in production | `<error alert, smoke check>` | `<…>` |
| 8 | Review checklist | judgement a machine cannot make yet | `pr-review`, the diff reviewer, `plan-reviewer` | `<…>` |
| 9 | Prose | taste, preferences, ways of working | the root rule, a skill, a `feedback` memory | tone of voice, response length |

Signals for each rung: if you can describe the mistake as "this value can't be X" → 1; "never
call Y directly" → 2; "this import/pattern must not appear in Z" → 3; "every A needs a B
somewhere else" → 4; "when C happens, D must result" → 5; "the repo as a whole must satisfy E" →
6. If the honest description needs "usually" or "it depends", it is 8 or 9.

When a check lands, the prose shrinks to one line that points to it, so agents know why the check
exists without re-reading the whole story.

## Narrow first, class on the second repeat

- **First correction:** a narrow check for the instance is fine (one file, one import).
- **Second correction of the same kind** (in session history, the corrections log or memory): the
  narrow fix failed to generalise. Write the check for the whole class — every variant of the
  mistake, not just the spot that was caught. Example: a first "don't import the image library
  from `lib/media`" becomes "no web-reachable module may reach a native image library,
  transitively".

## Red first

Before proposing the check as done:

1. Reproduce the original mistake on a scratch branch or in the test fixture (or revert the fix).
2. Run the check: it must fail, and its message must say what to do instead.
3. Restore the fix: it must pass.
4. Put the reproduction in the check's own tests (a fixture that must stay red), so a later
   refactor that silently disables the check also fails.

A check that only ever passed has not been shown to catch anything. If you cannot reproduce the
mistake, say so and stay on a lower rung (review checklist or prose) until you can.

## Ratchet for widespread patterns

When the new check would flag existing code, do not fix everything in the same change and do not
downgrade the check to a warning. Commit a baseline instead:

- The baseline is a checked-in file next to the check (e.g. `scripts/<check>.baseline.json`)
  listing the current offenders — per file, with a count when one file has several.
- The check fails when an offender is **added** or a count **grows**.
- When an offender is fixed, the check fails until the baseline is lowered in the same change (or
  the check rewrites it downwards itself). The baseline can only shrink; raising it needs an
  exception (below).
- New files are never added to the baseline.

## Exceptions expire

Every exception to a check — a lint-disable comment, a baseline bump, an allowlist entry — carries
an **owner** and an **expiry date**, plus the reason:

```ts
// eslint-disable-next-line local/catch-must-report -- owner: <name>, expires: 2027-02-28, why: best-effort cache warm-up
```

```json
{ "path": "lib/legacy/export.ts", "owner": "<name>", "expires": "2027-02-28", "why": "removed by the export rewrite" }
```

The check (or a small companion test) fails once an exception is past its date, so it comes back
for a decision instead of becoming permanent. An exception without an owner and date is rejected
like the mistake itself.

## Prune mode

Prose that a check now enforces is noise that costs context in every session and can drift from
the check. In prune mode:

1. List rules, skill passages and memories that describe what a check enforces.
2. For each, name the check and show it red on the mistake the prose warned about.
3. Propose: remove, or rewrite to a one-line pointer to the check (keep the "why" when it is not
   obvious from the check's message).
4. Fill the "Trim with audit" table from the root rule — block, keep/remove/rewrite, why — after
   reading each block's content, never its title. When in doubt, keep.
5. Remove nothing without a yes. Memories are pruned by editing the memory index and file.

Prose that covers more than the check catches (for example, escape hatches a lint rule cannot
see) keeps the uncovered part.
