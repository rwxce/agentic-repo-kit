#!/usr/bin/env node
/**
 * PreToolUse (Bash) — blocking (exit 2) for a narrow set of shapes.
 *
 * Blocks agent shell commands that would destroy a protected branch: delete, rename, reset to
 * another commit, force push, or remove its worktree. CONFIG.baseBranches are always protected;
 * the branches the person is working on right now come from
 * `git config --get-all <CONFIG.gitConfigKey>` (local, shared by every worktree, never committed).
 * History rewrites (reset --hard, rebase, amend, filter-branch) are blocked only while ON a base
 * branch, where guard-dangerous-commands.mjs would otherwise just ask.
 *
 * Why blocking and not `ask`: several agents in parallel worktrees each running a cleanup step
 * ("delete merged branches", "remove stale worktrees") is how in-progress branches disappear.
 *
 * Contract: stdin `{ tool_input: { command } }`; exit 2 + stderr to block, exit 0 otherwise.
 * Malformed stdin exits 0.
 */
import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

// ---------------------------------------------------------------------------------------------
// CONFIG — edit for your repo
// ---------------------------------------------------------------------------------------------
export const CONFIG = {
  /** Always protected. Add your integration/release branches (e.g. 'develop', 'staging'). */
  baseBranches: ['main', 'master', 'production'],
  /**
   * Extra per-machine protected branches: `git config --add <key> feat/my-branch`.
   * A branch-cleanup script should read the same key.
   */
  gitConfigKey: 'agent-guard.protect',
}
// ---------------------------------------------------------------------------------------------

/** Kept for callers that import the list directly. */
export const BASE_BRANCHES = CONFIG.baseBranches

const SEGMENT_SPLIT = /&&|\|\||[;|\n&]/
const strip = (token) => token.replace(/^['"]|['"]$/g, '')
const branchName = (ref) => ref.replace(/^refs\/heads\//, '')

/** Tokens of each simple command that runs `git`, with global options (-C path, -c k=v) dropped. */
function gitInvocations(command) {
  const invocations = []
  for (const segment of command.split(SEGMENT_SPLIT)) {
    const tokens = segment.trim().split(/\s+/).filter(Boolean).map(strip)
    const at = tokens.indexOf('git')
    if (at === -1) continue
    const rest = tokens.slice(at + 1)
    while (rest.length && rest[0].startsWith('-')) rest.splice(0, /^-[Cc]$/.test(rest[0]) ? 2 : 1)
    if (rest.length) invocations.push({ sub: rest[0], args: rest.slice(1) })
  }
  return invocations
}

/**
 * Why the command is blocked, or null when it may run.
 * @param {string} command
 * @param {{ protectedBranches: string[], baseBranches?: string[], currentBranch?: string, worktrees?: Record<string, string>, cwd?: string }} ctx
 *   worktrees maps a protected branch to the absolute path of the worktree that has it checked out.
 */
export function checkCommand(command, { protectedBranches, baseBranches = CONFIG.baseBranches, currentBranch = '', worktrees = {}, cwd = process.cwd() }) {
  if (typeof command !== 'string' || !command.trim()) return null
  const isProtected = (ref) => protectedBranches.includes(branchName(ref.replace(/^origin\//, '')))
  const isBase = (ref) => baseBranches.includes(branchName(ref))

  for (const { sub, args } of gitInvocations(command)) {
    const flags = args.filter((a) => a.startsWith('-'))
    const names = args.filter((a) => !a.startsWith('-'))
    const hit = names.find(isProtected)

    if (sub === 'branch') {
      const destructive = flags.some((f) => /^(?:--delete|--move|--force|-[a-zA-Z]*[dDmMf])$/.test(f))
      if (destructive && hit) return `git branch ${flags.join(' ')} on protected branch "${hit}"`
      if (destructive && /^-[a-zA-Z]*[mM]$|^--move$/.test(flags[0] ?? '') && names.length === 1 && isProtected(currentBranch))
        return `renames the current protected branch "${currentBranch}"`
    }

    if (sub === 'push') {
      const deleting = flags.some((f) => /^(?:--delete|-d)$/.test(f))
      const forcing = flags.some((f) => /^(?:--force|--force-with-lease(?:=.*)?|--force-if-includes|--mirror|--prune|-[a-zA-Z]*f[a-zA-Z]*)$/.test(f))
      const refspecs = names.slice(1)
      for (const spec of refspecs) {
        const plus = spec.startsWith('+')
        const [src, dst = src] = spec.replace(/^\+/, '').split(':')
        if (spec.includes(':') && src === '' && isProtected(dst)) return `deletes the remote protected branch "${dst}"`
        if (deleting && isProtected(dst)) return `deletes the remote protected branch "${dst}"`
        if ((plus || forcing) && isProtected(dst)) return `force-pushes the protected branch "${dst}"`
      }
      if (forcing && refspecs.length === 0 && isProtected(currentBranch))
        return `force-pushes the current protected branch "${currentBranch}"`
    }

    if (sub === 'update-ref' && flags.includes('-d') && hit) return `deletes the ref of protected branch "${hit}"`

    if ((sub === 'checkout' && flags.includes('-B')) || (sub === 'switch' && flags.some((f) => /^(?:-C|--force-create)$/.test(f)))) {
      if (hit) return `resets the protected branch "${hit}" with ${sub} ${flags.join(' ')}`
    }

    if (sub === 'worktree' && /^(?:remove|move)$/.test(names[0] ?? '')) {
      const target = names[1] && path.resolve(cwd, names[1])
      const owner = Object.entries(worktrees).find(([branch, dir]) => isProtected(branch) && path.resolve(dir) === target)
      if (owner) return `removes the worktree of protected branch "${owner[0]}"`
    }

    if (isBase(currentBranch)) {
      if (sub === 'reset' && flags.includes('--hard')) return `reset --hard on "${currentBranch}"`
      if (sub === 'rebase') return `rebase on "${currentBranch}"`
      if (sub === 'commit' && flags.includes('--amend')) return `commit --amend on "${currentBranch}"`
      if (sub === 'filter-branch' || sub === 'filter-repo') return `${sub} on "${currentBranch}"`
    }
  }

  const ghDelete = /\bgh\s+api\b[\s\S]*?(?:--method|-X)\s*[='"]?DELETE\b[\s\S]*?refs\/heads\/([^\s'"]+)/i.exec(command)
  if (ghDelete && isProtected(ghDelete[1])) return `deletes the remote protected branch "${ghDelete[1]}" through gh api`
  return null
}

const git = (args) => {
  try {
    return execFileSync('git', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], timeout: 3000 }).trim()
  } catch {
    return ''
  }
}

/** The protected list for the current repository: CONFIG.baseBranches plus the git config key. */
export function protectedBranchesFromGit(config = CONFIG) {
  const extra = git(['config', '--get-all', config.gitConfigKey]).split('\n').filter(Boolean)
  return [...new Set([...config.baseBranches, ...extra])]
}

function worktreesFromGit() {
  const map = {}
  for (const block of git(['worktree', 'list', '--porcelain']).split('\n\n')) {
    const dir = /^worktree (.+)$/m.exec(block)?.[1]
    const branch = /^branch refs\/heads\/(.+)$/m.exec(block)?.[1]
    if (dir && branch) map[branch] = dir
  }
  return map
}

export function runHook() {
  let input
  try {
    input = JSON.parse(fs.readFileSync(0, 'utf8'))
  } catch {
    // A malformed hook payload must not turn into a blanket shell outage.
    process.exit(0)
  }
  const command = input?.tool_input?.command ?? input?.toolInput?.command ?? input?.command ?? ''
  if (!/\bgit\b|\bgh\s+api\b/.test(command)) process.exit(0)

  const reason = checkCommand(command, {
    protectedBranches: protectedBranchesFromGit(),
    currentBranch: git(['branch', '--show-current']),
    worktrees: worktreesFromGit(),
  })
  if (!reason) process.exit(0)

  process.stderr.write(
    `Blocked: ${reason}. Protected branches: ${CONFIG.baseBranches.join(', ')} and \`git config --get-all ${CONFIG.gitConfigKey}\`. ` +
      'Remove a branch from that list first if the person really wants this.\n',
  )
  process.exit(2)
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) runHook()
