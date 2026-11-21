import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { hasSourceChanges, detectLintCommand, tail, run } from './lint-if-changed.mjs'
import { makeRepo, put } from './_helpers.mjs'

describe('lint-if-changed', () => {
  it('detects source changes by extension', () => {
    assert.equal(hasSourceChanges(['README.md', 'src/a.ts']), true)
    assert.equal(hasSourceChanges(['x.mjs\n']), true)
    assert.equal(hasSourceChanges(['README.md', 'docs/a.png', 'package.json']), false)
    assert.equal(hasSourceChanges([]), false)
  })

  it('tails the output', () => {
    const out = Array.from({ length: 50 }, (_, i) => `l${i}`).join('\n')
    const t = tail(out, 3)
    assert.equal(t, 'l47\nl48\nl49')
  })

  it('auto-detects the package manager from the lockfile and needs a lint script', () => {
    const none = makeRepo({ 'package.json': '{"scripts":{}}' })
    assert.equal(detectLintCommand(none), null)
    const noPkg = makeRepo({ 'a.js': '1' })
    assert.equal(detectLintCommand(noPkg), null)
    const pnpm = makeRepo({ 'package.json': '{"scripts":{"lint":"x"}}', 'pnpm-lock.yaml': '' })
    assert.deepEqual(detectLintCommand(pnpm), ['pnpm', 'run', 'lint'])
    const yarn = makeRepo({ 'package.json': '{"scripts":{"lint":"x"}}', 'yarn.lock': '' })
    assert.deepEqual(detectLintCommand(yarn), ['yarn', 'run', 'lint'])
    const npm = makeRepo({ 'package.json': '{"scripts":{"lint":"x"}}' })
    assert.deepEqual(detectLintCommand(npm), ['npm', 'run', 'lint'])
  })

  const cfg = { command: ['node', '-e', 'console.log("LINT RAN")'], sourceExt: /\.js$/, tailLines: 30, timeoutMs: 10_000 }

  it('stays silent when only non-source files changed', () => {
    const repo = makeRepo({ 'a.js': 'a\n' })
    put(repo, { 'notes.md': 'hello' })
    assert.equal(run(repo, cfg), '')
  })

  it('runs lint when a tracked source file changed', () => {
    const repo = makeRepo({ 'a.js': 'a\n' })
    put(repo, { 'a.js': 'changed\n' })
    assert.match(run(repo, cfg), /LINT RAN/)
  })

  it('runs lint when an untracked source file appeared', () => {
    const repo = makeRepo({ 'a.js': 'a\n' })
    put(repo, { 'new.js': 'x' })
    assert.match(run(repo, cfg), /LINT RAN/)
  })

  it('reports failing lint output instead of throwing', () => {
    const repo = makeRepo({ 'a.js': 'a\n' })
    put(repo, { 'a.js': 'b\n' })
    const failing = { ...cfg, command: ['node', '-e', 'console.error("BAD"); process.exit(1)'] }
    assert.match(run(repo, failing), /BAD/)
  })

  it('does nothing when no command can be resolved', () => {
    const repo = makeRepo({ 'a.js': 'a\n' })
    put(repo, { 'a.js': 'b\n' })
    assert.equal(run(repo, { ...cfg, command: null }), '')
  })
})
