# MCP servers — discovery and validation

Propose MCP servers only for services the repo actually uses (Lens 4). Never install, connect or
authenticate without the user's OK for that specific server.

## Find the official server
1. Search the vendor's own docs site for "MCP" (e.g. `site:<vendor-docs-domain> MCP`), then their
   GitHub org. Official = published or linked by the vendor.
2. If only community servers exist, list them under *Later* with the risk; do not propose by default.
3. Record: URL of the docs page, transport (remote HTTP/SSE or local stdio), auth (OAuth, API key,
   none), and whether separate **production** and **sandbox/test** endpoints exist.

## Validate before proposing
- Maintainer and activity: vendor-maintained, recent release, open security issues.
- Scope of the tools: read-only vs mutating. Prefer read-only or sandbox servers for agents; a
  production server with mutating tools needs an explicit note and a permission `ask` rule.
- Secrets: API keys go through environment variables or the tool's auth flow — never written into
  committed config. In committed config use `${VAR}` references.
- Version pin for local servers (exact, ≥5 days old).

## Where it goes
- Project-shared: `.mcp.json` (Claude Code) or `.rulesync/mcp.json` when rulesync is used.
- Personal (credentials tied to one person): user scope (`claude mcp add --scope user …`).
- Per-agent: an agent's `mcpServers` frontmatter when only that agent needs it.

## Proposal row
| Service | Official MCP (url) | Maintainer | Transport | Auth | Tools (read/mutate) | Prod / sandbox | Scope | Install command | Needs OK |
|---|---|---|---|---|---|---|---|---|---|

## Typical high-value servers (verify each is official and current before proposing)
Error monitoring (issues, traces), payments/billing (prefer sandbox), the backend platform
(database inspection, logs, function runs), deploy/hosting (deploy status, logs), background-job
platform (runs, logs), browser automation (UI verification and screenshots), docs search for the
main framework, issue tracker, design tool. Each one turns "verify the full circle" from a promise
into a step the agent can actually perform.
