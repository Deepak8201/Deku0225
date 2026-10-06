# Changelog

## 2026-10-01

- Added `cursor` as a second APM compile target in `apm.yml` (alongside `opencode`).
- `apm install` compiled the `test-generation` package for Cursor: `.cursor/agents/`,
  `.cursor/commands/`, `.cursor/skills/` now carry package-owned files mirroring the
  OpenCode side (skills deploy directly to `.cursor/skills/<name>/`, unlike OpenCode's
  `.agents/skills/<name>/` legacy-path shim); added
  `.cursor/hooks/test-generation/scripts/activate{,.ps1,.sh}` and `.cursor/apm-hooks.json`.
- Updated `docs/INDEX.md` to document the dual-target deployment (Cursor Location
  columns added to the APM-Installed Commands/Agents/Skills tables and the Core
  Skills/Core Context Skills tables, new APM Hooks section, `.cursor/project_init.md`
  entry, corrected the stale "cursor is quick-init only" note).
- Updated `AGENTS.md` with a cross-harness note and Cursor-equivalent paths throughout
  (Project Resource Map, Commands, Project Structure split into Shared/OpenCode/Cursor,
  Testing, Additional Resources).
- Updated `docs/GETTING_STARTED.md` to note both harnesses and link `.cursor/commands/`
  alongside `.opencode/commands/`.

## 2026-09-30

- Installed the `test-generation` APM package (full module), adding:
  - `/generate-test` command and related agents/skills under `.opencode/agents/` and `.agents/skills/`.
  - `TestGeneration/` Playwright/TypeScript test runtime.
  - `.gitlab-ci.yml`, `Dockerfile.multistage`, and `app-chart/` CI/CD artifacts.
