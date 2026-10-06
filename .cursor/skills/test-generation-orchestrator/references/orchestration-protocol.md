# Orchestration Protocol

Detailed subagent launch parameters, Phase Gate enforcement logic, retry handling, and error templates.

## Delegation Violation Detection (NON-NEGOTIABLE)

The orchestrator MUST self-check before every tool call during phase execution. If the tool being called is any of the following, it is a **VIOLATION** unless it is explicitly part of a Phase Gate check:

**Violation tool calls (MUST NOT use during phase execution):**

- `Write` to any path under `{rootFolder}/tests/` (generated artifacts belong to subagents)
- `CallMcpTool` with any `browser_*` tool (Playwright MCP belongs to the research subagent)
- `Shell` with `npx playwright test` (belongs to validation subagent only)

**Allowed tool calls for the orchestrator:**

- `Read` — to read agent `.md` files (for AGENT_CONTENT), config, prior phase outputs, and gate artifact checks
- `Task` — to launch subagents (this is the orchestrator's primary action tool)
- `Shell` with `npm install` or `npm list` — ONLY for pre-flight dependency checks
- ~~`Shell` with `npx tsc --noEmit`~~ — removed; tsc compilation is handled inside subagents (Test Gen Agent and Test Fix Agent)
- `Write` to `{rootFolder}/{paths.debugOutput}/GenerationCheckpoint.json` — checkpoint management only
- `Glob` / `Grep` — to verify artifact existence during gate checks

**Violation — writing agent instructions from memory:**
If you find yourself writing "You are the X Agent..." or describing what an agent should do in the `prompt` parameter — STOP. That means you did not read the agent file first, or you summarized it instead of copying. Re-read the file and copy AGENT_CONTENT as-is.

**On violation detection:** STOP immediately, do NOT execute the violating tool call, and instead construct and launch the appropriate Task tool call for the current phase.

## Subagent Launch Parameters

### Mandatory Invocation Model

```
For each phase:
1. Read agent file via Read tool: .cursor/agents/{agent-name}.md
   Store the COMPLETE output of the Read tool — every line, including frontmatter — as variable AGENT_CONTENT.
2. Build prompt:
   - Start with AGENT_CONTENT exactly as returned by Read tool (do not summarize, shorten, or rephrase)
   - Append the literal string: "\n\n---\nCONTEXT:\n"
   - Append the phase-specific context variables from the Launch Template below
3. Self-check BEFORE calling Task tool:
   - Confirm prompt starts with "---" (the YAML frontmatter opener from the agent file)
   - Confirm prompt contains all section headers from AGENT_CONTENT (e.g. "## Absolute rules", "# Phase 1")
   - If either check fails: re-read the agent file and rebuild the prompt
4. Launch Task tool with:
   - subagent_type: per agent definition (see exact values below)
   - prompt: the built prompt from step 2
   - description: "Phase {N}: {phase-name}"
5. Block until agent completes
6. Parse return value
7. Execute Phase Gate checks
8. Write checkpoint on success OR retry on failure (via Task tool re-invocation)
```

**Critical:** The Read tool returns the file content as plain text. Copy it into the prompt as-is — do not interpret, summarize, or rewrite it. You are a text relay for this step, not an editor. Every re-run of a phase (retry or user-approved continue) requires a fresh Read tool call — never reuse AGENT_CONTENT from a previous phase launch.

### Reading the test descriptor (applies to every phase)

The descriptor is passed **by path**, never inlined into a prompt. The orchestrator does not read it into context, and a phase agent reads only the part it needs. Descriptors have the same heading structure whether they were authored by `/m-tc-design` or produced by a migration, so one set of anchors serves both:

| Anchor | What it opens |
|---|---|
| `## <Section>` | the top-level sections, in order: `Overview`, `Systems Referenced`, optional `Authorization`, `Test Data Requirements`, `Test Steps`, `Verification Points`, optional `Call Contracts` |
| `### Step N` | one step block — self-contained: surface, page, contract ref, consumes/stores, actions, expected result, validation |
| `### C<N>` | one call contract in `## Call Contracts` — method, endpoint, headers, body, response schema, `→ Store` |

**Read the range you need, not the whole file.** Use `Grep` to locate an anchor and `Read` with an offset/limit to open the block. A step block carries everything about that step, so there is no need to jump around the file; the only outward reference is a step's `Contract: C<N>`, which resolves to the `### C<N>` block in the same file.

### Launch Templates

Each template specifies the exact Task tool parameters. The orchestrator MUST use these parameter names and values.

---

**Phase 0 — Reusability Agent:**

Task tool parameters:

- `subagent_type`: `"reusability-agent"`
- `description`: `"Phase 0: Reusability Analysis"`
- `prompt`: AGENT_CONTENT (full Read output of `.cursor/agents/reusability-agent.md`) + `"\n\n---\nCONTEXT:\n"` + context variables below:

```
Test Description Path: {testDescriptionPath}
Root Folder: {config.rootFolder}
Debug Output Path: {rootFolder}/{paths.debugOutput}
Functional Path: {rootFolder}/{paths.functional}
Business Path: {rootFolder}/{paths.business}
Test Scenario Path: {rootFolder}/{paths.testScenario}
Locator Cache Path: {rootFolder}/{paths.locatorCache}
Test Tags Mapping Path: {rootFolder}/{paths.testTagsMapping}
Import Base Path: {config.importBasePath}
```

---

**Phase 1-2 — Test Research Agent (MCP path):**

> Used when the test description does NOT contain inline locator hints. A descriptor has inline locators when its step actions include `→ \`page.getByRole(...)\`` style references (i.e. a `→` arrow followed by a Playwright locator expression). If no such pattern is found in any step — use the MCP path.

Task tool parameters:

- `subagent_type`: `"browser-use"`
- `description`: `"Phase 1-2: Test Research"`
- `prompt`: AGENT_CONTENT (full Read output of `.cursor/agents/test-research-agent.md`) + `"\n\n---\nCONTEXT:\n"` + context variables below:

```
Test Description Path: {testDescriptionPath}
ReusabilityAnalysis.md Content:
{reusabilityAnalysisContent}
Root Folder: {config.rootFolder}
Debug Output Path: {rootFolder}/{paths.debugOutput}
Functional Path: {rootFolder}/{paths.functional}
Business Path: {rootFolder}/{paths.business}
Locator Cache Path: {rootFolder}/{paths.locatorCache}
Import Base Path: {config.importBasePath}
Environment Configuration File Path: {rootFolder}/{paths.envConfig}
```

Note: read `ReusabilityAnalysis.md` from disk after Phase 0 gate passes, then include its full content above.

---

**Phase 1-2 — Locator Extractor Agent (codegen path):**

> Used when the test description contains inline locator hints — step actions in the format `→ \`page.getByRole(...)\`` (a `→` arrow followed by a Playwright locator expression).
> Produces the same artifacts as the MCP path. No live browser interaction is performed.

Task tool parameters:

- `subagent_type`: `"generalPurpose"`
- `description`: `"Phase 1-2: Locator Extraction"`
- `prompt`: AGENT_CONTENT (full Read output of `.cursor/agents/locator-extractor-agent.md`) + `"\n\n---\nCONTEXT:\n"` + context variables below:

```
Test Description Path: {testDescriptionPath}
Test Track Content:
{testTrackContent}
ReusabilityAnalysis.md Content:
{reusabilityAnalysisContent}
Root Folder: {config.rootFolder}
Debug Output Path: {rootFolder}/{paths.debugOutput}
Functional Path: {rootFolder}/{paths.functional}
Business Path: {rootFolder}/{paths.business}
Locator Cache Path: {rootFolder}/{paths.locatorCache}
Import Base Path: {config.importBasePath}
```

Notes:
- Read `ReusabilityAnalysis.md` from disk after Phase 0 gate passes, then include its full content above.
- Read **Test Track Content** from `{rootFolder}/tests/TestDesign/TestDesignPreparation/test-track.md` when that file exists; otherwise pass `not provided`. This file is the Playwright codegen recording used alongside locator hints in the test description.

---

**Phase 1-2 — SKIPPED (no-UI path):**

> Used when the descriptor's `Test Type` surface set has **no `UI`** (e.g. `API`, `API + DB`, `SSH`) — see orchestrator SKILL.md Step 5 sub-step 2.
> No Phase 1-2 agent is launched and the Phase 1-2 Gate is **not** run. There are no UI elements to research, so there is nothing to collect — skipping is correct, and empty artifacts MUST NOT be fabricated to satisfy a gate.

Actions:

- Do NOT launch Test Research or Locator Extractor.
- Do NOT read or expect `ElementsCollected.ts` / `InvestigationLog.md` (they are not produced).
- Write checkpoint for Phase 1-2 as `{ "status": "skipped", "reason": "no-UI surface" }`.
- Proceed to Phase 3-4, passing `ElementsCollected.ts Content: not provided` and `InvestigationLog.md Content: not provided` (same `not provided` convention used for `test-track.md`).

---

**Phase 3-4 — Test Gen Agent:**

Task tool parameters:

- `subagent_type`: `"test-gen-agent"`
- `description`: `"Phase 3-4: Test Generation"`
- `prompt`: AGENT_CONTENT (full Read output of `.cursor/agents/test-gen-agent.md`) + `"\n\n---\nCONTEXT:\n"` + context variables below:

```
ElementsCollected.ts Content:
{elementsCollectedContent}
InvestigationLog.md Content:
{investigationLogContent}
ReusabilityAnalysis.md Content:
{reusabilityAnalysisContent}
Test Description Path: {testDescriptionPath}
Full Config:
{JSON.stringify(config)}
Root Folder: {config.rootFolder}
Import Base Path: {config.importBasePath}
Environment Configuration File Path: {rootFolder}/{paths.envConfig}
```

Note: read `ElementsCollected.ts`, `InvestigationLog.md`, and `ReusabilityAnalysis.md` from disk after Phase 1-2 gate passes, then include their full contents above. **If Phase 1-2 was skipped (no-UI surface)**, do not read `ElementsCollected.ts` / `InvestigationLog.md` (they do not exist) — pass `ElementsCollected.ts Content: not provided` and `InvestigationLog.md Content: not provided` instead. `ReusabilityAnalysis.md` is still read from Phase 0.

---

**Phase 5 — Test Validation Agent:**

Task tool parameters:

- `subagent_type`: `"test-validation-agent"`
- `description`: `"Phase 5: Test Validation"`
- `prompt`: AGENT_CONTENT (full Read output of `.cursor/agents/test-validation-agent.md`) + `"\n\n---\nCONTEXT:\n"` + context variables below:

```
Root Folder: {config.rootFolder}
Full Config:
{JSON.stringify(config)}
Generated Test Files:
{generatedFilesList}
Report Output Path: {rootFolder}/{paths.reportOutput}
Execution Params: {config.execution.params}
Environment Configuration File Path: {rootFolder}/{paths.envConfig}
```

Note: `generatedFilesList` is the list of `.test.ts` file paths from Phase 3-4 return value. `Execution Params` MUST be appended to every `npx playwright test` command.

**On re-run (after user chose CONTINUE):** Read `.cursor/agents/test-validation-agent.md` again via Read tool (fresh read — do not reuse prior AGENT_CONTENT) and build the prompt identically to the initial launch. Do NOT add "prior failure summary" or any extra context. The agent reads `FixContext.json` from disk if it exists and handles resume internally.

## Phase Gate Enforcement Logic

```
FUNCTION enforceGate(phaseId, agentReturn, config):

  1. Parse agentReturn:
     - IF return is missing, malformed, or has no "status" field → FAIL("Malformed agent return")
     - IF status !== expected success value for phaseId → FAIL("Agent reported failure: " + status)

  2. Check required artifacts on disk:
     - FOR EACH requiredArtifact in GATE_DEFINITIONS[phaseId].artifacts:
       - IF file does not exist → FAIL("Missing artifact: " + artifactPath)

  3. Run content/shell checks (if defined):
     - FOR EACH check in GATE_DEFINITIONS[phaseId].contentChecks:
       - Execute check
       - IF check fails → FAIL("Content check failed: " + check.description)

  4. IF any FAIL occurred:
     - retryCount++
     - IF retryCount <= config.execution.maxRetriesPerPhase:
       - Log: "Phase {phaseId} gate failed (attempt {retryCount}): {failReason}"
       - Re-invoke same agent
     - ELSE:
       - Ask user: "Phase {phaseId} failed after {maxRetries} attempts. Continue trying or abort?"
       - IF user says continue: reset retryCount, re-invoke
       - IF user says abort: stop generation, write checkpoint with failure

  5. IF all checks PASS:
     - Write GenerationCheckpoint.json with phase status
     - Advance to next phase
     - NEVER skip a gate. NEVER proceed on partial success.
```

## Gate Definitions

### Phase 0: Reusability

| Check | Condition |
|-------|-----------|
| Agent return | `status === "success"` |
| Artifact | `{rootFolder}/{debugOutput}/ReusabilityAnalysis.md` exists |
| Content | File contains at least one step entry from Test Description |

### Phase 1-2: Research

> **No-UI surface:** if the descriptor's `Test Type` has no `UI` surface, Phase 1-2 is skipped entirely and this gate is **NOT run** (checkpoint status `skipped`). The checks below apply only when a Phase 1-2 agent was actually launched.

| Check | Condition |
|-------|-----------|
| Agent return | `status === "success"` AND `coverage === "100%"` |
| Artifact | `{rootFolder}/{debugOutput}/InvestigationLog.md` exists |
| Content | `InvestigationLog.md` is non-empty |
| Artifact | `{rootFolder}/{debugOutput}/ElementsCollected.ts` exists |
| Content | `ElementsCollected.ts` contains at least one entry in `collectedElements` array |

### Phase 3-4: Generation

| Check | Condition |
|-------|-----------|
| Agent return | `status === "success"` AND `tscErrors` is empty array |
| Artifact | At least one `.test.ts` file in `{rootFolder}/{testScenario}/` |
| Artifact | `{rootFolder}/{locatorCache}` exists — **except** when the Test Type has no `UI` surface: `locator_cache` is NOT required (UI layer is not generated); if absent or empty, treat as PASS |
| Artifact | `{rootFolder}/{testTagsMapping}` exists |

Note: `npx tsc --noEmit` is NOT run by the orchestrator at this gate. TypeScript compilation is handled inside the Test Gen Agent subagent and reported via the `tscErrors` field in its return value.

### Phase 5: Validation

| Check | Condition |
|-------|-----------|
| Agent return | `status === "pass"` AND `testResults.failed === 0` AND `testResults.skipped === 0` |
| Artifact | Report files exist in `{rootFolder}/{reportOutput}/` |

## Fix Cycle Protocol

Phase 5 manages fix cycles internally. The orchestrator receives only the final result.

- `status: "pass"` → Phase 5 gate passes, generation complete.
- `status: "fail"` → ask user: `"Tests failed. Continue or abort?"` If continue: re-invoke Phase 5 via Task tool. If abort: write checkpoint with failure state.

## Error Templates

**Malformed Return:**
```
Phase {phaseId} returned malformed data. Expected JSON with "status" field.
Raw return: {truncated first 500 chars}
Retrying... (attempt {retryCount}/{maxRetries})
```

**Missing Artifact:**
```
Phase {phaseId} agent reported success but required artifact not found:
  Expected: {artifactPath}
Retrying... (attempt {retryCount}/{maxRetries})
```

**Content Check Failure:**
```
Phase {phaseId} artifact exists but content check failed:
  Check: {checkDescription}
  File: {artifactPath}
Retrying... (attempt {retryCount}/{maxRetries})
```

**User Escalation:**
```
Phase {phaseId} failed after {maxRetries} attempts.
Last failure: {lastFailReason}

Options:
1. Continue trying (reset retry counter)
2. Abort generation (checkpoint saved at last successful phase)

Your choice:
```
