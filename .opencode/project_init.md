# Project Initialization Ledger

> **Compact state and audit log for project initialization.**
> To complete full configuration later, run **`/initialize`** in OpenCode.
>
> This file is intentionally thin: it records initialization state, user decisions and pointers to authoritative artifacts. Domain knowledge, stack details, architecture descriptions and behavioural rules live elsewhere — see [Artifact Pointers](#artifact-pointers).

---

## How This Works

When you run **`/initialize`**, the agent will:

1. **Detect initialization mode** — auto-detected from `.opencode/rules/.core-version.json` and file signals.
2. **Run phases progressively** — collect role(s), metadata, stack, architecture, requirements; persist findings to authoritative artifacts.
3. **Record every user answer here** — under `User Answers & Decision Log`, grouped by phase.
4. **Persist runtime knowledge into authoritative files**:
   - Stack and architecture summary → `.opencode/rules/development.md`.
   - Project identity → `.opencode/rules/project/metadata.json`.
   - Domain facts and constraints → `<skills-root>/<domain>-context/project-config.json`.
   - Agent-facing project rules → `<skills-root>/<domain>-context/references/guidelines.md`.
   - `<skills-root>` = `.opencode/skills/` for the two Core context skills, `.agents/skills/` for APM-installed context skills.
   - Documentation index and project docs → `docs/INDEX.md`, root `AGENTS.md`, root `README.md`.
5. **Generate a short summary** in this file when done.

---

## Source-of-Truth Map

| Knowledge | Authoritative artifact | Used by |
|-----------|------------------------|---------|
| Stack + architecture summary | `.opencode/rules/development.md` | All agents |
| Project identity | `.opencode/rules/project/metadata.json` | Tooling, deployment scripts |
| Per-domain facts | `<skills-root>/<domain>-context/project-config.json` | Domain context skills |
| Agent-facing project rules per domain | `<skills-root>/<domain>-context/references/guidelines.md` | Agents that load the matching skill |
| Documentation index | `docs/INDEX.md` | Navigation |
| Repo-wide conventions, project overview | Root `AGENTS.md`, `README.md` | Always-loaded |
| MCP servers | `opencode.json` (`mcp` block) | OpenCode MCP integration |

---

## Initialization State

| Field | Value |
|-------|-------|
| **Current Mode** | NEW_PROJECT (empty template shell, no application code) |
| **Selected Role(s)** | (Quick Init — no roles selected) |
| **Current Phase** | Quick Init complete |
| **Initialization Status** | `active` |
| **Started** | 2026-09-30T10:36:00Z |
| **Completed** | 2026-09-30T10:54:00Z |
| **Template Version** | 5.0.0 |

---

## Artifact Pointers

| Artifact | Path | Status |
|----------|------|--------|
| Project identity | `.opencode/rules/project/metadata.json` | Created |
| Stack + architecture | `.opencode/rules/development.md` | Present (placeholder) |
| docs-sync plugin config | `.opencode/hooks/docs-sync-config.json` | Not created (default enabled) |
| MCP configuration | `opencode.json` (`mcp` block) | Created |
| APM manifest | `apm.yml` | Created (test-generation installed) |
| APM lockfile | `apm.lock.yaml` | Created |
| APM activation state | `.workplace/state.json` | Created (test-generation active) |
| APM-deployed agents | `.opencode/agents/` | Populated by test-generation |
| APM-deployed commands | `.opencode/commands/` | Populated by test-generation |
| APM-deployed skills | `.agents/skills/` | Populated by test-generation |
| Documentation index | `docs/INDEX.md` | Created |
| Root AGENTS.md | `AGENTS.md` | Created |
| Root README.md | `README.md` | Created |
| Domain configs (core skills) | `.opencode/skills/{coding-standards,infrastructure}-context/project-config.json` | Created, initialized |
| Domain guidelines (core skills) | `.opencode/skills/{coding-standards,infrastructure}-context/references/guidelines.md` | Rendered, no placeholders |
| Optional architecture/stack/contributing docs | `docs/project/*` | Not created |

---

## Phase Checklist

Phases: `0 → 0.5 → 1 → 1.5 → 1.6 → 1.7-APM → 2 → 3 → 4 → 5 → 6 → 6.5 → 7 → 7.5 → 8`.

- [x] **Phase 0** — APM CLI bootstrap (installed 0.32.0, persisted to `.core-version.json`)
- [x] **Phase 0.5** — Environment setup (`opencode.json` created, commands dir inventoried, docs-sync default enabled)
- [x] **Phase 1** — Mode detection (NEW_PROJECT — empty template shell)
- [x] **Phase 1 reflection completed** (no questions needed; signals were unambiguous)
- [ ] **Phase 1.5** — User role(s) selected, MCP configuration written *(skipped in Quick Init)*
- [x] **Phase 1.6** — `.opencode/commands/` inventoried (6/6 Core commands present)
- [x] **Phase 1.7-APM** — APM package activation *(manually added `test-generation` after Quick Init; installed and activated)*
- [x] **Phase 2** — Project metadata collected → `metadata.json`
- [x] **Phase 2 reflection completed** (no adaptive questions needed)
- [ ] **Phase 3** — Technology stack determined → `development.md` *(not configured in Quick Init)*
- [ ] **Phase 4** — Codebase analysis *(Explore subagent only; no Phase 4 artifacts produced)*
- [ ] **Phase 5** — Requirements gathering *(not run in Quick Init)*
- [x] **Phase 6** — Core domain skills configured and `guidelines.md` rendered (Part 3.5 hard gate passed)
- [x] **Phase 6 reflection completed** (no questions needed; defaults applied for empty project)
- [x] **Phase 6.5** — Project identity recorded in `metadata.json`
- [x] **Phase 7** — `AGENTS.md` and `README.md` generated/updated
- [x] **Phase 7.5** — `docs/INDEX.md` generated, forward link verified
- [x] **Phase 8** — `.core-version.json` hashes computed, `initializationStatus` → `active`, docs-sync baseline recorded

---

## Supplemental Source Manifest

No supplemental sources were collected — Quick Init does not run Phase 4/5/6 API analysis or requirement gathering.

| Source | Provenance | Consumed by domain(s) | Pointer |
|--------|-----------|----------------------|---------|
| API specifications | none | `api-context` | none — no API surface detected |
| Endpoint analysis | none | `api-context` | none |
| Codebase analysis artifacts | Quick Init Explore subagent | all domains | Summary only; no persistent artifacts |
| Architecture description | none | `backend-context`, `infrastructure-context` | none |
| Database schema files | none | `database-context`, `api-context` | none |
| API test files | none | `api-context`, `testing-context` | none |
| BASS Security Guides | not installed | `security-compliance` | package not installed |
| Performance budgets | none | `performance-context`, `frontend-context` | none |
| Compliance pre-checks | none | all applicable | none |

---

## User Answers & Decision Log

### Phase 0 — APM CLI Bootstrap

#### Q1: Install APM CLI?
- What I found: `apm` not on PATH.
- Question asked: "APM CLI is required if you want to install optional AI Workplace packages now. I can install it via `irm https://aka.ms/apm-windows | iex`. Shall I run it? (yes / no)"
- User answer: yes
- Decision stored in: `.opencode/rules/.core-version.json` (`apmVersion: 0.32.0`, `apmVersionCheckedAt: 2026-09-30T...`)
- Follow-up: none

### Phase 1 — Mode Detection

#### Q1: Confirm NEW_PROJECT mode?
- What I found: `.core-version.json` existed with `initializationStatus: fresh` and all hashes `pending`; no prior application code.
- Question asked: none — signals were unambiguous.
- User answer: auto-detected NEW_PROJECT.
- Decision stored in: `.opencode/project_init.md` → Initialization State
- Follow-up: none

### Phase 2 — Project Metadata

#### Q1: Use detected project name?
- What I found: no `package.json`; workspace directory name is `cloud-jpg-tests`.
- Question asked: "Project name detected: `cloud-jpg-tests`. Use this? (y / custom)"
- User answer: yes
- Decision stored in: `.opencode/rules/project/metadata.json` (`project.name`), `README.md`, `AGENTS.md`
- Follow-up: none

### Phase 4.5 — Role-Agnostic APM Package Offer

#### Q1: Install any optional packages?
- What I found: 7 role-agnostic/standalone-only packages available (frontend-slides, jira-defect-analysis, llm-codegen-bench, worklog-kit, shopping-portal, project-scorecard, ticket-triage); no stack signals detected.
- Question asked: "Reply with a comma-separated list of package names, or `skip` to install none."
- User answer: skip (typo "Scip" interpreted as skip)
- Decision stored in: ledger only; no `apm.yml` created
- Follow-up: run `/initialize` later to add role-matched or role-agnostic packages

### Phase 6 — Domain Configuration (Core Skills)

#### Q1 (coding-standards-context): TDD policy question?
- What I found: no code/stack detected.
- Question asked: none — set to default `recommended`.
- User answer: auto-filled default.
- Decision stored in: `.opencode/skills/coding-standards-context/project-config.json` (`testing.tddPolicy: recommended`)
- Follow-up: update framework-specific tooling once stack is chosen

#### Q2 (infrastructure-context): Any infrastructure questions?
- What I found: no CI/CD, Docker, or cloud config.
- Question asked: none — all values left as defaults/TBD.
- User answer: auto-filled defaults.
- Decision stored in: `.opencode/skills/infrastructure-context/project-config.json`
- Follow-up: update once CI/CD/deployment choices are made

### Phase 7 — Documentation

No user questions — all 7 AGENTS.md fields were auto-filled from the empty-project defaults:
1. Project description: auto-filled — empty NC AI Workplace template shell.
2. Architecture style: auto-filled — no architecture chosen yet.
3. Do's: auto-filled — default agent behavior rules.
4. Don'ts: auto-filled — default anti-patterns.
5. Constraints & Non-Goals: auto-filled — no budgets/targets defined.
6. Code style + commit format: auto-filled — not configured yet.
7. Project structure pointers: auto-filled — 6 key paths.

Decisions stored in: `AGENTS.md`, `README.md`, `docs/INDEX.md`

### Phase 8 — Finalization

No user questions.
- Hash computation completed with `compute-hashes.ps1 -Apply -AllowMissing`.
- `apm.yml` recorded as `missing` at finalization because no APM packages were accepted during Quick Init.
- `initializationStatus` set to `active`.
- docs-sync baseline recorded during this `/docs-sync` run.

### Post-Quick-Init — APM Package Install (`test-generation`)

#### Q1: Install `test-generation` APM package?
- What I found: user requested installation of the full module `test-generation` (provides `/generate-test` command and testing-related agents/skills).
- Question asked: none — user gave a direct command.
- User answer: install `test-generation`.
- Actions taken:
  1. Created `apm.yml` with `compilation.agents_md.mode: managed_section`, `targets: [opencode]`, and dict-form dependency on `test-generation`.
  2. Ran `validate-apm-install.ps1 -PreInstall` — state clean.
  3. Ran `node .opencode/skills/project-initialization/scripts/apm-install-preserving.js` — installed successfully (13 agents, 5 commands, 11 skills).
  4. Ran `validate-apm-install.ps1` (full gate) — passed.
  5. Ran `apm_modules/test-generation/scripts/activate.ps1` — wrote marker and `.workplace/state.json` entry.
  6. Ran `verify-apm-activation.ps1` — reports `PARTIAL` because the verifier expects `runtime/BuildTests/` as a folder at project root, while the activation script intentionally copies its contents only (`.gitlab/`, `app-chart/` landed at root). `TestGeneration/` and `.workplace/test-generation/config.json` are present.
- Decision stored in: `apm.yml`, `apm.lock.yaml`, `.workplace/state.json`, `.opencode/agents/`, `.opencode/commands/`, `.agents/skills/`
- Follow-up: decide whether to copy `runtime/BuildTests/` folder to project root to silence the verifier, or treat the PARTIAL status as a false positive since the contents are deployed.

---

## Open Gaps

- **Stack undefined:** No programming language, framework, build tool, or runtime selected. Resolve by running `/initialize`.
- **Project description TBD:** `metadata.json` description is `[TBD]`.
- **Environments TBD:** development/staging/production URLs not set in `metadata.json`.
- **Infrastructure skeleton present, not active:** GitLab CI, Docker multistage, and Helm chart artifacts were deployed, but template placeholders (`<to_replace_*>`) still need values before the pipeline is active.
- **APM activation verifier mismatch:** `verify-apm-activation.ps1` reports `PARTIAL` for `test-generation` because it expects `runtime/BuildTests/` as a folder at project root, while the package's activation script copies the folder's contents to root. Contents (`.gitlab/`, `app-chart/`) are present.

---

## Initialization Summary

Quick Init completed for **cloud-jpg-tests**.

- **Project name:** cloud-jpg-tests
- **Mode:** NEW_PROJECT (empty template shell)
- **Roles:** none selected
- **APM packages installed:** `test-generation` (full module, manually added after Quick Init)
- **Configured domains:** coding-standards-context, infrastructure-context (Core skills only); test-generation skills deployed under `.agents/skills/`
- **Generated docs:** `AGENTS.md`, `README.md`, `docs/INDEX.md`, plus `docs/GETTING_STARTED.md` and `CHANGELOG.md` added during this docs-sync.
- **Next step:** Run `/initialize` to choose a technology stack and select roles.

### Update History

[TO_BE_FILLED — populated by /update-workplace.]
