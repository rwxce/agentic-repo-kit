#!/usr/bin/env node
/**
 * WHAT: Closes the loop of expand -> migrate -> contract. After the production deploy runs its data
 *   migrations, flags every open "Contract: <name>" issue whose migration finished successfully:
 *   adds the `contract-ready` label and one comment with the migration's result. Nobody has to open
 *   the database dashboard to learn the destructive "contract" PR can now be written, and an issue
 *   whose migration failed or is still running stays unflagged.
 *   Idempotent: the comment carries a hidden marker, the label is added once.
 * REPO SIGNAL: `ci/contract-issue.yml` (or the pre-merge gate) opens "Contract: <name>" issues, and
 *   the production deploy runs migrations whose status can be printed as JSON.
 * CONFIGURE: CONFIG below. `normalize` turns your migration tool's status output into
 *   `{ name, done, state, processed? }`; the default accepts that shape or the EXAMPLE shape of a
 *   migrations component that reports `{ name: "<file>:<migration>", isDone, state, processed }`.
 *   Run it as the deploy's last step, after waiting for migrations to finish, with GH_TOKEN
 *   (issues: write) and the gh CLI:
 *     <print-migration-status-as-json> > migration-status.json
 *     node scripts/mark-ready-contracts.mjs < migration-status.json
 * Usage: node scripts/mark-ready-contracts.mjs [--dry-run] < statuses.json
 */
import { execFileSync } from "node:child_process"
import { readFileSync } from "node:fs"
import { pathToFileURL } from "node:url"

// ---------------------------------------------------------------------------------------------
// CONFIG — edit for your repo
// ---------------------------------------------------------------------------------------------
export const CONFIG = {
  /** Label of the contract issues (same as ci/contract-issue.yml LABEL). */
  contractLabel: "schema-contract",
  /** Label added when the migration is done. */
  readyLabel: "contract-ready",
  readyLabelColor: "0E8A16",
  /** Environment named in the comment. */
  environment: "production",
  /** Title format of contract issues; group 1 = migration name. */
  titlePattern: /^Contract: (\S+)$/,
  /** Successful terminal states (lower-case). */
  successStates: ["success", "succeeded", "done", "completed"],
}

/**
 * One status entry -> `{ name, done, state, processed }`. Names lose any `<module>:` prefix so they
 * match the issue title. Accepts `done` or `isDone`.
 */
export function normalize(status) {
  const name = String(status?.name ?? "").replace(/^.*:/, "")
  const state = String(status?.state ?? "").toLowerCase()
  const done = (status?.done ?? status?.isDone) === true
  return { name, done, state, processed: status?.processed }
}

/** Migrations that finished successfully, by bare name. */
export function doneMigrations(statuses, config = CONFIG) {
  const list = Array.isArray(statuses) ? statuses : Object.values(statuses ?? {})
  return new Map(
    list
      .map(normalize)
      .filter((s) => s.name && s.done && config.successStates.includes(s.state))
      .map((s) => [s.name, s]),
  )
}

export const marker = (name) => `<!-- contract-ready:${name} -->`

/** Pure matching: which open contract issues need the label and/or the comment. */
export function planActions(issues, statuses, config = CONFIG) {
  const done = doneMigrations(statuses, config)
  const actions = []
  for (const issue of issues) {
    const name = config.titlePattern.exec(issue.title ?? "")?.[1]
    const status = name && done.get(name)
    if (!status) continue
    const hasLabel = issue.labels?.some((l) => l.name === config.readyLabel) ?? false
    const hasComment = issue.comments?.some((c) => c.body?.includes(marker(name))) ?? false
    if (hasLabel && hasComment) continue
    const processed = status.processed === undefined ? "" : `, ${status.processed} record(s) processed`
    actions.push({
      number: issue.number,
      addLabel: !hasLabel,
      comment: hasComment
        ? null
        : `${marker(name)}\nMigration \`${name}\` finished on ${config.environment}: state ${status.state}${processed}. The contract PR can be opened now (take the backup first).`,
    })
  }
  return actions
}

function gh(args) {
  return execFileSync("gh", args, { encoding: "utf8" })
}

function main() {
  const dryRun = process.argv.includes("--dry-run")
  const statuses = JSON.parse(readFileSync(0, "utf8"))
  const issues = JSON.parse(
    gh(["issue", "list", "--label", CONFIG.contractLabel, "--state", "open", "--limit", "200", "--json", "number,title,labels,comments"]),
  )
  const actions = planActions(issues, statuses)
  if (actions.length === 0) {
    console.log("No contract issue to mark.")
    return
  }
  if (dryRun) {
    for (const a of actions) console.log(`Would mark #${a.number} ${CONFIG.readyLabel}`)
    return
  }
  gh(["label", "create", CONFIG.readyLabel, "--force", "--color", CONFIG.readyLabelColor, "--description", "Migration done in production; the contract PR can open"])
  for (const a of actions) {
    if (a.addLabel) gh(["issue", "edit", String(a.number), "--add-label", CONFIG.readyLabel])
    if (a.comment) gh(["issue", "comment", String(a.number), "--body", a.comment])
    console.log(`Marked #${a.number} ${CONFIG.readyLabel}`)
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main()
