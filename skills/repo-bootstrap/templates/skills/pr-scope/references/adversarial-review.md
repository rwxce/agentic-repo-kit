<!--
TEMPLATE: pr-scope reference — the empirical catalog of finding classes the precheck's round B
hunts for. Start from these generic classes; replace the examples with real ones from this repo's
review history as they accumulate (mine merged PRs' review comments, group them, keep the classes
that recur). Strip this comment when writing the file.
-->
# Adversarial review — empirical catalog

Complement to the generic review checklist (`pr-review`). That covers the general ground (auth,
secrets, i18n, tests…). This catalog only covers the finding classes that **recur in this repo's
review history**. Apply all of them in every round of the precheck loop (§6.1 of `pr-scope.md`) —
it is what round B reviews, not a one-pass checklist.

Remember the §2.0 distinction: a **completion** (the code already in the diff does not work
without it) is always in scope even outside the baseline; an **extension** is deferred.

Each class: the question to ask against the diff, a typical example, and how to verify it.
Grow it: when a review finding escapes the precheck, add or sharpen a class.

## 1. Idempotency and retries

**Question:** every operation that can be retried (a job retry, a crash, a double dispatch) — is it
safe to run twice? Does the idempotency key change between attempts when it should, and stay the
same when it should?
**Example:** a retry reuses a fixed key, so the job runner returns the previous run and does
nothing; a `catch` that only logs marks the job completed, so the retry policy never fires.
**Verify:** every `catch` inside a retryable job rethrows or marks the state failed. Every
idempotency key derives from the real input.

## 2. State before the `await`

**Question:** between the start of an async operation and its confirmation, what happens if a
second request arrives (double click, two tabs, concurrent retry)?
**Example:** two "start export" calls both see `idle`, both pass the guard and both enqueue the job.
**Verify:** the "in progress" write happens **before** the `await` of the external call.

## 3. Missing or misaligned environment

**Question:** does the diff consume a variable, secret, webhook or provider setting that must exist
on the target deployment?
**Example:** a new webhook secret read in code but never provisioned: it compiles and breaks in
production.
**Verify:** cross-check the env registry (`docs/environment-variables.md`), the deploy workflow and
the provider configuration. Remote state cannot be inferred from the diff: confirm it.

## 4. Locale propagation

**Question:** does this function write or return translatable content? Does it receive the locale
explicitly, or assume the default language?
**Example:** an email is always sent in the source language because the locale is derived from a
constant.
**Verify:** functions that persist or send user-facing content take the locale as a parameter;
every locale file is updated.

## 5. Backfill semantics

**Question:** is a new required field compatible with existing rows/documents?
**Example:** a required column without a default breaks reads of old rows until a backfill runs.
**Verify:** expand (optional) → migrate (idempotent backfill) → contract (a `Contract:` issue).
Test with representative old data.

## 6. Legal/compliance coherence

**Question:** does the change persist a new field about a person, add a vendor, or touch consent —
and do the published legal texts already say so?
**Verify:** the compliance check in the root rule; the compliance inventory vs the real code.

## 7. Secrets and `.env`

**Question:** does the diff loosen `.gitignore`, expose a variable to the client, or reuse one
secret across domains?
**Verify:** mechanical — the PR preflight blocks it.

## 8. SSRF and URL validation

**Question:** is a user-supplied URL fetched on the server? Is the resolved address validated, or
only the string?
**Verify:** validate the resolved hostname (DNS → no loopback/private ranges) and restrict the
scheme to `http(s)`; reject repeated redirect parameters before sanitizing them.

## 9. Unpaginated scans

**Question:** does a recurring scan ("all pending", "all unprocessed") have a limit, or does it grow
with the user base?
**Verify:** every cron/reconciliation scan uses an index plus a limit or cursor, never an unbounded
read.

## 10. Dead links and routes

**Question:** does a button, CTA or link point to a route that really exists?
**Verify:** mechanical where possible (a route-registry arch test or lint rule).

## 11. Assets not bundled

**Question:** does serverless or worker code read a non-code file (template, font, image) from
disk? Does the bundler include it?
**Verify:** the bundler's include/extension config, or a lint rule that flags disk reads of
untraced assets.

## 12. Accessibility and responsive

**Question:** was a new visual surface (dialog, banner, email) checked on mobile and with a screen
reader?
**Verify:** ~375 px width; confirmations and errors announceable (`role="alert"`, `aria-live`);
long dialogs scrollable.

## 13. Lying tests

**Question:** does the mock reflect the **current** payload/contract, or an older one?
**Verify:** when a return type or payload changes, grep every mock that imitates it — a test must
fail if the logic breaks.

## 14. State across tabs and accounts

**Question:** with two tabs open, or an account switch without reload, does the new state
propagate (revocation, consent, analytics identity)?
**Verify:** state kept in memory that affects several tabs needs a sync channel (`storage` event,
`BroadcastChannel`, server revalidation).

## 15. Swallowed or unsanitized errors

**Question:** is a caught error lost (generic log) or exposed raw (stack trace, tokens, PII)?
**Verify:** errors sent to monitoring and logs are sanitized and keep enough context to debug.

## 16. Coupling to the critical path

**Question:** does new non-essential work (email, analytics, notification) run **inside** a flow
that must complete fast and without failing (login, checkout, OAuth callback, webhook)?
**Verify:** side effects are scheduled as background jobs, never awaited inside an
auth/payment/webhook handler.
