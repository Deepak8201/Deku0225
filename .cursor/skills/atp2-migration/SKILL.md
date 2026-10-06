---
name: atp2-migration
description: Orchestration of an ATP2 legacy test case migration into an ATP3 input package - phase sequence, subagent per phase, gate enforcement, and final descriptor and environment artifact paths. Use when running /migrate-atp2 or /validate-atp2-migration, resuming a migration from MigrationCheckpoint.json, or re-collecting a case after its ATP2 data changed.
---

# ATP2 → ATP3 Migration (Orchestration)

Migration of an ATP2 (legacy) test case into an ATP3 **input package** — a self-contained descriptor plus environment config.

## Orchestrator invariants

- Plan the pipeline, launch subagents with `Task`, verify gates on disk, maintain `MigrationCheckpoint.json` — never do phase work yourself.
- Pass only the CONTEXT block to a subagent; its body loads from `subagent_type`.
- Verify every gate before advancing; a subagent's self-reported status alone is never sufficient.
- Present a short summary to the user after each phase.

## Coverage and deduplication

ATP2 is the source of truth: every node executed in the run becomes its own Test Step block, in order, and repeated steps stay separate. Two exceptions, both mechanical: technical nodes (wait, separator, store of a constant, store of a capture) are **absorbed** into a neighbouring step by node type, per the Absorption table in [../atp2-unit-collection/references/atp2-node-taxonomy.md](../../../apm_modules/test-generation/.apm/skills/atp2-unit-collection/references/atp2-node-taxonomy.md); and a run of iterations differing only in a loop variable becomes one block carrying `Repeat`, per [references/atp2-descriptor-format.md](references/atp2-descriptor-format.md). No other grouping is permitted. Deduplication applies only to units and contracts, per the class rules in that same taxonomy — never to the steps.

A node whose `templates[].type` no per-kind guide covers is still collected, through the generic guide, and reported to the user at the end of the run — its type is known, only the guide is missing. Silently skipping an executed node is never an acceptable outcome of a migration.

## Run order

1. Read [references/atp2-orchestration-protocol.md](references/atp2-orchestration-protocol.md) (launch templates, gate definitions, retry and error templates) and [references/atp2-migration-checkpoint.md](references/atp2-migration-checkpoint.md) (checkpoint format).
2. Resolve identifiers: a Case URL or `testCaseId`, plus `projectId`, a PASSED `testRunId`, and `executionRequestId`. Ask the user for anything missing.
3. If a `MigrationCheckpoint.json` exists for the case, offer Resume / Restart / Cancel.
4. Run the phases below in order, enforcing each gate and writing the checkpoint after every pass.

## Phases

| # | Phase | Subagent | Output |
|---|---|---|---|
| 1 | Environment export | `atp2-env-exporter` | `{ENV_TEMPLATE}` + `env-<env>.yaml` + `{MIG}env-mapping.md`. It runs first because collection resolves every value against `{ENV_TEMPLATE}` |
| 2 | Collection (base + fan-out) | `atp2-collector`, fanning out one `atp2-unit-collector` per classified unit | `{MIG}mcp-data-collection.md` (execution manifest, unit inventory, nodes without a guide, system reconciliation, authorization, cross-step glossary, common patterns, callchain contract map) + contract files in `{TC_CONTRACTS}` + `ui-steps.partial.*.md` + `unit-steps.partial.*.md` + `screenshots/` |
| 3 | Descriptor build + host reconciliation | `atp2-descriptor-builder` | the self-contained descriptor: `### Step N` blocks plus a `## Call Contracts` section holding the HTTP inlined from the contract partials. Written in append passes, so an interrupted run resumes from the last block |
| — | Platform-systems merge (conditional) | `atp2-env-merger`, then a corrective `atp2-descriptor-builder` re-run | platform systems appended to the env config and `env-mapping.md`; the steps that referenced them filled |
| — | Coverage validation + healing (`/validate-atp2-migration`) | `atp2-migration-validator`, then a re-run of phases 2 and 3 | `{MIG}MigrationValidation.md` + healed contracts and descriptor |

The conditional merge runs only when the Phase 3 return's `unmappedHosts` holds at least one row whose `mark` is `unmapped`; the corrective re-run fills only the named steps, not the whole descriptor.

## Final artifacts

These live outside `Raw/Debug`:

| Output | Path |
|---|---|
| Descriptor | `{rootFolder}/tests/TestDesign/<tc_name>.md` |
| Env template (git-tracked) | `{ENV_TEMPLATE}` |
| Env values (gitignored) | `{ENV_LOCAL}/env-<env>.yaml` |

`MIG`, `TC_CONTRACTS`, `ENV_DIR`, `ENV_LOCAL`, and `ENV_TEMPLATE` are defined in [references/atp2-orchestration-protocol.md](references/atp2-orchestration-protocol.md); never hardcode an env path.

## References

| Purpose | File |
|---|---|
| Launch templates, gate definitions, retry/error templates | [references/atp2-orchestration-protocol.md](references/atp2-orchestration-protocol.md) |
| Checkpoint format | [references/atp2-migration-checkpoint.md](references/atp2-migration-checkpoint.md) |
| `atp_export_test_full` anatomy, `${name}` resolution, unit-cutting rules | [references/atp2-export-format.md](references/atp2-export-format.md) |
| Placeholder proofs, the env-config gate, and the mark dictionary | [references/atp2-value-rules.md](references/atp2-value-rules.md) |
| Descriptor output format | [references/atp2-descriptor-format.md](references/atp2-descriptor-format.md) |
| Worked descriptor example for that format | [references/atp2-descriptor-example.md](references/atp2-descriptor-example.md) |
| Node classes, per-kind collection guides, and the contract / UI / unit artifact formats | [`atp2-unit-collection` skill](../../../apm_modules/test-generation/.apm/skills/atp2-unit-collection/SKILL.md) |
