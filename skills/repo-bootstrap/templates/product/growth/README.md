# Growth module

Opt-in. Propose it only when the product sells plans: tiers, quotas, trials, paywalls, upgrade
prompts, a pricing page. A free tool, a CLI or a library gets none of it.

| Pattern | Template | What it prevents |
|---|---|---|
| **Server-side gating** | `plans.ts` → `checkLimit`, `hasFeature` (+ `plans.test.mjs`) | a paywall the client hides but the API still serves; a quota counted in the browser |
| **Prices from config** | `check-hardcoded-prices.mjs` (+ test) | a price literal in a component or one locale's messages that drifts after the next price change |
| **Limit → feature table** | `LIMIT_TABLE` in `plans.ts` | a limit nobody enforces, or enforced in one entry point and forgotten in the job that does the same work |

## Server-side gating

- Every paid action checks the tier's limit or feature **on the server, at the moment the paid work
  starts**, from the app's own entitlements (derived from the billing provider's data, mirrored by
  webhook and reconciled by a cron), never from a flag the client sends.
- The check returns a typed error (`QUOTA_EXHAUSTED`, `FEATURE_NOT_IN_PLAN`); the UI maps each code
  to an upgrade prompt. The UI may hide or disable a control, but that is presentation, not the
  gate.
- Jobs and webhooks that do paid work on the user's behalf (scheduled generation, auto-publish)
  check too: they are entry points without a button.
- Plan changes have a use-case row each (upgrade, downgrade, cancel, trial end, payment failure),
  including what happens to work already scheduled.

## Prices from config

Prices, currencies and intervals are read from the billing provider's catalog (or one config file)
and formatted with the locale's number formatter. Marketing copy says "from {price}" with a
placeholder. `check-hardcoded-prices.mjs` runs advisory first, then `--strict` in CI.

## Limit → feature table

One row per limit or feature: the value per tier, the server entry points that enforce it, the
error code, and the UI that explains it. The test fails when a tier offers a feature or limit that
no entry point enforces, and when a higher tier gets less than a lower one.

**Related concept cards:** `billing-mirror-and-server-side-entitlements`,
`reconciliation-and-retention-crons`, `rate-limit-by-cost`, `typed-errors`.

**Example (reference project, not a default):** limits lived in the billing provider's product
metadata and were synced onto a plan row, with a typed fallback table that had to mirror the
dashboard; a feature map listed what each paid tier added; `DESIGN.md` forbade hard-coding prices
or quotas in the UI. A check for price literals did not exist there; it is the kit's addition.
