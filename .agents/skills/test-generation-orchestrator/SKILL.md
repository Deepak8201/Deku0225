---
name: test-generation-orchestrator
description: Orchestration of end-to-end test code generation - pre-flight checks, phase sequence, subagent selection per phase, gate verification, and checkpoint recovery. Use when running /generate-test or /additional-input, when a test description file must be turned into test code, or when resuming from GenerationCheckpoint.json.
---

# Test Generation Orchestrator

Orchestrate end-to-end test code generation by sequentially launching subagents through a strict Phase Gate workflow with checkpoint-based recovery.

## When to Use This Skill

- User runs `/generate-test` command
- User provides a test description file and asks for test creation
- An existing `GenerationCheckpoint.json` is found and the user wants to resume
- User runs `/additional-input` command

---

## Role

You are the **ORCHESTRATOR ONLY**. You read agent files, construct prompts, launch subagents via Task tool, verify gate artifacts, and write checkpoints. You never perform phase work yourself.

---

## Absolute rules — never violate these

- **NEVER write agent instructions into the `prompt` from memory.** Always read the agent file via Read tool first and copy the full output as AGENT_CONTENT. If you find yourself writing "You are the X Agent..." or describing what the agent should do — STOP. Re-read the file. See `references/orchestration-protocol.md` — Mandatory Invocation Model for the exact procedure including the self-check.
- **NEVER perform phase work inline.** All phase work belongs to subagents: code generation, browser navigation, test execution, locator research, file writing to `tests/`. See `references/orchestration-protocol.md` — Delegation Violation Detection for the exact list of prohibited tool calls.
- **NEVER skip Phase Gates.** Verify artifacts on disk independently after each phase. Agent self-reported status alone is insufficient.
- **NEVER exceed `maxRetriesPerPhase`.** At the limit: ask user.
- **NEVER infer what a failing agent should do differently.** Re-launch the same agent with the same prompt. The agent's internal retry and fix logic handles failures.
- **NEVER advance to the next phase without user confirmation if `config.execution.confirmBeforeContinue === true`.** Before each phase: present the phase name, subagent type, and input summary. Wait for explicit "yes" before proceeding. After each phase: present gate result before moving on.

---

## Inputs

- Test description file path (from user via `/generate-test` command)
- Module config: `.workplace/test-generation/config.json`

---

# Workflow

## Step 1 — Input validation

1. Check if test description path was provided. If missing: ask user.
2. Verify the file exists and is non-empty (`Test-Path` plus a length check) — do **not** read it into context.
3. Store `testDescriptionPath`. Every subagent receives the path; the descriptor is never inlined into a prompt. See `references/orchestration-protocol.md` — "Reading the test descriptor" for the anchors an agent uses to open the part it needs.

## Step 2 — Read module config

1. Read `.workplace/test-generation/config.json`.
2. Extract `rootFolder`, `paths.*`, `importBasePath`, `execution.*`.
3. Construct full paths: `{rootFolder}/{paths.xxx}` for each path entry.
4. Resolve: `maxRetriesPerPhase`, `confirmBeforeContinue`, `playwrightParams`.

## Step 3 — Check for existing checkpoint

1. Check if `{rootFolder}/{paths.debugOutput}/GenerationCheckpoint.json` exists.
2. If found: display last completed phase and timestamp → ask "Resume or restart?"
   - Resume: skip completed phases, verify their artifacts still exist on disk.
   - Restart: delete checkpoint, proceed to Phase -1.
3. If not found: proceed to Phase -1.

See `references/state-management.md` for checkpoint format and recovery protocol.

## Step 4 — Pre-flight checks (Phase -1)

Perform directly (not delegated). All checks before Phase 0.

### Check 1: npm dependencies

```
1. Check if {rootFolder}/node_modules exists
2. If missing: run npm install --prefix {rootFolder}
3. If present: npm list ssh2 --prefix {rootFolder} && npm list oracledb --prefix {rootFolder}
4. If any missing: run npm install --prefix {rootFolder}
```

### Check 2: SharedRuntime import paths

Scan `{rootFolder}/{paths.sharedRuntime}/*.ts` for legacy imports:

```typescript
// ❌ Legacy — will cause TypeScript errors
import { AIPage } from 'Engine/Shared/AIPage';

// ✅ Correct
import { AIPage } from './AIPage';
```

If legacy imports found: warn user, offer auto-fix (StrReplace `Engine/Shared/{X}` → `./{X}`).

### Check 3: TestTagsMapping.json schema

If file exists at `{rootFolder}/{paths.testTagsMapping}`: verify each entry has nested `tags` object:

```json
{ "tc_id": { "testId": "tc_id", "testFile": "...", "tags": { "priority": "P1" } } }
```

Flat structure (missing nested `tags`) is an error. Offer auto-fix.

### Check 4: Debug output directory

If `{rootFolder}/{paths.debugOutput}` does not exist: create it. This check never fails.

### Check 5: Locator cache path consistency

1. Read `{rootFolder}/{paths.sharedRuntime}/LocatorCacheManagement.ts`.
2. Find `CACHE_CONFIG.CACHE_FILE_PATH`. It must equal `config.paths.locatorCache`.
3. If mismatch: warn user, offer to update `LocatorCacheManagement.ts`.

### Check 6: Test description completeness

Check by `Grep` on `{testDescriptionPath}`, not by reading the file:

```
- Has test ID
- Has at least one step block (`### Step `)
- If API mentioned: has an endpoint/URL or a resolvable `Contract: C<N>`
- If DB mentioned: has table/query
```

If issues found: warn user, ask "Continue with potentially incomplete description?"

### Check 7: Env config file

The generated `environment-configuration.json` is the source of truth; the `ATP_ENVGENE_CONFIGURATION` environment variable is a deprecated fallback only.

1. Check if `{rootFolder}/{paths.envConfig}` exists and is valid JSON. If yes → OK.
2. If missing: check the `ATP_ENVGENE_CONFIGURATION` environment variable (backward-compat fallback). If set and valid JSON → OK, but warn the user that the deprecated fallback is in use and recommend generating the file.
3. If neither is available: warn user. Let `ENV_LOCAL` be the folder containing `{rootFolder}/{paths.envConfig}` and `ENV_DIR` its parent (concretely `TestGeneration/environment-configuration/local-environment-configuration/` and `TestGeneration/environment-configuration/`), then report —

```
No environment configuration found at {rootFolder}/{paths.envConfig}.
Generate it:
  1. pick or create a template in {ENV_DIR}/environment-configuration-template-<name>.json
  2. create {ENV_LOCAL}/env-<name>.yaml with the real values (gitignored)
  3. run: .\environment-configuration\setEnvironmentScript.ps1 -TemplateFile "environment-configuration-template-<name>.json" -EnvFile "env-<name>.yaml"
     (from {rootFolder}; see {ENV_LOCAL}/LOCAL-SETUP.md)
```

Live-navigation phases (research, locator-fix) require it to resolve `{{SYSTEM.field}}` placeholders.

### Pre-flight summary

```
✓ Pre-flight checks complete
  - Dependencies: OK
  - SharedRuntime imports: OK
  - JSON schemas: OK
  - Debug output directory: OK
  - Locator cache path: OK
  - Test description: OK
  - Env config: OK

Proceeding to Phase 0...
```

## Step 5 — Execute phase sequence

1. **Read `.cursor/skills/test-generation-orchestrator/references/orchestration-protocol.md` now** (via Read tool). It contains the exact Task tool parameters, context variables, Gate Definitions, violation detection rules, and error templates. Do not launch any phase without reading it first.

2. **Determine whether Phase 1-2 runs at all.** Read the `Test Type` surface set by opening the descriptor's `## Overview` section only — `Grep` for `## Overview`, then `Read` that range. Do not read the whole file. Pure deterministic check, no inference:

   ```
   IF the Test Type surface set contains "UI"  (e.g. "UI", "UI + API")
     → Phase 1-2 RUNS (UI research / locators).
   ELSE  (no UI surface — e.g. "API", "API + DB", "SSH")
     → SKIP Phase 1-2; proceed directly from Phase 0 to Phase 3-4.
   ```

   When skipped, follow the exact mechanics in **orchestration-protocol.md → "Phase 1-2 — SKIPPED (no-UI path)"** (already read in sub-step 1).

3. If Phase 1-2 RUNS (Test Type contains `UI`), determine which Phase 1-2 agent to use:

   ```
   IF `Grep` on {testDescriptionPath} finds at least one action line matching the pattern
      "→ `page." (i.e. an arrow followed by a Playwright locator expression)
     → Phase 1-2 agent: Locator Extractor  (subagent_type: "generalPurpose")
       agent file: .cursor/agents/locator-extractor-agent.md
       Launch Template: "Phase 1-2 — Locator Extractor Agent (codegen path)"
   ELSE
     → Phase 1-2 agent: Test Research      (subagent_type: "browser-use")
       agent file: .cursor/agents/test-research-agent.md
       Launch Template: "Phase 1-2 — Test Research Agent (MCP path)"
   END
   ```

   Both paths produce identical gate artifacts (`ElementsCollected.ts`, `InvestigationLog.md`) and the same gate checks apply regardless of which agent was used.

   When using the **Locator Extractor** path, before launching Phase 1-2 read `{rootFolder}/tests/TestDesign/TestDesignPreparation/test-track.md` if it exists and pass its full content as **Test Track Content** in the Task prompt (see orchestration-protocol.md). If the file does not exist, pass `not provided`.

4. Execute phases in order: Phase 0 → Phase 1-2 (skipped when Test Type has no `UI`) → Phase 3-4 → Phase 5. Follow Launch Templates and Gate Definitions from `orchestration-protocol.md`.

**Phase 5 failure:** The Validation Agent manages fix cycles internally. If it returns `status: "fail"`:
1. Read `{rootFolder}/{paths.debugOutput}/FixContext.json` to get the last error state.
2. Present diagnostics to user:
   ```
   Phase 5 failed after {fixCyclesUsed} fix cycle(s).
   Last error: {failingTests[0].errorMessage (first 300 chars)}
   Error type: {failingTests[0].errorType}
   Failing test: {failingTests[0].testFile}

   Options:
   1. Provide a fix instruction (/additional-input)
   2. Continue (re-run Phase 5 with new fix cycles)
   3. Abort
   ```
3. If user provides a `/additional-input` instruction: follow Human Intervention Protocol.
4. If user chooses continue: re-launch Phase 5.
5. If user chooses abort: write checkpoint with failure state.

## Step 6 — Completion

1. Write final `GenerationCheckpoint.json` with all phases completed.
2. Present summary: generated files, test results (pass count, duration), any warnings.
3. Confirm: "Test generation complete. All tests passing."

---

## Human Intervention Protocol

When triggered by `/additional-input`: read `references/human-intervention.md` via Read tool and follow it entirely. All instructions for classification, clarification dialogue, and execution routing are defined there.

---


## Subagent Definitions

| Agent | File | subagent_type | Phase | Condition |
|---|---|---|---|---|
| Reusability | `.cursor/agents/reusability-agent.md` | `reusability-agent` | 0 | Always |
| Test Research | `.cursor/agents/test-research-agent.md` | `browser-use` | 1-2 | Test Type contains `UI` AND no `Locator hint (from codegen)` in description |
| Locator Extractor | `.cursor/agents/locator-extractor-agent.md` | `generalPurpose` | 1-2 | Test Type contains `UI` AND `Locator hint (from codegen)` present in description |
| _(Phase 1-2 skipped)_ | — | — | 1-2 | Test Type has no `UI` surface → no agent, Phase 1-2 skipped entirely |
| Test Gen | `.cursor/agents/test-gen-agent.md` | `test-gen-agent` | 3-4 | Always |
| Test Validation | `.cursor/agents/test-validation-agent.md` | `test-validation-agent` | 5 | Always |

---

## References

| Reference | Path | Use |
|---|---|---|
| Orchestration Protocol | `references/orchestration-protocol.md` | Exact Task tool parameters, Phase Gate logic, violation detection, error templates |
| State Management | `references/state-management.md` | Checkpoint format, recovery protocol |
| Human Intervention | `references/human-intervention.md` | `/additional-input` classification, clarification dialogue, execution routing |

---

## Configuration Reference

| Field | Purpose |
|---|---|
| `rootFolder` | Base directory for all test artifacts |
| `paths.*` | Relative paths under rootFolder |
| `importBasePath` | Import prefix for SharedRuntime base classes |
| `testIdFormat` | Test case ID naming pattern |
| `execution.params` | Playwright CLI flags |
| `execution.maxRetriesPerPhase` | Max re-launches per phase before user escalation |
| `execution.confirmBeforeContinue` | Present phase plan and wait for approval before each Task launch |

---

# Checklist

- [ ] `.cursor/skills/test-generation-orchestrator/references/orchestration-protocol.md` read via Read tool before executing any phase (Step 5 sub-step 1).
- [ ] Agent file read via Read tool before every Task tool invocation — fresh read every time, including retries and re-runs.
- [ ] prompt starts with AGENT_CONTENT (first line is "---", all section headers present) — verified before Task tool call.
- [ ] prompt contains no role descriptions or phase summaries written from memory.
- [ ] The test descriptor was passed as `Test Description Path` and never inlined into a prompt; the orchestrator's own reads of it were section-scoped.
- [ ] No inline phase work performed (no browser_*, no artifact writes, no playwright test).
- [ ] Each Phase Gate verified independently on disk — not just relying on agent return status.
- [ ] Checkpoint written after each successful gate.
- [ ] `confirmBeforeContinue` check performed before EVERY Task tool call — user confirmed each phase.
- [ ] Phase 5 re-run (after CONTINUE): same Task call as initial run — no extra context added to prompt.
- [ ] At `maxRetriesPerPhase` limit: asked user before continuing.
