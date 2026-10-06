# Documentation Index

> Central index of all project documentation, rules, and AI agent primitives.
> Last Updated: 2026-09-30

## Project Entry Points

| Document | Purpose |
|----------|---------|
| [`README.md`](../README.md) | Project overview and getting-started pointer. |
| [`AGENTS.md`](../AGENTS.md) | AI agent instructions, conventions, safety rules, and project structure. |
| [`docs/GETTING_STARTED.md`](GETTING_STARTED.md) | Quick-start pointers for this initialized project. |
| [`CHANGELOG.md`](../CHANGELOG.md) | Version history and notable changes. |

## Configuration & Rules

| Document | Purpose |
|----------|---------|
| [`opencode.json`](../opencode.json) | OpenCode configuration: watcher exclusions, permissions, and MCP servers. |
| [`.opencode/project_init.md`](../.opencode/project_init.md) | Initialization ledger, state, artifact pointers, and open gaps. |
| [`.opencode/rules/.core-version.json`](../.opencode/rules/.core-version.json) | Core template version tracker and file-integrity hashes. |
| [`.opencode/rules/development.md`](../.opencode/rules/development.md) | Technology stack reference and architecture overview. |
| [`.opencode/rules/orchestrator.md`](../.opencode/rules/orchestrator.md) | Workflow orchestration, command routing, and agent behavioral principles. |
| [`.opencode/rules/project/metadata.json`](../.opencode/rules/project/metadata.json) | Project identity: name, repository, environments, template version. |
| [`.opencode/rules/taskmaster/dev_workflow.md`](../.opencode/rules/taskmaster/dev_workflow.md) | TaskMaster development workflow. |
| [`.opencode/rules/taskmaster/taskmaster.md`](../.opencode/rules/taskmaster/taskmaster.md) | TaskMaster tools and commands reference. |

## Cursor-Line Configuration (cross-harness)

> This project is initialized for **two** AI-agent harnesses in parallel: OpenCode (`.opencode/`, template v5.0.0, fully initialized — see above) and Cursor (`.cursor/`, template v4.8.0, set up via `/quick-init`). The two sides describe the same project facts independently; `.cursor/` context-skill answers were ported from the verified `.opencode/` configuration rather than re-collected. `apm.yml` now targets **both** `opencode` and `cursor` — `apm install` has compiled the `test-generation` package for Cursor too, so `.cursor/agents/`, `.cursor/commands/`, and `.cursor/skills/` now carry real `apm compile` output (mirroring `.opencode/agents/`, `.opencode/commands/`, and `.agents/skills/`) in addition to the Workplace Core template and the original `/quick-init` run.

| Document | Purpose |
|----------|---------|
| [`.cursor/mcp.json`](../.cursor/mcp.json) | Cursor MCP configuration. |
| [`.cursorignore`](../.cursorignore) | Cursor indexing exclusions. |
| [`.cursor/rules/.core-version.json`](../.cursor/rules/.core-version.json) | Cursor-line Core template version tracker and file-integrity hashes. |
| [`.cursor/rules/development.mdc`](../.cursor/rules/development.mdc) | Cursor-line technology stack reference (placeholder — run `/initialize` to fill). |
| [`.cursor/rules/orchestrator.mdc`](../.cursor/rules/orchestrator.mdc) | Cursor-line workflow orchestration and command routing. |
| [`.cursor/rules/project/metadata.json`](../.cursor/rules/project/metadata.json) | Cursor-line project identity (mirrors `.opencode/rules/project/metadata.json`). |
| [`.cursor/skills/coding-standards-context/references/guidelines.md`](../.cursor/skills/coding-standards-context/references/guidelines.md) | Cursor-line coding standards (ported from `.opencode/` equivalent — also listed with its config in Core Context Skills below). |
| [`.cursor/skills/infrastructure-context/references/guidelines.md`](../.cursor/skills/infrastructure-context/references/guidelines.md) | Cursor-line infrastructure guidelines (ported from `.opencode/` equivalent — also listed with its config in Core Context Skills below). |
| [`.cursor/project_init.md`](../.cursor/project_init.md) | Cursor-line initialization ledger (mirrors `.opencode/project_init.md`). |

## Core Skills

> Identical skill set exists on both harnesses: `.opencode/skills/<name>/` and `.cursor/skills/<name>/`.

| Skill | OpenCode Location | Cursor Location |
|-------|--------------------|------------------|
| Project Initialization | [`.opencode/skills/project-initialization/SKILL.md`](../.opencode/skills/project-initialization/SKILL.md) | [`.cursor/skills/project-initialization/SKILL.md`](../.cursor/skills/project-initialization/SKILL.md) |
| Project Update | [`.opencode/skills/project-update/SKILL.md`](../.opencode/skills/project-update/SKILL.md) | [`.cursor/skills/project-update/SKILL.md`](../.cursor/skills/project-update/SKILL.md) |
| Documentation Management | [`.opencode/skills/documentation-management/SKILL.md`](../.opencode/skills/documentation-management/SKILL.md) | [`.cursor/skills/documentation-management/SKILL.md`](../.cursor/skills/documentation-management/SKILL.md) |
| Code Quality Standards | [`.opencode/skills/code-quality-standards/SKILL.md`](../.opencode/skills/code-quality-standards/SKILL.md) | [`.cursor/skills/code-quality-standards/SKILL.md`](../.cursor/skills/code-quality-standards/SKILL.md) |
| Codebase Analysis | [`.opencode/skills/codebase-analysis/SKILL.md`](../.opencode/skills/codebase-analysis/SKILL.md) | [`.cursor/skills/codebase-analysis/SKILL.md`](../.cursor/skills/codebase-analysis/SKILL.md) |
| APM Packaging | [`.opencode/skills/apm-packaging/SKILL.md`](../.opencode/skills/apm-packaging/SKILL.md) | [`.cursor/skills/apm-packaging/SKILL.md`](../.cursor/skills/apm-packaging/SKILL.md) |

## Core Context Skills

| Skill | OpenCode Guidelines | OpenCode Config | Cursor Guidelines | Cursor Config |
|-------|----------------------|-------------------|---------------------|------------------|
| Coding Standards | [`.opencode/skills/coding-standards-context/references/guidelines.md`](../.opencode/skills/coding-standards-context/references/guidelines.md) | [`.opencode/skills/coding-standards-context/project-config.json`](../.opencode/skills/coding-standards-context/project-config.json) | [`.cursor/skills/coding-standards-context/references/guidelines.md`](../.cursor/skills/coding-standards-context/references/guidelines.md) | [`.cursor/skills/coding-standards-context/project-config.json`](../.cursor/skills/coding-standards-context/project-config.json) |
| Infrastructure | [`.opencode/skills/infrastructure-context/references/guidelines.md`](../.opencode/skills/infrastructure-context/references/guidelines.md) | [`.opencode/skills/infrastructure-context/project-config.json`](../.opencode/skills/infrastructure-context/project-config.json) | [`.cursor/skills/infrastructure-context/references/guidelines.md`](../.cursor/skills/infrastructure-context/references/guidelines.md) | [`.cursor/skills/infrastructure-context/project-config.json`](../.cursor/skills/infrastructure-context/project-config.json) |

## APM Package Manifest

| File | Purpose |
|------|---------|
| [`apm.yml`](../apm.yml) | APM manifest (`test-generation` dependency + `managed_section` config; now targeting `opencode` + `cursor`). |
| [`apm.lock.yaml`](../apm.lock.yaml) | Reproducible lockfile for installed APM packages. |
| [`.workplace/state.json`](../.workplace/state.json) | Per-package activation state. |

## APM-Installed Commands

> `apm.yml` targets both `opencode` and `cursor`; `apm install` compiles the package separately for each.

| Command | OpenCode Location | Cursor Location |
|---------|--------------------|------------------|
| `/generate-test` | [`.opencode/commands/generate-test.md`](../.opencode/commands/generate-test.md) | [`.cursor/commands/generate-test.md`](../.cursor/commands/generate-test.md) |
| `/additional-input` | [`.opencode/commands/additional-input.md`](../.opencode/commands/additional-input.md) | [`.cursor/commands/additional-input.md`](../.cursor/commands/additional-input.md) |
| `/migrate-atp2` | [`.opencode/commands/migrate-atp2.md`](../.opencode/commands/migrate-atp2.md) | [`.cursor/commands/migrate-atp2.md`](../.cursor/commands/migrate-atp2.md) |
| `/validate-atp2-migration` | [`.opencode/commands/validate-atp2-migration.md`](../.opencode/commands/validate-atp2-migration.md) | [`.cursor/commands/validate-atp2-migration.md`](../.cursor/commands/validate-atp2-migration.md) |
| `/m-tc-design` | [`.opencode/commands/m-tc-design.md`](../.opencode/commands/m-tc-design.md) | [`.cursor/commands/m-tc-design.md`](../.cursor/commands/m-tc-design.md) |

## APM-Installed Agents

| Agent | OpenCode Location | Cursor Location |
|-------|--------------------|------------------|
| `test-gen-agent` | [`.opencode/agents/test-gen-agent.md`](../.opencode/agents/test-gen-agent.md) | [`.cursor/agents/test-gen-agent.md`](../.cursor/agents/test-gen-agent.md) |
| `test-research-agent` | [`.opencode/agents/test-research-agent.md`](../.opencode/agents/test-research-agent.md) | [`.cursor/agents/test-research-agent.md`](../.cursor/agents/test-research-agent.md) |
| `test-validation-agent` | [`.opencode/agents/test-validation-agent.md`](../.opencode/agents/test-validation-agent.md) | [`.cursor/agents/test-validation-agent.md`](../.cursor/agents/test-validation-agent.md) |
| `test-fix-agent` | [`.opencode/agents/test-fix-agent.md`](../.opencode/agents/test-fix-agent.md) | [`.cursor/agents/test-fix-agent.md`](../.cursor/agents/test-fix-agent.md) |
| `reusability-agent` | [`.opencode/agents/reusability-agent.md`](../.opencode/agents/reusability-agent.md) | [`.cursor/agents/reusability-agent.md`](../.cursor/agents/reusability-agent.md) |
| `locator-extractor-agent` | [`.opencode/agents/locator-extractor-agent.md`](../.opencode/agents/locator-extractor-agent.md) | [`.cursor/agents/locator-extractor-agent.md`](../.cursor/agents/locator-extractor-agent.md) |
| `locator-fix-agent` | [`.opencode/agents/locator-fix-agent.md`](../.opencode/agents/locator-fix-agent.md) | [`.cursor/agents/locator-fix-agent.md`](../.cursor/agents/locator-fix-agent.md) |
| `atp2-collector` | [`.opencode/agents/atp2-collector.md`](../.opencode/agents/atp2-collector.md) | [`.cursor/agents/atp2-collector.md`](../.cursor/agents/atp2-collector.md) |
| `atp2-descriptor-builder` | [`.opencode/agents/atp2-descriptor-builder.md`](../.opencode/agents/atp2-descriptor-builder.md) | [`.cursor/agents/atp2-descriptor-builder.md`](../.cursor/agents/atp2-descriptor-builder.md) |
| `atp2-env-exporter` | [`.opencode/agents/atp2-env-exporter.md`](../.opencode/agents/atp2-env-exporter.md) | [`.cursor/agents/atp2-env-exporter.md`](../.cursor/agents/atp2-env-exporter.md) |
| `atp2-env-merger` | [`.opencode/agents/atp2-env-merger.md`](../.opencode/agents/atp2-env-merger.md) | [`.cursor/agents/atp2-env-merger.md`](../.cursor/agents/atp2-env-merger.md) |
| `atp2-migration-validator` | [`.opencode/agents/atp2-migration-validator.md`](../.opencode/agents/atp2-migration-validator.md) | [`.cursor/agents/atp2-migration-validator.md`](../.cursor/agents/atp2-migration-validator.md) |
| `atp2-unit-collector` | [`.opencode/agents/atp2-unit-collector.md`](../.opencode/agents/atp2-unit-collector.md) | [`.cursor/agents/atp2-unit-collector.md`](../.cursor/agents/atp2-unit-collector.md) |

## APM-Installed Skills

> OpenCode deploys skills to `.agents/skills/<name>/` (legacy skill path shim). Cursor deploys the same skills directly to `.cursor/skills/<name>/` — they are **not** also mirrored into `.agents/skills/` for the Cursor target.

| Skill | OpenCode Location | Cursor Location |
|-------|--------------------|------------------|
| `test-generation-orchestrator` | [`.agents/skills/test-generation-orchestrator/SKILL.md`](../.agents/skills/test-generation-orchestrator/SKILL.md) | [`.cursor/skills/test-generation-orchestrator/SKILL.md`](../.cursor/skills/test-generation-orchestrator/SKILL.md) |
| `test-standards` | [`.agents/skills/test-standards/SKILL.md`](../.agents/skills/test-standards/SKILL.md) | [`.cursor/skills/test-standards/SKILL.md`](../.cursor/skills/test-standards/SKILL.md) |
| `test-architecture` | [`.agents/skills/test-architecture/SKILL.md`](../.agents/skills/test-architecture/SKILL.md) | [`.cursor/skills/test-architecture/SKILL.md`](../.cursor/skills/test-architecture/SKILL.md) |
| `test-api-integration` | [`.agents/skills/test-api-integration/SKILL.md`](../.agents/skills/test-api-integration/SKILL.md) | [`.cursor/skills/test-api-integration/SKILL.md`](../.cursor/skills/test-api-integration/SKILL.md) |
| `test-database-helper` | [`.agents/skills/test-database-helper/SKILL.md`](../.agents/skills/test-database-helper/SKILL.md) | [`.cursor/skills/test-database-helper/SKILL.md`](../.cursor/skills/test-database-helper/SKILL.md) |
| `test-ssh-helper` | [`.agents/skills/test-ssh-helper/SKILL.md`](../.agents/skills/test-ssh-helper/SKILL.md) | [`.cursor/skills/test-ssh-helper/SKILL.md`](../.cursor/skills/test-ssh-helper/SKILL.md) |
| `test-locator-management` | [`.agents/skills/test-locator-management/SKILL.md`](../.agents/skills/test-locator-management/SKILL.md) | [`.cursor/skills/test-locator-management/SKILL.md`](../.cursor/skills/test-locator-management/SKILL.md) |
| `test-locator-research` | [`.agents/skills/test-locator-research/SKILL.md`](../.agents/skills/test-locator-research/SKILL.md) | [`.cursor/skills/test-locator-research/SKILL.md`](../.cursor/skills/test-locator-research/SKILL.md) |
| `test-tagging-standards` | [`.agents/skills/test-tagging-standards/SKILL.md`](../.agents/skills/test-tagging-standards/SKILL.md) | [`.cursor/skills/test-tagging-standards/SKILL.md`](../.cursor/skills/test-tagging-standards/SKILL.md) |
| `atp2-migration` | [`.agents/skills/atp2-migration/SKILL.md`](../.agents/skills/atp2-migration/SKILL.md) | [`.cursor/skills/atp2-migration/SKILL.md`](../.cursor/skills/atp2-migration/SKILL.md) |
| `atp2-unit-collection` | [`.agents/skills/atp2-unit-collection/SKILL.md`](../.agents/skills/atp2-unit-collection/SKILL.md) | [`.cursor/skills/atp2-unit-collection/SKILL.md`](../.cursor/skills/atp2-unit-collection/SKILL.md) |

## APM Hooks (Cursor target)

| File | Purpose |
|------|---------|
| [`.cursor/hooks/test-generation/scripts/activate`](../.cursor/hooks/test-generation/scripts/activate) / `.ps1` / `.sh` | Module activation scripts for the Cursor-target deployment of `test-generation` (run directly — the `SessionStart` entry APM writes is inert under Cursor's hooks schema; see `apm-workflow.md` §6.1–6.2). |
| [`.cursor/apm-hooks.json`](../.cursor/apm-hooks.json) | APM's ownership sidecar recording which package wrote the merged `SessionStart` entry in `.cursor/hooks.json`. |

## Module Runtime Folders

| Folder | Purpose |
|--------|---------|
| [`TestGeneration/`](../TestGeneration/) | Test-generation module runtime payload (Playwright/TypeScript tests and shared runtime). |
| [`app-chart/`](../app-chart/) | Helm chart payload from `test-generation`. |
| [`.gitlab/`](../.gitlab/) | GitLab CI registry-config payload from `test-generation`. |

## CI/CD & Infrastructure

| File | Purpose |
|------|---------|
| [`.gitlab-ci.yml`](../.gitlab-ci.yml) | GitLab CI pipeline (build, package, publish). |
| [`Dockerfile.multistage`](../Dockerfile.multistage) | Multistage Docker build for the test runner. |
| [`app-chart/Chart.yaml`](../app-chart/Chart.yaml) | Helm chart metadata. |
| [`app-chart/templates/NOTES.txt`](../app-chart/templates/NOTES.txt) | Helm chart usage notes. |

## Discovered Docs

No additional project-specific documents discovered under `docs/project/`.
