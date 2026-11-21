/**
 * WHAT: RuleTester tests for eslint.local-rules.mjs, using node:test. Requires `eslint` (>=9) to be
 * resolvable from the repo (it already is in any repo that uses ESLint); skips itself otherwise.
 * Run: node --test lint/   (or `node --test eslint.local-rules.test.mjs`)
 * Copy this file next to the plugin and add a case for every rule you enable with project options.
 */
import test from "node:test"
import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"

let RuleTester
try {
  ;({ RuleTester } = await import("eslint"))
} catch {
  test("eslint not installed -- skipped", { skip: true }, () => {})
}

if (RuleTester) {
  const { localPlugin } = await import("./eslint.local-rules.mjs")
  const rules = localPlugin.rules
  RuleTester.describe = (name, fn) => test(name, fn)
  RuleTester.it = (name, fn) => fn()
  RuleTester.itOnly = RuleTester.it
  const tester = new RuleTester({ languageOptions: { ecmaVersion: "latest", sourceType: "module" } })

  // ---- fixture project on disk
  const cwd = mkdtempSync(join(tmpdir(), "local-rules-"))
  const w = (p, c = "") => {
    mkdirSync(join(cwd, p, ".."), { recursive: true })
    writeFileSync(join(cwd, p), c)
  }
  w("lib/a.ts"); w("lib/a.test.ts")
  w("lib/b.ts")
  w("workers/img.ts", `import sharp from "sharp"`)
  w("lib/barrel.ts", `export * from "../workers/img"`)
  w("lib/pure.ts", `export const x = 1`)
  w("pages/home/page.tsx"); w("pages/(g)/items/[id]/page.tsx")

  tester.run("require-test-file", rules["require-test-file"], {
    valid: [
      { code: "", filename: join(cwd, "lib/a.ts"), options: [{ cwd }] },
      { code: "", filename: join(cwd, "lib/index.ts"), options: [{ cwd }] },
      { code: "", filename: join(cwd, "lib/b.test.ts"), options: [{ cwd }] },
    ],
    invalid: [{ code: "", filename: join(cwd, "lib/b.ts"), options: [{ cwd }], errors: [{ message: "Missing test file: lib/b.test.ts" }] }],
  })

  const rep = [{ reporters: ["captureException"], clientReporters: ["captureClientException"] }]
  tester.run("catch-must-report", rules["catch-must-report"], {
    valid: [
      { code: "try { f() } catch (e) { captureException(e) }", options: rep },
      { code: `"use client"; try { f() } catch (e) { captureClientException(e) }`, options: rep },
      { code: "p.catch((e) => { captureException(e) })", options: rep },
      { code: "p.catch(handle)", options: rep }, // named reference is not inspected
      { code: "try { f() } catch (e) { throw e }", options: [{ reporters: ["captureException"], allowRethrow: true }] },
    ],
    invalid: [
      { code: "try { f() } catch (e) { toast(e) }", options: rep, errors: 1 },
      { code: `"use client"; try { f() } catch (e) { captureException(e) }`, options: rep, errors: 1 }, // wrong reporter for client file
      { code: "p.catch((e) => toast(e))", options: rep, errors: 1 },
    ],
  })

  const iof = [{ packages: ["sharp"], allowedDirs: ["workers/"], roots: ["lib", "workers", "app"], entrypointDirs: ["app/"], cwd }]
  tester.run("import-only-from", rules["import-only-from"], {
    valid: [
      { code: `import sharp from "sharp"`, filename: join(cwd, "workers/other.ts"), options: iof },
      { code: `import { x } from "./pure"`, filename: join(cwd, "lib/c.ts"), options: iof },
      // `import type` needs a TS parser; add a case with @typescript-eslint/parser if you use TS.
    ],
    invalid: [
      { code: `import sharp from "sharp"`, filename: join(cwd, "app/page.ts"), options: iof, errors: 1 },
      { code: `import { y } from "./barrel"`, filename: join(cwd, "lib/c.ts"), options: iof, errors: 1 }, // taint travels through the barrel
      { code: `export * from "../workers/img"`, filename: join(cwd, "lib/c.ts"), options: iof, errors: 1 },
    ],
  })

  tester.run("must-use-wrapper", rules["must-use-wrapper"], {
    valid: [{ code: "wrapped(schema)", options: [{ calls: [{ callee: "Output.object", message: "m" }] }] }],
    invalid: [
      { code: "Output.object({})", options: [{ calls: [{ callee: "Output.object", message: "use wrapper" }] }], errors: [{ message: "use wrapper" }] },
      { code: "new Foo()", options: [{ calls: [{ callee: "Foo", message: "m", newExpression: true }] }], errors: 1 },
    ],
  })

  const rpe = [{ appRoot: "pages", cwd }]
  tester.run("registry-path-exists", rules["registry-path-exists"], {
    valid: [
      { code: `const r = { home: { path: "/home" }, item: { path: (id) => \`/items/\${id}\` }, api: { path: "/api/x" } }`, options: rpe },
    ],
    invalid: [{ code: `const r = { ghost: { path: "/ghost" } }`, options: rpe, errors: 1 }],
  })
}
