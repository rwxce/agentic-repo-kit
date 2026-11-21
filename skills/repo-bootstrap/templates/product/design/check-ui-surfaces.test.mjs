import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, it } from 'node:test'
import { checkInventory, citedPaths, classify, walk } from './check-ui-surfaces.mjs'

const sources = {
  'app/en/page.tsx': 'export default function Home() {}',
  'app/en/billing/page.tsx': 'export default function Billing() {}',
  'components/confirm-delete.tsx': 'return <AlertDialog open>…</AlertDialog>',
  'components/ui/dialog.tsx': 'export const Dialog = …; <Dialog />',
  'components/card.tsx': 'return <div className="card" />',
}
const read = (f) => sources[f]

describe('check-ui-surfaces', () => {
  it('classifies pages and surface files, skipping UI primitives', () => {
    const { pages, surfaces } = classify(Object.keys(sources), read)
    assert.deepEqual(pages, ['app/en/page.tsx', 'app/en/billing/page.tsx'])
    assert.deepEqual(surfaces, ['components/confirm-delete.tsx'])
  })

  it('reads only file-like backticked paths, not placeholders or routes', () => {
    const cited = citedPaths('| `/billing` | `app/en/billing/page.tsx` | `<path/to/page file>` | `pnpm test` |')
    assert.deepEqual([...cited], ['app/en/billing/page.tsx'])
  })

  it('reports missing entries in both directions', () => {
    const problems = checkInventory({
      pages: ['app/en/page.tsx', 'app/en/billing/page.tsx'],
      surfaces: ['components/confirm-delete.tsx'],
      inventoryText: '`app/en/page.tsx` `components/old-sheet.tsx`',
      exists: (p) => p !== 'components/old-sheet.tsx',
    })
    assert.deepEqual(problems, [
      'page not in inventory: app/en/billing/page.tsx',
      'floating surface not in inventory: components/confirm-delete.tsx',
      'inventory cites a missing file: components/old-sheet.tsx',
    ])
  })

  it('walks a real tree with posix paths', () => {
    const root = mkdtempSync(join(tmpdir(), 'ui-surfaces-'))
    mkdirSync(join(root, 'app', 'x'), { recursive: true })
    writeFileSync(join(root, 'app', 'x', 'page.tsx'), '')
    assert.deepEqual(walk(join(root, 'app'), root), ['app/x/page.tsx'])
  })
})
