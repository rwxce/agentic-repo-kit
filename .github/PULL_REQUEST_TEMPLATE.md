## What

<!-- What changes, in one or two sentences. -->

## Why

<!-- The failure or need behind it. Link the issue for big changes. -->

## Evidence

<!-- Test output, screenshots (375 / 768 / 1440 px for site changes, all three languages), or a run of the skill on a repo. -->

## Checklist

- [ ] `node --test skills/repo-bootstrap/templates/**/*.test.mjs` passes
- [ ] `node skills/repo-bootstrap/templates/automations/check-skills.mjs skills` passes
- [ ] `CHANGELOG.md` updated under `## Unreleased` (if users would notice)
- [ ] Attribution kept; new third-party material credited inline and in `THIRD_PARTY.md`
- [ ] Site changes applied to en, ca and es
