# Third-party material in the repo-bootstrap skill

This file lists every part of `skills/repo-bootstrap/` that is adapted from, or draws on, someone
else's work. It sits inside the skill folder on purpose, so it travels with every install.

When `/repo-bootstrap` writes one of these templates into your repository, it keeps the
attribution comment in the generated file (see `templates/README.md`).

| File | Source | License | What we took | Changes |
|---|---|---|---|---|
| `templates/skills/plan-feature/references/diagram-picker.md` | "Mermaid Studio" by Felipe Rodrigues / Tech Leads Club, [`tech-leads-club/agent-skills`](https://github.com/tech-leads-club/agent-skills), `packages/skills-catalog/skills/(tooling)/mermaid-studio/SKILL.md` (v1.0.1) | [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) | The "question → diagram type" selection approach and the density limits | Reorganized around engineering questions, reduced to the diagram types used here, theming rules removed. Our wording |
| `templates/skills/debugging/SKILL.md` | `skills/debugging-and-error-recovery` in [`addyosmani/agent-skills`](https://github.com/addyosmani/agent-skills), © 2025 Addy Osmani | MIT (text below) | The stop-the-line sequence and the triage structure | Shortened and rewritten as a template; repo-specific evidence table, hazard search and "mitigation is not root cause" added |
| `templates/skills/interview-me/SKILL.md` | `skills/interview-me` in [`addyosmani/agent-skills`](https://github.com/addyosmani/agent-skills), © 2025 Addy Osmani | MIT (text below) | The skill's method and much of its structure | Adapted as a template with repo-specific probes |
| `templates/skills/plan-feature/references/evidence-and-spikes.md` | Ideas from [`open-gsd/gsd-core`](https://github.com/open-gsd/gsd-core), [`github/spec-kit`](https://github.com/github/spec-kit) and [`bmad-code-org/BMAD-METHOD`](https://github.com/bmad-code-org/BMAD-METHOD) | MIT (each project) | Ideas only: the spike shape and evidence tagging | No text copied; credited as a courtesy |

Everything else in the skill is original to this project and released under the MIT License
(`LICENSE` at the root of https://github.com/rwxce/agentic-repo-kit). The `rulesync` schema URLs in
`templates/rulesync/` and `references/rulesync.md` point at
[`dyoshikawa/rulesync`](https://github.com/dyoshikawa/rulesync); nothing from it is copied.

## CC BY 4.0 notice (Mermaid Studio)

"Mermaid Studio" by Felipe Rodrigues / Tech Leads Club is licensed under the Creative Commons
Attribution 4.0 International License: <https://creativecommons.org/licenses/by/4.0/>. Source:
<https://github.com/tech-leads-club/agent-skills>. Our `diagram-picker.md` is an adaptation (changes
listed in the table above) and is not endorsed by the original authors.

## MIT License (addyosmani/agent-skills)

```text
MIT License

Copyright (c) 2025 Addy Osmani

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```
