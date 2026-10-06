# State Management

Checkpoint format, session recovery protocol, and progress tracking.

## GenerationCheckpoint.json

**Location:** `{rootFolder}/{paths.debugOutput}/GenerationCheckpoint.json`

**Owner:** Orchestrator (writes after each successful phase gate)

### Format

```json
{
  "testDescriptionPath": "path/to/test-description.md",
  "lastCompletedPhase": "research",
  "phaseResults": {
    "reusability": {
      "status": "complete",
      "outputFile": "tests/Raw/Debug/ReusabilityAnalysis.md",
      "completedAt": "2026-03-25T10:15:00Z"
    },
    "research": {
      "status": "complete",
      "outputFile": "tests/Raw/Debug/InvestigationLog.md",
      "completedAt": "2026-03-25T10:30:00Z"
    },
    "generation": {
      "status": "pending"
    },
    "validation": {
      "status": "pending"
    }
  },
  "config": {
    "rootFolder": "TestGeneration",
    "importBasePath": "TestGeneration/SharedRuntime"
  },
  "timestamp": "2026-03-25T10:30:00Z",
  "version": "1.0.0"
}
```

Paths under `outputFile` are relative to `config.rootFolder` as in `.workplace/test-generation/config.json`; adjust if your module uses a different `rootFolder`.

### Phase IDs

| Phase ID | Subagent | Description |
|----------|----------|-------------|
| `reusability` | Reusability Agent | Phase 0: Analyze existing code |
| `research` | Test Research Agent | Phase 1-2: Investigate pages, collect locators |
| `generation` | Test Gen Agent | Phase 3-4: Generate test code |
| `validation` | Test Validation Agent | Phase 5: Execute Playwright tests |
| `user-intervention-{N}` | Varies | Human-directed fix or test update (N = 1, 2, 3…) |

### Status Values

| Status | Meaning |
|--------|---------|
| `pending` | Phase not started |
| `complete` | Phase gate passed, artifacts verified |
| `failed` | Phase failed (checkpoint saved for diagnostics) |

### User Intervention Record Format

When the orchestrator completes a `/additional-input` intervention, it appends a record to `GenerationCheckpoint.json` phases map using the key `user-intervention-{N}` where N increments from 1.

```json
"user-intervention-1": {
  "status": "complete",
  "category": "code_fix",
  "userInstruction": "DOB picker race condition — year selected before popup open",
  "agentsUsed": ["test-fix-agent"],
  "resumedFrom": "5",
  "completedAt": "2026-06-02T10:00:00Z"
}
```

For `test_update` interventions that required re-running earlier phases:

```json
"user-intervention-2": {
  "status": "complete",
  "category": "test_update",
  "userInstruction": "Added step 9 — verify account status before payment instrument",
  "agentsUsed": ["test-gen-agent"],
  "phasesReRun": ["3-4", "5"],
  "newElementsResearched": false,
  "completedAt": "2026-06-02T11:00:00Z"
}
```

Fields:

| Field | Required | Description |
|-------|----------|-------------|
| `status` | Yes | Always `"complete"` — failed interventions are retried, not saved as failed |
| `category` | Yes | `"code_fix"`, `"locator_fix"`, or `"test_update"` |
| `userInstruction` | Yes | Short summary (≤ 100 chars) of what the user asked for |
| `agentsUsed` | Yes | List of agent names that ran during this intervention |
| `resumedFrom` | For fix types | Phase ID that was re-run after the fix |
| `phasesReRun` | For test_update | List of phase IDs that were executed |
| `newElementsResearched` | For test_update | `true` if Phase 1-2 was re-run for new elements |
| `completedAt` | Yes | ISO timestamp |

## Recovery-on-Resume Protocol

When the orchestrator starts and finds an existing `GenerationCheckpoint.json`:

```
1. Read checkpoint file
2. Display to user:
   "Found existing generation checkpoint:
    - Test description: {testDescriptionPath}
    - Last completed phase: {lastCompletedPhase}
    - Timestamp: {timestamp}
    
    Options:
    1. Resume from {nextPhase}
    2. Restart from beginning (delete checkpoint)
    3. Cancel"

3. If user chooses RESUME:
   - Verify all completed phase artifacts still exist on disk
   - If any artifact missing: warn user, suggest restart
   - If all artifacts present: load prior outputs into context, start from next phase
   
4. If user chooses RESTART:
   - Delete GenerationCheckpoint.json
   - Optionally delete prior debug output files (ask user)
   - Start from Phase 0

5. If user chooses CANCEL:
   - Exit without changes
```

## ResearchProgress.md

**Location:** `{rootFolder}/{paths.debugOutput}/ResearchProgress.md`

**Owner:** Test Research Agent (for mid-phase checkpointing of complex scenarios)

This file tracks progress within the research phase when investigation spans multiple browser sessions or encounters complexity that prevents completing all steps in one pass.

### Format

```markdown
# Research Progress Tracking

## Current Status
- Completion: 60%
- Session: 2
- Date: 2026-03-25

## Completed Test Steps
### Steps 1-5: Login Flow
- **Status**: COMPLETE
- **Type**: EXISTING components (from ReusabilityAnalysis.md)
- **Components**: LoginPage, LoginWorkflow (reused)

### Steps 6-10: Navigation Flow
- **Status**: COMPLETE
- **Type**: NEW components
- **Investigation**: InvestigationLog.md (lines 50-120)
- **Elements Collected**: ElementsCollected.ts (items 1-8)

## Remaining Test Steps
### Steps 11-15: Data Entry Flow
- **Status**: PENDING
- **Type**: NEW components (need investigation)
- **Next Actions**: Navigate to DataEntryPage, collect elements

## Checkpoint
- Current Position: After step 10
- Next Step: Begin step 11
- Resume Point: Navigate to data entry form
```

## Checkpoint Write Timing

The orchestrator writes the checkpoint file only after the Phase Gate passes (not on agent return):

```
1. Agent completes → return value received
2. Phase Gate checks executed (return + artifacts + content)
3. IF gate PASSES:
   - Update checkpoint: set phase status to "complete", record outputFile and timestamp
   - Write checkpoint to disk
   - Advance to next phase
4. IF gate FAILS:
   - Do NOT update checkpoint
   - Retry or escalate
```

This ensures the checkpoint always reflects verified, trustworthy state.
