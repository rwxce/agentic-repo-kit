# Dev-environment module

Opt-in. Propose it when the app has several runtimes and secrets (web app, backend, workers),
authentication, OAuth callbacks or incoming webhooks. A CLI or library with `npm test` as its whole
dev loop gets none of it.

| Pattern | Template | What it prevents |
|---|---|---|
| **Local vs tunnel** | `dev-local.mjs` (+ test), decision table below | sign-in bouncing to a tunnel host during a local run; two worktrees fighting over one port |
| **Test login** | `../../skills/test-login/SKILL.md` | "done" claimed from tests because nobody could log in; agents testing against stage or with real cards |
| **Secrets folder per provider** | section below + the env registry template | a runtime holding every secret; a value copied into five places and rotated in four |

## Local vs tunnel

Default to **local** (`dev:local`: first free port, app-URL vars forced to localhost, everything
else from the secrets store). Use the **tunnel** only when the flow needs a public URL:

| Flow | Mode | Why |
|---|---|---|
| UI, data, jobs, most features | local | nothing outside calls back |
| OAuth "connect your account" callback | tunnel | the provider redirects to a registered public URL |
| Incoming webhooks (billing, auth, scheduling) | tunnel | the provider must reach the endpoint |
| Payment checkout return | tunnel | the return URL is public |
| Absolute URLs built by the backend (emails, links) | tunnel | they must open from outside |

A tunnel usually works on one fixed port and one worktree at a time, and each developer's sandbox
apps are registered against their own tunnel host: document that instead of building
port-fallback machinery. Add a short root-rule section "Local or tunnel": before starting a dev
server or a test run, the agent says which mode it will use and why and waits for the answer; the
existing "Kill dev processes you start" section covers stopping them.

## Test login

The `test-login` skill signs in as a throwaway user in the auth provider's dev/test mode and
reaches states with browser automation. Its **triple guard**: local host only, dev auth instance
only, billing sandbox only (the checkout banner is checked before paying).

## Secrets folder per provider

When a secrets store syncs to several runtimes (CI, backend, workers, hosting):
- the **root** of each environment holds every real value, once;
- each provider reads from **its own folder**, holding only the keys that runtime reads, each as a
  **reference** to the root, never a copied value (one documented exception: a literal a runtime
  needs that differs from the root);
- the key list per folder comes from the code (each runtime's env readers) and lives in the env
  registry (`registries/environment-variables.md`); a change that adds a var a synced runtime reads
  adds its reference to that folder in every environment, in the same change;
- a new sync starts with deletion protection on, turned off only after checking the destination is
  missing nothing.
Reading or listing secrets is an `ask` in the permissions, every time.

**Related concept cards:** `secrets-management`, `change-completeness-preflight`.

**Example (reference project, not a default):** `pnpm dev:local` ran under the secrets CLI, took
the first free port from 3000 and forced the two app-URL vars to localhost; the tunnel was reserved
for OAuth, webhooks and checkout returns; a test-login skill used the auth provider's test mode with
a fixed code and checked the billing sandbox banner before paying; each synced runtime read from its
own secrets folder of references.
