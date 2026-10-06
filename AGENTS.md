# AGENTS.md

> Instructions for AI coding agents working on the `cloud-jpg-tests` project.
> See https://agents.md for the open standard.

> **Cross-harness note:** this project runs **two** AI-agent harnesses in parallel — **OpenCode** (`.opencode/`, template v5.0.0, fully initialized) and **Cursor** (`.cursor/`, template v4.8.0, set up via `/quick-init`). `apm.yml` targets both (`targets: [opencode, cursor]`), and `apm install` compiles the `test-generation` package for each independently. This file is loaded by both harnesses; most paths below are given in their OpenCode form with the Cursor equivalent noted alongside. Full cross-reference: [`docs/INDEX.md`](docs/INDEX.md) → "Cursor-Line Configuration".

## Project Resource Map (read first)

> **For AI agents — canonical entry points before any work.** Consult these in order; first hit wins for project-specific facts.

1. **[`docs/INDEX.md`](docs/INDEX.md)** — auto-generated central index of every documentation and rule file in this repository, for **both** harnesses. **Use this to discover any other resource by topic** instead of guessing paths.
2. **[`.opencode/rules/development.md`](.opencode/rules/development.md)** — single source of truth for the technology stack (always loaded into agent context). Cursor equivalent: [`.cursor/rules/development.mdc`](.cursor/rules/development.mdc).
3. **[`.opencode/project_init.md`](.opencode/project_init.md)** — compact initialization ledger (state, artifact pointers, **Supplemental Source Manifest**, **User Answers & Decision Log**). Cursor equivalent: [`.cursor/project_init.md`](.cursor/project_init.md).
4. **`<skills-root>/<context>/references/guidelines.md`** — per-domain project conventions. Active for this project: [`coding-standards-context`](.opencode/skills/coding-standards-context/references/guidelines.md) and [`infrastructure-context`](.opencode/skills/infrastructure-context/references/guidelines.md) (OpenCode); [`coding-standards-context`](.cursor/skills/coding-standards-context/references/guidelines.md) and [`infrastructure-context`](.cursor/skills/infrastructure-context/references/guidelines.md) (Cursor).
5. **[`.opencode/rules/.core-version.json`](.opencode/rules/.core-version.json)** — template version + applied migrations. Cursor equivalent: [`.cursor/rules/.core-version.json`](.cursor/rules/.core-version.json).

> Do NOT search ad-hoc when `docs/INDEX.md` exists — it is the navigation hub for the project.

## Do

- Run `/initialize` before adding application code or choosing a technology stack.
- Follow the active context-skill guidelines ([`coding-standards-context`](.opencode/skills/coding-standards-context/references/guidelines.md), [`infrastructure-context`](.opencode/skills/infrastructure-context/references/guidelines.md) for OpenCode; [`coding-standards-context`](.cursor/skills/coding-standards-context/references/guidelines.md), [`infrastructure-context`](.cursor/skills/infrastructure-context/references/guidelines.md) for Cursor) once a stack is chosen.
- Keep environment secrets and credentials out of source control.
- Add new documentation files to `docs/INDEX.md` so agents can discover them.
- Prefer installing an APM package over hand-creating custom agents/commands/skills.

## Don't

- Don't commit secrets, API keys, or `.env` files.
- Don't add application source code without deciding on the language/framework stack.
- Don't duplicate rules already covered by an active context-skill `guidelines.md`.
- Don't create custom agents, commands, or skills without first checking available APM packages.

## Architecture (TL;DR)

NetCracker ATP3 project with the `test-generation` APM package installed. The test runtime is **Playwright 1.58.2 / TypeScript 6.0.3** under `TestGeneration/`, using a layered page-object model (`TestScenario → Business → Functional → SharedRuntime`). CI/CD uses GitLab NextGenCI components with NetCracker Artifactory as the registry; pipeline is disabled until placeholders in `.gitlab-ci.yml` are filled. The **application under test (AUT)** and its stack have not been configured. Run `/initialize` to select the AUT stack.

## Constraints & Non-Goals

- No AUT (application under test) runtime, browser target, or platform support has been configured yet.
- Test runtime is Playwright 1.58.2 / TypeScript 6.0.3 — Chromium only, single worker, 30-minute test timeout.
- Mandatory test tags: `suite`, `priority`, `type`, `dataImpact` (validated against `TagConfiguration.json`).
- No dependency allowlist exists; new runtime or build dependencies require explicit user approval per [`orchestrator.md`](.opencode/rules/orchestrator.md) (OpenCode) / [`orchestrator.mdc`](.cursor/rules/orchestrator.mdc) (Cursor).
- No performance budgets, compliance, or PII requirements have been recorded.
- The AUT stack is intentionally unconfigured; role-specific context skills must be installed via `/initialize` or APM.

## Commands

This project has no application scripts yet. Core commands available (identical set in both harnesses — [`.opencode/commands/`](.opencode/commands/) and [`.cursor/commands/`](.cursor/commands/)):

- `/initialize` — full project configuration (stack, roles, domain skills).
- `/docs-sync` — synchronize documentation with code changes.
- `/package-new` — scaffold a new APM package.
- `/update-workplace` — update the Core template safely.

Additional commands installed by the `test-generation` APM package (deployed to both `.opencode/commands/` and `.cursor/commands/` — see `docs/INDEX.md` → "APM-Installed Commands" for the full per-harness list):

- `/generate-test` — generate tests via the test-generation module.
- `/additional-input`, `/migrate-atp2`, `/validate-atp2-migration`, `/m-tc-design` — supporting test-generation and ATP2-migration workflows.

## Safety and Permissions

**Allowed without asking:**
- read/list files
- run lint, format, or type-check on single files
- run single test files

**Ask first:**
- install new packages
- git push
- delete files or chmod
- full builds or E2E test suites

## Project Structure

**Shared (not harness-specific):**
- [`apm.yml`](apm.yml) / [`apm.lock.yaml`](apm.lock.yaml) — APM manifest and lockfile; `targets: [opencode, cursor]`.
- [`.workplace/state.json`](.workplace/state.json) — APM activation state.
- [`.agents/skills/`](.agents/skills/) — APM-deployed skills for the `opencode` target's legacy skill-path shim (e.g., `test-*`, `atp2-*`).
- [`TestGeneration/`](TestGeneration/) — Playwright/TypeScript test runtime from `test-generation`.
- [`app-chart/`](app-chart/) — Helm chart payload from `test-generation`.
- [`.gitlab-ci.yml`](.gitlab-ci.yml) / [`Dockerfile.multistage`](Dockerfile.multistage) — GitLab CI and Docker build artifacts.
- [`README.md`](README.md) — project overview and entry points.
- [`docs/INDEX.md`](docs/INDEX.md) — central documentation index (both harnesses).
- [`CHANGELOG.md`](CHANGELOG.md) — version history.

**OpenCode (`.opencode/`):**
- [`opencode.json`](opencode.json) — OpenCode configuration, watcher exclusions, and MCP servers.
- [`.opencode/rules/development.md`](.opencode/rules/development.md) — technology stack reference (placeholder until `/initialize` fills it).
- [`.opencode/rules/project/metadata.json`](.opencode/rules/project/metadata.json) — project identity and repository metadata.
- [`.opencode/skills/coding-standards-context/references/guidelines.md`](.opencode/skills/coding-standards-context/references/guidelines.md) — coding standards and TDD policy.
- [`.opencode/skills/infrastructure-context/references/guidelines.md`](.opencode/skills/infrastructure-context/references/guidelines.md) — infrastructure guidelines.
- [`.opencode/agents/`](.opencode/agents/) — Core + APM-deployed agent definitions.
- [`.opencode/commands/`](.opencode/commands/) — Core + APM-deployed command definitions.

**Cursor (`.cursor/`):**
- [`.cursor/mcp.json`](.cursor/mcp.json) / [`.cursorignore`](.cursorignore) — Cursor MCP configuration and indexing exclusions.
- [`.cursor/rules/development.mdc`](.cursor/rules/development.mdc) — technology stack reference (placeholder until `/initialize` fills it).
- [`.cursor/rules/project/metadata.json`](.cursor/rules/project/metadata.json) — project identity (mirrors `.opencode/` equivalent).
- [`.cursor/skills/coding-standards-context/references/guidelines.md`](.cursor/skills/coding-standards-context/references/guidelines.md) — coding standards and TDD policy (ported, not re-collected).
- [`.cursor/skills/infrastructure-context/references/guidelines.md`](.cursor/skills/infrastructure-context/references/guidelines.md) — infrastructure guidelines (ported, not re-collected).
- [`.cursor/agents/`](.cursor/agents/) — Core + APM-deployed agent definitions.
- [`.cursor/commands/`](.cursor/commands/) — Core + APM-deployed command definitions.
- [`.cursor/skills/`](.cursor/skills/) — Core + APM-deployed skills, **including** the `test-generation` package's skills (deployed here directly for the `cursor` target, unlike OpenCode's `.agents/skills/` legacy shim).
- [`.cursor/hooks/test-generation/scripts/`](.cursor/hooks/test-generation/scripts/) / [`.cursor/apm-hooks.json`](.cursor/apm-hooks.json) — `test-generation` module activation scripts and APM's hook-ownership sidecar.

## PR Checklist

- Confirm the change aligns with the active coding-standards guidelines.
- No secrets, credentials, or environment files committed.
- Documentation updated if a new doc file was added.
- Diff is focused and includes a short summary.

## When Stuck

- Ask a question about the intended stack or project direction.
- Propose a short plan before implementing.
- Open a draft PR with notes if the scope is unclear.

## Testing

The `test-generation` APM package provides a Playwright 1.58.2 / TypeScript 6.0.3 E2E test framework under [`TestGeneration/`](TestGeneration/) — one shared runtime payload used by both harnesses. See [`TestGeneration/README.md`](TestGeneration/README.md) for full runtime setup, workflow, and command reference. See [`coding-standards-context/references/guidelines.md`](.opencode/skills/coding-standards-context/references/guidelines.md) (OpenCode) or [`coding-standards-context/references/guidelines.md`](.cursor/skills/coding-standards-context/references/guidelines.md) (Cursor) → "Test-Driven Development (TDD) Policy" for TDD rules. `/generate-test` is available in both OpenCode and Cursor (`.opencode/commands/generate-test.md`, `.cursor/commands/generate-test.md`).

Key paths:
- Test scenarios: `TestGeneration/tests/TestScenario/` (Playwright `testDir`)
- Framework core: `TestGeneration/SharedRuntime/` — do not modify without intent
- Test descriptors (input for `/generate-test`): `TestGeneration/tests/TestDesign/`
- Environment config template: `TestGeneration/environment-configuration/environment-configuration-template.json`

The default TDD policy is `recommended` with mandatory tests for domain logic and regression bug fixes.

## Security Considerations

- Never commit secrets, API keys, or credentials.
- Use environment variables for sensitive configuration.
- Validate and sanitize all external input once APIs are introduced.
- Use parameterized queries for database operations once a datastore is introduced.

## Project Conventions

> _No team-wide conventions documented yet. Add cross-domain or repo-wide rules here under sub-headings such as `### Branching`, `### Deployment`, `### Environments`, or `### Security`. Link to the relevant context-skill `references/guidelines.md` for domain-specific rules rather than duplicating them._

## Additional Resources

- **[docs/INDEX.md](docs/INDEX.md)** — Central documentation index (start here for any lookup; auto-generated by `/initialize` Phase 7.5)
- [Development Rules (OpenCode)](.opencode/rules/development.md) / [Development Rules (Cursor)](.cursor/rules/development.mdc)
- [TaskMaster Workflow](.opencode/rules/taskmaster/dev_workflow.md)

<!-- apm:start -->
<!-- apm:end -->

---

*Generated by Quick Init. Run `/initialize` for comprehensive configuration.*
