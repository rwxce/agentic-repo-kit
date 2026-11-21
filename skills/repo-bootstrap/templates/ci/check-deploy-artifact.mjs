#!/usr/bin/env node
/**
 * WHAT: Builds the real artifact a deploy ships, in CI, with the deploy tool's own bundler and
 *   options, and optionally runs a smoke entry from the built output. Two failure classes it catches
 *   that typecheck, lint and unit tests miss:
 *   1. **Bundle check** (always): an import that does not resolve once bundled, e.g. a gitignored
 *      generated file that only exists after codegen, or a path alias the deploy bundler ignores.
 *   2. **Built smoke** (when CONFIG.smoke is set): a package that works from node_modules but breaks
 *      once bundled, e.g. one that reads a `.wasm`/font/data file next to its own JS through
 *      `__dirname`, which becomes the bundle dir (ENOENT on the first real call in production).
 *      The smoke entry exercises that code path with no network or secrets and exits non-zero on
 *      failure.
 * REPO SIGNAL: a deploy step that bundles code itself (a background-job/worker platform, serverless
 *   functions, an edge runtime) whose "dry run" needs a login or is unavailable in CI; native or
 *   file-reading packages in that bundle; or an incident where the deploy built green and the
 *   first run crashed.
 * CONFIGURE: CONFIG below. Read the deploy tool's own build code (its esbuild/rollup options,
 *   `external` list, injected shims, resolve conditions) and copy them here instead of guessing:
 *   the check is only as real as those options. Resolve the bundler from the deploy tool's own
 *   dependency (`bundlerFrom`) so the version matches. Wire as `check:deploy-artifact` in CI after
 *   codegen and before tests.
 *   Example of a smoke entry (marked as such): a worker that renders an image with a WASM-backed
 *   library imports that library, renders one tiny image from a font in the repo and asserts the
 *   output is non-empty.
 * Usage: node scripts/check-deploy-artifact.mjs    exit 0 ok, 1 broken
 */
import { execFileSync } from "node:child_process"
import { existsSync, readdirSync, readFileSync, rmSync } from "node:fs"
import { createRequire } from "node:module"
import { join, relative } from "node:path"
import { pathToFileURL } from "node:url"

// ---------------------------------------------------------------------------------------------
// CONFIG — edit for your repo
// ---------------------------------------------------------------------------------------------
export const CONFIG = {
  /** Directories whose source files are the deploy's entry points (e.g. ["<worker-dir>"]). */
  entryDirs: ["<worker-dir>"],
  /** Entry file pattern and the files to leave out (tests, fixtures). */
  include: /\.(ts|tsx|js|mjs)$/,
  exclude: /\.(test|spec)\.[cm]?[jt]sx?$/,
  /**
   * Package whose own dependency provides the bundler, so the version is the deploy's
   * (e.g. "<deploy-cli-package>/package.json"). null = resolve "esbuild" from the repo.
   */
  bundlerFrom: null,
  /** Path-alias prefixes resolved by the tsconfig (kept internal, never externalised). */
  aliasPrefixes: ["@/"],
  /** tsconfig the deploy honours (aliases), relative to the repo root; skipped when absent. null = none. */
  tsconfig: "tsconfig.json",
  /**
   * Bundle check: npm packages stay external (the deploy installs them), relative and alias
   * imports must resolve. Options merged into the bundler call.
   */
  bundleOptions: { platform: "node", format: "esm" },
  /**
   * Built smoke, or null to skip. `entry` is bundled with `options` (copy the deploy tool's real
   * build options here) and run with node from inside the repo so external packages resolve from
   * node_modules, as in the deployed image. `externals` lists the packages the deploy keeps
   * external: an array, or { file, pattern } to read them from the deploy config so the check never
   * drifts from it.
   */
  smoke: null,
  // smoke: {
  //   entry: "scripts/deploy-artifact-smoke/entry.ts",
  //   outdir: "node_modules/.cache/deploy-artifact-smoke",
  //   externals: { file: "<deploy-config-file>", pattern: /external:\s*\[([^\]]*)\]/ },
  //   options: { platform: "node", format: "esm", splitting: true, target: ["node20"], loader: { ".wasm": "copy" }, outExtension: { ".js": ".mjs" } },
  // },
}

/** Every entry file under `dir` matching include and not exclude, sorted. */
export function collectEntries(dir, { include = CONFIG.include, exclude = CONFIG.exclude } = {}) {
  if (!existsSync(dir)) return []
  return readdirSync(dir, { withFileTypes: true })
    .flatMap((entry) => {
      const path = join(dir, entry.name)
      if (entry.isDirectory()) return entry.name === "node_modules" ? [] : collectEntries(path, { include, exclude })
      return include.test(entry.name) && !exclude.test(entry.name) ? [path] : []
    })
    .sort()
}

/**
 * Whether a specifier is an npm package to keep external. `packages: "external"` would also skip
 * path aliases (it treats every non-relative specifier as a package), so this decides by hand.
 */
export function isExternalPackage(specifier, kind, aliasPrefixes = CONFIG.aliasPrefixes) {
  if (kind === "entry-point") return false
  if (specifier.startsWith(".") || specifier.startsWith("/")) return false
  return !aliasPrefixes.some((prefix) => specifier.startsWith(prefix))
}

/** The quoted strings inside the first capture group of `pattern` in a deploy config file. */
export function parseExternals(source, pattern = /external:\s*\[([^\]]*)\]/) {
  const match = pattern.exec(source)
  if (!match) throw new Error(`no externals list matching ${pattern} in the deploy config`)
  return [...match[1].matchAll(/["']([^"']+)["']/g)].map((m) => m[1])
}

/** One line per bundler error, `file:line: text`. */
export function formatBuildErrors(error) {
  const lines = error?.errors?.map((e) => `${e.location?.file ?? "?"}:${e.location?.line ?? "?"}: ${e.text}`)
  return lines?.length ? lines : [String(error?.message ?? error)]
}

/** The most useful line of a crashed smoke run's stderr. */
export function firstErrorLine(stderr) {
  const lines = String(stderr ?? "").split("\n").map((l) => l.trim()).filter(Boolean)
  return lines.find((l) => /Error|ENOENT|Aborted|Cannot find/.test(l)) ?? lines[0] ?? "smoke entry exited non-zero"
}

function loadBundler(root) {
  const fromRepo = createRequire(join(root, "package.json"))
  const resolver = CONFIG.bundlerFrom ? createRequire(fromRepo.resolve(CONFIG.bundlerFrom)) : fromRepo
  return resolver("esbuild")
}

async function bundleCheck(root, build) {
  const entryPoints = CONFIG.entryDirs.flatMap((d) => collectEntries(join(root, d)))
  if (!entryPoints.length) {
    console.error(`Deploy artifact check: no entry points under ${CONFIG.entryDirs.join(", ")}. Fix CONFIG.entryDirs.`)
    process.exit(1)
  }
  try {
    await build({
      ...CONFIG.bundleOptions,
      entryPoints,
      bundle: true,
      write: false,
      outdir: "out",
      absWorkingDir: root,
      plugins: [
        {
          name: "external-npm-packages",
          setup(b) {
            b.onResolve({ filter: /^[^./]/ }, (args) => (isExternalPackage(args.path, args.kind) ? { path: args.path, external: true } : undefined))
          },
        },
      ],
      ...(CONFIG.tsconfig && existsSync(join(root, CONFIG.tsconfig)) ? { tsconfig: join(root, CONFIG.tsconfig) } : {}),
      logLevel: "silent",
    })
  } catch (error) {
    console.error(`Deploy artifact bundle check failed:\n${formatBuildErrors(error).join("\n")}`)
    process.exit(1)
  }
  console.log(`Deploy artifact bundle check passed (${entryPoints.length} entry points).`)
}

async function smokeCheck(root, build) {
  const { entry, outdir: out, externals, options } = CONFIG.smoke
  const external = Array.isArray(externals) ? externals : parseExternals(readFileSync(join(root, externals.file), "utf8"), externals.pattern)
  const outdir = join(root, out)
  rmSync(outdir, { recursive: true, force: true })
  await build({ ...options, entryPoints: [join(root, entry)], outdir, absWorkingDir: root, bundle: true, write: true, external, logLevel: "warning" })
  const built = readdirSync(outdir).find((f) => /^entry\.[cm]?js$/.test(f))
  if (!built) {
    console.error(`Deploy artifact smoke: no built entry in ${relative(root, outdir)}.`)
    process.exit(1)
  }
  try {
    execFileSync(process.execPath, [join(outdir, built)], { cwd: root, stdio: ["ignore", "inherit", "pipe"] })
  } catch (error) {
    console.error(`Deploy artifact smoke failed with external = ${JSON.stringify(external)}:\n${firstErrorLine(error.stderr)}`)
    process.exit(1)
  }
}

async function main() {
  const root = process.cwd()
  let build
  try {
    ;({ build } = loadBundler(root))
  } catch {
    console.error("Deploy artifact check: esbuild not found. Set CONFIG.bundlerFrom to the deploy tool's package, or install esbuild.")
    process.exit(1)
  }
  await bundleCheck(root, build)
  if (CONFIG.smoke) await smokeCheck(root, build)
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await main()
