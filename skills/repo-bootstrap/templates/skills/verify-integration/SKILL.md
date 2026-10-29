<!--
TEMPLATE: verify-integration skill. Generate when the repo talks to any external service (error
monitoring, payments, email, queues, webhooks, auth provider) or has a UI. Fill: one recipe row per
service actually found in the manifests/env; delete the 3 example rows that do not apply.
Strip this comment when writing the file.
-->
---
name: verify-integration
description: >-
  Close the whole loop on a change instead of stopping at static checks: predict impact, trigger
  the real code path, and confirm the effect on the other side (<list the repo's services>) plus UI
  screenshots across breakpoints and variants. Use before declaring done any change that touches an
  external service, a webhook/job, a data contract, or user-visible UI — and while writing the plan.
targets: ["*"]
---

# Verify the whole loop

Lint, typecheck and mocked tests prove the code compiles. They do not prove an error event
arrives, a webhook lands, or a screen looks right. This skill is the "done" bar for changes that
cross a boundary.

## 1. Impact map (in the plan, before code)

Block titled **Impact and expected responses**. List what consumes the thing you change (callers,
types/contracts, tables and existing rows, jobs/crons, webhooks, i18n, plans and entitlements,
routes) — use the code-graph query and grep for consumers — and for each, write the response you
expect: "I expect X at Y". Include later steps: retry, refresh, back, plan change, delete, late
webhook, a job that keeps running, old data.

## 2. Tools needed (in the plan, before implementing)

List the tools and access needed to verify (MCP servers, browser automation, sandbox credentials,
deployed-to-dev backend, test account) and say which you have. Ask the user for the missing ones
**before** implementing. This does not replace the explicit "go" or the Rate limit decision. If
they cannot be provided, the user must explicitly OK the exception; without that OK, do not
implement. Never assume the exception or discover it midway. The final message then lists what was
not verified and why.

## 3. Run the loop

1. Trigger the real path in the running app/worker (<test-login skill>, browser automation, task
   trigger, function runner). **Dev/sandbox only, test data only, never prod**: pin the dev
   environment explicitly, confirm it before running, and never use a production flag or env.
2. Confirm the effect on the other side with the service recipe below.
3. A new event, property or vendor needs the root rule's `## Compliance` check before it is added.
   Exercise the failure path (service rejects or is unreachable) and the consent gate when one
   applies.
4. Compare expected vs observed. If they differ, investigate before moving on (`debugging`).
5. Clean up events, rows, runs and accounts you created.

## Service recipes

One row per service the repo uses. "Never do" is the line that stops a verification from causing
real-world side effects.

| Service | Trigger | Confirm on the other side | Failure path | Never do |
|---|---|---|---|---|
| Error monitoring (e.g. Sentry) | Throw a test error through the real path, client and server | Query the monitoring MCP/API: the issue exists with the right release/env, tags, and no PII | Break the transport/DSN locally: the app still renders and does not loop | Send events to the production project; leave the test error unresolved |
| Payments (sandbox) | Run checkout / plan change in the app against the **sandbox** org | Sandbox MCP/dashboard shows the subscription/order; the webhook was processed **once** (check the processed-events table), also on replay | Replay the webhook; send an out-of-order or unknown event: no double credit, no crash | Use live keys or a real card; touch production customers |
| Transactional email | Ask the user first; send only to an address they supply for this run | Provider logs/events show the message; template and locale are right | Use an invalid/bounced address: the app records the failure and does not retry forever | Send to real users or to a list; copy recipient PII into the report |
| <service> | <how to fire the real path> | <where to look> | <how to break it> | <hard prohibition> |

When a new service is added to the repo, add its row here and mention it in `docs/blueprint.md`.

## UI matrix (screenshots in the final message)

Whenever possible, show the change **and its variants**: mobile 375, tablet ~768, desktop 1440 (px);
every locale; relevant states (empty, loading, error, full; free vs paid; roles); hover/focus/open
when it matters. Save under `<scratch dir>` and embed inline. Browser-engine-specific rendering
bugs not reproducible in your automation browser must be confirmed by the user in the real
browser. If a variant cannot be reached, say which and why.

## Final message

This section's format overrides the default chat length limit; keep it to one line per case.

- Cases checked, each with its evidence (screenshot, run id, issue link, command output).
- Expected vs observed, with any difference explained.
- What was not verified, why, and what only the tests cover. Never imply it was seen.
