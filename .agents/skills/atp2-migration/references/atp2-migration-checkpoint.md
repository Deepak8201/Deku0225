# ATP2 Migration Checkpoint

Structured progress state for the `/migrate-atp2` pipeline.

## MigrationCheckpoint.json

**Location:** `{rootFolder}/{paths.debugOutput}/ATP2_Migration/<TC_NAME>/MigrationCheckpoint.json`

**Owner:** the migration orchestrator ONLY. No subagent reads or writes it.

### Format

```json
{
  "caseRef": "<Case URL or testCaseId>",
  "tcName": "<TC_NAME>",
  "migrationFolder": "TestGeneration/tests/Raw/Debug/ATP2_Migration/<TC_NAME>/",
  "identifiers": {
    "projectId": "<uuid>",
    "testRunId": "<uuid>",
    "executionRequestId": "<uuid>"
  },
  "lastCompletedPhase": "collection",
  "phaseResults": {
    "environment":    { "status": "complete", "envShort": "ci01", "outputFile": ".../env-mapping.md", "startedAt": "2026-07-13T20:00:00Z", "endedAt": "2026-07-13T20:01:21Z" },
    "collection":     { "status": "complete", "outputFile": ".../mcp-data-collection.md", "contracts": 8, "uiPartials": 2, "unitPartials": 3, "nodesWithoutGuide": 1, "systemMismatches": 0, "startedAt": "2026-07-13T20:01:22Z", "endedAt": "2026-07-13T20:05:02Z", "workers": [ { "unit": "[BS] Create City", "unitKind": "api-callchain", "startedAt": "2026-07-13T20:01:30Z", "endedAt": "2026-07-13T20:02:40Z" }, { "unit": "Check ONT state in DB", "unitKind": "db", "startedAt": "2026-07-13T20:02:40Z", "endedAt": "2026-07-13T20:03:50Z" } ] },
    "descriptor":     { "status": "in-progress", "passes": { "header": true, "stepsThrough": 40, "verification": false, "contractsWritten": 12 } },
    "platform-merge": { "status": "pending" }
  },
  "timestamp": "2026-07-13T20:05:02Z",
  "version": "1.1.0"
}
```

### Descriptor pass progress

The builder writes the descriptor in append passes, so an interrupted Phase 3 must not restart the file. After each descriptor launch — including a failed one — copy the builder's `passes` object into `phaseResults.descriptor.passes`: `header` (the four header sections written), `stepsThrough` (the highest `### Step N` on disk), `verification`, and `contractsWritten` (the count of `### C<N>` blocks).

On resume, relaunch the builder with the unchanged Phase 3 CONTEXT. It resumes from the file itself: find the last `### Step N` and continue with the next one, then the sections that `passes` shows as unwritten. Never delete a partial descriptor to "start clean" — that discards the passes already paid for.

### Phase telemetry (real timestamps, never placeholders)

- Record **real** `startedAt` (captured immediately before launching the phase Task) and `endedAt` (immediately after the return is parsed) for every phase — not round/placeholder values. This is the only way to measure which phase (or worker) is slow.
- For the collection phase, also record a `workers` array with per-worker `unit`, `unitKind`, `startedAt`, `endedAt` (from the collector's return telemetry) so a slow or re-launched worker is visible, and which kind of unit it was collecting.
- `timestamp` is the moment the checkpoint was last written.

### Phase IDs

| Phase | Phase ID | Subagent | Description |
|---|---|---|---|
| 1 | `environment` | `atp2-env-exporter` | export env → template + yaml + env-mapping.md |
| 2 | `collection` | `atp2-collector` | base collection + one `atp2-unit-collector` per classified unit (contracts, UI partials, unit partials) |
| 3 | `descriptor` | `atp2-descriptor-builder` | build the self-contained descriptor (Test Step blocks + inlined Call Contracts) + host reconciliation |
| — | `platform-merge` | `atp2-env-merger` | auto-add platform systems, then corrective descriptor re-run (conditional) |
| — | `validation` | `atp2-migration-validator` | coverage diagnosis + healing re-runs, written by `/validate-atp2-migration` |

`phaseResults` keys are these phase IDs, written in phase order.

### Status values

| Status | Meaning |
|---|---|
| `pending` | Phase not started |
| `in-progress` | Phase started and interrupted; only `descriptor` uses it, together with `passes` |
| `complete` | Phase gate passed, artifacts verified on disk |
| `skipped` | Phase intentionally not run (only `platform-merge`, when no `unmappedHosts` row carries the mark `unmapped`) — record `reason` |
| `failed` | Phase failed (checkpoint saved for diagnostics) |
