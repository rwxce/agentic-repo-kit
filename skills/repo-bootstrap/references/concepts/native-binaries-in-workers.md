# Native and heavy work only in workers

**Origin: proven.** Enforced in the production project this kit was distilled from (generalized, project names removed).

## Problem

Packages with prebuilt native binaries (image, PDF, font rendering) fail to load in a serverless web bundle. One import, even through a barrel re-export, makes an unrelated route return 500. Assets read from disk at run time break the same way when the bundler does not ship them.

## Principle

Native and heavy work runs in a separate worker runtime. A lint rule follows imports transitively and fails when a web-reachable module reaches a native package. Files read at run time are declared to the worker bundler. CI builds the real worker bundle.

## When it applies

- Serverless or edge web deploys plus any dependency with native binaries or large CPU/RAM needs.

## When it doesn't

- A long-running server on a known OS and architecture, where native modules load normally.

## Typical mistakes

- Re-exporting an image module from a barrel file used by web code.
- A lint rule that checks direct imports only.
- Assuming the lint rule sees the bundle: dynamic imports and packages that pull native deps themselves escape it.

## The check that verifies it

A transitive import lint rule (with `import type` exempt); a CI step that builds the worker bundle and runs one real render.

## Canonical source

- [sharp documentation: Installation (cross-platform binaries)](https://sharp.pixelplumbing.com/install)

## Variants per stack

- **Node workers:** Trigger.dev, a container job, AWS Lambda with a matching architecture layer.
- **Python:** wheels built for the target platform (`manylinux`); worker images instead of serverless functions.
- **Lint:** a local ESLint rule over the module graph; `dependency-cruiser` forbidden rules.

## Related

[layer-boundaries-as-lint](layer-boundaries-as-lint.md) · [presigned-upload-to-worker](presigned-upload-to-worker.md)
