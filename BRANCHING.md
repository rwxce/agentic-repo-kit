# Branches and releases

Two long-lived branches:

| Branch | Holds | Who writes to it |
|---|---|---|
| `dev` (default) | Every commit: features, fixes, docs | Pull requests |
| `main` | One commit per release (`release: vX.Y.Z`), each tagged | Only the Release workflow |

- Open pull requests against `dev`. Never against `main`.
- `main` is what users install and what the site at GitHub Pages shows, so it only moves on a
  release. Its history reads as a list of versions; the detail of each one is on `dev` and in
  `CHANGELOG.md`.

## Cutting a release

1. On `dev`, rename the `## Unreleased` section of `CHANGELOG.md` to `## X.Y.Z — YYYY-MM-DD`
   (through a pull request, like any change).
2. Run **Actions → Release → Run workflow** on `dev` with the version `X.Y.Z`.

The workflow (`.github/workflows/release.yml`) refuses a version without its changelog section or
whose tag already exists. It then:
- creates one commit on `main` whose content is exactly `dev`'s, with the previous release as its
  parent;
- tags it `vX.Y.Z`;
- publishes the GitHub release with that changelog section;
- redeploys the site from `main`.

## Fixing a release

There are no hotfix branches. Fix on `dev` and cut a patch release (`X.Y.Z+1`). Since each
release copies `dev`'s whole content, nothing fixed on `dev` can be lost from `main`.
