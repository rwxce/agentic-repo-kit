/**
 * WHAT: Turns a JSON Schema (e.g. the output of your schema library's JSON Schema export) into the
 *   strict structured-output dialect, the most restrictive one a router may send your call to, so
 *   the same schema works whichever upstream serves the model. The model's answer is still
 *   validated against the ORIGINAL, fully constrained schema; this only changes what is sent.
 *   Per https://developers.openai.com/api/docs/guides/structured-outputs (read 2026-11-21):
 *   - every key in `properties` is listed in `required`; keys that were optional become nullable;
 *   - `additionalProperties: false` on every object;
 *   - unsupported composition keywords (`allOf`, `not`, `if`/`then`/`else`, `dependent*`) and
 *     `default` are dropped, unknown string formats too, with a note appended to `description`
 *     so the model still sees the intent; `oneOf` becomes `anyOf`.
 *   `dropNulls` maps the nulls back to "absent" before validating with the original schema.
 * REPO SIGNAL: structured LLM output (JSON mode, tool calls) through a router or several providers.
 * CONFIGURE: EXTRA_DROP for keywords a provider you route to rejects or breaks (e.g. bounds like
 *   `minItems`, `minLength`), found by your eval. Zero dependencies.
 */

export const DROP = ['allOf', 'not', 'if', 'then', 'else', 'dependentRequired', 'dependentSchemas',
  'patternProperties', 'default', '$schema']
/** Add keywords here when an upstream rejects or mishandles them (measured, not guessed). */
export const EXTRA_DROP = []
export const FORMATS = ['date-time', 'time', 'date', 'duration', 'email', 'hostname', 'ipv4', 'ipv6', 'uuid']

const isObj = (v) => v !== null && typeof v === 'object' && !Array.isArray(v)

function nullable(schema) {
  if (Array.isArray(schema.type)) return schema.type.includes('null') ? schema : { ...schema, type: [...schema.type, 'null'] }
  if (typeof schema.type === 'string') return { ...schema, type: [schema.type, 'null'] }
  if (schema.anyOf) return schema.anyOf.some((s) => s.type === 'null') ? schema : { ...schema, anyOf: [...schema.anyOf, { type: 'null' }] }
  return { anyOf: [schema, { type: 'null' }] }
}

/** Returns a new schema in the strict dialect; never mutates the input. */
export function toStrictSchema(schema, { drop = [...DROP, ...EXTRA_DROP] } = {}) {
  const visit = (node) => {
    if (Array.isArray(node)) return node.map(visit)
    if (!isObj(node)) return node
    const out = {}
    const notes = []
    for (const [key, value] of Object.entries(node)) {
      if (drop.includes(key)) {
        notes.push(`${key}: ${JSON.stringify(value)}`)
        continue
      }
      if (key === 'format' && !FORMATS.includes(value)) {
        notes.push(`format: ${value}`)
        continue
      }
      if (key === 'oneOf') out.anyOf = visit(value)
      else if (key === 'properties' || key === '$defs' || key === 'definitions') {
        out[key] = Object.fromEntries(Object.entries(value).map(([k, v]) => [k, visit(v)]))
      } else out[key] = visit(value)
    }
    if (out.type === 'object' || out.properties) {
      const props = out.properties ?? {}
      const required = new Set(node.required ?? [])
      for (const [k, v] of Object.entries(props)) if (!required.has(k)) props[k] = nullable(v)
      out.properties = props
      out.required = Object.keys(props)
      out.additionalProperties = false
    }
    if (notes.length) out.description = [node.description, `(Constraints: ${notes.join('; ')})`].filter(Boolean).join(' ')
    return out
  }
  return visit(schema)
}

/** Strict mode answers `null` where the original schema says optional: drop those keys, deeply. */
export function dropNulls(value) {
  if (Array.isArray(value)) return value.map(dropNulls)
  if (!isObj(value)) return value
  return Object.fromEntries(Object.entries(value).filter(([, v]) => v !== null).map(([k, v]) => [k, dropNulls(v)]))
}
