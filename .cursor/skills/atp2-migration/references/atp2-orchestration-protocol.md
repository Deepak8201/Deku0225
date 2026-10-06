# ATP2 Migration Orchestration Protocol

Exact subagent launch parameters, Phase Gate enforcement, retry handling, and error templates for the `/migrate-atp2` orchestrator.

**Canonical `<TC_NAME>` / `<tc_name>` (one rule, used everywhere).** Derive a single token from the ATP2 case name: lowercase, strip all special characters, replace whitespace/separators with `_` → **snake_case** (e.g. `[RI][YACT] TD Creation As Is` → `ri_yact_td_creation_as_is`). `<TC_NAME>` and `<tc_name>` are the **same** token; use it for the migration folder, the per-migration contract folder, and the descriptor file name.

Let `MIG = {rootFolder}/{paths.debugOutput}/ATP2_Migration/<TC_NAME>/` — create it. Concretely `TestGeneration/tests/Raw/Debug/ATP2_Migration/<TC_NAME>/`.

Let `TC_CONTRACTS = {MIG}contracts/` — the migration's **working** contract folder, gitignored like the rest of `{MIG}`. Concretely `TestGeneration/tests/Raw/Debug/ATP2_Migration/<TC_NAME>/contracts/`. Contracts are collected fresh per migration, and the descriptor builder inlines them into the descriptor's `## Call Contracts` section; the partials themselves are never committed and nothing downstream reads them.

Both env folders are **derived from the single `{paths.envConfig}` entry** in `config.json` — there is no separate folder key, and no env path may ever be hardcoded in a prompt or an artifact.

Let `ENV_LOCAL` = the folder containing `{rootFolder}/{paths.envConfig}` — gitignored, holds the env value yamls and the generated config. Concretely `TestGeneration/environment-configuration/local-environment-configuration/`.

Let `ENV_DIR` = the parent of `ENV_LOCAL` — git-tracked, holds the templates and `setEnvironmentScript.ps1`. Concretely `TestGeneration/environment-configuration/`.

Let `ENV_TEMPLATE = {ENV_DIR}/environment-configuration-template-<env>.json` — the env template Phase 1 writes, where `<env>` is the `envShort` of the Phase 1 return. Phases 2 and 3 are given this path; neither rebuilds it.

## Delegation Violation Detection (NON-NEGOTIABLE)

The orchestrator self-checks before every tool call during phase execution. A call is a **VIOLATION** unless it is part of a Phase Gate check or checkpoint management:

**Violation tool calls (MUST NOT use during phase execution):**

- `CallMcpTool` with any `atp_*` tool (all ATP2 collection/export belongs to subagents).
- `Write` to any migration artifact (`mcp-data-collection.md`, contract files in `{TC_CONTRACTS}/`, `ui-steps.partial.*`, `unit-steps.partial.*`, screenshots, env template/yaml, `env-mapping.md`, the descriptor). Those belong to subagents.

**Allowed tool calls for the orchestrator:**

- `Read` — to read prior phase outputs and to check gate artifacts on disk.
- `Task` — to launch the phase subagents (this is the orchestrator's primary action tool).
- `Shell` with a cheap existence check (`Test-Path <returnedPath>`, or one directory listing of `{TC_CONTRACTS}` / `{MIG}`) — the **preferred** way to verify a freshly written artifact at a gate.
- `Grep` — for a cheap content spot-check (e.g. a section header or a `Response Schema` count) on a path the subagent returned.
- `Write` to `{MIG}MigrationCheckpoint.json` — checkpoint management only (see `atp2-migration-checkpoint.md`).

**Gate existence checks — use returned paths + `Test-Path`, not an index-backed `Glob`.** Verify each artifact at the path the subagent returned, using `Test-Path` (or one directory listing). Do **not** rely on an index-backed file-glob to prove existence — the index can lag behind files written moments earlier in the same run and cause a false gate failure. `Grep` is fine for a content spot-check once existence is confirmed.

**On violation detection:** STOP immediately, do NOT execute the violating call, and instead launch the appropriate phase Task.

## Invocation Model (CONTEXT-only prompts)

Migration subagents are registered agents (`atp2-collector`, `atp2-env-exporter`, `atp2-descriptor-builder`, `atp2-env-merger`). The per-unit worker `atp2-unit-collector` — one instance per unit, whatever its kind — is fanned out by `atp2-collector`, not launched by the orchestrator. Pass only the CONTEXT block to each — the subagent body loads automatically from `subagent_type`.

```
For each phase:
1. Build the prompt = ONLY the phase-specific CONTEXT block from the Launch Template below.
2. Capture startedAt = now() (real timestamp).
3. Launch Task with:
   - subagent_type: the exact value from the template
   - description:   "Phase {N}: {phase-name}"
   - prompt:        the CONTEXT block
4. Block until the agent completes.
5. Capture endedAt = now(); parse the single raw-JSON return value.
6. Run the Phase Gate checks (return + artifact existence via the returned paths + content spot-check).
7. On success → write checkpoint (incl. real startedAt/endedAt, and per-worker telemetry for collection), advance. On failure → retry (same CONTEXT) or escalate.
```

## Pre-flight: identifiers

Before Phase 1, confirm the minimum identifiers are present (from the command args or by asking the user): a Case URL or `testCaseId` (required); `projectId`, a PASSED `testRunId`, and `executionRequestId` (required for execution collection + env export). If any required id is missing → ask the user; do not guess.

---

## Launch Templates

Each template specifies the exact Task parameters. Use these parameter names and values.

### Phase 1 — Environment export

- `subagent_type`: `"atp2-env-exporter"`
- `description`: `"Phase 1: Environment export"`
- `prompt` (CONTEXT only):

```
projectId: {projectId}
executionRequestId: {executionRequestId}
Migration folder: {MIG}
ENV_DIR: {ENV_DIR}
ENV_LOCAL: {ENV_LOCAL}
```

`{ENV_TEMPLATE}` is fixed by this return and is passed to both later phases.

### Phase 2 — Collection (base + fan-out)

- `subagent_type`: `"atp2-collector"`
- `description`: `"Phase 2: Collection"`
- `prompt` (CONTEXT only):

```
Case URL (or testCaseId): {caseUrlOrTestCaseId}
projectId: {projectId}
testRunId: {passedTestRunId}
executionRequestId: {executionRequestId}
Slice scope: {sliceScope or "full case"}
Migration folder: {MIG}
Output file (base): {MIG}mcp-data-collection.md
contractDir: {TC_CONTRACTS}
Partials dir: {MIG}
Bruno outputDir: {MIG}bruno
Screenshots dir: {MIG}screenshots
Env template: {ENV_TEMPLATE}
```

### Phase 3 — Descriptor build + host reconciliation

- `subagent_type`: `"atp2-descriptor-builder"`
- `prompt` (CONTEXT only):

```
mcp-data-collection.md path: {MIG}mcp-data-collection.md
contractDir: {TC_CONTRACTS}
Partials glob: {MIG}*-steps.partial.*.md
env-mapping.md path: {MIG}env-mapping.md
Env template: {ENV_TEMPLATE}
Output file: {rootFolder}/tests/TestDesign/<tc_name>.md
```

Two launches use this one template; they differ only in the `description` and in one appended line:

| Launch | `description` | Appended line |
|---|---|---|
| Phase 3 | `"Phase 3: Descriptor"` | — |
| Corrective re-run, after the conditional merge | `"Descriptor (corrective)"` | `Corrective instruction: The following systems now exist in the env config: {alias list}. Fill ONLY the steps that reference them: {step list}. Do NOT rewrite the rest of the descriptor.` |

### Conditional — Platform-systems merge + corrective descriptor re-run

Run only if the Phase 3 return's `unmappedHosts` array holds at least one row whose `mark` is exactly `unmapped`. Otherwise SKIP (checkpoint `platform-merge` as `{ "status": "skipped", "reason": "no unmapped host" }`).

**Step A — merge:**

- `subagent_type`: `"atp2-env-merger"`
- `description`: `"Platform merge"`
- `prompt` (CONTEXT only):

```
envShort: {envShort from the Phase 1 return}
Migration folder: {MIG}
ENV_DIR: {ENV_DIR}
ENV_LOCAL: {ENV_LOCAL}
Platform endpoints to add: {the `unmappedHosts` rows whose mark is `unmapped` — items of { alias, resolvedHost, mark, steps }}
```

**Step B — corrective descriptor re-run:** the Phase 3 template with its appended line, per the table above.

An `unmappedHosts` row marked `atp2-internal`, `external`, `no-slot` or `unknown-origin` is terminal by the dictionary: it is never sent to the merger. Those rows and every `failedPlaceholders` row go into the final report instead.

---

## Phase Gate Enforcement Logic

```
FUNCTION enforceGate(phaseId, agentReturn, startedAt, endedAt):
  1. Parse agentReturn:
     - IF missing / malformed / no "status" field → FAIL("Malformed agent return")
     - IF status !== expected success value → FAIL("Agent reported failure: " + status)
  2. Check required artifacts EXIST at the paths the subagent returned:
     - FOR EACH returned path (outputFile / contracts[].outputFile / uiPartials[].outputFile / unitPartials[].outputFile / env artifacts):
       - Verify with `Test-Path <path>` (or one directory listing) — NOT an index-backed Glob (the index can lag freshly written files → false failure).
  3. Run cheap content spot-checks (see Gate Definitions) with `Grep` on the returned paths.
  4. IF any FAIL:
     - retryCount++
     - IF retryCount <= maxRetries (default 3, from config `execution.maxRetriesPerPhase`): re-launch same phase (optionally with a corrective note)
     - ELSE: ask the user "Phase {phaseId} failed after {maxRetries} attempts. Continue or abort?"
  5. IF all PASS:
     - Write MigrationCheckpoint.json with the phase status AND the real startedAt/endedAt (plus per-worker telemetry from the collector return for the collection phase)
     - Advance. NEVER skip a gate. NEVER proceed on partial success.
```

## Gate Definitions

### Phase 1: Environment export

| Check | Condition |
|---|---|
| Agent return | `status === "success"` (if `status === "blocked"` → STOP, ask user to transfer env manually) |
| Artifact | `{ENV_TEMPLATE}` exists |
| Artifact | `{ENV_LOCAL}/env-<env>.yaml` exists and `git check-ignore` returns true (passwords empty + `# TODO`) |
| Artifact | `{MIG}env-mapping.md` exists with the primary SYSTEM alias |

### Phase 2: Collection

| Check | Condition |
|---|---|
| Agent return | `status === "success"` |
| Artifact | `{MIG}mcp-data-collection.md` exists |
| Content | It has an `## Execution manifest` whose rows are numbered from 1 with no gaps |
| Content | For each surface in the surface set, matching artifacts exist: API surface ⇒ ≥1 contract file in `{TC_CONTRACTS}/` (from the return's `contracts[].outputFile`) **and** a `## Callchain contract map` section in `mcp-data-collection.md`; UI surface ⇒ ≥1 `ui-steps.partial.*` (each with interactions + Results, no Playwright locators) |
| Content | Every non-absorbed manifest row has an artifact: a contract row in the `## Callchain contract map`, a `ui-steps.partial.*`, or a `unit-steps.partial.*` — or is explicitly noted non-collectable |
| Content | `## Unit inventory`, `## Nodes without a guide` and `## System reconciliation` are present (the last two may read `None`), and the `nodesWithoutGuide[]` and `systemMismatches[]` returns match their rows one for one |
| Content | `mcp-data-collection.md` has `## Authorization` (may be `None`), `## Cross-step glossary` and `## Common patterns` sections |

The count of calls inside a contract is **not** gated: the static call list of a callchain is a lower bound, and contract completeness belongs to the worker that wrote the contract. On incomplete collection, the orchestrator re-launches **Phase 2** and MAY pass a corrective note in the re-launch prompt stating exactly what to re-collect, instead of restarting the whole phase from scratch.

Neither of these two returns is a gate failure, and both are reported to the user at the end of the run:

| Return | Why it passes |
|---|---|
| non-empty `nodesWithoutGuide[]` | the node's type is known and it was collected through the generic guide; the report is what earns it a per-kind guide later |
| non-empty `systemMismatches[]` | the directive stays the alias; a divergence from the callchain's own system is informational |

### Phase 3: Descriptor + host reconciliation

| Check | Condition |
|---|---|
| Agent return | `status === "success"`, `descriptorComplete === true` |
| Artifact | `{rootFolder}/tests/TestDesign/<tc_name>.md` exists |
| Content | `Test Type` is a surface set; `## Overview` carries an `- **Origin**:` line |
| Content | Placeholder gate: `Grep` every `{{X.y}}` in the descriptor and resolve each against `{ENV_TEMPLATE}` by string comparison — `X` a top-level system key, `y` a field of its connection. No heuristics, no case folding. One that does not resolve fails the gate |
| Content | Every system named by a `Surface` line has exactly one row in `## Systems Referenced`, and that section names no system the steps do not use. A used system absent from `{ENV_TEMPLATE}` keeps its row carrying `UNKNOWN (absent from the env template)`, and that is **not** a failure |
| Content (UI) | If the surface set includes `UI`, the descriptor has ≥1 UI step (not silently empty), exactly one synthesized `Navigate`, and no Playwright locators (`page.getBy…`) anywhere |
| Content | `## Call Contracts` is present with a `### C<N>` block per contract; every `Contract: C<N>` cited by a step resolves to an existing `### C<N>` (`Grep` both sets and diff them) |
| Content | The descriptor references nothing outside itself: no `Screenshot`, no `logRecordId`, no path into `{MIG}` or `{TC_CONTRACTS}` |
| Content | `## Test Steps` is a list of `### Step N` blocks numbered consecutively from 1 with no gaps |
| Content | Every `(mark: X)` in the descriptor carries one of the five marks of the *Mark dictionary* in [atp2-value-rules.md](atp2-value-rules.md); an invented mark fails the gate |
| Content | Every `Expected Result` meets the *Generation-ready criterion* of [atp2-descriptor-format.md](atp2-descriptor-format.md) |
| Return | `unmappedHosts[]` and `failedPlaceholders[]` present (each may be empty); `uiSteps` matches the descriptor when the surface set includes `UI` |
| Return | The coverage identity holds: `manifestNodes == absorbedNodes + (descriptorSteps - repeatBlocks) + repeatCoveredNodes`, and `manifestNodes` equals the Phase 2 manifest count |
| Return | `descriptorSteps` equals the `### Step N` count on disk and `contracts` equals the `### C<N>` count |

A value with no proven placeholder is written resolved and marked; `Grep` for the token `(mark: ` to find every one. Marked values are expected output, never a gate failure, and no step is parked.

After the gate: an `unmappedHosts` row marked `unmapped` triggers the conditional merge and the corrective re-run, after which this gate is re-checked. Any other gate failure is fixed upstream and Phase 3 re-run.

### Platform merge (only if launched)

| Check | Condition |
|---|---|
| Agent return | `status === "success"` |
| Content | Every merged row is `added` or `already present`; none `blocked` |

If a URL is `blocked` (no resolved host and `atp_get_server_outbound` unavailable) → surface it in the final report; do not guess. After a successful merge, launch the corrective descriptor re-run (Conditional Step B), then re-check the Phase 3 gate.

## Error Templates

**Malformed Return:**
```
Phase {phaseId} returned malformed data. Expected one raw JSON object with a "status" field.
Raw return: {truncated first 500 chars}
Retrying... (attempt {retryCount}/{maxRetries})
```

**Missing Artifact:**
```
Phase {phaseId} agent reported success but a required artifact was not found:
  Expected: {artifactPath}
Retrying... (attempt {retryCount}/{maxRetries})
```

**User Escalation:**
```
Phase {phaseId} failed after {maxRetries} attempts.
Last failure: {lastFailReason}

Options:
1. Continue trying (reset retry counter)
2. Abort migration (checkpoint saved at last successful phase)

Your choice:
```
