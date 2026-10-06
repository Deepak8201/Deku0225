# Project Development Guidelines

> **Central Development Rule** — Technology stack reference and architecture overview.
>
> Workflow orchestration is handled by [orchestrator.md](orchestrator.md). Specialized agents in `.opencode/agents/` and domain skills in `.opencode/skills/` are discovered and activated natively by OpenCode — subagents by their `description` frontmatter (automatically or via `@name`), skills through the `skill` tool. Each domain skill has a `project-config.json` with project-specific configuration filled during initialization Phase 6.

---

## Project Technology Stack

> **Single Source of Truth:** This section is automatically populated during project initialization (Phase 3).

### Core Technologies

- **Framework:** [TO_BE_FILLED during initialization]
- **Build Tool:** [TO_BE_FILLED during initialization]
- **Styling:** [TO_BE_FILLED during initialization]
- **State Management:** [TO_BE_FILLED during initialization]
- **Testing:** Playwright (via `test-generation` APM package) — see `TestGeneration/package.json`
- **Package Manager:** npm (for the `TestGeneration/` test runtime)
- **TypeScript:** Yes (used by the `TestGeneration/` test runtime)

### Stack Details

- **Framework Version:** [TO_BE_FILLED during initialization]
- **Key Dependencies:** [TO_BE_FILLED - top 5-10 critical packages with versions]
- **Development Tools:** ESLint, Prettier (from `TestGeneration/package.json`)

### Stack Configuration Notes

The application stack has not been selected yet. The `test-generation` module provides a Playwright/TypeScript test runtime with ESLint, Prettier, and Allure reporting. Run `/initialize` to choose the application framework and populate the remaining stack fields.

---

## Architecture Overview

### Architecture Pattern

[TO_BE_FILLED during initialization - e.g., "Monolith", "Microservices", "Modular monolith"]

### Key Architectural Decisions

[TO_BE_FILLED during initialization - major architectural decisions and rationale]

### Data Flow Strategy

[TO_BE_FILLED during initialization - e.g., "REST API", "GraphQL", "tRPC"]

---

## Dependency & Pattern Governance

> Applies to all agents. Full protocol is defined in [orchestrator.md — Agent Behavioral Principles](orchestrator.md).

| Change Type | Required Action |
|-------------|----------------|
| New runtime dependency | Explicit user approval — state what it does, why existing deps can't cover it, and alternatives |
| New dev/build tooling | Discussion with user — state impact on build pipeline and developer workflow |
| New architectural pattern not already in codebase | Discussion with user — state trade-offs vs. existing patterns |
| New framework plugin or major version upgrade | Discussion with user — state migration effort and breaking changes |
| New APM package added to project's `apm.yml` | Discussion with user — state what the package adds (agents, skills, prompts, MCP), `x-workplace.type`, and any runtime folder it relocates (full modules). Re-run `apm install` after editing. The lockfile (`apm.lock.yaml`) MUST be committed. |

When in doubt whether a new dependency or pattern is needed, **ask the user first** with full reasoning before proceeding.

---

## Related Documentation

- [AGENTS.md](../AGENTS.md) - AI agent instructions
- [README.md](../../README.md) - Project overview
- [.opencode/project_init.md](../project_init.md) - Initialization configuration
- [orchestrator.md](orchestrator.md) - Workflow orchestration and command routing

---

## Changelog

<!-- Auto-populated during initialization -->

| Date | Change | Phase |
|------|--------|-------|
| 2026-09-30 | Installed `test-generation` APM package | Post-Quick-Init |
| [TO_BE_FILLED] | Initial configuration | Phase 3 |
| [TO_BE_FILLED] | Domain skills configured | Phase 6 |

> **Template v5.0.0** (2026-09-03): OpenCode line — port of the Cursor-line 4.8.0 template to OpenCode 1.18.27 and the APM 0.28.0 `opencode` target. Release notes: CHANGELOG.md (this line starts at 5.0.0).
