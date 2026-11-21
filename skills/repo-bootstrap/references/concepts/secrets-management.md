# Secrets management

**Origin: external.** Established practice from the canonical source below; not yet proven in the project this kit came from. Treat its checks as a proposal to validate.

## Problem

Secrets copied into code, chat, CI variables and laptops leak and are never rotated. Nobody knows which runtime reads which secret, so removing one breaks production.

## Principle

Keep each secret once in a secrets store, inject it at run time per environment, give each runtime only the keys it reads, document every variable, and rotate on a schedule and on every suspected leak.

## When it applies

- Every project with API keys, database credentials or signing secrets.

## When it doesn't

- Public configuration (publishable keys, public URLs) needs documentation, not a vault.

## Typical mistakes

- Committing `.env` files or dropping them from `.gitignore`.
- Copying values into each provider instead of referencing one source.
- Server secrets behind a public env prefix that bundlers ship to the client.
- One secret shared across dev, stage and prod.

## The check that verifies it

Secret scanning in CI and push protection; a preflight that blocks committed env files; an env-docs check that flags a new variable without documentation.

## Canonical source

- [OWASP Secrets Management Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Secrets_Management_Cheat_Sheet.html)

## Variants per stack

- **Stores:** Infisical, Doppler, 1Password, HashiCorp Vault, AWS Secrets Manager, GCP Secret Manager.
- **Sync:** store-to-provider syncs (GitHub, Vercel/Netlify, Convex, Trigger.dev) reading per-provider folders.
- **Kubernetes:** External Secrets Operator rather than plain `Secret` manifests in git.
- **Mobile:** no server secrets in the app binary; exchange through your backend.

## Related

[change-completeness-preflight](change-completeness-preflight.md) · [shared-secret-bridges](shared-secret-bridges.md) · [gated-release-pipeline](gated-release-pipeline.md)
