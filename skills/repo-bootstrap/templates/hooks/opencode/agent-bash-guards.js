// TEMPLATE: OpenCode plugin that enforces the "ask" Bash hooks. Hand-written, NOT generated.
// REPO SIGNAL: OpenCode is one of the agent tools, and the repo uses guard-dangerous-commands.mjs
//   (answers "ask") and block-outward-writes.mjs.
// FILL: SCRIPTS (where the hook scripts live, default `scripts/` at the repo root) and the messages.
//   Lands in `.opencode/plugins/agent-bash-guards.js`. If rulesync generates OpenCode config, set
//   `delete: false` in rulesync.jsonc (or the plugin is wiped). Strip this header.
//
// Why: an OpenCode plugin can only let a tool call through or reject it (throw); it cannot ask.
// rulesync's generated plugin rejects a call when a hook exits 2 or answers "deny", so blocking
// hooks (protect-branches, block-outward-writes) already work there, but an "ask" answer from
// guard-dangerous-commands would run unchallenged. This plugin turns it into a rejection that names
// the reason, and the agent must get the person to confirm and run the command themselves. Delete it
// once the generated plugin turns "ask" into a rejection.
//
// Only the plugin is exported: OpenCode calls every exported function as a plugin.

// Hook scripts directory as a file URL ending in `/`. The env override exists for the tests.
const scriptsDir = () => process.env.AGENT_GUARDS_SCRIPTS_DIR ?? new URL('../../scripts/', import.meta.url).href
const load = (file) => import(new URL(file, scriptsDir()).href)

export const AgentBashGuardsPlugin = async () => ({
  'tool.execute.before': async (input, output) => {
    if (!/^bash$/i.test(input?.tool ?? '')) return
    const command = output?.args?.command
    if (typeof command !== 'string' || !command.trim()) return

    let guards
    try {
      const [outward, dangerous] = await Promise.all([load('block-outward-writes.mjs'), load('guard-dangerous-commands.mjs')])
      guards = { isOutwardWrite: outward.isOutwardWrite, classifyCommand: dangerous.classifyCommand }
    } catch {
      // A broken import must not become a blanket shell outage, same contract as the hook scripts.
      return
    }

    if (guards.isOutwardWrite(command)) {
      throw new Error(
        'Blocked by repository policy: agents never approve pull requests or run mutating GitHub API calls. ' +
          "Comments and reviews need the user's explicit authorization; approval stays with a human.",
      )
    }
    const hit = guards.classifyCommand(command)
    if (hit) {
      throw new Error(`Dangerous command (${hit.category}): ${hit.why}. Not run. Ask the person to confirm and run it themselves.`)
    }
  },
})
