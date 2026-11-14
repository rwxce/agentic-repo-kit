#!/usr/bin/env node
/**
 * WHAT: Post-deploy smoke test. GETs each path in CONFIG.checks against a base URL (with retries
 *   and a timeout) and exits 1 unless every one answers 200. Blocking. Host-agnostic: whichever
 *   caller knows the deploy URL (a deploy hook, a manual workflow input, a human) can run it.
 * REPO SIGNAL: deploys happen outside CI, and a class of failure only shows at runtime: a
 *   dependency that loads fine in the build but not in the serverless/edge runtime breaks the whole
 *   render graph of every route that reaches it. A GET catches that module-load failure; it does
 *   NOT exercise mutations or form posts.
 * CONFIGURE: CONFIG.checks (a health endpoint plus one page per locale/area that pulls in the
 *   heaviest server code), retry/timeout values.
 * Usage: node scripts/smoke-deploy.mjs <base-url>      e.g. http://localhost:3000
 */
import { pathToFileURL } from 'node:url'

export const CONFIG = {
  checks: ['/api/health', '/', '/<locale>'],
  retryAttempts: 3,
  retryBackoffMs: 1000,
  requestTimeoutMs: 10_000,
}

async function fetchOnce(url, timeoutMs, fetchImpl) {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), timeoutMs)
  try {
    return await fetchImpl(url, { signal: controller.signal, redirect: 'manual' })
  } finally {
    clearTimeout(timeout)
  }
}

/** Checks one path; resolves `{ path, ok, detail }`. `fetchImpl` and `sleep` are injectable for tests. */
export async function checkWithRetry(baseUrl, path, { config = CONFIG, fetchImpl = fetch, sleep } = {}) {
  const wait = sleep ?? ((ms) => new Promise((resolve) => setTimeout(resolve, ms)))
  const url = new URL(path, baseUrl).toString()
  let detail = ''
  for (let attempt = 1; attempt <= config.retryAttempts; attempt++) {
    try {
      const res = await fetchOnce(url, config.requestTimeoutMs, fetchImpl)
      if (res.status === 200) return { path, ok: true, detail: '200' }
      detail = String(res.status)
    } catch (error) {
      detail = error instanceof Error ? error.message : String(error)
    }
    if (attempt < config.retryAttempts) await wait(config.retryBackoffMs * attempt)
  }
  return { path, ok: false, detail: `${detail} (after ${config.retryAttempts} attempts)` }
}

export async function smoke(baseUrl, options = {}) {
  const config = options.config ?? CONFIG
  return Promise.all(config.checks.map((path) => checkWithRetry(baseUrl, path, options)))
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const baseUrl = process.argv[2]
  if (!baseUrl) {
    console.error('✗ Usage: node scripts/smoke-deploy.mjs <base-url>')
    process.exit(1)
  }
  const results = await smoke(baseUrl)
  for (const r of results) (r.ok ? console.log : console.error)(`${r.ok ? '✓' : '✗'} ${r.path} → ${r.detail}`)
  if (results.every((r) => r.ok)) {
    console.log(`\n✓ Smoke test passed — ${baseUrl}`)
    process.exit(0)
  }
  console.error(`\n✗ Smoke test failed — ${baseUrl}`)
  process.exit(1)
}
