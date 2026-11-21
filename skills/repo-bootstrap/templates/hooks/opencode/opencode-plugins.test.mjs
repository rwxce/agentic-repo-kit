import assert from 'node:assert/strict'
import { after, before, describe, it } from 'node:test'

// The plugins resolve the hook scripts from `.opencode/plugins/../../scripts/` in a real repo; here
// they live one directory up, next to this folder.
const HOOKS_DIR = new URL('../', import.meta.url).href
const SAVE_HANDOFF = new URL('../save-handoff.mjs', import.meta.url).href

describe('opencode: agent-bash-guards', () => {
  let run
  before(async () => {
    process.env.AGENT_GUARDS_SCRIPTS_DIR = HOOKS_DIR
    const { AgentBashGuardsPlugin } = await import('./agent-bash-guards.js')
    run = async (tool, command) => (await AgentBashGuardsPlugin())['tool.execute.before']({ tool }, { args: { command } })
  })
  after(() => delete process.env.AGENT_GUARDS_SCRIPTS_DIR)

  it('rejects a PR approval or mutating GitHub API call', async () => {
    await assert.rejects(run('bash', 'gh pr review 12 --approve'), /never approve pull requests/)
  })

  it('rejects a dangerous command with its category and reason', async () => {
    await assert.rejects(run('bash', 'rm -rf build'), /Dangerous command \(\w+\): .+Not run/)
  })

  it('lets safe commands, empty commands and other tools through', async () => {
    assert.equal(await run('bash', 'ls -la'), undefined)
    assert.equal(await run('bash', '   '), undefined)
    assert.equal(await run('read', 'rm -rf build'), undefined)
  })

  it('fails open when the hook scripts cannot be loaded', async () => {
    process.env.AGENT_GUARDS_SCRIPTS_DIR = new URL('./does-not-exist/', import.meta.url).href
    try {
      assert.equal(await run('bash', 'rm -rf build'), undefined)
    } finally {
      process.env.AGENT_GUARDS_SCRIPTS_DIR = HOOKS_DIR
    }
  })
})

describe('opencode: agent-handoff', () => {
  // A stand-in for OpenCode's Bun shell: records the command and stdin, returns canned stdout.
  function fakeShell(stdout = '') {
    const calls = []
    const $ = (strings, ...values) => {
      const call = { strings: [...strings], values }
      calls.push(call)
      const chain = {
        cwd: (dir) => ((call.cwd = dir), chain),
        nothrow: () => chain,
        quiet: async () => ({ stdout: Buffer.from(stdout) }),
      }
      return chain
    }
    return { $, calls }
  }
  function fakeClient({ parentID, messages = [] } = {}) {
    const toasts = []
    return {
      toasts,
      session: {
        get: async () => ({ data: parentID ? { parentID } : {} }),
        messages: async () => ({ data: messages }),
      },
      tui: { showToast: async ({ body }) => toasts.push(body.message) },
    }
  }

  let AgentHandoffPlugin
  before(async () => {
    process.env.AGENT_HANDOFF_SCRIPT = SAVE_HANDOFF
    process.env.AGENT_HANDOFF_ROOT = '/repo'
    ;({ AgentHandoffPlugin } = await import('./agent-handoff.js'))
  })
  after(() => {
    delete process.env.AGENT_HANDOFF_SCRIPT
    delete process.env.AGENT_HANDOFF_ROOT
  })

  const messages = [{ info: { role: 'assistant', tokens: { input: 120 } }, parts: [{ type: 'text', text: 'Pending: ship it' }] }]

  it('pipes the last assistant text to save-handoff on idle, from the repo root', async () => {
    const { $, calls } = fakeShell()
    const plugin = await AgentHandoffPlugin({ client: fakeClient({ messages }), $ })
    await plugin.event({ event: { type: 'session.idle', properties: { sessionID: 's1' } } })
    assert.equal(calls.length, 1)
    assert.equal(calls[0].cwd, '/repo')
    assert.match(calls[0].values[0], /save-handoff\.mjs$/)
    const payload = JSON.parse(await calls[0].values[1].text())
    assert.deepEqual(payload, { hook_event_name: 'Stop', session_id: 's1', last_assistant_text: 'Pending: ship it', context_tokens: 120 })
  })

  it('runs before compaction as PreCompact and shows the script message as a toast', async () => {
    const { $, calls } = fakeShell(JSON.stringify({ systemMessage: 'Context is large: hand off saved' }))
    const client = fakeClient({ messages })
    const plugin = await AgentHandoffPlugin({ client, $ })
    await plugin['experimental.session.compacting']({ sessionID: 's1' })
    assert.equal(JSON.parse(await calls[0].values[1].text()).hook_event_name, 'PreCompact')
    assert.deepEqual(client.toasts, ['Context is large: hand off saved'])
  })

  it('skips subagent sessions and ignores other events', async () => {
    const { $, calls } = fakeShell()
    const plugin = await AgentHandoffPlugin({ client: fakeClient({ parentID: 'parent', messages }), $ })
    await plugin.event({ event: { type: 'session.idle', properties: { sessionID: 'child' } } })
    await plugin.event({ event: { type: 'message.updated' } })
    assert.equal(calls.length, 0)
  })

  it('never throws when the client or the shell fails', async () => {
    const client = { session: { get: async () => { throw new Error('down') }, messages: async () => { throw new Error('down') } } }
    const $ = () => { throw new Error('no shell') }
    const plugin = await AgentHandoffPlugin({ client, $ })
    await plugin.event({ event: { type: 'session.idle', properties: { sessionID: 's1' } } })
  })
})
