#!/usr/bin/env node
/**
 * WHAT: Decides whether a PR closes a plan folder consistently (used by `plan-folder-gate.yml`).
 *   Plan folders live at <plans dir>/<initiative>/ and are deleted in the initiative's last PR,
 *   which carries a `Closes-plan: <initiative>` line in its body. Pure logic, so the workflow stays
 *   thin and this stays testable.
 * REPO SIGNAL: multi-PR initiatives keep a plan folder with a decision log (the plan-feature skill's
 *   `references/plan-folder.md`). Without the gate, finished folders linger as stale "truth", or a
 *   folder is deleted half-way and the decision log is lost.
 * CONFIGURE: CONFIG.plansPrefix. Lands as `scripts/check-plan-close.mjs`.
 */

export const CONFIG = {
  /** Repo-relative prefix of the plan folders, with a trailing slash. */
  plansPrefix: 'docs/plans/',
}

const MARKER = /^\s*Closes-plan:[ \t]*(\S*)[ \t]*$/gim
const VALID_SLUG = /^[a-z0-9][a-z0-9-]*$/

/** Every `Closes-plan:` value in a PR body, in order. An empty value is kept so it can be rejected. */
export function closedPlans(body) {
  return [...String(body ?? '').matchAll(MARKER)].map((match) => match[1])
}

/** The initiative a repo path belongs to, or null when the path isn't inside a plan folder. */
export function initiativeOf(filename, prefix = CONFIG.plansPrefix) {
  if (!filename.startsWith(prefix)) return null
  const parts = filename.slice(prefix.length).split('/')
  return parts.length > 1 ? parts[0] : null
}

/**
 * @param {object} input
 * @param {string | null | undefined} input.body PR body.
 * @param {{ filename: string, status: string, previous_filename?: string }[]} input.files Files changed by the PR.
 * @param {(initiative: string) => boolean} input.folderExistsAtHead Whether the folder has files on the PR head.
 * @param {string} [input.prefix] Plans prefix (defaults to CONFIG.plansPrefix).
 * @returns {string[]} Problems found; empty when the PR is consistent.
 */
export function planCloseProblems({ body, files, folderExistsAtHead, prefix = CONFIG.plansPrefix }) {
  const problems = []
  const markers = closedPlans(body)
  const removed = new Set()
  for (const file of files) {
    if (file.status === 'removed') {
      const initiative = initiativeOf(file.filename, prefix)
      if (initiative) removed.add(initiative)
    } else if (file.status === 'renamed' && file.previous_filename) {
      // A rename out of a plan folder (e.g. promoting a file to docs/) removes it from the folder.
      // A move into another plan folder keeps the initiative alive, so it is not a closure.
      const from = initiativeOf(file.previous_filename, prefix)
      if (from && from !== initiativeOf(file.filename, prefix) && !file.filename.startsWith(prefix)) {
        removed.add(from)
      }
    }
  }

  for (const slug of markers) {
    if (!VALID_SLUG.test(slug)) {
      problems.push(`"Closes-plan: ${slug}" is not a valid initiative name (lowercase letters, digits, hyphens).`)
      continue
    }
    if (!removed.has(slug)) {
      problems.push(`"Closes-plan: ${slug}" is set, but this PR removes nothing under ${prefix}${slug}/.`)
    } else if (folderExistsAtHead(slug)) {
      problems.push(`"Closes-plan: ${slug}" is set, but ${prefix}${slug}/ still has files. Delete the whole folder.`)
    }
  }

  for (const slug of removed) {
    if (!markers.includes(slug) && !folderExistsAtHead(slug)) {
      problems.push(`${prefix}${slug}/ is deleted without a "Closes-plan: ${slug}" line in the PR body.`)
    }
  }

  return problems
}
