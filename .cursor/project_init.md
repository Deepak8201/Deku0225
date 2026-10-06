# Project Initialization Ledger

> **Compact state and audit log for project initialization.**
> To start initialization, attach this file to your chat context and prompt: **"Initialize my project"**.
>
> This file is intentionally thin: it records initialization state, user decisions and pointers to authoritative artifacts. Domain knowledge, stack details, architecture descriptions and behavioural rules live elsewhere — see [Artifact Pointers](#artifact-pointers).

---

## How This Works

When you prompt **"Initialize my project"** with this file in context, the agent will:

1. **Detect initialization mode** — auto-detected from `.cursor/rules/.core-version.json` and file signals (no ritual confirmation).
2. **Run phases progressively** — collect role(s), metadata, stack, architecture, requirements; persist findings to authoritative artifacts.
3. **Record every user answer here** — under `User Answers & Decision Log`, grouped by phase, so all decisions stay auditable.
4. **Persist runtime knowledge into authoritative files**:
   - Stack and architecture summary → `.cursor/rules/development.mdc` (`alwaysApply: true`).
   - Project identity → `.cursor/rules/project/metadata.json`.
   - Domain facts and constraints → `.cursor/skills/<domain>-context/project-config.json`.
   - Agent-facing project rules → `.cursor/skills/<domain>-context/references/guidelines.md`.
   - Documentation index and project docs → `docs/INDEX.md`, `docs/project/*`, root `AGENTS.md`, root `README.md`.
5. **Generate a short summary** in this file when done.

> **Tip:** Every question the agent asks is logged below with what was found, what was asked, and what you answered. Use the log later to understand why a guideline or domain config looks the way it does.

---

## Source-of-Truth Map

This file is a thin ledger. Do **not** duplicate stack lists, endpoint inventories, codebase analyses, or domain rules into the sections below — they belong in the artifacts pointed to here.

| Knowledge | Authoritative artifact | Used by |
|-----------|------------------------|---------|
| Stack + architecture summary | `.cursor/rules/development.mdc` | All agents (`alwaysApply: true`) |
| Project identity (name, repo, environments) | `.cursor/rules/project/metadata.json` | Tooling, deployment scripts |
| Per-domain facts (frontend/backend/database/api/testing/infrastructure/performance/coding-standards) | `.cursor/skills/<domain>-context/project-config.json` | Domain context skills |
| Agent-facing project rules per domain | `.cursor/skills/<domain>-context/references/guidelines.md` | Agents that load the matching skill |
| Codebase analysis details | `.cursor/project/analysis/` — `index.json` (component registry, coverage, gaps) plus a `<component>.json` / `<component>.md` pair per component; optionally `docs/project/ARCHITECTURE.md` for a complex architecture | Phases 5 and 6, codebase-aware tasks, any resumed session |
| Endpoint inventory + external integrations | `.cursor/skills/api-context/project-config.json` + `references/guidelines.md` | API-aware agents |
| Documentation index | `docs/INDEX.md` | Navigation |
| Repo-wide conventions, project overview | Root `AGENTS.md` (`Project Conventions`), `README.md` | Always-loaded |
| Selected role(s) + installed APM packages | `apm.yml` (manifest) + `apm.lock.yaml` (lockfile) + `.workplace/state.json` (per-package activation state) | APM workflow (Phase 1.7-APM) |
| MCP servers | `.cursor/mcp.json` | Cursor MCP integration |

---

## Initialization State

| Field | Value |
|-------|-------|
| **Current Mode** | [TO_BE_DETERMINED] (NEW_PROJECT \| EXISTING_PROJECT) |
| **Selected Role(s)** | [TO_BE_FILLED] (comma-separated) |
| **Current Phase** | [TO_BE_FILLED] (0 → 8 → complete) |
| **Initialization Status** | `fresh` (set to `active` after Phase 8) |
| **Started** | [TO_BE_FILLED] (ISO timestamp) |
| **Completed** | [TO_BE_FILLED] (ISO timestamp) |
| **Template Version** | [TO_BE_FILLED] (from `.cursor/rules/.core-version.json`) |

> **Mode detection rule:** auto-detected from `.cursor/rules/.core-version.json` + file signals (see `.cursor/skills/project-initialization/references/mode-detection.md`). The agent does NOT ask "Is this a new or existing project?" outside the rare `signals == 1` edge case. Indicators are recorded under `### Phase 1` in the Decision Log.

---

## Artifact Pointers

The agent fills these pointers as artifacts are created. Use them to navigate from this ledger to the actual content.

| Artifact | Path | Status |
|----------|------|--------|
| Project identity | `.cursor/rules/project/metadata.json` | [TO_BE_FILLED] |
| Stack + architecture (always-applied) | `.cursor/rules/development.mdc` | [TO_BE_FILLED] |
| docs-sync hook category config | `.cursor/hooks/docs-sync-config.json` | [TO_BE_FILLED] |
| MCP configuration | `.cursor/mcp.json` | [TO_BE_FILLED] |
| APM manifest | `apm.yml` | [TO_BE_FILLED] |
| APM lockfile | `apm.lock.yaml` | [TO_BE_FILLED] |
| APM per-package activation state | `.workplace/state.json` | [TO_BE_FILLED] |
| Documentation index | `docs/INDEX.md` | [TO_BE_FILLED] |
| Root AGENTS.md | `AGENTS.md` | [TO_BE_FILLED] |
| Root README.md | `README.md` | [TO_BE_FILLED] |
| Codebase analysis artifacts | `.cursor/project/analysis/` (`index.json` + per-component `.json` / `.md`) | [TO_BE_FILLED — components analysed] |
| Domain configs (per active context skill) | `.cursor/skills/<domain>-context/project-config.json` | [TO_BE_FILLED — list] |
| Domain guidelines (per active context skill) | `.cursor/skills/<domain>-context/references/guidelines.md` | [TO_BE_FILLED — list] |
| Optional architecture doc | `docs/project/ARCHITECTURE.md` | [TO_BE_FILLED — created? yes/no] |
| Optional stack rationale doc | `docs/project/STACK.md` | [TO_BE_FILLED — created? yes/no] |
| Optional contribution doc | `docs/project/CONTRIBUTING.md` | [TO_BE_FILLED — created? yes/no] |

---

## Phase Checklist

Phases: `0 → 0.5 → 1 → 1.5 → 1.6 → 1.7-APM → 2 → 3 → 4 → 5 → 6 → 6.5 → 7 → 7.5 → 8`.

- [ ] **Phase 0** — APM CLI bootstrap (`apm --version`; auto-install via curl/irm/brew/pip if missing; persist `apmVersion` to `.core-version.json`)
- [ ] **Phase 0.5** — Environment setup (`.cursorignore`, `.gitignore` with Workplace + APM exclusions, commands dir, hooks)
- [ ] **Phase 1** — Mode detection
  - [ ] Phase 1 reflection completed
- [ ] **Phase 1.5** — User role(s) selected, MCP configuration written
- [ ] **Phase 1.6** — `.cursor/commands/` inventoried (read-only; no command file created)
- [ ] **Phase 1.7-APM** — APM package activation (registry source chosen → role-matched packages installed → optional packages offered → `apm install` → `apm.lock.yaml` + primitives deployed)
- [ ] **Phase 2** — Project metadata collected → `metadata.json`
  - [ ] Phase 2 reflection completed
- [ ] **Phase 3** — Technology stack determined → `development.mdc`
- [ ] **Phase 4** — Codebase analysis (EXISTING_PROJECT only) → artifacts in `.cursor/project/analysis/`, `validate-analysis.js` exits 0, summary in Decision Log + supplemental sources
  - [ ] Phase 4 reflection completed
- [ ] **Phase 5** — Components, architecture, performance, security, constraints captured into domain configs
  - [ ] Phase 5 reflection completed
- [ ] **Phase 6** — Domain skill `project-config.json` filled and `guidelines.md` rendered (Part 3.5 hard gate passed)
  - [ ] Phase 6 reflection completed (per-domain Reflection Step 0 ran)
- [ ] **Phase 6.5** — Project identity recorded in `metadata.json`
- [ ] **Phase 7** — `AGENTS.md` (with Resource Map + Project Conventions) and `README.md` updated
- [ ] **Phase 7.5** — `docs/INDEX.md` generated, cross-references validated
- [ ] **Phase 8** — `.core-version.json` hashes computed, `initializationStatus` → `active`

---

## Supplemental Source Manifest (used by Phase 6)

Phase 6 renders domain `guidelines.md` from `template.md` + `project-config.json`. In addition, it reads the supplemental sources listed here (collected in earlier phases) to enrich the rendered output. Each entry MUST point to a real artifact or external reference (path or URL); do NOT inline the content.

| Source | Provenance | Consumed by domain(s) | Pointer |
|--------|-----------|----------------------|---------|
| API specifications (OpenAPI / GraphQL / Protobuf / Postman) | Phase 4 §7 + Phase 5 Part 1.5 | `api-context` | [TO_BE_FILLED — paths or "none"] |
| Endpoint analysis (Phase 5 user-directed sub-analysis) | Phase 5 Part 1.5 (Step 3) | `api-context` | [TO_BE_FILLED — see `api-context/project-config.json` → endpoints] |
| Codebase analysis artifacts (Phase 4 codebase-analyzer subagents) | Phase 4 | All domain skills | [TO_BE_FILLED — `.cursor/project/analysis/index.json` + per-component reports; short bullets in Decision Log §4] |
| Architecture description (user-provided wiki / Confluence / ADR) | Phase 5 Part 2 | `backend-context`, `infrastructure-context` | [TO_BE_FILLED — paths or URLs] |
| Database schema files (if user opted in) | Phase 5 Part 1.5 (Q6) | `database-context`, `api-context` | [TO_BE_FILLED] |
| API test files (if user opted in) | Phase 5 Part 1.5 (Q6) | `api-context`, `testing-context` | [TO_BE_FILLED] |
| BASS Security Guides selection *(only if `nc-code-security-audit` package installed — see Phase 5 Part 5 Gate Check)* | Phase 5 Part 5 | `security-compliance`, `coding-standards-context` | `.cursor/skills/security-compliance/assets/security-sources.json` (absent when package not installed) |
| Performance budgets and Core Web Vitals targets | Phase 5 Part 3 | `performance-context`, `frontend-context` | [TO_BE_FILLED — values stored in `performance-context/project-config.json`] |
| Compliance pre-checks (PCI/HIPAA/GDPR) | Phase 4 §11 + Phase 5 Part 5 | `api-context`, `backend-context`, `infrastructure-context` | [TO_BE_FILLED] |

> **Rules for the manifest:**
> 1. The manifest stores **pointers**, not content. Persist content in the matching `project-config.json` (under `references`, `endpoints`, `externalIntegrations`, `constraints`, etc.).
> 2. When a supplemental source is consumed, the agent MUST cite it in the rendered `guidelines.md` (e.g., "Source: Phase 4 codebase analysis", "Source: user-provided OpenAPI spec at `docs/api/openapi.yaml`").
> 3. If no supplemental source applies for a domain, leave the row's pointer as `none — no supplemental data` so audits can confirm the gap was considered.

---

## User Answers & Decision Log

> **Audit trail.** Every question asked during initialization is recorded here. Each entry MUST include: what was found, what was asked, what the user answered, where the decision was persisted, and any follow-up. Skipped questions and `TBD` answers must also be logged.
>
> **Format per question:**
>
> ```markdown
> #### Q{n}: {short title}
> - What I found: {observation or detected signal}
> - Question asked: {exact question text or short paraphrase}
> - User answer: {answer, including "skipped" / "TBD"}
> - Decision stored in: {file path, e.g., `.cursor/skills/api-context/project-config.json` or "ledger only"}
> - Follow-up: {anything that still needs to happen, or "none"}
> ```
>
> Reflection notes (mandatory for Phases 1, 2, 4, 5, 6) are subsumed by this log — record them under the corresponding phase using the same format and an explicit `Reflection: yes/no` line.

### Phase 0 — APM CLI Bootstrap

[TO_BE_FILLED — record detected apm version (or "missing → installed via {curl|irm|brew|pip}"), final `apmVersion` written to .core-version.json, any major-version drift warning vs `apmVersionExpected`.]

### Phase 0.5 — Environment Setup

[TO_BE_FILLED — usually no user questions; record any deviations like "user opted out of docs auto-sync hook"]

### Phase 1 — Mode Detection

[TO_BE_FILLED — record auto-detected mode, matched signal categories. If signals == 1 the edge-case confirmation question must be logged here.]

### Phase 1.5 — Roles & MCP

[TO_BE_FILLED — record role(s) selected and rationale; note MCP servers configured.]

### Phase 1.7-APM — APM Package Activation

[TO_BE_FILLED — record: (1) chosen registry source (built-in / external / both) and any external URLs used; (2) role-matched APM packages auto-installed; (3) optional APM packages offered in Pass A.5 with accept/decline per package; (4) standalone-only APM packages noted as informational (skipped at init time); (5) any `apm install` failures and how they were resolved.]

### Phase 2 — Project Metadata

[TO_BE_FILLED — record metadata source (silent acceptance vs adaptive question), conflicts resolved, name conflicts.]

### Phase 3 — Technology Stack

[TO_BE_FILLED — log every stack decision. For EXISTING_PROJECT, record auto-detected stack and any user corrections. Final stack lives in `development.mdc`.]

### Phase 4 — Codebase Analysis (EXISTING_PROJECT)

[TO_BE_FILLED — short bullets only: business modules, top entities, top endpoint groups, named integrations. Smart Reflection Questions and answers MUST be logged here. Full report goes into the supplemental source manifest above and per-domain `project-config.json`.]

### Phase 5 — Requirements

[TO_BE_FILLED — record decisions per Part: Components, API discovery (Part 1.5), Architecture (Part 2), Performance (Part 3), General (Part 4), Security (Part 5). Note skipped/partial rounds with reason. Compliance pre-checks must be recorded.]

### Phase 6 — Domain Configuration

[TO_BE_FILLED — per domain: confidence level, questions asked, supplemental sources used, output paths. Reflection Step 0 result MUST be logged.]

### Phase 6.5 — Project Identity

[TO_BE_FILLED — single-line confirmation that `.cursor/rules/project/metadata.json` was written.]

### Phase 7 — Documentation

[TO_BE_FILLED — record AGENTS.md root dialogue answers (Q1–Q7), README updates, optional docs created.]

### Phase 7.5 — Documentation Registry

[TO_BE_FILLED — record document discovery summary, link integrity result, any broken links found.]

### Phase 8 — Finalization

[TO_BE_FILLED — record hash computation result, version transition fresh → active.]

---

## Open Gaps

> Items explicitly marked `TBD` or `Skip` during initialization. Resolve later via direct edits to the relevant `project-config.json` / `guidelines.md` / `AGENTS.md`.

[TO_BE_FILLED — bullet list, each entry with: gap, source phase, owner, suggested follow-up.]

---

## Initialization Summary

> Filled by the agent at the end of Phase 8. Keep concise — full details live in the artifacts pointed to from `Artifact Pointers`.

[TO_BE_FILLED — short summary: project name, mode, roles, installed APM packages (from `apm.lock.yaml`), configured domains, list of optional docs created, link to docs/INDEX.md.]

### Update History

> Smart Merge during `/update-workplace` appends a one-line entry here per template update. Initialization itself does not write to this section.

[TO_BE_FILLED — populated by /update-workplace. Each entry: ISO timestamp + version transition + applied migrations.]
