import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { selectGuardTests } from './list-guard-tests.mjs'

describe('list-guard-tests', () => {
  const sources = {
    'middleware.test.ts': 'import { readdirSync } from "node:fs"',
    'lib/a.test.ts': 'import { a } from "./a"',
    'scripts/b.test.ts': 'import fs from "fs"',
    'scripts/c.test.ts': 'import { readFile } from "node:fs/promises"',
  }

  it('keeps only tests that read the repo from disk, sorted', () => {
    assert.deepEqual(selectGuardTests(Object.keys(sources), (f) => sources[f]), [
      'middleware.test.ts',
      'scripts/b.test.ts',
      'scripts/c.test.ts',
    ])
  })

  it('returns nothing when no test reads the filesystem', () => {
    assert.deepEqual(selectGuardTests(['x.test.ts'], () => 'export {}'), [])
  })
})
