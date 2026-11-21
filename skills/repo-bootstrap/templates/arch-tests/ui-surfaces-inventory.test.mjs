import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { after, describe, it } from 'node:test'
import { fileURLToPath } from 'node:url'
import { checkInventory, citedPaths, findFloatingSurfaces, findPages } from './ui-surfaces-inventory.mjs'

const SCRIPT = fileURLToPath(new URL('./ui-surfaces-inventory.mjs', import.meta.url))
const dirs = []
after(() => dirs.forEach((d) => rmSync(d, { recursive: true, force: true })))

function fixture(files) {
  const root = mkdtempSync(join(tmpdir(), 'ui-inventory-'))
  dirs.push(root)
  for (const [path, content] of Object.entries(files)) {
    mkdirSync(join(root, path, '..'), { recursive: true })
    writeFileSync(join(root, path), content)
  }
  return root
}

const APP = {
  'app/page.tsx': 'export default function Home() {}',
  'app/settings/[section]/page.tsx': 'export default function S() {}',
  'app/settings/layout.tsx': 'export default function L() {}',
  'components/ui/dialog.tsx': 'export const Dialog = 1',
  'components/delete-dialog.tsx': 'import { Dialog } from "@/components/ui/dialog"',
  'components/cookie-banner.tsx': 'return <div role="dialog" />',
  'components/menu.tsx': "import { Popover } from '../ui/popover'",
  'components/button.tsx': 'export const Button = 1',
  'components/delete-dialog.test.tsx': 'import { Dialog } from "@/components/ui/dialog"',
}

describe('ui-surfaces-inventory: discovery', () => {
  it('finds page files only', () => {
    assert.deepEqual(findPages(fixture(APP)), ['app/page.tsx', 'app/settings/[section]/page.tsx'])
  })

  it('finds overlay users, skipping primitives, tests and plain components', () => {
    assert.deepEqual(findFloatingSurfaces(fixture(APP)), ['components/cookie-banner.tsx', 'components/delete-dialog.tsx', 'components/menu.tsx'])
  })

  it('reads backticked paths with a directory from the doc', () => {
    assert.deepEqual(citedPaths('`app/page.tsx` and `components/x.tsx`, not `Dialog` or `foo.tsx`; `app/page.tsx` again'), ['app/page.tsx', 'components/x.tsx'])
  })
})

describe('ui-surfaces-inventory: checkInventory', () => {
  const fullDoc = [
    '| `/` | `app/page.tsx` |',
    '| Settings | `app/settings/[section]/page.tsx` |',
    '| Delete | `components/delete-dialog.tsx` |',
    '| Cookies | `components/cookie-banner.tsx` |',
    '| Menu | `components/menu.tsx` |',
  ].join('\n')

  it('is clean when every page and surface is cited and every citation exists', () => {
    const r = checkInventory(fixture({ ...APP, 'docs/ui-surfaces.md': fullDoc }))
    assert.deepEqual(r, { problems: [], unlistedPages: [], unlistedSurfaces: [], missing: [] })
  })

  it('reports a new page, a new overlay and a stale citation', () => {
    const doc = fullDoc.replace('| Menu | `components/menu.tsx` |', '| Old | `components/old-sheet.tsx` |')
    const r = checkInventory(fixture({ ...APP, 'app/billing/page.tsx': 'x', 'docs/ui-surfaces.md': doc }))
    assert.deepEqual(r.unlistedPages, ['app/billing/page.tsx'])
    assert.deepEqual(r.unlistedSurfaces, ['components/menu.tsx'])
    assert.deepEqual(r.missing, ['components/old-sheet.tsx'])
  })

  it('refuses to pass vacuously when the pages directory moved', () => {
    const r = checkInventory(fixture({ 'docs/ui-surfaces.md': '' }))
    assert.match(r.problems[0], /found 0 page/)
  })

  it('reports a missing doc', () => {
    assert.match(checkInventory(fixture(APP)).error, /does not exist/)
  })
})

describe('ui-surfaces-inventory: CLI', () => {
  it('exits 1 with one line per drift and 0 when in sync', () => {
    const drift = spawnSync(process.execPath, [SCRIPT], { cwd: fixture({ ...APP, 'docs/ui-surfaces.md': '`app/page.tsx`' }), encoding: 'utf8' })
    assert.equal(drift.status, 1)
    assert.match(drift.stderr, /page not in docs\/ui-surfaces\.md: app\/settings\/\[section\]\/page\.tsx/)
    assert.match(drift.stderr, /floating surface not in docs\/ui-surfaces\.md: components\/menu\.tsx/)
    const ok = spawnSync(process.execPath, [SCRIPT], {
      cwd: fixture({ 'app/page.tsx': 'x', 'docs/ui-surfaces.md': '`app/page.tsx`' }),
      encoding: 'utf8',
    })
    assert.equal(ok.status, 0, ok.stderr)
  })
})
