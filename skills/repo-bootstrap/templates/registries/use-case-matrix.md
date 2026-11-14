<!--
TEMPLATE: docs/use-case-matrix.md. Generate when behaviour depends on the user's state (plan tiers,
feature toggles, entity lifecycles, roles, connected integrations) — planners otherwise design for
the happy-path state only. The example below is FICTIONAL (an invoicing SaaS with orders, invoices
and a subscription plan): replace every row with the repo's real axes, rules and transitions, each
with the code that reads or implements it (verify with `rg`). Start with 3-6 axes; it grows one row
per case that escapes a plan.
-->
# Use-case matrix

The states a user can be in, the product rules that depend on them, and the transitions between
them. Planners keep designing for the happy-path state only (a paid user with everything set up)
and miss what the same screen does for everyone else, or what happens the moment a state changes.

**Who reads it:** every plan that changes behaviour depending on the user's state — features, fixes
and review triage alike (root rule, `plan-feature` step 1b, `pr-scope` §6.2, `plan-reviewer`). A
review finding (automated reviewer, `/pr-review`) is checked against the product rules below
**before** it is accepted: a finding that contradicts a rule is discarded with the rule's name,
not fixed.

**Grow it:** every time a case escapes a plan (found in review, QA or by a user), add the axis
value, rule or transition that would have caught it, with a "Seen in" note (where it was found,
not a date).

## 1. State axes

Pick the axes the change touches; the plan's use-case table has one row per relevant combination.

| Axis | Values | Where it is read |
|---|---|---|
| Plan | free · trial · paid · cancelled at period end · trial ended | `<entitlements helper>` (e.g. `src/billing/entitlements.ts`) |
| Auto-send | on · off | `<settings reader>` |
| Payment connection | connected · not connected · disconnected after use | `<integration module>` |
| Order state | draft · confirmed · invoiced · paid · refunded · cancelled | `<order state machine>` |
| Invoice due date | past · today · future (account's timezone) | `<date helper>` |
| Role | owner · member · viewer | `<authz helper>` |
| Data age | rows written before the change (new optional fields absent) | schema comments |
| Locale | <locales> | `<messages dir>` |
| Viewport | 375 · ~768 · 1440 · light/dark | `verify-integration` matrix |

## 2. Product rules

One line each, with a short **name** (review triage cites it) and the code that implements it. A
plan or fix that contradicts one needs the user's explicit decision first, stated in the plan.

| Name | Rule | Implemented in | Seen in |
|---|---|---|---|
| `manual-approval-only-when-auto-off` | "Send invoice" approval exists only on a paid plan with auto-send off; with auto-send on, invoices go out on their own | `<send gate>` | <where it escaped> |
| `free-never-sends` | The free plan never sends an invoice without an explicit click | `<send gate>` | |
| `paid-lapse-disables-auto` | A subscription that stops being paid turns auto-send off | `<subscription sync>` | |
| `invoiced-is-immutable` | An invoiced order's lines cannot change; corrections go through a credit note | `<order mutations>` | |
| `viewer-is-read-only` | A viewer never reaches a mutating action, in UI or API | `<authz helper>` | |

## 3. Transitions to check

For each transition the change touches, the plan says what every affected screen and function does
right after it, and a test or a `verify-integration` step covers it (each one is an invariant in
`plan-feature` step 8).

| Transition | What must hold |
|---|---|
| Auto-send on → off | Every not-yet-sent invoice shows the approval action; nothing already sent is resent |
| Auto-send off → on | Pending approvals become scheduled; no approval action anywhere |
| Paid → free / cancelled / trial ended | Auto-send off, approval gone, paywall where it applies; existing invoices stay visible |
| Free → paid | Scheduled work that the free plan skipped is reconciled once, not duplicated |
| Payment connection connected → disconnected | Collecting asks to reconnect; auto-send says why it cannot run |
| Due date passes with a screen open | Date gates re-evaluate without a reload |
| Order confirmed → cancelled after invoicing | A credit note is issued; the invoice is never edited in place |
| Old data | Rows written before the change render and save without the new optional fields |
| Another tab edits the same record | Saving one part never overwrites or drops what the other tab saved |

## 4. Checking a review finding against the matrix

1. Find the surface the finding is about and the axes/rules that govern it.
2. If the requested change contradicts a named rule → **discard** it: `contradicts: <rule name>`.
   (Example: "show the approval button to free users so they can send faster" → discarded,
   `contradicts: free-never-sends`.)
3. If it does not contradict a rule, the fix must hold in **every** state and transition listed for
   that surface — not only the reviewer's scenario. Write the affected rows in the triage record.
4. If the finding reveals a state or transition the matrix lacks, accept or defer it as usual and
   add the missing row here with a "Seen in" note.
