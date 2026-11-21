#!/usr/bin/env node
/**
 * WHAT: Local dev launcher (dev-env module). Picks the first free port from a base, forces the
 *   app-URL variables to `http://localhost:<port>` so sign-in and redirects stay local, then runs
 *   the dev command with that env. Everything else comes from the environment the caller set up
 *   (a secrets-store wrapper such as `<secrets CLI> run -- node scripts/dev-local.mjs`).
 * REPO SIGNAL: app-URL env vars (auth callback base, public app URL) that point to a tunnel or a
 *   shared host in the secrets store, so a plain local run bounces to the wrong origin; or several
 *   worktrees running dev servers at once.
 * CONFIGURE: CONFIG.basePort, CONFIG.maxPort, CONFIG.urlVars, CONFIG.command.
 * Usage: node scripts/dev-local.mjs            (prints the chosen URL, then runs the command)
 * Zero dependencies.
 */
import { spawn } from 'node:child_process'
import { createServer } from 'node:net'
import { pathToFileURL } from 'node:url'

export const CONFIG = {
  basePort: Number(process.env.DEV_BASE_PORT ?? 3000),
  maxPort: Number(process.env.DEV_MAX_PORT ?? 3019),
  /** Vars that must point at the local server in local mode. */
  urlVars: ['<AUTH_URL>', '<NEXT_PUBLIC_APP_URL>'],
  /** The dev command; PORT is passed through the env. */
  command: ['<pnpm>', ['<dev>']],
}

export const isPortFree = (port) => new Promise((resolve) => {
  const server = createServer().once('error', () => resolve(false)).once('listening', () => server.close(() => resolve(true)))
  server.listen(port, '127.0.0.1')
})

/** First port in [start, end] for which `isFree` resolves true; throws when none is. */
export async function pickPort(isFree, start = CONFIG.basePort, end = CONFIG.maxPort) {
  for (let port = start; port <= end; port++) if (await isFree(port)) return port
  throw new Error(`no free port between ${start} and ${end}`)
}

/** The env for local mode: every URL var forced to localhost, PORT set, everything else kept. */
export function localEnv(env, port, urlVars = CONFIG.urlVars) {
  const origin = `http://localhost:${port}`
  return { ...env, PORT: String(port), ...Object.fromEntries(urlVars.map((v) => [v, origin])) }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const port = await pickPort(isPortFree)
  const env = localEnv(process.env, port)
  console.log(`[dev:local] local mode → http://localhost:${port}`)
  const [cmd, args] = CONFIG.command
  const child = spawn(cmd, args, { env, stdio: 'inherit' })
  for (const sig of ['SIGINT', 'SIGTERM']) process.on(sig, () => child.kill(sig))
  child.on('exit', (code) => process.exit(code ?? 0))
}
