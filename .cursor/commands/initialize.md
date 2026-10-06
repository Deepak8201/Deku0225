# Initialize Project

> **Core Command** - Starts the AI-powered project initialization workflow

## Overview

This command launches the project initialization process. The AI agent automatically reads the configuration file and guides you through setup.

> **Reference documentation.** The user-facing description of this workflow — entry points, mode auto-detection, the phase-by-phase reference, the verification checklist and troubleshooting — is [`docs/core/INITIALIZATION.md`](https://git.netcracker.com/DEMO.SE.AI/nc-ai-workplace/-/blob/master/docs/core/INITIALIZATION.md) in the AI Workplace template repo, and the role catalogue is [`docs/core/ROLES.md`](https://git.netcracker.com/DEMO.SE.AI/nc-ai-workplace/-/blob/master/docs/core/ROLES.md). Neither is copied into an initialized project: resolve them via [`workplace-docs.md`](../skills/project-initialization/references/workplace-docs.md), or run `node .cursor/skills/project-initialization/scripts/fetch-workplace-doc.js core/INITIALIZATION.md`. The executable procedure remains the `project-initialization` skill and its `references/` — those documents explain it to the **user**.

## How to Use

Type `/initialize` in Cursor chat to start the initialization process.

### Resuming an interrupted run

`/initialize --resume` is a convenience spelling only. Plain `/initialize` and the phrase "continue the initialization" behave identically, because **the agent detects resumption from state on disk, not from the command text**: an incomplete `## Phase Checklist` in `.cursor/project_init.md` means resume, and the run continues from the first unticked phase without re-asking anything already in the Decision Log. See `project-initialization/SKILL.md → Safe Stop Points and Resumption`.

## Agent Instructions

**When this command is triggered, the AI agent MUST:**

1. **Delegate to Initializer Agent:**
   - Read the agent definition at `.cursor/agents/initializer.md`
   - The Initializer reads the `project-initialization` skill for phase orchestration
   - The Initializer reads phase reference docs from `skills/project-initialization/references/` as needed

2. **The Initializer Agent will:**
   - Read `.cursor/project_init.md` configuration file
   - Check `.cursor/rules/.core-version.json` for update vs fresh detection
   - If update scenario → delegate to Project Updater agent (`agents/project-updater.md`)
   - If fresh → execute all initialization phases (0-8)
   - Fill `development.mdc` and domain skill `project-config.json` files during Phase 6
   - Generate documentation and registry during Phase 7/7.5

## Prerequisites

- `.cursor/project_init.md` file must exist in project (included in template)

## Troubleshooting

### Agent doesn't start initialization
- Ensure you're in Agent mode (not Ask or Edit mode)
- Verify `.cursor/project_init.md` exists in project
- Try explicit prompt: "Read .cursor/project_init.md and initialize my project"

### Initialization stalls at a phase
- Ask agent: "Continue with phase [N]"
- Or: "Skip current step and proceed"

### The session ended mid-initialization
- Start a fresh chat and run `/initialize` (or `/initialize --resume`, or just "continue the initialization")
- The agent reads the ledger and the artifacts, validates the ticked phases against them, and continues from the first unticked phase
- Answers already recorded in `## User Answers & Decision Log` are never asked again; genuinely missing ones surface as items under `## Open Gaps`

---

*This is a Core command. For project-specific workflows, create custom commands in `.cursor/commands/` with a `project-` prefix.*
