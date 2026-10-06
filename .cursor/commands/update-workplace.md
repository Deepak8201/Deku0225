# Update Workplace

> **Core Command** - Safely update the AI Workplace template to a newer version

## Overview

This command launches the Workplace update process. The AI agent clones a fresh template from a git URL you provide, compares versions, creates a backup, and applies the update while preserving all your project customizations.

## How to Use

Type `/update-workplace` in Cursor chat to start the update process.

## Agent Instructions

**When this command is triggered, the AI agent MUST:**

1. **Delegate to Project Updater Agent:**
   - Read the agent definition at `.cursor/agents/project-updater.md`
   - The Project Updater reads the `project-update` skill for phase orchestration
   - The Project Updater reads phase reference docs from `skills/project-update/references/` as needed

2. **The Project Updater Agent will:**
   - Ask for the git URL of the new template version
   - Clone to `.cursor/.temp-update/`
   - Validate the cloned template structure
   - Detect update type (patch/minor/major)
   - Create a full backup at `.cursor/.backups/`
   - Run pending migrations (any update type; a project with none skips the phase)
   - Scan and preserve all project customizations
   - Update Core files from the cloned template
   - Verify all customizations survived
   - Reconcile configs and validate integrity
   - Generate update report
   - Ask user to confirm temp directory cleanup

## Prerequisites

- Project must be initialized (`.cursor/rules/.core-version.json` with `initializationStatus: "active"`)
- Git must be available on the system
- Network access to the template repository

## What Gets Preserved

Never written by any step of the update:

- `.cursor/rules/project/metadata.json` — project identity
- `AGENTS.md` → `Project Conventions` section — team-wide rules
- `.cursor/skills/*/references/guidelines.md` — rendered domain guidelines (packages ship only `template.md`)
- `.apm/` in the repo root — the project's own APM primitive overrides
- `docs/project/` — project documentation
- `.cursor/project_init.md` Decision Log, Open Gaps, Initialization Summary (Smart Merge)
- `.cursor/skills/{coding-standards-context,infrastructure-context}/project-config.json` — Core context configs

> ⚠️ **Not unconditionally preserved.** Step 3.5.b of this flow runs `APM_LEGACY_SKILL_PATHS=1 apm install`, which redeploys everything the installed APM packages own. That covers APM-deployed agents/commands/skills in `.cursor/` **and** the `project-config.json` of every role-pack `*-context` skill (it ships inside the package). APM has no per-file conflict prompt — surface its end-of-run diagnostic summary to the user and list every collision so lost edits can be re-applied. Durable customizations belong in `.apm/` — see [CUSTOMIZATION.md → Channel 1b](https://git.netcracker.com/DEMO.SE.AI/nc-ai-workplace/-/blob/master/docs/core/CUSTOMIZATION.md#1b--override-the-artifact-from-the-projects-own-apm).
>
> The legacy `project-*` prefix artifacts (`.cursor/rules/project/*.mdc`, `.cursor/{agents,commands,skills}/project-*`) were retired in v3.0.0. They are still carried through the Core copy step untouched, then offered for per-file migration by `migration_v3_0_drop_project_customizations`.

## Troubleshooting

### Project not initialized
- Error: "initializationStatus is fresh" means the project hasn't been initialized yet
- Run `/initialize` first, then use `/update-workplace` for future updates

### Git clone fails
- Verify the URL is correct and accessible
- Check network connectivity
- For private repos, ensure authentication is configured

### Update fails mid-process
- The agent will automatically rollback from the backup
- Check the error details and try again
- Backup location: `.cursor/.backups/backup-YYYY-MM-DD-HHmmss/`

## Related Commands

- `/initialize` - Full project initialization (use for first-time setup)
- `/quick-init` - Fast template initialization

## Related Files

- [Project Updater Agent](../agents/project-updater.md) - Agent handling this command
- [Project Update Skill](../skills/project-update/SKILL.md) - Update workflow orchestration
- [Workplace Documentation Map](../skills/project-initialization/references/workplace-docs.md) - Which upstream `docs/**` guide answers what, and how to resolve it (local first, then the template’s Git URL via `scripts/fetch-workplace-doc.js`)
- [MIGRATION_BACKUP.md](https://git.netcracker.com/DEMO.SE.AI/nc-ai-workplace/-/blob/master/docs/core/MIGRATION_BACKUP.md) - User-facing guide to this command: [update in 3 steps](https://git.netcracker.com/DEMO.SE.AI/nc-ai-workplace/-/blob/master/docs/core/MIGRATION_BACKUP.md#update-in-3-steps), [preserved vs overwritten](https://git.netcracker.com/DEMO.SE.AI/nc-ai-workplace/-/blob/master/docs/core/MIGRATION_BACKUP.md#what-is-preserved-what-is-overwritten), [backups](https://git.netcracker.com/DEMO.SE.AI/nc-ai-workplace/-/blob/master/docs/core/MIGRATION_BACKUP.md#backups), [rollback](https://git.netcracker.com/DEMO.SE.AI/nc-ai-workplace/-/blob/master/docs/core/MIGRATION_BACKUP.md#rollback)
- [CUSTOMIZATION.md](https://git.netcracker.com/DEMO.SE.AI/nc-ai-workplace/-/blob/master/docs/core/CUSTOMIZATION.md) - Which customizations survive an update ([quick reference](https://git.netcracker.com/DEMO.SE.AI/nc-ai-workplace/-/blob/master/docs/core/CUSTOMIZATION.md#update-safety-quick-reference))

---

*This is a Core command for Workplace template updates.*
