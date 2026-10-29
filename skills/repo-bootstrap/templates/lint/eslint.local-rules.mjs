/**
 * WHAT: A zero-dependency ESLint plugin of "repo law" rules, configured entirely through rule
 * options (no editing this file per repo). Flat-config (ESLint 9+) ready.
 * REPO SIGNAL: each rule exists because the same review comment / production incident repeated.
 * See README.md for the signal per rule. Enable only the rules whose signal you can point at.
 * CONFIGURE: import as a plugin and set options in eslint.config.mjs (see eslint.config.snippet.mjs):
 *
 *   import { localPlugin } from "./eslint.local-rules.mjs"
 *   { plugins: { local: localPlugin }, files: [...], rules: { "local/require-test-file": ["warn", {...}] } }
 *
 * Rules: require-test-file, catch-must-report, import-only-from, must-use-wrapper,
 *        registry-path-exists.
 * Every rule that touches the file system accepts `cwd` (default process.cwd()) so it can be unit
 * tested against a temp directory.
 */
import { existsSync, readFileSync, readdirSync } from "node:fs"
import { basename, dirname, extname, join, relative } from "node:path"

const posix = (p) => p.replace(/\\/g, "/")
const rel = (cwd, p) => posix(relative(cwd, p))

// ---------------------------------------------------------------------------------------------
// require-test-file
// ---------------------------------------------------------------------------------------------
// Every source file in the configured dirs needs a sibling test file. Cheap proxy for "this unit
// has at least one test" that agents cannot forget, because the lint error names the missing file.
const requireTestFile = {
  meta: {
    type: "problem",
    schema: [
      {
        type: "object",
        properties: {
          extensions: { type: "array", items: { type: "string" } }, // ["ts", "tsx"]
          testSuffixes: { type: "array", items: { type: "string" } }, // [".test", ".integration.test"]
          testDirs: { type: "array", items: { type: "string" } }, // ["__tests__"]: also look in <dir>/__tests__/<file>.test.ts
          ignoreBasenames: { type: "array", items: { type: "string" } }, // ["index", "types"]
          ignoreSuffixes: { type: "array", items: { type: "string" } }, // [".types", ".d", ".stories"]
          cwd: { type: "string" },
        },
        additionalProperties: false,
      },
    ],
  },
  create(context) {
    const o = context.options[0] ?? {}
    const exts = o.extensions ?? ["ts"]
    const suffixes = o.testSuffixes ?? [".test", ".integration.test"]
    const testDirs = o.testDirs ?? ["__tests__"]
    const ignoreBase = new Set(o.ignoreBasenames ?? ["index", "types"])
    const ignoreSuffix = o.ignoreSuffixes ?? [".types", ".d"]
    const cwd = o.cwd ?? process.cwd()
    return {
      Program(node) {
        const filename = context.filename ?? context.getFilename()
        const dir = dirname(filename)
        const ext = extname(filename).slice(1)
        if (!exts.includes(ext)) return
        const stem = basename(filename, `.${ext}`)
        // Already a test, or lives in a test dir.
        if (suffixes.some((s) => stem.endsWith(s)) || testDirs.some((d) => dir.split(/[\\/]/).includes(d))) return
        if (ignoreBase.has(stem) || ignoreSuffix.some((s) => stem.endsWith(s))) return
        const candidates = []
        for (const s of suffixes) {
          for (const e of exts) {
            candidates.push(join(dir, `${stem}${s}.${e}`))
            for (const d of testDirs) candidates.push(join(dir, d, `${stem}${s}.${e}`))
          }
        }
        if (candidates.some(existsSync)) return
        context.report({
          node,
          loc: { line: 1, column: 0 },
          message: `Missing test file: ${rel(cwd, candidates[0])}`,
        })
      },
    }
  },
}

// ---------------------------------------------------------------------------------------------
// catch-must-report
// ---------------------------------------------------------------------------------------------
// Every `catch` block and inline `.catch(fn)` handler must call a reporter. Swallowed errors
// (toast + return, silent fallback) never reach monitoring. Deliberately has NO "does this block
// call the network" heuristic: those are trivially bypassed by wrapping in a helper.
// Browser files may need a different reporter (consent-gated) than server files: `clientReporters`.
const catchMustReport = {
  meta: {
    type: "problem",
    schema: [
      {
        type: "object",
        properties: {
          reporters: { type: "array", items: { type: "string" }, minItems: 1 }, // ["captureException", "logger.error"]
          clientReporters: { type: "array", items: { type: "string" } }, // used when the file is client-side
          clientOnlyImports: { type: "array", items: { type: "string" } }, // hooks that prove client execution
          clientDirective: { type: "string" }, // "use client"
          allowRethrow: { type: "boolean" }, // a `throw` in the catch body counts as handling (default false)
        },
        additionalProperties: false,
      },
    ],
  },
  create(context) {
    const o = context.options[0] ?? {}
    const serverFns = o.reporters ?? ["captureException"]
    const clientFns = o.clientReporters ?? serverFns
    const directive = o.clientDirective ?? "use client"
    // Hard-won: "use client" is only required at a client subtree's *boundary*. A component with no
    // directive that is imported only by a client ancestor still runs in the browser, and importing
    // a client-only hook from "react" is a reliable tell. (Do NOT include hooks that also work in
    // server components, e.g. a translation hook with an RSC integration.)
    const clientHooks = new Set(
      o.clientOnlyImports ?? [
        "useState", "useEffect", "useLayoutEffect", "useRef", "useCallback", "useMemo",
        "useReducer", "useContext", "useTransition", "useOptimistic", "useSyncExternalStore",
      ],
    )
    let required = serverFns

    const isClientFile = (program) =>
      program.body.some(
        (s) =>
          (s.type === "ExpressionStatement" && s.directive === directive) ||
          (s.type === "ImportDeclaration" &&
            s.source.value === "react" &&
            s.specifiers.some((sp) => sp.type === "ImportSpecifier" && clientHooks.has(sp.imported.name))),
      )

    // "a.b.c" matches callee `a.b.c(...)`; "c" matches `c(...)` and `x.y.c(...)` is NOT matched
    // unless written out, to avoid accepting any `.error()` method.
    const calleeText = (c) => {
      if (c.type === "Identifier") return c.name
      if (c.type === "MemberExpression" && !c.computed && c.property.type === "Identifier") {
        const obj = calleeText(c.object)
        return obj ? `${obj}.${c.property.name}` : null
      }
      return c.type === "ThisExpression" ? "this" : null
    }

    const walk = (node, pred) => {
      if (!node || typeof node.type !== "string") return false
      if (pred(node)) return true
      for (const key in node) {
        if (key === "parent") continue
        const v = node[key]
        if (Array.isArray(v) ? v.some((c) => c && walk(c, pred)) : v && walk(v, pred)) return true
      }
      return false
    }
    const handles = (body) =>
      walk(body, (n) => {
        if (n.type === "CallExpression") {
          const t = calleeText(n.callee)
          if (t && required.includes(t)) return true
        }
        return o.allowRethrow === true && n.type === "ThrowStatement"
      })

    const fail = (node) =>
      context.report({
        node,
        message: `This catch block does not report the error. Call ${required.join(" or ")}(err), or add "// eslint-disable-next-line local/catch-must-report" with a comment explaining why this failure is intentionally not reported.`,
      })

    return {
      Program(node) {
        required = isClientFile(node) ? clientFns : serverFns
      },
      CatchClause(node) {
        if (!handles(node.body)) fail(node)
      },
      CallExpression(node) {
        const c = node.callee
        if (c.type !== "MemberExpression" || c.property.type !== "Identifier" || c.property.name !== "catch") return
        const h = node.arguments[0]
        // Only inline handlers: a reference like `.catch(handleError)` cannot be inspected without
        // scope analysis, and flagging it would punish extracting error handling into a function.
        if (!h || (h.type !== "ArrowFunctionExpression" && h.type !== "FunctionExpression")) return
        if (!handles(h.body)) fail(node)
      },
    }
  },
}

// ---------------------------------------------------------------------------------------------
// import-only-from
// ---------------------------------------------------------------------------------------------
// Native/heavy packages (image libs with prebuilt binaries, headless browsers, huge SDKs) may be
// imported only under `allowedDirs`. The check is TRANSITIVE and follows re-exports and barrels:
// a barrel that re-exports a heavy module is itself heavy, so an unrelated import of the barrel is
// reported. Discovery is by scanning source, not by a hand-kept list (nobody updates those).
//
// Two sets, kept apart on purpose:
//   seeds   - modules that import a restricted package directly. They may import each other.
//   tainted - the transitive closure over value imports. Importing a tainted module from outside
//             allowedDirs is the violation.
// Exempting a file because it is *tainted* would let it silence the very edge that tainted it,
// so only seeds exempt.
//
// Limits (document them to your team): reads source imports, not the bundle. Dynamic specifiers
// (`import(variable)`) and npm packages that pull the restricted package in themselves escape it;
// the built output is always the ground truth.
const graphCache = new Map()

function buildGraph(cfg) {
  const key = JSON.stringify(cfg)
  if (graphCache.has(key)) return graphCache.get(key)
  const { cwd, packages, roots, rootFiles, skipDirs, aliases, sourceExt } = cfg
  const SOURCE_RE = /(?:from|import|require)\s*\(?\s*["']([^"']+)["']/
  // `import type` / `export type` are erased by the compiler, so they cannot drag a binary into a
  // bundle and must NOT propagate taint (lets a UI layer reference task types across the boundary).
  const TYPE_ONLY_RE = /^\s*(?:import|export)\s+type\s/
  const moduleId = (p) =>
    rel(cwd, p).replace(new RegExp(`\\.(${sourceExt.join("|")})$`), "").replace(/\/index$/, "")
  const resolveSpecifier = (spec, fromFile) => {
    for (const [prefix, target] of Object.entries(aliases)) {
      if (spec.startsWith(prefix)) return posix(join(target, spec.slice(prefix.length))).replace(/^\.\//, "").replace(/\/index$/, "")
    }
    if (spec.startsWith(".")) return moduleId(join(dirname(fromFile), spec))
    return null
  }

  const valueImports = new Map()
  const seeds = new Set()
  const collect = (file) => {
    let source
    try {
      source = readFileSync(file, "utf8")
    } catch {
      return // unreadable: skip rather than fail the whole lint run
    }
    const self = moduleId(file)
    const deps = new Set()
    for (const line of source.split("\n")) {
      const m = line.match(SOURCE_RE)
      if (!m || TYPE_ONLY_RE.test(line)) continue
      if (packages.includes(m[1])) seeds.add(self)
      else {
        const r = resolveSpecifier(m[1], file)
        if (r) deps.add(r)
      }
    }
    valueImports.set(self, deps)
  }
  const walkDir = (dir) => {
    let entries
    try {
      entries = readdirSync(dir, { withFileTypes: true })
    } catch {
      return
    }
    for (const e of entries) {
      const full = join(dir, e.name)
      if (e.isDirectory()) {
        if (!skipDirs.includes(e.name)) walkDir(full)
      } else if (sourceExt.some((x) => e.name.endsWith(`.${x}`)) && !/\.(test|spec)\./.test(e.name)) {
        // Tests never reach the production bundle, so a test importing the package taints nothing.
        collect(full)
      }
    }
  }
  for (const r of roots) walkDir(join(cwd, r))
  // Root-level entry files (instrumentation, middleware, server.ts) are not under any root dir and
  // would silently never enter the graph. Guard with existsSync so a renamed file is a no-op.
  for (const f of rootFiles) if (existsSync(join(cwd, f))) collect(join(cwd, f))

  // Modules outside `roots` that scanned modules import (i18n/, types/, ...) would never become
  // seeds, so taint would never start. Resolve whatever the walk missed, however deep.
  const scanned = new Set(valueImports.keys())
  const pending = [...valueImports.values()].flatMap((d) => [...d])
  while (pending.length) {
    const dep = pending.shift()
    if (scanned.has(dep)) continue
    scanned.add(dep)
    const full = sourceExt
      .flatMap((x) => [join(cwd, `${dep}.${x}`), join(cwd, dep, `index.${x}`)])
      .find(existsSync)
    if (!full) continue
    collect(full)
    pending.push(...(valueImports.get(dep) ?? []))
  }

  const tainted = new Set(seeds)
  for (let changed = true; changed; ) {
    changed = false
    for (const [mod, deps] of valueImports) {
      if (!tainted.has(mod) && [...deps].some((d) => tainted.has(d))) {
        tainted.add(mod)
        changed = true
      }
    }
  }
  const graph = { seeds, tainted, moduleId, resolveSpecifier }
  graphCache.set(key, graph)
  return graph
}

const importOnlyFrom = {
  meta: {
    type: "problem",
    schema: [
      {
        type: "object",
        properties: {
          packages: { type: "array", items: { type: "string" }, minItems: 1 },
          allowedDirs: { type: "array", items: { type: "string" }, minItems: 1 }, // module-id prefixes, e.g. ["workers/"]
          entrypointDirs: { type: "array", items: { type: "string" } }, // web-reachable by definition: ["app/", "components/"]
          entrypointModules: { type: "array", items: { type: "string" } }, // ["middleware", "instrumentation"]
          roots: { type: "array", items: { type: "string" } }, // dirs to scan
          rootFiles: { type: "array", items: { type: "string" } },
          skipDirs: { type: "array", items: { type: "string" } },
          aliases: { type: "object", additionalProperties: { type: "string" } }, // {"@/": "."}
          sourceExt: { type: "array", items: { type: "string" } },
          hint: { type: "string" }, // what to do instead, appended to the message
          cwd: { type: "string" },
        },
        required: ["packages", "allowedDirs"],
        additionalProperties: false,
      },
    ],
  },
  create(context) {
    const o = context.options[0]
    const cfg = {
      cwd: o.cwd ?? process.cwd(),
      packages: o.packages,
      roots: o.roots ?? ["src", "app", "lib"],
      rootFiles: o.rootFiles ?? [],
      skipDirs: o.skipDirs ?? ["node_modules", "dist", "build", ".next", "__tests__"],
      aliases: o.aliases ?? {},
      sourceExt: o.sourceExt ?? ["ts", "tsx", "js", "jsx", "mjs"],
    }
    const { seeds, tainted, moduleId, resolveSpecifier } = buildGraph(cfg)
    const filename = context.filename ?? context.getFilename()
    const self = moduleId(filename)
    const inAllowed = o.allowedDirs.some((d) => self.startsWith(d))
    const isEntrypoint =
      (o.entrypointDirs ?? []).some((d) => self.startsWith(d)) || (o.entrypointModules ?? []).includes(self)
    const hint = o.hint ?? "Import it only from the allowed directories (trigger the work there instead of importing it here)."
    const isSeed = seeds.has(self)

    const check = (node, source) => {
      if (typeof source !== "string") return
      if (cfg.packages.includes(source)) {
        // A direct import is only wrong where it is web-reachable by definition; elsewhere the
        // edge check on whoever imports THIS module covers it.
        if (inAllowed || !isEntrypoint) return
        context.report({ node, message: `"${source}" is restricted to ${o.allowedDirs.join(", ")} but this file is reachable from the entrypoints. ${hint}` })
        return
      }
      const resolved = resolveSpecifier(source, filename)
      if (!resolved || !tainted.has(resolved) || inAllowed || isSeed) return
      const how = seeds.has(resolved) ? `imports ${cfg.packages.join(", ")}` : `transitively depends on ${cfg.packages.join(", ")}`
      context.report({
        node,
        message: `"${resolved}" ${how}. Importing or re-exporting it from here is not allowed. ${hint} If you only need its types, use "import type", which the compiler erases.`,
      })
    }
    // `import { type X }` (all-inline type specifiers) is erased just like `import type`.
    const typeOnly = (n) =>
      n.importKind === "type" ||
      n.exportKind === "type" ||
      (n.specifiers?.length > 0 && n.specifiers.every((s) => s.importKind === "type" || s.exportKind === "type"))
    return {
      ImportDeclaration: (n) => !typeOnly(n) && check(n, n.source.value),
      // A barrel re-export is itself an import: this is what makes "a barrel dragged it in" impossible to repeat.
      ExportNamedDeclaration: (n) => n.source && !typeOnly(n) && check(n, n.source.value),
      ExportAllDeclaration: (n) => !typeOnly(n) && check(n, n.source.value),
      ImportExpression: (n) => n.source.type === "Literal" && check(n, n.source.value),
    }
  },
}

// ---------------------------------------------------------------------------------------------
// must-use-wrapper
// ---------------------------------------------------------------------------------------------
// Ban a raw call in favour of the house wrapper. Example: `Output.object(schema)` hands a raw
// schema to an LLM provider that rejects optional fields; the wrapper normalises it first.
// Typical targets: raw `fetch` (use the http client with timeouts), raw SDK constructors,
// `JSON.parse` on untrusted input, `new Date()` where a clock helper exists.
// The wrapper's own file is exempted with an ESLint `ignores`/override block, not an option.
const mustUseWrapper = {
  meta: {
    type: "problem",
    schema: [
      {
        type: "object",
        properties: {
          calls: {
            type: "array",
            minItems: 1,
            items: {
              type: "object",
              properties: {
                callee: { type: "string" }, // "Output.object" | "fetch" | "axios.get"
                message: { type: "string" },
                newExpression: { type: "boolean" }, // match `new X()` instead of `X()`
              },
              required: ["callee", "message"],
              additionalProperties: false,
            },
          },
        },
        required: ["calls"],
        additionalProperties: false,
      },
    ],
  },
  create(context) {
    const { calls } = context.options[0]
    const text = (c) => {
      if (c.type === "Identifier") return c.name
      if (c.type === "MemberExpression" && !c.computed && c.property.type === "Identifier") {
        const o = text(c.object)
        return o ? `${o}.${c.property.name}` : null
      }
      return null
    }
    const handler = (isNew) => (node) => {
      const t = text(node.callee)
      const hit = t && calls.find((c) => c.callee === t && Boolean(c.newExpression) === isNew)
      if (hit) context.report({ node, message: hit.message })
    }
    return { CallExpression: handler(false), NewExpression: handler(true) }
  },
}

// ---------------------------------------------------------------------------------------------
// registry-path-exists
// ---------------------------------------------------------------------------------------------
// Every string/template-literal value of the configured property inside a registry file must
// resolve to a real page/handler file. Editor-time twin of arch-tests/route-registry-exists.
// Default model is file-system routing (folders = segments, "(group)" invisible, "[param]" = "*").
// Report-only on what it can resolve statically; block-bodied builders are skipped.
const registryPathExists = {
  meta: {
    type: "problem",
    schema: [
      {
        type: "object",
        properties: {
          property: { type: "string" }, // "path"
          appRoot: { type: "string" }, // "app/[locale]"
          pageFiles: { type: "array", items: { type: "string" } },
          ignorePrefixes: { type: "array", items: { type: "string" } }, // ["/api/"]
          cwd: { type: "string" },
        },
        additionalProperties: false,
      },
    ],
  },
  create(context) {
    const o = context.options[0] ?? {}
    const prop = o.property ?? "path"
    const root = join(o.cwd ?? process.cwd(), o.appRoot ?? "app")
    const pageFiles = new Set(o.pageFiles ?? ["page.tsx", "page.ts", "route.ts"])
    const ignore = o.ignorePrefixes ?? ["/api/"]
    let patterns = null
    const scan = (dir, segs, out) => {
      let entries
      try {
        entries = readdirSync(dir, { withFileTypes: true })
      } catch {
        return
      }
      for (const e of entries) {
        if (e.isDirectory()) scan(join(dir, e.name), [...segs, e.name], out)
        else if (pageFiles.has(e.name)) {
          const url = segs.filter((s) => !/^\(.*\)$/.test(s)).map((s) => (/^\[.*\]$/.test(s) ? "*" : s))
          out.add(`/${url.join("/")}`)
        }
      }
    }
    const template = (t) =>
      t.quasis.map((q, i) => (q.value.cooked ?? "") + (i < t.expressions.length ? "*" : "")).join("")
    return {
      [`Property[key.name='${prop}']`](node) {
        let pattern = null
        const v = node.value
        if (v.type === "Literal" && typeof v.value === "string") pattern = v.value
        else if (v.type === "ArrowFunctionExpression" && v.body.type === "TemplateLiteral") pattern = template(v.body)
        else if (v.type === "TemplateLiteral") pattern = template(v)
        if (!pattern || ignore.some((p) => pattern.startsWith(p))) return
        if (!patterns) scan(root, [], (patterns = new Set()))
        if (!patterns.has(pattern)) {
          context.report({
            node,
            message: `No page under ${posix(rel(o.cwd ?? process.cwd(), root))} resolves to "${pattern}". Add the page, fix the path, or (if declared ahead of the page on purpose) silence with a comment saying why.`,
          })
        }
      },
    }
  },
}

export const localPlugin = {
  meta: { name: "local-rules" },
  rules: {
    "require-test-file": requireTestFile,
    "catch-must-report": catchMustReport,
    "import-only-from": importOnlyFrom,
    "must-use-wrapper": mustUseWrapper,
    "registry-path-exists": registryPathExists,
  },
}

export default localPlugin
