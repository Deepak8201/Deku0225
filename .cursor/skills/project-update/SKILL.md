---
name: project-update
description: Safe Workplace template update workflow. Use for /update-workplace command, updating Core template files while preserving project customizations, git-based template source, version detection, backup, migration, and validation.
---

# Project Update Skill

> Orchestrates safe updates of the NC AI Workplace template on already-initialized projects.

## Activation

This skill activates when:
- User runs `/update-workplace` command
- User says "Update project", "Re-initialize project", "Upgrade AI Workplace", "Apply template updates"
- Initializer detects `initializationStatus: "active"` and redirects here

## Pre-Condition

`.cursor/rules/.core-version.json` must exist with `initializationStatus: "active"` (or legacy — missing field). If status is `"fresh"` with all hashes `"pending"`, redirect to full initialization via `project-initialization` skill instead.

## Core vs Project Separation

The update process relies on manifest-based safety. **Only files listed in `.core-version.json` are overwritten.** Everything else is preserved.

### What Gets Overwritten (Core)

- `.cursor/rules/*.mdc` — orchestrator, development, customizations, tdd
- `.cursor/rules/taskmaster/*.mdc` — TaskMaster workflow rules
- `.cursor/agents/*.md` — the 5 Core agent definitions (`initializer`, `project-updater`, `infra-specialist`, `documentation-sync`, `codebase-analyzer`)
- `.cursor/skills/*/SKILL.md` — all domain and utility skill files
- `.cursor/commands/*.md` — all template workflow commands
- `docs/core/*.md`, `CHANGELOG.md` (project root) — Core documentation

### What Is Preserved (Project)

- `.cursor/rules/project/*.mdc` — custom rules
- `.cursor/commands/project-*.md` — custom commands
- `.cursor/agents/project-*.md` — custom agents
- `.cursor/skills/project-*/` — custom skill directories
- `.cursor/skills/*/project-config.json` — domain skill configs
- `.cursor/rules/project/metadata.json` — project identity
- `docs/project/` — project documentation

## Update Process Overview

```
Pre. Git Source Setup → 0. Version Detection → 1. Backup Creation →
2. Migration (pending only) → 3. Customization Scan → 4. Core Update →
5. Preservation Verify → 6. Config Reconciliation → 7. Validation →
8. Report & Cleanup
```

## Phase Reference Docs

Each phase has detailed implementation instructions in `references/`:

| Phase | Reference Doc | Summary |
|-------|--------------|---------|
| Pre | `references/git-source-setup.md` | Ask git URL + optional branch, pre-fill from saved source, clone to `.cursor/.temp-update/`, validate |
| 0-1 | `references/detection-and-backup.md` | Version comparison, hash checks, backup creation |
| 2-3 | `references/migration-and-scan.md` | Pending migrations (any update type), customization inventory |
| 4 | `references/core-update.md` | Copy Core files from cloned template, smart merge |
| 5-7 | `references/preservation-and-validation.md` | Verify project files, reconcile configs (incl. guidelines.md health check for active skills), validate links |
| 8 | `references/cleanup-and-report.md` | Generate report, confirm temp directory deletion |

### Reading Instructions

Read reference docs **lazily** — only load the reference for the phase currently being executed. Do not read all references upfront.

## Integration Points

- **Version tracking:** `.cursor/rules/.core-version.json` (also stores `templateSource.url` and `templateSource.branch` after first update)
- **Template source:** `.cursor/.temp-update/` (temporary clone, gitignored, deleted after update)
- **Backup location:** `.cursor/.backups/backup-YYYY-MM-DD-HHmmss/`
- **Project metadata:** `.cursor/rules/project/metadata.json`
- **Initialization config:** `.cursor/project_init.md` (smart merge for mixed Core/Project sections)
- **Workplace documentation (upstream):** [`MIGRATION_BACKUP.md`](https://git.netcracker.com/DEMO.SE.AI/nc-ai-workplace/-/blob/master/docs/core/MIGRATION_BACKUP.md) is the user-facing guide to this command — [what is preserved vs overwritten](https://git.netcracker.com/DEMO.SE.AI/nc-ai-workplace/-/blob/master/docs/core/MIGRATION_BACKUP.md#what-is-preserved-what-is-overwritten), [backups](https://git.netcracker.com/DEMO.SE.AI/nc-ai-workplace/-/blob/master/docs/core/MIGRATION_BACKUP.md#backups), [rollback](https://git.netcracker.com/DEMO.SE.AI/nc-ai-workplace/-/blob/master/docs/core/MIGRATION_BACKUP.md#rollback), [migrations](https://git.netcracker.com/DEMO.SE.AI/nc-ai-workplace/-/blob/master/docs/core/MIGRATION_BACKUP.md#migrations) — and [`CUSTOMIZATION.md`](https://git.netcracker.com/DEMO.SE.AI/nc-ai-workplace/-/blob/master/docs/core/CUSTOMIZATION.md) explains which customizations survive. Quote them when the user asks what an update will touch. Both ship in the template repo, not in the project: resolve via [`workplace-docs.md`](../project-initialization/references/workplace-docs.md) or `fetch-workplace-doc.js` — during an update they are already local in `.cursor/.temp-update/docs/`.

## Error Handling

- If `.core-version.json` is missing → redirect to full initialization
- If git clone fails → ask user to verify URL and network access
- If backup creation fails → cancel update (safety precaution)
- If validation fails after update → rollback from backup
- If project files are lost → immediately restore from backup and cancel

## Progress Tracking

Show progress after each phase:
```
📊 Update Progress: [current]/9 phases
✅ Git Source Setup (Pre)
✅ Version Detection (Phase 0)
⏳ Backup Creation (Phase 1 - in progress...)
⬜ Remaining phases...
```
