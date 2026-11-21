<!--
TEMPLATE: docs/environment-variables.md — inventory of every env var, grouped, with where it is
consumed. Generate when the code reads env vars (process.env / os.environ / env files / secrets
manager). Fill by grepping for env reads; never copy values. Pair with a stop-hook/CI check that
flags new env reads missing from this doc.
-->
# Environment variables

Source of truth for values: <secrets manager / `.env.example` / hosting dashboard>. **Never commit
values.** This doc lists names, where each is consumed (verified by grep, not assumed) and what it
does.

**Whenever you add, rename, or remove a var, update this file.** <If a checker exists:
`<script>` flags a new env read with no matching entry here; it only catches new code references,
not vars added to the secrets manager alone.>

## How to read this doc

- **Scope:** `public` (shipped to the browser) / `server` / `build` / `worker`.
- **Envs:** which of dev / stage / prod set it; per-developer variants are marked.
- A var consumed in several places lists the primary consumer and `+N`.

## <Group: e.g. Auth>

| Var | Scope | Consumed in | What it does |
|---|---|---|---|
| `<NAME>` | server | `<path>` (`<function>`) | <purpose; value shape such as `sk_test_…` vs `sk_live_…`, never the value> |

## <Group: e.g. Database / backend>

| Var | Scope | Consumed in | What it does |
|---|---|---|---|

## <Group: e.g. Billing, Email, Monitoring, Storage, Feature flags>

| Var | Scope | Consumed in | What it does |
|---|---|---|---|

## Per-developer / local-only

<!-- fill with: vars that differ per developer or per worktree and how to obtain them. -->

## Pending / known gaps

<!-- vars referenced in code but not yet documented, or documented but unused (candidates to remove). -->
