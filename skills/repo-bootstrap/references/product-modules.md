# Product modules

The families in Phase 0 set up the engineering workflow. Product modules go one level up: the
product's design system, legal promises, content, copy, AI features, plans and dev environment.
They are **opt-in and signal-driven**: offer a module only when the repo shows its signal, propose
only the pieces whose own signal is present, and say "none" when nothing matches. A CLI, a library
or an internal service usually gets no module at all, and the proposal says so in one line.

Templates live in `templates/product/<module>/` (each with a README listing piece → lands as →
signal → what it prevents), plus skills in `templates/skills/` and one agent in
`templates/agents/`. Every template is generic: fill the `<placeholders>` from the repo and the
founder. Lines marked "Example (reference project, not a default)" describe how the production
project the kit came from did it; they are evidence that the pattern works, never values to copy.

## Signals → modules

Look for these in the Phase 0 light scan (manifests, top-level dirs, a few `rg` hits). One hit is
enough to **offer** a module in the menu; the Phase 4 proposal still cites `file:line` per piece.

| Module | Signals in the repo | When not | Templates | Concept cards |
|---|---|---|---|---|
| **Design** | UI framework in the manifest (React, Vue, Svelte, SwiftUI, Compose, Flutter); `app/`, `pages/`, `screens/`; a theme file, Tailwind config or `*.tokens.json`; dialog/sheet components; a design-tool export in the repo | no user-facing UI; a UI one person maintains with no agents designing for it | `product/design/`, `agents/ui-router.md` | `layout-guard-and-ui-inventory`, `guard-tests` |
| **Legal** | auth or user tables; analytics, monitoring or replay SDKs; cookie/storage writes; payment SDK; uploads; AI on user data; `legal/`, `privacy`, `terms` pages | no personal data, no device storage, no published legal texts | `product/legal/`, `skills/legal-compliance/` | `compliance-by-evidence`, `reconciliation-and-retention-crons` |
| **Content** | `blog/`, `posts/`, `docs/` pages on the product site, MDX, a CMS client, `vs/` or `alternatives/` pages, a public changelog page, `llms.txt` | no public site; a library's developer CHANGELOG | `product/content/`, `skills/content-writing/`, `skills/changelog-entry/` | `route-registry`, `guard-tests` |
| **Copy** | i18n library and `messages/`/`locales/` with 2+ files; a marketing site; onboarding or email copy in the repo | only developer-facing text | `product/copy/` (+ `arch-tests/i18n-parity.mjs`) | — |
| **Product AI** | LLM SDKs or routers in the manifest (`openai`, `@anthropic-ai/sdk`, `ai`, LangChain, an OpenRouter client) called from product code; prompt files; `*_MODEL` env vars | AI used only in developer tooling; no AI features | `product/ai/` | `llm-boundary`, `rate-limit-by-cost` |
| **Growth** | billing SDK (Stripe, Paddle, Polar, Lemon Squeezy, RevenueCat…); plan, quota, trial or entitlement code; a pricing page | free product; no tiers | `product/growth/` | `billing-mirror-and-server-side-entitlements`, `typed-errors` |
| **Dev environment** | several runtimes with their own env (web, backend, workers); auth; OAuth callbacks or incoming webhooks; tunnel tooling (`cloudflared`, `ngrok`); a secrets CLI | a single process whose dev loop is the test command | `product/dev-env/`, `skills/test-login/` | `secrets-management`, `change-completeness-preflight` |

## In the flow

- **Phase 0.** The light scan lists the module signals it found. The menu's question 9 offers only
  those modules, each with the signal and a one-line cost; modules with no signal are not shown.
- **Phase 1 (new project).** The interview asks which of these surfaces the product will have
  (UI, legal pages, blog, locales, AI features, paid plans) so the modules can be offered.
- **Phase 4.** Add a **Product modules** table to the proposal, one row per chosen piece, in the
  same format as the families (artifact · signal `file:line` · what it prevents · cost · B/Q/A ·
  template). Modules the user chose but whose pieces have no signal go to *Later*.
- **Phase 5.** One PR per module, after the core families, so a module never blocks the workflow
  setup. Checks start advisory (`warn`, or the script's default mode) when the current content does
  not pass yet, and the baseline is reported.
- **Phase 6.** Run each module's checks on the real repo and report the baseline: token check,
  UI surfaces guard, content registry test, glossary check, price-literal check, plan table test.

## Lines the modules do not cross

- **Legal:** evidence, mismatches and questions only. No final legal text, no lawful basis, no
  retention period without the founder; drafts go to a lawyer, marked as drafts.
- **Design:** design tools are for exploring; tokens and components in code are the source of
  truth. A design artifact applies only to the surface it shows.
- **Content and copy:** no invented facts, quotes or numbers; third-party facts are dated and
  re-checked; legal texts are not machine-translated and published.
- **Product AI:** evals recommend; they never change a model env var or a prompt.
