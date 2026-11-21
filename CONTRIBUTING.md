# Contributing

Thanks for helping. This kit is a Claude Code skill (`skills/repo-bootstrap/`) plus a static site
(`site/`). Everything it proposes is meant to come from a real failure, so the most useful
contributions explain the failure that motivates them.

## Proposing a change

- **Small fixes** (typos, a broken link, a failing test, a clear bug in one template): open a pull
  request to `main` directly.
- **Big changes** (a new template family, a new phase in the skill, a change to how the proposal is
  built, anything that touches many files): open an issue first and describe the problem, the repo
  signal that would justify the change, and the failure it prevents. Agree on the approach before
  writing the code.
- Keep one topic per pull request, and fill in the pull request template.

## Commit messages

The history uses [Conventional Commits](https://www.conventionalcommits.org/) in English:
`type(scope): summary`, for example `fix(site): one-line hero eyebrow` or
`feat: loop roadmap in plan-feature`. Types in use: `feat`, `fix`, `docs`, `chore`. The scope is
optional (`site`, `hooks`, `ci`…). Explain the why in the body when it is not obvious.

## Running the checks

The script templates have no dependencies; you only need a recent Node.js.

```bash
# Template tests (hooks, CI scripts, automations, lint rules) with Node's built-in runner
node --test skills/repo-bootstrap/templates/**/*.test.mjs

# Skill lint on the shipped skill (frontmatter, name, description)
node skills/repo-bootstrap/templates/automations/check-skills.mjs skills
```

The skill lint only applies to `skills/`: files under `templates/skills/` start with a template
header comment instead of frontmatter, by design.

For site changes, open `site/index.html` (and `site/ca/`, `site/es/`) through a local static server
and check 375, 768 and 1440 px. Apply layout and style changes to all three languages.

## Templates and generated files

- Every template starts with a header comment: what it is, the repo signal that justifies it, and
  what to fill. Keep that format (see `skills/repo-bootstrap/templates/README.md`).
- Templates must not ship tool-specific or company-specific defaults; use placeholders or config
  constants.
- A template with logic gets a `node:test` suite next to it.
- Update `CHANGELOG.md` under `## Unreleased` for anything a user of the kit would notice.

## Attribution

- Never remove an attribution comment (`<!-- Adapted from … -->`, `<!-- … draw on ideas from … -->`)
  or a license header from a vendored file.
- If you adapt text, code or a template from someone else, check its license first, add the credit
  comment inline and add a row to `skills/repo-bootstrap/THIRD_PARTY.md` (skill) or
  `THIRD_PARTY.md` (site and repo files), with the source, the license and what you changed.
  CC BY material also needs the license link and a note of the changes.
- Do not add material whose license does not allow redistribution under MIT-compatible terms.

## License of contributions

The project is under the [MIT License](LICENSE). By opening a pull request you agree that your
contribution is licensed under the same terms. There is no CLA and no DCO sign-off to add.

## Conduct and security

Participation follows the [Code of Conduct](CODE_OF_CONDUCT.md). Report vulnerabilities privately
as described in [SECURITY.md](SECURITY.md), never in a public issue.
