#!/usr/bin/env node
/**
 * WHAT: Design-token check (CI). Validates a DTCG token file (Design Tokens Format Module 2025.10,
 *   https://www.designtokens.org/tr/2025.10/format/): every token has a type (own, inherited from
 *   a group, or from the token it aliases), names avoid `$`, `{`, `}` and `.`, values match their
 *   type, every `{alias}` resolves without cycles. Optional: every token has a matching CSS custom
 *   property in the generated theme file, so the theme cannot drift from the source of truth.
 * REPO SIGNAL: a `*.tokens.json` / `*.tokens` file, or a theme the team wants to drive from one.
 * CONFIGURE: CONFIG.tokensFile, CONFIG.cssFile (null = skip parity), CONFIG.cssName (how a token
 *   path becomes a custom property). Wire as `check:tokens` and run it in CI.
 * Usage: node scripts/check-tokens.mjs [tokensFile] [--css themeFile]   exit 0 clean, 1 problems
 * Zero dependencies. Scope: the format and color modules' core types; `$extends` groups and JSON
 * Pointer `$ref` values are reported as unsupported rather than guessed.
 */
import { existsSync, readFileSync } from 'node:fs'
import { pathToFileURL } from 'node:url'

export const CONFIG = {
  tokensFile: process.env.TOKENS_FILE ?? 'design/tokens.tokens.json',
  cssFile: process.env.TOKENS_CSS ?? null,
  /** Token path → CSS custom property. Default: `color.brand.primary` → `--color-brand-primary`. */
  cssName: (path) => `--${path.join('-')}`,
}

const PRIMITIVE = ['color', 'dimension', 'fontFamily', 'fontWeight', 'duration', 'cubicBezier', 'number']
const COMPOSITE = ['strokeStyle', 'border', 'transition', 'shadow', 'gradient', 'typography']
export const TYPES = [...PRIMITIVE, ...COMPOSITE]
const COLOR_SPACES = ['srgb', 'srgb-linear', 'hsl', 'hwb', 'lab', 'lch', 'oklab', 'oklch', 'display-p3',
  'a98-rgb', 'prophoto-rgb', 'rec2020', 'xyz-d65', 'xyz-d50']
const WEIGHT_NAMES = ['thin', 'hairline', 'extra-light', 'ultra-light', 'light', 'normal', 'regular', 'book',
  'medium', 'semi-bold', 'demi-bold', 'bold', 'extra-bold', 'ultra-bold', 'black', 'heavy', 'extra-black',
  'ultra-black']
const STROKE_NAMES = ['solid', 'dashed', 'dotted', 'double', 'groove', 'ridge', 'outset', 'inset']
/** Sub-value types of each composite, per the spec. */
const PARTS = {
  shadow: { color: 'color', offsetX: 'dimension', offsetY: 'dimension', blur: 'dimension', spread: 'dimension' },
  typography: { fontFamily: 'fontFamily', fontSize: 'dimension', fontWeight: 'fontWeight',
    letterSpacing: 'dimension', lineHeight: 'number' },
  border: { color: 'color', width: 'dimension', style: 'strokeStyle' },
  transition: { duration: 'duration', delay: 'duration', timingFunction: 'cubicBezier' },
}

const isObj = (v) => v !== null && typeof v === 'object' && !Array.isArray(v)
const isNum = (v) => typeof v === 'number' && Number.isFinite(v)
const ALIAS = /^\{([^{}]+)\}$/
export const aliasTarget = (v) => (typeof v === 'string' ? v.match(ALIAS)?.[1] ?? null : null)

/** Walks the file and returns { tokens: Map<path, {type, value}>, problems }. */
export function collectTokens(root) {
  const tokens = new Map()
  const problems = []
  const walk = (node, path, inherited) => {
    for (const [key, child] of Object.entries(node)) {
      if (key.startsWith('$')) {
        if (key === '$extends') problems.push(`${path.join('.') || '(root)'}: $extends is not supported by this check`)
        continue
      }
      const here = [...path, key]
      const name = here.join('.')
      if (/[{}.]/.test(key)) problems.push(`${name}: name must not contain "{", "}" or "."`)
      if (!isObj(child)) {
        problems.push(`${name}: expected a token or group object`)
        continue
      }
      if ('$value' in child) {
        tokens.set(name, { path: here, type: child.$type ?? inherited ?? null, value: child.$value })
      } else {
        walk(child, here, child.$type ?? inherited)
      }
    }
  }
  if (!isObj(root)) return { tokens, problems: ['(root): token file must be a JSON object'] }
  walk(root, [], root.$type)
  return { tokens, problems }
}

/** Resolves a token's effective type, following aliases; reports missing targets and cycles. */
export function resolveType(name, tokens, seen = []) {
  const token = tokens.get(name)
  if (!token) return { error: `unknown alias target "{${name}}"` }
  if (seen.includes(name)) return { error: `alias cycle: ${[...seen, name].join(' → ')}` }
  if (token.type) return { type: token.type }
  const target = aliasTarget(token.value)
  if (target) return resolveType(target, tokens, [...seen, name])
  return { error: 'no $type (own, group or alias)' }
}

function checkPrimitive(type, v) {
  switch (type) {
    case 'color': {
      if (!isObj(v)) return 'color must be an object {colorSpace, components}'
      if (!COLOR_SPACES.includes(v.colorSpace)) return `unknown colorSpace "${v.colorSpace}"`
      if (!Array.isArray(v.components) || v.components.length !== 3
        || !v.components.every((c) => isNum(c) || c === 'none')) return 'components must be 3 numbers (or "none")'
      if ('alpha' in v && !(isNum(v.alpha) && v.alpha >= 0 && v.alpha <= 1)) return 'alpha must be in [0, 1]'
      if ('hex' in v && !/^#[0-9a-fA-F]{6}$/.test(v.hex)) return 'hex must be #rrggbb'
      return null
    }
    case 'dimension':
      return isObj(v) && isNum(v.value) && ['px', 'rem'].includes(v.unit) ? null : 'dimension must be {value, unit: px|rem}'
    case 'duration':
      return isObj(v) && isNum(v.value) && ['ms', 's'].includes(v.unit) ? null : 'duration must be {value, unit: ms|s}'
    case 'fontFamily':
      return typeof v === 'string' || (Array.isArray(v) && v.length && v.every((f) => typeof f === 'string'))
        ? null : 'fontFamily must be a string or an array of strings'
    case 'fontWeight':
      return (isNum(v) && v >= 1 && v <= 1000) || WEIGHT_NAMES.includes(v) ? null : 'fontWeight must be 1-1000 or a spec name'
    case 'cubicBezier':
      return Array.isArray(v) && v.length === 4 && v.every(isNum) && v[0] >= 0 && v[0] <= 1 && v[2] >= 0 && v[2] <= 1
        ? null : 'cubicBezier must be [x1, y1, x2, y2] with x in [0, 1]'
    case 'number':
      return isNum(v) ? null : 'number must be a JSON number'
    case 'strokeStyle':
      return STROKE_NAMES.includes(v) || (isObj(v) && Array.isArray(v.dashArray) && typeof v.lineCap === 'string')
        ? null : 'strokeStyle must be a keyword or {dashArray, lineCap}'
    default:
      return `unknown type "${type}"`
  }
}

/** Checks one value (or sub-value) against a type; aliases must resolve to a token of that type. */
export function checkValue(type, value, tokens) {
  const target = aliasTarget(value)
  if (target) {
    const r = resolveType(target, tokens)
    if (r.error) return [r.error]
    return r.type === type ? [] : [`alias {${target}} is ${r.type}, expected ${type}`]
  }
  if (PARTS[type]) {
    if (!isObj(value)) return [`${type} must be an object`]
    const out = []
    for (const [part, partType] of Object.entries(PARTS[type])) {
      if (!(part in value)) out.push(`${type} is missing "${part}"`)
      else out.push(...checkValue(partType, value[part], tokens).map((p) => `${part}: ${p}`))
    }
    return out
  }
  if (type === 'gradient') {
    if (!Array.isArray(value)) return ['gradient must be an array of stops']
    return value.flatMap((stop, i) => (aliasTarget(stop) ? checkValue('gradient', stop, tokens)
      : !isObj(stop) ? [`stop ${i}: must be {color, position}`]
        : [...checkValue('color', stop.color, tokens), ...checkValue('number', stop.position, tokens)]
          .map((p) => `stop ${i}: ${p}`)))
  }
  const p = checkPrimitive(type, value)
  return p ? [p] : []
}

/** Follows a chain of whole-value aliases; returns an error for a missing target or a cycle. */
export function followAliases(name, tokens) {
  const seen = [name]
  let target = aliasTarget(tokens.get(name)?.value)
  while (target) {
    if (!tokens.has(target)) return `unknown alias target "{${target}}"`
    if (seen.includes(target)) return `alias cycle: ${[...seen, target].join(' → ')}`
    seen.push(target)
    target = aliasTarget(tokens.get(target).value)
  }
  return null
}

export function checkTokens(root) {
  const { tokens, problems } = collectTokens(root)
  for (const [name, token] of tokens) {
    const chain = followAliases(name, tokens)
    if (chain) {
      problems.push(`${name}: ${chain}`)
      continue
    }
    const r = resolveType(name, tokens)
    if (r.error) {
      problems.push(`${name}: ${r.error}`)
      continue
    }
    if (!TYPES.includes(r.type)) {
      problems.push(`${name}: unknown type "${r.type}"`)
      continue
    }
    const values = r.type === 'shadow' && Array.isArray(token.value) ? token.value : [token.value]
    for (const v of values) problems.push(...checkValue(r.type, v, tokens).map((p) => `${name}: ${p}`))
  }
  return { tokens, problems }
}

/** Tokens with no matching custom property in the theme file. */
export function missingCssVars(tokens, css, cssName = CONFIG.cssName) {
  return [...tokens.values()].map((t) => cssName(t.path)).filter((v) => !css.includes(`${v}:`))
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const args = process.argv.slice(2)
  const cssAt = args.indexOf('--css')
  const cssFile = cssAt >= 0 ? args[cssAt + 1] : CONFIG.cssFile
  const file = args.find((a, i) => !a.startsWith('--') && (cssAt < 0 || i !== cssAt + 1)) ?? CONFIG.tokensFile
  if (!existsSync(file)) {
    console.error(`Token check: ${file} not found`)
    process.exit(1)
  }
  const { tokens, problems } = checkTokens(JSON.parse(readFileSync(file, 'utf8')))
  if (cssFile) problems.push(...missingCssVars(tokens, readFileSync(cssFile, 'utf8')).map((v) => `${cssFile}: missing ${v}`))
  if (problems.length) {
    console.error(`Token check failed (${file}):\n${problems.map((p) => `  • ${p}`).join('\n')}`)
    process.exit(1)
  }
  console.log(`Token check passed (${file}, ${tokens.size} tokens).`)
}
