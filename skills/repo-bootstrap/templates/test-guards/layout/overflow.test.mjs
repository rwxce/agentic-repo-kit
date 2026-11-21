import assert from 'node:assert/strict'
import { afterEach, beforeEach, describe, it } from 'node:test'
import { DEFAULTS, findOverflow, formatIssues, monotonicViolation, scanOverflow, sweepSteps } from './overflow.mjs'

// ---- A tiny fake DOM: just enough geometry and selectors for scanOverflow. The real thing runs in
// a browser through Playwright; this pins the decision logic without one.
function matches(el, selector) {
  return selector.split(',').map((s) => s.trim()).some((s) => {
    const attr = /^\[([\w-]+)(?:='([^']*)')?\]$/.exec(s)
    if (attr) return attr[1] in el.attrs && (attr[2] === undefined || el.attrs[attr[1]] === attr[2])
    return el.tagName.toLowerCase() === s
  })
}

function el(tag, { rect = [0, 0, 100, 20], text = '', attrs = {}, cls = [], style = {}, scrollWidth, clientWidth, visible = true } = {}, children = []) {
  const [left, top, width, height] = rect
  const node = {
    tagName: tag.toUpperCase(),
    id: attrs.id ?? '',
    attrs,
    classList: cls,
    style: { overflowX: 'visible', textOverflow: 'clip', opacity: '1', ...style },
    childNodes: [...(text ? [{ nodeType: 3, textContent: text }] : []), ...children],
    children,
    parentElement: null,
    textContent: text + children.map((c) => c.textContent).join(''),
    nodeType: 1,
    scrollWidth: scrollWidth ?? width,
    clientWidth: clientWidth ?? width,
    getAttribute: (name) => attrs[name] ?? null,
    getBoundingClientRect: () => ({ left, top, width, height, right: left + width, bottom: top + height }),
    checkVisibility: () => visible,
    closest(selector) {
      for (let n = node; n; n = n.parentElement) if (matches(n, selector)) return n
      return null
    },
    contains(other) {
      for (let n = other; n; n = n.parentElement) if (n === node) return true
      return false
    },
    querySelectorAll(selector) {
      const out = []
      const walk = (n) => n.children.forEach((c) => {
        if (selector === '*' || matches(c, selector)) out.push(c)
        walk(c)
      })
      walk(node)
      return out
    },
  }
  for (const c of children) c.parentElement = node
  return node
}

function mount(bodyChildren, { viewport = 375, pageWidth = viewport } = {}) {
  const body = el('body', { rect: [0, 0, viewport, 2000] }, bodyChildren)
  globalThis.document = {
    body,
    documentElement: { clientWidth: viewport, scrollWidth: pageWidth },
    querySelectorAll: (s) => body.querySelectorAll(s),
  }
  globalThis.getComputedStyle = (n) => n.style
}

const kinds = (issues) => issues.map((i) => i.kind)

describe('layout guard: scanOverflow', () => {
  beforeEach(() => mount([]))
  afterEach(() => {
    delete globalThis.document
    delete globalThis.getComputedStyle
  })

  it('reports nothing for a layout that fits', () => {
    mount([el('p', { rect: [16, 0, 300, 20], text: 'Fits' })])
    assert.deepEqual(scanOverflow(DEFAULTS), [])
  })

  it('reports horizontal page scroll', () => {
    mount([], { viewport: 375, pageWidth: 420 })
    assert.deepEqual(scanOverflow(DEFAULTS), [{ kind: 'page-scroll', selector: 'html', text: '', px: 45 }])
  })

  it('reports text running past the viewport, unless inside a horizontal scroller', () => {
    mount([el('h1', { rect: [16, 0, 400, 40], text: 'A very long translated headline', cls: ['hero'] })])
    const [issue] = scanOverflow(DEFAULTS)
    assert.equal(issue.kind, 'past-viewport')
    assert.equal(issue.px, 41)
    assert.match(issue.selector, /h1\.hero/)
    mount([el('div', { rect: [0, 0, 375, 40], style: { overflowX: 'auto' } }, [el('span', { rect: [300, 0, 200, 20], text: 'carousel item' })])])
    assert.deepEqual(scanOverflow(DEFAULTS), [])
  })

  it('reports text clipped by its own box', () => {
    mount([el('span', { rect: [0, 0, 100, 20], text: 'Truncated label', style: { textOverflow: 'ellipsis' }, scrollWidth: 140, clientWidth: 100 })])
    assert.deepEqual(kinds(scanOverflow(DEFAULTS)), ['clipped-text'])
  })

  it('skips opted-out, hidden, sr-only and ancestor-clipped elements', () => {
    mount([
      el('p', { rect: [0, 0, 500, 20], text: 'bleeds on purpose', attrs: { 'data-allow-overflow': '' } }),
      el('p', { rect: [0, 0, 500, 20], text: 'invisible', visible: false }),
      el('span', { rect: [0, 0, 1, 1], text: 'sr only' }),
      el('div', { rect: [0, 0, 0, 20], style: { overflowX: 'hidden' } }, [el('a', { rect: [0, 0, 500, 20], text: 'collapsed cta' })]),
    ])
    assert.deepEqual(scanOverflow(DEFAULTS), [])
  })

  it('reports colliding and escaping controls inside a guarded container only', () => {
    const nav = (attrs) =>
      el('nav', { rect: [0, 0, 300, 40], attrs }, [
        el('a', { rect: [10, 0, 120, 40], text: 'Pricing' }),
        el('a', { rect: [100, 0, 120, 40], text: 'Blog' }),
        el('button', { rect: [250, 0, 80, 40], text: 'Menu' }),
      ])
    mount([nav({ 'data-overflow-guard': '' })])
    const issues = scanOverflow(DEFAULTS)
    assert.deepEqual(kinds(issues).sort(), ['outside-container', 'overlap'])
    assert.match(issues.find((i) => i.kind === 'overlap').text, /Pricing x Blog/)
    mount([nav({})])
    assert.deepEqual(scanOverflow(DEFAULTS), [])
  })

  it('treats a control nested in another as one control', () => {
    mount([el('nav', { rect: [0, 0, 300, 40], attrs: { 'data-overflow-guard': '' } }, [el('a', { rect: [0, 0, 200, 40], text: 'Card' }, [el('button', { rect: [150, 0, 40, 40], text: 'x' })])])])
    assert.deepEqual(scanOverflow(DEFAULTS), [])
  })
})

describe('layout guard: helpers', () => {
  it('findOverflow passes the scan and merged options to page.evaluate', async () => {
    let seen
    const page = { evaluate: async (fn, arg) => ((seen = { fn, arg }), []) }
    await findOverflow(page, { tolerance: 2 })
    assert.equal(seen.fn, scanOverflow)
    assert.equal(seen.arg.tolerance, 2)
    assert.equal(seen.arg.guardSelector, DEFAULTS.guardSelector)
  })

  it('formats issues for a readable diff', () => {
    assert.deepEqual(formatIssues([{ kind: 'page-scroll', px: 3, selector: 'html', text: '' }, { kind: 'overlap', px: 20, selector: 'a x a', text: 'A x B' }]), [
      'page-scroll +3px  html',
      'overlap +20px  a x a  "A x B"',
    ])
  })

  it('sweeps up to max and back down without repeating max', () => {
    const steps = sweepSteps(320, 400, 40)
    assert.deepEqual(steps.map((s) => `${s.width}${s.dir[0]}`), ['320u', '360u', '400u', '360d', '320d'])
    assert.deepEqual(sweepSteps(320, 330, 20).map((s) => s.width), [320, 330, 320])
    assert.throws(() => sweepSteps(400, 320, 20), RangeError)
  })

  it('flags collapsible items that move against the resize direction', () => {
    assert.equal(monotonicViolation(null, 3, 'up', 'up'), null)
    assert.equal(monotonicViolation(3, 4, 'up', 'up'), null)
    assert.match(monotonicViolation(4, 3, 'up', 'up'), /dropped from 4 to 3 while widening/)
    assert.match(monotonicViolation(2, 3, 'down', 'down'), /grew from 2 to 3 while narrowing/)
    assert.equal(monotonicViolation(5, 4, 'down', 'up'), null) // direction changed: reset
  })
})
