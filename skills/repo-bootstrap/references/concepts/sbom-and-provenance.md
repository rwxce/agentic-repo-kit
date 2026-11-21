# SBOM and build provenance

**Origin: external.** Established practice from the canonical source below; not yet proven in the project this kit came from. Treat its checks as a proposal to validate.

## Problem

When a vulnerable library is announced, nobody can say which deployed builds contain it; and consumers of your packages or images cannot verify they were built from your source by your pipeline.

## Principle

Generate a software bill of materials for every release artifact and keep it with the release. Produce signed provenance that states which source, workflow and inputs built the artifact, and verify it before deploy or install.

## When it applies

- Published packages, container images, mobile binaries; customers or regulations asking for an SBOM.

## When it doesn't

- Internal prototypes; for a small web app, a lockfile plus vulnerability scanning covers most of the value.

## Typical mistakes

- An SBOM generated from the manifest instead of the built artifact.
- Provenance generated but never verified.
- Long-lived publish tokens instead of OIDC trusted publishing.

## The check that verifies it

The release workflow fails without an SBOM attached; provenance is verified in the deploy or install step.

## Canonical source

- [SLSA specification: Provenance](https://slsa.dev/spec/v1.0/provenance)
- [CycloneDX specification overview](https://cyclonedx.org/specification/overview/)
- [npm Docs: Generating provenance statements](https://docs.npmjs.com/generating-provenance-statements)

## Variants per stack

- **npm:** `npm publish --provenance` from CI with trusted publishing.
- **Containers:** Syft for SBOMs, cosign / Sigstore for signatures and attestations.
- **GitHub:** artifact attestations; SLSA GitHub generator.
- **Formats:** CycloneDX or SPDX.

## Related

[supply-chain-hygiene](supply-chain-hygiene.md) · [gated-release-pipeline](gated-release-pipeline.md)
