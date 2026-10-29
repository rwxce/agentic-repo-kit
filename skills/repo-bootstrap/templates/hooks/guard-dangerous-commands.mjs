#!/usr/bin/env node
/**
 * PreToolUse (Bash) — `ask`, never an outright block.
 *
 * Holds a shell command that is hard to undo and asks the person first, with a best-effort
 * read-only preview of what it would touch (files to be deleted, local commits that a history
 * rewrite would orphan). The person decides; nothing is denied.
 *
 * Categories: delete, history, production, secrets, github, system, data.
 * Deploy CLIs, secrets CLIs and protected branches come from CONFIG.
 *
 * Contract: prints a PreToolUse `permissionDecision: "ask"`; malformed stdin exits 0.
 * Reading dotenv files is better denied in your permission rules than here.
 */
import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import { pathToFileURL } from 'node:url'

// ---------------------------------------------------------------------------------------------
// CONFIG — edit for your repo
// ---------------------------------------------------------------------------------------------
export const CONFIG = {
  /** Pushing straight to these branches asks (they should advance through PRs / release jobs). */
  protectedBranches: ['main', 'master', 'production'],
  /**
   * Secrets managers: ANY invocation asks (reads included) when written in command position.
   * Add `doppler`, `vault`, `op`, `sops`, `aws-vault`... as your team uses them; [] disables.
   */
  secretsClis: ['infisical', 'doppler', 'vault'],
  /** Deploy / infra CLIs: regex SOURCE + why. Add yours (`fly deploy`, `kubectl delete`, ...). */
  deployCommands: [
    { re: '\\bvercel\\b[^|;&]*--prod\\b', why: 'deploys to Vercel production' },
    { re: '\\bnetlify\\s+deploy\\b[^|;&]*--prod\\b', why: 'deploys to Netlify production' },
    { re: '\\bwrangler\\s+(?:deploy|delete|publish)\\b', why: 'deploys or deletes a Cloudflare Worker' },
    { re: '\\bfirebase\\s+deploy\\b', why: 'deploys to Firebase' },
    { re: '\\bfly(?:ctl)?\\s+(?:deploy|destroy)\\b', why: 'deploys or destroys a Fly.io app' },
    { re: '\\bserverless\\s+(?:deploy|remove)\\b', why: 'deploys or removes a serverless stack' },
    { re: '\\bterraform\\s+(?:apply|destroy)\\b', why: 'changes real infrastructure' },
    { re: '\\bpulumi\\s+(?:up|destroy)\\b', why: 'changes real infrastructure' },
    { re: '\\bkubectl\\s+(?:delete|apply)\\b', why: 'changes a live Kubernetes cluster' },
    { re: '\\bhelm\\s+(?:install|upgrade|uninstall)\\b', why: 'changes a live Kubernetes release' },
    { re: '\\bconvex\\s+deploy\\b', why: 'deploys Convex functions' },
    { re: '\\bsupabase\\s+(?:db\\s+push|functions\\s+deploy)\\b', why: 'changes the linked Supabase project' },
    { re: '\\b(?:prisma\\s+migrate\\s+deploy|prisma\\s+db\\s+push)\\b', why: 'applies schema changes to the configured database' },
  ],
  /** Max time (ms) the read-only preview may spend; keep well inside the hook timeout. */
  previewBudgetMs: 3000,
}
// ---------------------------------------------------------------------------------------------

const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

/** Builds the ordered rule list from CONFIG. First match wins. */
export function buildRules(config = CONFIG) {
  const rules = [
    // Deletion. The prefix group makes `sudo rm -rf`, `xargs rm -r`, `then rm -rf`, `cd x && rm -rf` trip.
    { category: 'delete', re: /(?:^|[;&|(\n`{]|\b(?:sudo|xargs|time|env|nohup|exec|command|then|do|else))\s*(?:\w+=\S*\s+)*rm\b[^|;&\n]*\s(?:-[a-zA-Z]*[rR][a-zA-Z]*|--recursive)\b/, why: 'recursive delete' },
    { category: 'delete', re: /\bfind\b[^|;&]*\s-delete\b/, why: 'find -delete' },
    { category: 'delete', re: /\bgit\s+clean\b[^|;&]*\s-[a-zA-Z]*f/, why: 'git clean removes untracked files' },
    { category: 'delete', re: /\bgit\s+(?:checkout(?:\s+\S+)*?(?:\s+--)?|restore(?:\s+\S+)*)\s+\.(?:\s|$)/, why: 'discards uncommitted changes' },
    { category: 'delete', re: /\bgit\s+branch\s+(?:-[a-zA-Z]*D\b|--delete\s+--force)/, why: 'force-deletes a branch' },
    { category: 'delete', re: /\bgit\s+stash\s+(?:drop|clear|pop)\b/, why: 'the stash stack is shared by every worktree' },
    // History / remote
    { category: 'history', re: /\bgit\s+push\b[^|;&]*(?:\s--force(?:-with-lease)?\b|\s-[a-zA-Z]*f\b|\s\+\S)/, why: 'force push rewrites remote history' },
    { category: 'history', re: /\bgit\s+reset\b[^|;&]*\s--hard\b/, why: 'reset --hard discards commits and changes' },
    { category: 'history', re: /\bgit\s+rebase\b/, why: 'rebase rewrites history' },
    { category: 'history', re: /\bgit\s+(?:filter-branch|filter-repo)\b/, why: 'rewrites the whole history' },
    { category: 'history', re: /\bgit\s+(?:tag\s+-d|push\b[^|;&]*\s--delete)\b/, why: 'deletes a tag or remote ref' },
  ]
  if (config.protectedBranches.length) {
    const names = config.protectedBranches.map(esc).join('|')
    rules.push({
      category: 'history',
      re: new RegExp(`\\bgit\\s+push\\b[^|;&]*\\s(?:origin\\s+)?(?:\\S+:)?(?:refs\\/heads\\/)?(?:${names})(?:\\s|$)`),
      why: `push to a protected branch (${config.protectedBranches.join('/')})`,
    })
  }
  for (const { re, why } of config.deployCommands) rules.push({ category: 'production', re: new RegExp(re), why })
  if (config.secretsClis.length) {
    const names = config.secretsClis.map(esc).join('|')
    // Command position only (start, after ; & | ( `, env/time/npx/bash -c...), so `grep infisical docs` is fine.
    rules.push({
      category: 'secrets',
      re: new RegExp(`(?:^|[;&|(\`]\\s*|\\b(?:env|time|command|exec|npx|bunx|pnpm\\s+(?:exec|dlx)|sh\\s+-c|bash\\s+-c|zsh\\s+-c)\\s+["']?)(?:\\w+=\\S*\\s+)*(?:sudo\\s+)?(?:${names})\\b`),
      why: 'secrets manager: every command needs explicit permission',
    })
  }
  rules.push(
    // GitHub
    { category: 'github', re: /\bgh\s+(?:repo\s+(?:delete|archive)|release\s+delete|secret\s+(?:set|delete|remove)|workflow\s+run)\b/, why: 'irreversible or outward GitHub action' },
    { category: 'github', re: /\bgh\s+pr\s+merge\b/, why: 'merges a pull request' },
    // System
    { category: 'system', re: /(?:^|[\s;&|(])sudo\s/, why: 'runs as root' },
    { category: 'system', re: /\bchmod\s+-R\s+0?777\b|\bchown\s+-R\b/, why: 'recursive permission/owner change' },
    { category: 'system', re: /\b(?:curl|wget)\b[^;&]*\|\s*(?:sudo\s+)?(?:ba|z)?sh\b/, why: 'pipes a download straight into a shell' },
    { category: 'system', re: /(?:^|[\s;&|(])(?:dd\s+[^|;&]*of=|mkfs\b|diskutil\s+erase)/, why: 'writes a raw disk' },
    { category: 'system', re: /\b(?:kill\s+-(?:9|KILL)|pkill|killall)\b/, why: 'force-kills processes (other workspaces may own them)' },
    { category: 'system', re: /\bdocker\s+(?:system|volume|image)\s+prune\b/, why: 'prunes Docker data' },
    { category: 'system', re: /\b(?:npm|pnpm|yarn)\s+publish\b/, why: 'publishes a package' },
    // Data: only when a SQL client runs the statement (a grep for "drop table" is fine)
    { category: 'data', re: /\b(?:psql|mysql|sqlite3|pgcli)\b[\s\S]*\b(?:DROP\s+(?:TABLE|DATABASE|SCHEMA)|TRUNCATE(?:\s+TABLE)?)\b/i, why: 'drops or empties data' },
    { category: 'data', re: /\b(?:psql|mysql|sqlite3|pgcli)\b[\s\S]*\bDELETE\s+FROM\s+\S+\s*(?:;|"|'|$)/i, why: 'DELETE without WHERE' },
  )
  return rules
}

const DEFAULT_RULES = buildRules(CONFIG)

/** The first rule a command trips, as { category, why }, or null when it is safe to run. */
export function classifyCommand(command, rules = DEFAULT_RULES) {
  if (typeof command !== 'string' || !command.trim()) return null
  const rule = rules.find(({ re }) => re.test(command))
  return rule ? { category: rule.category, why: rule.why } : null
}

// At most 20 lines, so the prompt stays readable.
const head = (text) => {
  const all = text.trim().split('\n').filter(Boolean)
  return all.length > 20 ? [...all.slice(0, 20), `… and ${all.length - 20} more`].join('\n') : all.join('\n')
}

// The whole preview shares one budget: the ask must always be written, with or without details.
let deadline = 0

/** Command output, or null when it failed, ran out of budget or produced too much. */
function run(cmd, args) {
  const left = deadline - Date.now()
  if (left < 200) return null
  try {
    return execFileSync(cmd, args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], timeout: left, maxBuffer: 4 * 1024 * 1024 })
  } catch {
    return null
  }
}

/** Best-effort, read-only preview of what the command would touch. */
export function preview(command, category, config = CONFIG) {
  deadline = Date.now() + config.previewBudgetMs
  const lines = []
  if (category === 'delete') {
    const targets = (command.match(/\brm\s+((?:\S+\s*)+)/)?.[1] ?? '').split(/\s+/).filter((t) => t && !t.startsWith('-') && !/[;&|]/.test(t))
    for (const target of targets.slice(0, 5)) {
      if (!fs.existsSync(target)) continue
      const out = run('find', [target, '-type', 'f'])
      if (out === null) {
        lines.push(`${target}: too many files to list — treat it as large`)
        continue
      }
      const files = out.split('\n').filter(Boolean)
      lines.push(`${target}: ${files.length} file(s)`, ...files.slice(0, 20).map((f) => `  ${f}`))
      if (files.length > 20) lines.push(`  … and ${files.length - 20} more`)
    }
    if (/\bgit\s+(?:checkout|restore|clean)\b/.test(command)) lines.push(head(run('git', ['status', '--short']) ?? ''))
  }
  if (category === 'history') {
    const ahead = (run('git', ['log', '--oneline', '-10', '@{upstream}..HEAD']) ?? '').trim()
    const dirty = head(run('git', ['status', '--short']) ?? '')
    if (ahead) lines.push('Local commits not on the upstream:', ahead)
    if (dirty) lines.push('Uncommitted changes:', dirty)
  }
  return lines.filter(Boolean).join('\n')
}

export function askOutput(hit, details) {
  const reason = `Dangerous command (${hit.category}): ${hit.why}.${details ? `\n${details}` : ''}`
  return {
    hookSpecificOutput: { hookEventName: 'PreToolUse', permissionDecision: 'ask', permissionDecisionReason: reason },
  }
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
  const hit = classifyCommand(command)
  if (!hit) process.exit(0)
  process.stdout.write(JSON.stringify(askOutput(hit, preview(command, hit.category))))
  process.exit(0)
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) runHook()
