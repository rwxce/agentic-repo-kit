<!--
TEMPLATE: interview-me skill — extract intent before any plan exists. Include with plan-feature
(its Step 0 routes underspecified asks here). Fill: the repo-specific probes in step 3 (positioning
doc, rate-limit block, compliance check) or delete the ones whose root-rule section was dropped.
Adapted from addyosmani/agent-skills (skills/interview-me), MIT License © 2025 Addy Osmani — keep
this attribution as a comment in the generated file.
Strip the rest of this comment when writing the file (frontmatter must be the first thing in SKILL.md).
-->
---
name: interview-me
description: >-
  Extract what the user actually wants before any plan exists, one question at a time with a
  guess attached, until you can predict their next three answers. Use when an ask is
  underspecified (missing who, why, success, or the binding constraint), when you catch yourself
  silently filling in requirements before the mandatory plan, or when the user says "interview
  me", "grill me", "are we sure?".
targets: ["*"]
---

# Interview me

What people ask for and what they want are different things. The cheapest moment to find the gap
is before the plan the root rule requires — once files are listed and an approach is chosen, the
user rationalizes the wrong thing into "good enough".

This skill sits **before** the plan. Its output is a confirmed statement of intent; the plan (and
`plan-feature`'s PR map, if the work spans several PRs) consumes it.

## When to use

- The ask is missing at least one of: **who** benefits, **why** now, what **success** looks like,
  what the binding **constraint** is.
- The ask is conventional ("add a dashboard", "make it faster") and you cannot unpack it without
  guessing.
- Two reasonable values are in tension and the user has not picked one (simplicity vs.
  flexibility, cost vs. speed, ship now vs. do it right).
- The user invokes it explicitly.

**Do not use** for unambiguous asks (rename, typo, a known prop), pure questions ("how does X
work?"), when the user asked for speed over verification, or in non-interactive runs (`/loop`,
scheduled agents, CI). In a loop started from a `plan-feature` roadmap, an ambiguity the pre-loop
questions already covered uses its recorded default and is logged for the final report; one they
did not cover blocks only that item (mark it blocked, move to the next), never the whole loop.
Elsewhere, flag it as a blocker instead of guessing.

## Process

Ask in the language of the user's last message.

### 1. Hypothesize, with a confidence number

One sentence of what you think they want, plus an honest confidence (0–100%). Below ~70%, say on
the same line what is missing.

```
HYPOTHESIS: You want account owners to see which invoices are overdue, and "dashboard" was the
convention that came to mind.
CONFIDENCE: ~35% — missing: which metric counts as success, and whether this is in-app or internal
```

### 2. One question at a time, each with your guess

```
Q: <one focused question>
GUESS: <your answer hypothesis, and the reasoning behind it>
```

Wait for the reaction before the next question. People react to a wrong guess faster than they
generate an answer from scratch. Batched questions get skimmed, and question three usually depends
on the answer to question one. Be visibly willing to be wrong — occasionally guess in a direction
you expect pushback on, so agreement is not just politeness.

### 3. Listen for "want vs. should want"

Watch for answers that sound like best practice instead of a choice: "scalable", "clean", "the
standard way", "I should probably…". Then ask:

> If you didn't have to justify this to anyone, what would you actually want?

Repo-specific probes, only when they apply:
- **User-facing copy or a new screen** → which doubt of the visitor does it answer, and for which
  moment of the target user? (<positioning doc>)
- **New public entry point** → who triggers it and what does it cost per call? (feeds the Rate
  limit block)
- **New data about a person, a cookie, or a new vendor** → flag that the compliance check in the
  root rule will run; the lawful basis is the user's call.

### 4. Restate in their words

```
Here's what I now think you want:

- Outcome:      <one line>
- User:         <who benefits>
- Why now:      <what changed>
- Success:      <how we know it worked>
- Constraint:   <the binding limit>
- Out of scope: <what we're explicitly not doing>

Yes / no / refine?
```

"Out of scope" is mandatory — half of misalignment is silent disagreement about non-goals.

### 5. Confirm with an explicit yes

Not a yes: "whatever you think" (delegation — re-ask as a choice between two concrete options),
"sounds good" (ask "anything you'd refine?"), "ok let's start" after silence (they gave up; ask
what you missed). Fold corrections in and restate until you get a yes.

### 6. Stop

After the yes: deliver the confirmed intent, offer the next step (the written plan via
`plan-feature`), and **end the turn**. Do not start the plan or call tools in the same turn.

**Stop condition:** you can predict the user's reaction to the next three questions you would ask.
If several rounds pass and confidence is not rising, say so: "I've asked N questions and still
can't predict your answers — something foundational is missing. Step back?"

## Common rationalizations

| Rationalization | Reality |
|---|---|
| "The ask is clear enough" | If you cannot write the outcome in one sentence now, it is not. Do step 1 first. |
| "Questions waste their time" | Four targeted questions are cheap; a plan built on the wrong intent is not. |
| "I'll figure it out in the plan" | The plan locks in files and approach — exactly where a wrong guess gets expensive. |
| "They said 'whatever you think'" | That is delegation, not a decision. Offer two concrete options. |
| "Attaching my guess leads them" | Leading is the point; the risk is sycophancy. Be visibly willing to be wrong. |

## Red flags

- Two or more questions in one message.
- A question without your guess attached.
- A confidence below ~70% with no reason given.
- Writing the plan before the restate got an explicit yes.
- A restate without an "Out of scope" line.
- Three rounds without confidence visibly rising.
