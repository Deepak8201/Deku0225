# Human Intervention Protocol

Triggered when the user runs `/additional-input` with an instruction in natural language. Requires an active `GenerationCheckpoint.json`.

---

## Step 1 — Load context

1. Read `GenerationCheckpoint.json` — note `lastCompletedPhase` and all phase statuses.
2. Read `FixContext.json` if it exists — note what the last automatic fix cycle targeted.
3. Read `test-results.json` from `{rootFolder}/{paths.reportOutput}/` if it exists — note actual test errors and stdout.

---

## Step 2 — Classify the instruction

Classify the user instruction into exactly one category. When multiple categories could apply, show classification to user and ask to confirm before proceeding.

| Category | Key signals in user text | Examples |
|---|---|---|
| `code_fix` | Wrong component targeted, wrong method, timing/sync issue, logic error | "problem is in X not Y", "the year dropdown is selected before the picker opens" |
| `locator_fix` | Element not found, wrong element clicked, locator doesn't match | "button is not found", "wrong element selected", "locator doesn't work" |
| `test_update` | Missing steps, wrong step order, step needs change, forgot to describe something | "after step 8 also need to verify", "forgot to add", "step 5 should click X instead" |

---

## Step 3 — Clarification dialogue (before any execution)

**For `code_fix` and `locator_fix`:** If the instruction mentions a specific file/method → proceed. If it is vague ("something is wrong with DOB") → ask: "Which file and method should be fixed? Or should I look at the last failing test output to determine it?"

**For `test_update`:** Always enter clarification dialogue before execution. Do NOT start any agent until all four conditions are met:

1. **Steps are clear** — if user described steps in natural language without file/element references, confirm your interpretation: present a numbered list of the new/changed steps and ask "Is this correct?"
2. **Test description is updated** — the test description `.md` file must reflect the new steps. If it is not yet updated: write the proposed additions to the file yourself (orchestrator may write to the test description file — it is not under `tests/`), then ask user to confirm or correct.
3. **Elements scope is known** — check `ElementsCollected.ts` for each new UI element mentioned. Categorize: `EXISTING` (already researched) vs `NEW` (needs research). Show this to user.
4. **All information available** — if any `NEW` elements exist: ask user to provide `Locator hint (from codegen)` blocks for the new elements OR confirm that live MCP research is needed.

---

## Step 4 — Execute

**`code_fix` path:**
1. Build a new `FixContext.json`:
   - `fixType`: `"code"`
   - `errorType`: `"code_error"`
   - `failingTests[0].errorMessage`: compose from user instruction + technical context (class names, method names, file paths) gathered from reading relevant source files
   - `failingTests[0].testFile`: from checkpoint or last test-results
   - All `paths` and `config` fields: from module config
2. Write `FixContext.json` to `{rootFolder}/{paths.debugOutput}/FixContext.json`.
3. Read `.cursor/agents/test-fix-agent.md` via Read tool → launch via Task tool:
   - `subagent_type`: `"test-fix-agent"`
   - `description`: `"User Fix: {one-line summary of instruction}"`
   - `prompt`: AGENT_CONTENT + `"\n\n---\nCONTEXT:\n"` + full FixContext.json content + root folder + full config
4. After agent completes: proceed to **Step 5**.

**`locator_fix` path:**
1. Identify the failing element key from user instruction + `locator_cache.json` + `ElementsCollected.ts`.
2. Build `FixContext.json` with `fixType: "locator"`, `errorType: "locator_not_found"`, `timeoutAtLine` if known.
3. Write `FixContext.json`.
4. Read `.cursor/agents/test-fix-agent.md` → launch via Task tool (same as `code_fix` path).
5. After agent completes: proceed to **Step 5**.

**`test_update` path:**
1. Test description file is already updated (confirmed in Step 3).
2. Determine minimum phase set:
   - All new elements are `EXISTING` → start from **Phase 3-4** (incremental re-generation of affected files only)
   - Any `NEW` elements exist → start from **Phase 1-2** (locator extraction or MCP research for new elements only, then Phase 3-4)
3. Present plan to user: "I will run Phase X → Phase Y → Phase 5. Proceed?"
4. Wait for confirmation, then execute phases using the same Launch Templates from `orchestration-protocol.md`.

---

## Step 5 — Record and resume

1. Write intervention record to `GenerationCheckpoint.json` (see `state-management.md` for format).
2. Resume Phase 5 using the standard Phase 5 Launch Template from `orchestration-protocol.md`.

---

## Absolute rules

- **Never modify files under `{rootFolder}/tests/`** — only subagents do that. The one exception: you MAY write to the test description file (it is outside `tests/`).
- **Never start execution while any clarification is unresolved.**
- **Never skip Phase 5** after an intervention — always re-validate.
- **FixContext.json ownership:**
  - **Automatic fix cycle** (`/generate-test` Phase 5): written by the **Test Validation Agent** before each Task spawn of `test-fix-agent`.
  - **Human intervention** (`/additional-input`, `code_fix` / `locator_fix`): written by the **orchestrator** in Step 4 before launching `test-fix-agent`.
  - The fix agent does not care who wrote the file — it only reads FixContext from disk.

---

## Checklist

- [ ] Instruction classified into exactly one category before any execution.
- [ ] Ambiguous classification shown to user and confirmed before proceeding.
- [ ] `code_fix` / `locator_fix`: FixContext.json built from user instruction + technical context from source files.
- [ ] `test_update`: all 4 clarification conditions met (steps clear, description updated, elements scoped, info complete).
- [ ] `test_update`: minimum phase set determined — no phases re-run unnecessarily.
- [ ] Phase plan presented to user and confirmed before execution (`test_update` and when `confirmBeforeContinue` is true).
- [ ] Intervention recorded in `GenerationCheckpoint.json` as `user-intervention-{N}` after subagents complete.
- [ ] Phase 5 re-run after every intervention without exception.
