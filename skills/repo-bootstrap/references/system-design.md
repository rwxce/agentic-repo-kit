# Phase 1b — system design

Runs after Phase 1 (understand) and before the proposal. It answers one question: **what is the
design, and which checks will hold it in place?** A new project gets a designed architecture with
an ADR per decision; an existing one gets its real design written down, its risks listed, and a
migration only when evidence demands it.

Rules that apply to the whole phase:

- **Read-only until "go".** Drafts go to `.context/repo-bootstrap/system-design.md` and
  `.context/repo-bootstrap/adr/`. They land in the repo (`docs/architecture/system-design.md`,
  `docs/adr/NNNN-<slug>.md`) only in Phase 5, after the user's "go".
- **Small methods chosen by risk, never a checklist.** A method enters only if it can change a
  decision. A local CLI does not get a threat model because a SaaS would.
- **Checkable criteria only.** Every comparison uses values someone else can re-check with a
  command or an official page. Never stars, download counts as a quality proxy, scores out of 10
  or weighted totals.
- **Every decision names the check that enforces it** (lint rule, architecture test, CI step,
  dependency check, contract test). A decision no check can hold is marked `review-only`, with
  the reason.
- **Evidence tags** on every claim the design rests on: `assumed` · `read` · `verified` ·
  `refuted` · `accepted` (the user takes the risk). Docs and READMEs reach `read`, never
  `verified`.

## Step 0 — size the design by risk

Pick the depth from the signals found in Phase 1, then pick methods from the table below. Write one
line per method: `Method: <name> — <the question it answers here>`, or `Methods: none (<why>)`.

| Depth | When | Output |
|---|---|---|
| **Light** | One runtime, no network service of its own, no money, no personal data, one maintainer or a small team (CLIs, libraries, local tools, static sites) | One page: brief, observable requirements, the 1-3 decisions that are still open, each with its check. No diagrams unless one answers a question |
| **Standard** | A service with users, or one external integration, or one sensitive domain | The full path below; C4 level 1; risks with the methods they trigger |
| **Deep** | Several sensitive domains (money, auth, personal data, publishing), several runtimes or trust boundaries, regulated data | The full path plus C4 level 2, threat modeling, FMEA on the money and job paths |

| If the project… | Method | Cheapest useful form | Skip when |
|---|---|---|---|
| Has any non-trivial risk | Risk-driven design | Top risks, the technique for each, residual risk | Never skip; one line when light |
| Depends on unproven technology | Spike | Spike card, run only with the user's OK for that spike id | The answer is in docs plus code you can read |
| Has states or error behaviour | EARS requirements + state diagram | `While… / When… / If…, then…` lines | Still exploring the problem |
| Stores data | Entity relationship model | `erDiagram` with cardinality and the indexes reads need | No persistent data |
| Has a service or trust boundary | C4 levels 1-2 | Context and containers only | Single process, no network surface |
| Touches auth, payments, webhooks, tenancy | Threat modeling | What are we building, what can go wrong, what do we do, did it work; STRIDE as prompts | No trust boundary crosses the system |
| Handles personal data | LINDDUN GO | Relevant privacy threats, next to the compliance check | No personal data |
| Has billing, migrations or background jobs | Lightweight FMEA | Failure, effect, detection, recovery; partial failure, retries, idempotency, concurrency | Reversible, stateless work |
| Moves data between systems | Data flow | Source, transformations, storage, consumers | Single-module data |
| Has a property that can regress | Fitness function | One test or CI check per property | One-off properties |

Left out on purpose: UML class diagrams, full arc42 documents, formal DDD aggregates. Use one only
if a specific question needs it. A model that only restates the text is dropped.

## New project path

### 1. Brief
Five lines, confirmed by the user: who uses it · the problem · what success looks like (a number
or an observable event) · the binding constraint (budget, deadline, team skills, platform,
regulation) · non-goals.

### 2. Observable requirements
Each requirement gets an id, an EARS sentence and **how it will be observed** (a test, a metric, a
manual step on a real device). Quality attributes carry numbers: p95 latency, offline behaviour,
monthly cost ceiling at launch and at 10x, data residency, supported OS versions. A requirement
nobody can observe is rewritten or dropped.

### 3. Context and trust boundaries
- C4 level 1 (users, the system, external systems); level 2 only at standard depth with more than
  one container, or at deep depth.
- One row per trust boundary: what crosses it · who authenticates · what validates the input ·
  what happens on replay or forgery. Webhooks, OAuth callbacks, file uploads, mobile clients and
  public APIs are boundaries.

### 4. Risks and hypotheses
- Top risks, most damaging first, each with the method that addresses it.
- Hypothesis gate: list the hypotheses that would change the design if false
  (`Id | Hypothesis | If false | Evidence tag | Next step`). No schema, pins, file lists or roadmap
  may rest on a critical hypothesis that is still `assumed` or `read`. Resolve it by reading, by
  a spike the user authorizes by id, or by the user accepting the risk.

### 5. Alternatives with checkable criteria
For each decision that matters (language/framework, data store, auth, billing, hosting, sync
model…), compare **2-4 alternatives**, including at least one the user did not name. Score each on
these criteria, and write the value and the source, not a grade:

| Criterion | What to record | How to check it |
|---|---|---|
| Maintenance activity | Date of the last release; releases in the last 12 months; whether the last few issues or PRs got a maintainer reply | Registry metadata (`npm view <pkg> time --json`, PyPI JSON, crates.io, pub.dev, Maven Central); `gh api repos/<o>/<r>/releases`; [deps.dev](https://deps.dev/). OpenSSF [Scorecard](https://scorecard.dev/): quote individual check results (e.g. `Maintained`), never the aggregate score |
| License | SPDX id at the exact version; compatible with how the project ships (SaaS, app store, redistributed binary, library) | The package manifest at that version; [SPDX License List](https://spdx.org/licenses/) |
| CVEs of the exact version | Known advisories for that version; fixed-in version; unfixed count | [OSV](https://osv.dev/) query for package + ecosystem + version (`POST https://api.osv.dev/v1/query`); ecosystem audit (`npm audit`, `pip-audit`, `cargo audit`, `osv-scanner`) |
| Breaking changes | Major releases in the last 24 months; migration guide present; deprecations announced for what you would use | Official changelog or release notes |
| Modelled cost | A formula with the brief's volumes, at launch and at 10x: `units × price` per month, with the pricing page and the date read | Official pricing page; free-tier limits stated as limits, not as "free" |
| Lock-in | Proprietary APIs you would call; data export format; standard protocol or not; exit cost in PR-sized units | Official docs for export, self-hosting and protocol support |
| Fit | Which requirement ids it satisfies, each with its evidence tag | The requirement table from step 2 |

How to decide: first **eliminate** any alternative that fails a hard constraint (unfixed CVE in
the version you need, incompatible license, a requirement it cannot meet, cost above the ceiling).
Then compare the survivors in prose, naming the requirement or risk behind each trade-off. If two
survivors are equivalent, pick the one with the lower lock-in and say so.

### 6. ADR per decision
One ADR per decision from step 5 (`templates/adr.md`), status `proposed`. Each ADR fills
**Enforced by** with the check that keeps the decision true: an import-boundary lint rule, an
architecture test, a dependency allowlist, an OSV scan in CI, a contract test, a cost alert. These
rows feed the Phase 4 proposal directly; a check that does not exist yet is proposed there.

### 7. Present and wait for "go"
Show the system design draft (`templates/system-design.md`) and the ADRs. Corrections go into a
`## Clarifications` section as in Phase 4. Nothing moves to the proposal until the user says "go"
on the design; ADRs switch to `accepted` then.

## Existing project path

### 1. Document the real design
Reuse Phase 1's lenses; do not re-run them. Lens 1 (stack and infrastructure) gives the
containers, data stores and hosting; lens 4 (external services) gives the context diagram and the
trust boundaries; lens 5 (code and architecture) gives the real layers, the actual import
directions and the violations. Write the design **as it is**, not as it should be: every statement
cites `file:line` or a config path, and every gap between the stated design (README, docs) and the
code is listed as a finding.

### 2. Retroactive ADRs, only for load-bearing decisions
Record a decision only when it is load-bearing and someone could reasonably undo it by accident
(the data store, the auth provider, a layer rule). Status `accepted (recorded retroactively)`,
with the check that already enforces it or the one Phase 4 will propose.

### 3. Risks
From discovery evidence only: runtime or framework versions past end of support, CVEs in the
versions in the lockfile, trust boundaries without validation, single points of failure, layer
violations with counts, cost lines without a ceiling. Each risk carries its evidence tag.

### 4. Migrate only with evidence
A migration enters the proposal only when all four hold:
1. a risk tagged `verified` (seen in code, data, CVE records or production behaviour), not taste;
2. alternatives compared with the criteria of step 5, including "stay as is";
3. a reversible path (expand/migrate/contract, strangler, feature flag) sized in PRs;
4. the user's "go" on that migration.
Anything else goes to **Later** with the signal that would justify it. Never propose a rewrite.

## Official sources by project type

Read the current page at run time; these are starting points, not facts to quote from memory.

| Type | Architecture | Security and platform rules |
|---|---|---|
| Android | [Guide to app architecture](https://developer.android.com/topic/architecture) · [Architecture recommendations](https://developer.android.com/topic/architecture/recommendations) | [Security checklist](https://developer.android.com/privacy-and-security/security-tips) · [OWASP MASVS](https://mas.owasp.org/MASVS/) |
| iOS | [SwiftUI](https://developer.apple.com/documentation/swiftui) · [SwiftData](https://developer.apple.com/documentation/swiftdata) · [Human Interface Guidelines](https://developer.apple.com/design/human-interface-guidelines) | [App Review Guidelines](https://developer.apple.com/app-store/review/guidelines/) · [Apple Platform Security](https://support.apple.com/guide/security/welcome/web) · [OWASP MASVS](https://mas.owasp.org/MASVS/) |
| Flutter | [Architecting Flutter apps](https://docs.flutter.dev/app-architecture) · [Architecture recommendations](https://docs.flutter.dev/app-architecture/recommendations) | [Flutter security](https://docs.flutter.dev/security) · [OWASP MASVS](https://mas.owasp.org/MASVS/) |
| Kotlin Multiplatform | [Get started](https://kotlinlang.org/docs/multiplatform/get-started.html) · [Project structure](https://kotlinlang.org/docs/multiplatform/multiplatform-discover-project.html) · [Expected and actual declarations](https://kotlinlang.org/docs/multiplatform/multiplatform-expect-actual.html) · [KMP on Android Developers](https://developer.android.com/kotlin/multiplatform) | Per target platform: the Android and iOS rows |
| SaaS web | [The Twelve-Factor App](https://12factor.net/) · the hosting provider's framework: [AWS](https://docs.aws.amazon.com/wellarchitected/latest/framework/welcome.html), [Google Cloud](https://docs.cloud.google.com/architecture/framework), [Azure](https://learn.microsoft.com/en-us/azure/well-architected/) | [OWASP ASVS](https://asvs.owasp.org/) · [OWASP Cheat Sheet Series](https://cheatsheetseries.owasp.org/) · [WCAG 2.2](https://www.w3.org/TR/WCAG22/) |
| CLI / library | [GNU command-line interface standards](https://www.gnu.org/prep/standards/html_node/Command_002dLine-Interfaces.html) · [POSIX utility conventions](https://pubs.opengroup.org/onlinepubs/9799919799/basedefs/V1_chap12.html) · [Semantic Versioning](https://semver.org/) · per ecosystem: [npm semver](https://docs.npmjs.com/about-semantic-versioning), [Python Packaging User Guide](https://packaging.python.org/), [Cargo SemVer compatibility](https://doc.rust-lang.org/cargo/reference/semver.html), [Rust API Guidelines](https://rust-lang.github.io/api-guidelines/), [Go module layout](https://go.dev/doc/modules/layout) | [OSV](https://osv.dev/) for dependencies · [SPDX License List](https://spdx.org/licenses/) |

Cross-cutting method sources: [C4 model](https://c4model.com/) ·
[Architectural Decision Records](https://adr.github.io/) ·
[OWASP Threat Modeling](https://owasp.org/www-community/Threat_Modeling).

## Output and handoff to Phase 4

- `.context/repo-bootstrap/system-design.md` (from `templates/system-design.md`) and one
  `.context/repo-bootstrap/adr/NNNN-<slug>.md` per decision (from `templates/adr.md`).
- Each ADR's **Enforced by** becomes a row in the Phase 4 proposal, under the family that owns the
  check (custom lint, architecture tests, CI, automations). The trust boundaries feed the
  sensitive-domain rows of the decision matrix; the risks feed the side-effect registry.
- In the proposal, the design artifacts themselves are optional files: propose
  `docs/architecture/system-design.md` and `docs/adr/` only when the depth was standard or deep,
  or when the user asked for them. A light design can live in the root rules as three lines.
