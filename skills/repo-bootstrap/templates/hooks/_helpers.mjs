// Test-only helpers shared by the *.test.mjs files (not a hook, never copied to scripts/).
import { execFileSync, spawnSync } from 'node:child_process'
import { mkdtempSync, writeFileSync, mkdirSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

export const HERE = dirname(fileURLToPath(import.meta.url))

/** Run a hook script as a child process with `stdin` and return { status, stdout, stderr }. */
export function runScript(file, { stdin = '', args = [], cwd = HERE, env = {} } = {}) {
  const r = spawnSync('node', [join(HERE, file), ...args], {
    input: stdin,
    cwd,
    encoding: 'utf8',
    env: { ...process.env, ...env },
  })
  return { status: r.status, stdout: r.stdout, stderr: r.stderr }
}

export function git(repo, ...args) {
  return execFileSync('git', args, { cwd: repo, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] })
}

export function put(repo, files) {
  for (const [name, content] of Object.entries(files)) {
    const full = join(repo, name)
    mkdirSync(dirname(full), { recursive: true })
    writeFileSync(full, content)
  }
}

/** A throwaway git repo on `branch` with one commit; origin/<branch> points at that commit. */
export function makeRepo(files = { 'a.js': 'a\n' }, branch = 'main') {
  const repo = mkdtempSync(join(tmpdir(), 'hook-test-'))
  git(repo, 'init', '-q', '-b', branch)
  git(repo, 'config', 'user.email', 't@example.com')
  git(repo, 'config', 'user.name', 't')
  git(repo, 'config', 'commit.gpgsign', 'false')
  put(repo, files)
  git(repo, 'add', '-A')
  git(repo, 'commit', '-qm', 'base')
  git(repo, 'update-ref', `refs/remotes/origin/${branch}`, 'HEAD')
  return repo
}
