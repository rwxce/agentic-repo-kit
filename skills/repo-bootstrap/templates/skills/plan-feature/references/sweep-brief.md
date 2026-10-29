<!--
TEMPLATE: consumer-sweep subagent brief (loaded on demand by plan-feature step 2).
Generated together with plan-feature. Nothing to fill beyond the optional graph command name.
-->
# Consumer-sweep brief (template)

Send one of these per read-only exploration subagent (mid-tier model). Normal features: one
subagent with the whole concept list. Big features: 2-3 in parallel, each with its own slice.

```text
Goal: find every place in the repo that already reads or writes the concepts below, and say
which assumption the planned change breaks for each. Read-only. Do not propose fixes.

Planned change (one paragraph): <what the feature does>

Concepts in your slice:
- <concept> → <what changes> (e.g. "tenant access" → non-owners can now act on a tenant)
- ...

Graph results to start from (already run by the orchestrator):
- <code-graph query/path output for this slice, or "no graph: use rg">

Method: start from the graph results; verify every hit in the source; widen with `rg` only for
what the graph missed. Ignore tests and generated files unless they encode a contract.

Return ONLY this table, at most 40 rows, no prose before or after:

| file:line | reader | broken assumption |
|---|---|---|

If nothing breaks for a concept, one row: `— | <concept> | none found (searched: <terms>)`.
```
