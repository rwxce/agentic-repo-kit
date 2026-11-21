<!--
TEMPLATE: docs/side-effect-registry.md. Generated for every repo that gets plan-feature (normal/big
features read it in full). Seed rows are generic: for each, keep only those whose surface exists in
the repo (verify with the search), replace <placeholders> with real paths, drop the rest.
It starts short on purpose and grows one row per side effect that escapes a plan.
-->
# Side-effect registry

Cross-cutting surfaces that planners keep missing. The `plan-feature` skill reads this file in
full for every normal or big feature and walks each row whose trigger matches. Each row says
**when** it applies and **the search to run** — the search, not memory, is what finds the reader.

Grow it: every time a side effect escapes a plan (found in review, QA or production), add one row
with where it was seen. Keep rows short; the point is the trigger and the search. Delete a row when
its surface disappears from the repo.

| Surface | Applies when the change… | Run / check | Seen in |
|---|---|---|---|
| Auth and roles | lets anyone other than the current owner/role act on a resource, or adds a role | every caller of `<auth/authz helpers>` (`<path>`) — classify each by role; lists, redirects and "has access" queries that assume a single owner | <ticket/PR or "seed"> |
| Rate-limit keys and exemptions | adds actors or public entry points | every call of `<rate-limit helper>`, the key it uses (owner vs actor), exemption lists and per-user purge lists in `<rate limiter module>` | seed |
| Consent / audit evidence | lets someone other than the owner accept, publish, enable or consent | fields that record the actor (`<…By`, `updatedBy`, consent timestamps) — must record the actor; what happens to them when that actor loses access | seed |
| Billing: price parsing, catalog sync, webhooks | adds a price type (seat, metered, custom), a product/metadata key, or a second subscription per customer | `<billing price parser>`, `<catalog sync>`, `<webhook snapshot/handlers>`: do they handle the new shape, or silently treat it as zero / throw on unknown? Is each webhook idempotent and applied once? Can the provider's self-service portal drift from our DB? | seed |
| Purge / cascade / retention | adds a table, column or row about a person | `<cascade-delete module>`, account purge/deletion, `<retention plan doc>` — is the new data deleted and listed? | seed |
| Lifecycle emails audience | changes who has a workspace/account, publishes, pays or churns | follow-up/eligibility queries and email-type config (`<path>`): who now gets (or stops getting) which email? | seed |
| Pricing / marketing / legal copy | changes what a plan includes, how it is billed, or what data/automation does | `rg -n` the concept in the i18n files (every locale), `<plan features config>`, positioning docs, and the legal pages (`<legal path>`) — does any published promise now lie? | seed |
| Paywall / UI gates subject | lets a non-owner use a paid resource, or changes plan status | components that gate on plan/subscription (`<paywall gate>`, `<shell>`, `<home gate>`) — do they read the **viewer's** subscription or the **owner's**? | seed |
| Routes, middleware, redirects | adds a page, changes who may see a route, or changes post-login/onboarding flow | `<routes registry>`, `<middleware>` protected prefixes, redirect helpers, sitemap/robots, locale prefixes | seed |
| External connect (OAuth) flows | lets more people start a connect/OAuth flow or changes what is stored from it | where the signed state is minted and verified (`<oauth state module>`) — is the role checked at mint time? what happens on revoke/disconnect? | seed |

<!-- Keep: unconditional rows for any app with users + data. Drop: billing row if no payments;
     emails row if no email; OAuth row if no third-party connects; legal copy row if no marketing/
     legal pages. Add repo-specific rows found during analysis (e.g. "native capability not checked":
     provider docs/MCP first — a vendor often already has seats, pause, invitations natively). -->
