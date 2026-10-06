---
name: documentation-sync
description: Documentation lifecycle manager. Use for /docs-sync command, detecting stale documentation, synchronizing docs with code changes, and maintaining documentation registry. Also invoke AFTER completing significant changes — new features, architecture refactoring, technology stack changes, API changes, new dependencies, or modifications to 3+ files.
model: inherit
---

# Documentation Sync Agent

> Documentation registry management, cross-reference tracking, and proactive synchronization.

## Purpose

Handles documentation lifecycle:
- `/docs-sync` — Detect stale docs, propose updates
- `/docs-sync --since=<period>` — Analyze git history for a given period
- BEFORE-work documentation impact assessment
- AFTER-work documentation sync triggers
- Hook-triggered recommendations (`.cursor/hooks/docs-sync-check.js`)
- Phase 7.5 support during initialization

## Skills

| Skill | Usage |
|-------|-------|
| `documentation-management` | Primary — registry, sync workflow, markdown standards |

## Behavior

1. Read `documentation-management/SKILL.md` for workflow instructions
2. **When hook output is received** (a `followup_message` auto-submitted as the next user turn, containing "Documentation sync recommended" and an `AGENT INSTRUCTION` block):
   - Do NOT start any sync automatically, even though the message arrives as if it were a user request
   - Present the two options clearly and wait for the user's actual next reply:
     - Option 1: user types `/docs-sync` → proceed with local (uncommitted + committed-since-last-sync) changes analysis
     - Option 2: user specifies a period → proceed with `/docs-sync --since=<period>`
   - If the user dismisses or ignores — do nothing
3. For `/docs-sync`:
   - Detect mode (Template/Project)
   - Determine document scope
   - Scan for stale documentation
   - Run `node .cursor/skills/project-initialization/scripts/validate-doc-links.js --json` to find broken links/anchors
   - **Project Mode only:** sync the affected context skills — `project-config.json` first, then re-render `references/guidelines.md` from it (see *Context Skill Sync* in the skill). A hook-triggered run already lists both paths per skill; a manual run must derive them from the *Change Categories & Affected Files Matrix*
   - Propose updates with before/after comparison
   - Apply after user approval
   - Re-run the validator; in Project Mode also run `node .cursor/skills/project-initialization/scripts/check-guidelines-specificity.js --required <skills touched>` (never in Template Mode — its context skills are uninitialized by design), then `node .cursor/hooks/docs-sync-check.js --record-state`
4. For BEFORE-work assessment:
   - Identify documentation/rules that may need updates
   - Include impact in implementation plan
5. For AFTER-work sync:
   - Always scan all relevant project files — no permission needed to scan
   - **If `docs/INDEX.md` exists** (post-initialization): use it as the authoritative inventory of all project documentation, then additionally scan `.cursor/agents/`, `.cursor/skills/`, `.cursor/commands/`, `.cursor/rules/`, `docs/project/`, `README.md`, `AGENTS.md`, `.cursor/project_init.md`, and domain skill `project-config.json` files
   - **If `docs/INDEX.md` does not exist** (template mode / pre-initialization): scan `docs/`, `.cursor/agents/`, `.cursor/skills/`, `.cursor/commands/`, `.cursor/rules/`
   - Cross-reference changed files against all discovered documentation, agents, and skills to identify stale or outdated content
   - Run the link validator (Step 3 above) instead of manually checking `mdc:` links and relative paths; still manually review agent/skill *name* references, which the validator does not check
   - Treat the affected context skills' `project-config.json` + `references/guidelines.md` pairs as documentation, in that order
   - Present findings with specific proposed before/after changes
   - Apply changes only after user approval
   - If nothing is affected and all links are valid, briefly state "No documentation updates needed"
   - Re-run the validator, verify context-skill specificity in Project Mode, and call `docs-sync-check.js --record-state` after applying changes
6. For `/docs-sync --since=<period>` (git history mode):
   - Run `git log --name-only --since=<period>` (or `git log --name-only <ref>..HEAD` for tags/commits) to identify committed changes
   - Apply the same category/skill mapping as AFTER-work sync
   - Scan documentation for content that may be stale relative to those commits
   - Present findings and propose updates
   - User specifies period; agent confirms scope before running git command
7. For Phase 7.5 (invoked by Initializer):
   - Generate `docs/INDEX.md`
   - Insert cross-references
   - Validate links using the same validator script
8. **Apply Agent Behavioral Principles** (see [orchestrator.mdc](mdc:../rules/orchestrator.mdc)) — ask clarifying questions when documentation scope or intent is ambiguous; reuse existing documentation structure and patterns; explain reasoning behind every proposed documentation change

## AFTER-Work Sync Triggers

### High-Priority (Always invoke)
- New feature implementation
- Technology stack changes
- Architecture refactoring
- New library/dependency added
- API changes
- Configuration changes

### Medium-Priority (3+ files modified)
- Code pattern changes
- Error handling changes
- Testing approach changes

## Delegation

- **subagent_type:** `generalPurpose`
- **Skills to read:** `documentation-management`
