import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { copyFileSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { after, describe, it } from 'node:test'
import { fileURLToPath } from 'node:url'
import { compareGates, readPnpmAgeMinutes, readRenovateAge, renovateAgeMinutes } from './check-release-age.mjs'

const here = (f) => fileURLToPath(new URL(f, import.meta.url))
const dirs = []
after(() => dirs.forEach((d) => rmSync(d, { recursive: true, force: true })))

describe('check-release-age: parsing', () => {
  it('converts Renovate durations to minutes', () => {
    assert.equal(renovateAgeMinutes('5 days'), 7200)
    assert.equal(renovateAgeMinutes('3d'), 4320)
    assert.equal(renovateAgeMinutes('72 hours'), 4320)
    assert.equal(renovateAgeMinutes('1 week'), 10080)
    assert.equal(renovateAgeMinutes('90 minutes'), 90)
    assert.equal(renovateAgeMinutes('soon'), null)
    assert.equal(renovateAgeMinutes(undefined), null)
  })

  it('reads minimumReleaseAge from JSON and JSON5', () => {
    assert.equal(readRenovateAge('{ "minimumReleaseAge": "5 days" }'), '5 days')
    assert.equal(readRenovateAge("{\n  minimumReleaseAge: '3d',\n}"), '3d')
    assert.equal(readRenovateAge('{ "extends": [] }'), null)
  })

  it('reads the top-level pnpm setting, ignoring commented ones', () => {
    assert.equal(readPnpmAgeMinutes('# minimumReleaseAge: 10\nminimumReleaseAge: 7200 # 5 days\n'), 7200)
    assert.equal(readPnpmAgeMinutes('# minimumReleaseAge: 7200\n'), null)
  })

  it('reads the shipped templates as aligned', () => {
    const renovate = renovateAgeMinutes(readRenovateAge(readFileSync(here('./renovate.json5'), 'utf8')))
    const pnpm = readPnpmAgeMinutes(readFileSync(here('./pnpm-workspace.snippet.yaml'), 'utf8'))
    assert.deepEqual(compareGates(renovate, pnpm), [])
  })
})

describe('check-release-age: compareGates', () => {
  it('passes equal gates above the floor', () => {
    assert.deepEqual(compareGates(7200, 7200, 3), [])
  })

  it('flags drift in either direction', () => {
    assert.match(compareGates(4320, 7200, 3)[0], /Renovate waits 4320 min, pnpm 7200 min/)
    assert.match(compareGates(7200, 4320, 3)[0], /differ/)
  })

  it('flags a missing gate or one below the floor', () => {
    assert.match(compareGates(null, 7200)[0], /Renovate has no/)
    assert.match(compareGates(7200, null)[0], /pnpm-workspace.yaml has no/)
    assert.equal(compareGates(60, 60, 3).filter((p) => /floor/.test(p)).length, 2)
  })
})

describe('check-release-age: CLI', () => {
  it('exits 0 on the shipped templates and 1 on drift', () => {
    const root = mkdtempSync(join(tmpdir(), 'release-age-'))
    dirs.push(root)
    copyFileSync(here('./renovate.json5'), join(root, 'renovate.json5'))
    copyFileSync(here('./pnpm-workspace.snippet.yaml'), join(root, 'pnpm-workspace.yaml'))
    const ok = spawnSync(process.execPath, [here('./check-release-age.mjs')], { cwd: root, encoding: 'utf8' })
    assert.equal(ok.status, 0, ok.stderr)
    writeFileSync(join(root, 'pnpm-workspace.yaml'), 'minimumReleaseAge: 1440\n')
    const bad = spawnSync(process.execPath, [here('./check-release-age.mjs')], { cwd: root, encoding: 'utf8' })
    assert.equal(bad.status, 1)
    assert.match(bad.stderr, /below the 3-day floor/)
  })
})
