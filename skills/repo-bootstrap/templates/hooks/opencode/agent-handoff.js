// TEMPLATE: OpenCode plugin that feeds save-handoff.mjs the session data OpenCode hooks lack.
//   Hand-written, NOT generated.
// REPO SIGNAL: OpenCode is one of the agent tools and the repo uses save-handoff.mjs.
// FILL: SCRIPT and ROOT (default: `scripts/save-handoff.mjs` and the repo root, two levels up from
//   `.opencode/plugins/`). Lands in `.opencode/plugins/agent-handoff.js`. Remove save-handoff from
//   the generated OpenCode stop/preCompact hook lists (e.g. an `opencode.hooks` override in
//   `.rulesync/hooks.json`) so it runs once, and keep `delete: false` in rulesync.jsonc. Strip this
//   header.
//
// Why: generated OpenCode hooks run commands with no session data on stdin, and OpenCode has no
// transcript file, so save-handoff could record only branch, sha and tree: the pending block stayed
// empty and the context warning never fired. This plugin reads the session's messages through the
// OpenCode client and pipes `last_assistant_text` / `context_tokens` to the script, on idle (Stop)
// and before compaction (PreCompact). Subagent sessions are skipped: their last message is not the
// session's pending work. Delete it once the generator passes session data to OpenCode hooks.
//
// Only the plugin is exported: OpenCode calls every exported function as a plugin, so the payload
// builder lives in save-handoff.mjs, where it is unit-tested.

import { fileURLToPath } from 'node:url'

const scriptUrl = () => new URL(process.env.AGENT_HANDOFF_SCRIPT ?? new URL('../../scripts/save-handoff.mjs', import.meta.url).href)
const rootDir = () => process.env.AGENT_HANDOFF_ROOT ?? fileURLToPath(new URL('../../', import.meta.url))

// OpenCode waits for the compacting hook: cap the work like a hook timeout.
const TIMEOUT_MS = 10_000

export const AgentHandoffPlugin = async ({ client, $ }) => {
  const save = async (sessionID, event) => {
    try {
      let messages = []
      if (sessionID) {
        try {
          const session = await client.session.get({ path: { id: sessionID } })
          if (session?.data?.parentID) return
        } catch {}
        try {
          const res = await client.session.messages({ path: { id: sessionID } })
          messages = res?.data ?? res
        } catch {}
      }
      const url = scriptUrl()
      const { handoffInputFromOpencodeMessages } = await import(url.href)
      const payload = JSON.stringify(handoffInputFromOpencodeMessages(messages, { sessionID, event }))
      // Redirect from a Response, not `echo`: no shell escaping can mangle the JSON.
      const result = await $`node ${fileURLToPath(url)} < ${new Response(payload)}`.cwd(rootDir()).nothrow().quiet()
      // save-handoff prints {"systemMessage"} once per session past the context threshold.
      let message
      try {
        message = JSON.parse(result.stdout.toString()).systemMessage
      } catch {}
      if (message) {
        try {
          await client.tui.showToast({ body: { message, variant: 'info' } })
        } catch {}
      }
    } catch {
      // Same contract as the hook script: a hand off problem never breaks the session.
    }
  }

  const capped = (work) => {
    let timer
    return Promise.race([work, new Promise((resolve) => (timer = setTimeout(resolve, TIMEOUT_MS)))]).finally(() => clearTimeout(timer))
  }

  return {
    event: async ({ event }) => {
      if (event?.type === 'session.idle') await capped(save(event.properties?.sessionID, 'Stop'))
    },
    'experimental.session.compacting': async (input) => {
      await capped(save(input?.sessionID, 'PreCompact'))
    },
  }
}
