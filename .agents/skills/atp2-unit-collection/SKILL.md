---
name: atp2-unit-collection
description: Collection of one ATP2 execution unit into a self-sufficient migration artifact - node-kind routing, the per-kind collection guides, and the contract, UI and unit partial formats. Use when collecting a callchain, compound, UI group, DB, SSH, data node, or a node no guide covers, during an ATP2 migration.
---

# ATP2 Unit Collection

Which guide applies to which ATP2 node kind, and what the resulting artifact must contain.

## Self-sufficiency

The migration folder is gitignored and the descriptor references nothing outside itself, so everything a unit contributes to the final test survives inside that unit's artifact alone:

- the complete HTTP exchange or the verbatim statement, including what a call stores and what a later step consumes;
- every UI interaction written so that it is executable exactly as it stands.

An artifact that sends its reader back to ATP2 for a screenshot, a log record or a callchain definition has failed, however accurate it is.

## Routing

The unit's class comes from `templates[].type` read through [references/atp2-node-taxonomy.md](references/atp2-node-taxonomy.md); classification is offline, and no field of a run log record decides it. Take the row of the resulting `unitKind`:

| `unitKind` | Guide | Output format | `artifactKind` |
|---|---|---|---|
| `api-callchain` | [guide-api-callchain.md](references/guide-api-callchain.md) | [atp2-contract-format.md](references/atp2-contract-format.md) | `contract` |
| `api-compound` | [guide-api-compound.md](references/guide-api-compound.md) | [atp2-contract-format.md](references/atp2-contract-format.md) | `contract` |
| `ui-group` | [guide-ui-group.md](references/guide-ui-group.md) | [atp2-ui-partial-format.md](references/atp2-ui-partial-format.md) | `ui-partial` |
| `db`, `ssh`, `data` | [guide-db-ssh-data.md](references/guide-db-ssh-data.md) | [atp2-unit-partial-format.md](references/atp2-unit-partial-format.md) | `unit-partial` |
| `other` | [guide-generic-unknown.md](references/guide-generic-unknown.md) | [atp2-unit-partial-format.md](references/atp2-unit-partial-format.md) | `unit-partial` |

The list of `type` values is open. A `type` no class of the taxonomy covers takes the `other` row — the generic guide, a `unit-partial`, and a row in the taxonomy's *Nodes without a guide* report. Never the closest-looking row, never a stop, never a silent skip.

A `unitKind` hint arrives in CONTEXT. It is a hint: when the node's own evidence contradicts it, follow the evidence and report the override.

## Acceptance

Every output format ends with an `## Acceptance` section stating what a finished block must carry. That section, not the guide, decides whether the artifact is done; check the written file against it before returning.

## References

| Purpose | File |
|---|---|
| Node classes, evidence, dedup rules | [references/atp2-node-taxonomy.md](references/atp2-node-taxonomy.md) |
| What may enter an artifact as a placeholder, and what stays a resolved value with a mark | [../atp2-migration/references/atp2-value-rules.md](../../../apm_modules/test-generation/.apm/skills/atp2-migration/references/atp2-value-rules.md) |
| Collecting a callchain | [references/guide-api-callchain.md](references/guide-api-callchain.md) |
| Collecting a compound or single catalog REST action | [references/guide-api-compound.md](references/guide-api-compound.md) |
| Collecting a UI group | [references/guide-ui-group.md](references/guide-ui-group.md) |
| Collecting a DB, SSH or computed-store unit | [references/guide-db-ssh-data.md](references/guide-db-ssh-data.md) |
| Collecting a node no guide covers | [references/guide-generic-unknown.md](references/guide-generic-unknown.md) |
| Contract file format | [references/atp2-contract-format.md](references/atp2-contract-format.md) |
| UI partial format | [references/atp2-ui-partial-format.md](references/atp2-ui-partial-format.md) |
| Unit partial format | [references/atp2-unit-partial-format.md](references/atp2-unit-partial-format.md) |
