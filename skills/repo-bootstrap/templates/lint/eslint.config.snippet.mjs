/**
 * WHAT: Copy-paste blocks for an ESLint flat config (eslint.config.mjs) that turn architecture into
 * lint errors: layer graph, no cycles, SDK gateways, logger-only output, scoped local rules.
 * REPO SIGNAL: a layered folder structure (api -> services -> data), a wrapper around each vendor
 * SDK, a logger/monitoring helper, repeated review comments about the same shortcut.
 * CONFIGURE: replace every <placeholder>; delete blocks you cannot justify. Start each new block at
 * "warn", flip to "error" when the repo is clean (README.md, "Rollout"). NOT a drop-in file: it is
 * a menu. Required packages: eslint-plugin-boundaries, eslint-plugin-import-x (+ resolver).
 */
import { defineConfig } from "eslint/config"
import pluginBoundaries from "eslint-plugin-boundaries"
import pluginImportX from "eslint-plugin-import-x"
import { localPlugin } from "./eslint.local-rules.mjs"

const TESTS = ["**/*.test.{ts,tsx}", "**/__tests__/**"]

export default defineConfig([
  // 1. Layer graph ------------------------------------------------------------------------------
  // Declare each layer once, then say what it MAY import. `default: "disallow"` is the point:
  // a new layer or an unexpected edge fails until someone makes a decision, instead of the
  // dependency graph silently growing. Tests are ignored (they legitimately cross layers).
  {
    ignores: TESTS,
    plugins: { boundaries: pluginBoundaries },
    settings: {
      "import/resolver": { typescript: { alwaysTryTypes: true } },
      "boundaries/elements": [
        { type: "entry", pattern: "<src/api/**>" }, //          HTTP handlers / pages
        { type: "service", pattern: "<src/services/**>" }, //   business logic
        { type: "data", pattern: "<src/db/**>" }, //            persistence
        { type: "shared", pattern: "<src/shared/**>" }, //      pure helpers, types
      ],
    },
    rules: {
      "boundaries/dependencies": [
        "error",
        {
          default: "disallow",
          rules: [
            { from: { type: "entry" }, allow: { to: { type: ["service", "shared"] } } },
            { from: { type: "service" }, allow: { to: { type: ["data", "shared"] } } },
            { from: { type: "data" }, allow: { to: { type: ["shared"] } } },
            // Explicit "never" with a message beats a bare default-deny for the edges that tempt people.
            { from: { type: "service" }, disallow: { to: { type: "entry" } }, message: "Services are called by entries, never the other way round." },
            // Type-only edges carry no runtime coupling: allow them narrowly and say why.
            { from: { type: "shared" }, dependency: { kind: "type" }, allow: { to: { type: "service" } } },
          ],
        },
      ],
    },
  },

  // 2. No cycles -------------------------------------------------------------------------------
  // Cycles are the first thing a fast-moving agent creates and the last thing it can diagnose.
  {
    files: ["<src>/**/*.{ts,tsx}"],
    plugins: { "import-x": pluginImportX },
    settings: { "import-x/resolver": { typescript: { alwaysTryTypes: true } } },
    rules: { "import-x/no-cycle": ["error", { maxDepth: 10 }], "import-x/no-duplicates": "error" },
  },

  // 3. SDK gateways ----------------------------------------------------------------------------
  // One module owns each vendor SDK; everyone else uses its helpers. Flat config does NOT merge
  // `no-restricted-imports` across overlapping blocks: the last matching block wins, so give each
  // file exactly one block (split by directory, exclude the gateway itself with `ignores`).
  {
    files: ["<src>/**/*.ts"],
    ignores: ["<src/monitoring/analytics.ts>", ...TESTS], // the gateway owns the SDK
    rules: {
      "no-restricted-imports": [
        "error",
        { name: "<vendor-sdk>", message: "Don't import <vendor-sdk> directly. <src/monitoring/analytics.ts> owns the client; call its helpers." },
        { name: "<llm-sdk>", message: "<llm-sdk> may only be imported from <src/ai/pipelines>." },
      ],
    },
  },

  // 4. Output goes through the logger ----------------------------------------------------------
  // console.* bypasses redaction, levels and monitoring. Exempt the logger itself and CLI scripts.
  {
    files: ["<src>/**/*.{ts,tsx}"],
    ignores: ["<src/logger.ts>", "<src/monitoring/reporter.ts>", "scripts/**", ...TESTS],
    rules: { "no-console": "error" },
  },

  // 5. Hard-coded paths -> registry ------------------------------------------------------------
  // Locale/route prefixes written as string literals bypass the routes registry. Build the locale
  // list from the translation files so adding a locale needs no lint change.
  {
    files: ["<src>/**/*.{ts,tsx}"],
    ignores: TESTS,
    rules: {
      "no-restricted-syntax": [
        "error",
        { selector: "Literal[value=/^\\/(en|es)\\//]", message: "Do not hardcode locale-prefixed paths. Use routes.<name>.href(locale)." },
      ],
    },
  },

  // 6. Local rules, scoped (see README.md for each rule's signal) -------------------------------
  { files: ["<src/services/**/*.ts>", "<src/usecases/**/*.ts>"], ignores: TESTS,
    plugins: { local: localPlugin }, rules: { "local/require-test-file": ["warn", { extensions: ["ts"] }] } },

  { files: ["<src/ui/**/*.{ts,tsx}>", "<src/api/**/*.ts>"], ignores: TESTS,
    plugins: { local: localPlugin },
    rules: { "local/catch-must-report": ["warn", { reporters: ["captureException"], clientReporters: ["captureClientException"] }] } },

  // Heavy/native deps live only under <workers/>. Applies everywhere except tests.
  { files: ["**/*.{ts,tsx}"], ignores: TESTS, plugins: { local: localPlugin },
    rules: { "local/import-only-from": ["error", {
      packages: ["<native-pkg-1>", "<native-pkg-2>"],
      allowedDirs: ["<workers/>"],
      entrypointDirs: ["app/", "components/"],           // web-reachable by definition
      entrypointModules: ["middleware", "instrumentation"],
      roots: ["app", "components", "lib", "<workers>"],
      rootFiles: ["middleware.ts", "instrumentation.ts"], // entry files outside `roots`
      aliases: { "@/": "." },
      hint: "Move the work to <workers/> and trigger it from here.",
    }] } },

  // Wrapper law. The wrapper's own file is exempt via `ignores`, not via an option.
  { files: ["<src>/**/*.ts"], ignores: ["<src/ai/shared/track.ts>", ...TESTS], plugins: { local: localPlugin },
    rules: { "local/must-use-wrapper": ["error", { calls: [
      { callee: "Output.object", message: "Use trackedGenerateObject({ schema }) instead of Output.object(): a raw schema is rejected by strict-mode providers." },
    ] }] } },

  { files: ["<src/routes.ts>"], plugins: { local: localPlugin },
    rules: { "local/registry-path-exists": ["warn", { appRoot: "<app/[locale]>", property: "path", ignorePrefixes: ["/api/"] }] } },

  // 7. Generated and vendored output is never linted ---------------------------------------------
  { ignores: ["<.next/**>", "<dist/**>", ".claude/**", ".cursor/**", ".agents/**", ".context/**"] },
])
