# Documentation Sync Command

> **Utility Command** - Synchronize documentation with local code/configuration changes

## Overview

This command triggers an on-demand documentation synchronization workflow using the Documentation Sync agent. It works for both the NC AI Workplace template itself and initialized projects.

## How to Use

Type `/docs-sync` in Cursor chat to start documentation synchronization.

**Aliases:**
- "Sync documentation"
- "Update docs to reflect changes"
- "Synchronize documentation"

## Agent Delegation

**When this command is triggered, the AI agent MUST delegate to the Documentation Sync Agent:**

- Read the agent definition at `.cursor/agents/documentation-sync.md`
- The Documentation Sync agent reads the `documentation-management` skill
- The skill contains registry management, sync workflow, and markdown standards

**The Documentation Sync Agent will:**

1. **Context Detection:** Check `.cursor/rules/.core-version.json` to determine Template vs Project mode
2. **Scope Determination:** Identify document scope based on mode
3. **Scan for Staleness:** Cross-reference changed code with documentation
4. **Validate Links:** Run `node .cursor/skills/project-initialization/scripts/validate-doc-links.js --json` to find broken references authoritatively instead of manual inspection
5. **Sync Context Skills (Project Mode only):** For every affected context skill, reconcile `project-config.json` first, then re-render `references/guidelines.md` from it — these are the artifacts agents actually load at runtime, and the order is not interchangeable. See *Context Skill Sync* in the `documentation-management` skill
6. **Propose Updates:** Present specific changes with before/after comparison
7. **Apply Changes:** Only after user approval
8. **Update Tracking:** Log changes in CHANGELOG.md
9. **Re-validate & Record State:** Re-run the validator to confirm no new broken links; in Project Mode also run `node .cursor/skills/project-initialization/scripts/check-guidelines-specificity.js --required <skills touched>` to prove the synced guidelines are still grounded in the project (**never in Template Mode** — its context skills are uninitialized by design); then run `node .cursor/hooks/docs-sync-check.js --record-state` so the hook doesn't immediately re-recommend on the files this sync just touched

---

## Output Modes

### Interactive Mode (Default)

- Proposes each change individually
- Waits for user approval before applying
- Allows modification of proposals
- Best for careful review

### Report Mode

Triggered by: `/docs-sync --report` or "generate sync report"

- Generates markdown report without making changes
- Saves report to `docs/_sync_report.md` (temporary)
- Useful for review before applying changes

### Auto Mode

Triggered by: `/docs-sync --auto` or "auto-sync documentation"

- Applies all "safe" changes automatically
- Prompts only for risky changes (deletions, major rewrites)
- Best for routine synchronization

### Git History Mode

Triggered by: `/docs-sync --since=<period>` or when the agent recommends it after hook detection

Analyzes committed changes for the specified period and checks if documentation is stale relative to those commits:
- `/docs-sync --since=7d` — last 7 days
- `/docs-sync --since=2w` — last 2 weeks
- `/docs-sync --since=v1.2.0` — since git tag
- `/docs-sync --since=abc1234` — since specific commit

Agent will:
1. Run `git log --name-only --since=<period>` (or `git log --name-only <ref>..HEAD` for tags/commits) to get changed files
2. Apply the same category-to-skill mapping as local analysis
3. Scan documentation for staleness relative to those changes
4. Propose updates with before/after comparison

Can be combined with other modes: `/docs-sync --since=7d --report`

---

## Common Scenarios

### Scenario 1: After Feature Implementation

```
User: "I just implemented user authentication with Auth0"

Agent:
1. Identifies change category: Authentication
2. Scans: SECURITY.md, ARCHITECTURE.md, development.mdc, api-context skill
3. Proposes updates for each affected document
```

### Scenario 2: After Dependency Update

```
User: "Updated React from 18 to 19"

Agent:
1. Identifies change category: Dependencies
2. Scans: README.md, GETTING_STARTED.md, development.mdc
3. Proposes version updates across documentation
```

### Scenario 3: Periodic Health Check

```
User: "/docs-sync --report"

Agent:
1. Full scan mode activated
2. Checks all documentation for consistency
3. Validates all cross-references
4. Generates comprehensive report without changes
```

### Scenario 4: Hook-Triggered Recommendation

```
Agent completes a task that modified 3+ files (counting uncommitted changes
AND anything committed since the last sync/--record-state), added
dependencies, or changed architectural files (.cursor/agents/, rules/,
.cursor/hooks/, etc.). The stop hook fires a `followup_message`, which Cursor
auto-submits as the NEXT USER TURN — it is not a passive chat note the agent
can choose to ignore; the agent must respond to it like any other user
message.

The message itself carries an "AGENT INSTRUCTION" block that is binding:

Agent (upon receiving the auto-submitted message):
1. Does NOT start any sync immediately, even though it looks like a user
   request — the message explicitly forbids that
2. Presents exactly the two options named in the message and waits for the
   user's actual next reply:
   a) /docs-sync for current uncommitted + committed-since-last-sync changes
   b) /docs-sync --since=<period> for a deeper git history analysis than what
      the hook's own commit tracking already covered
3. If the user dismisses or asks something unrelated — does nothing further
4. On explicit choice — runs the selected mode (see Step 9 above: both modes
   end with re-validating links, verifying context-skill specificity in
   Project Mode, and calling docs-sync-check.js --record-state)
```

The hook message's "Context skill artifacts that may need refresh" list names
both `project-config.json` and `references/guidelines.md` per affected skill —
feed it directly into Step 5 instead of re-deriving the mapping.

### Scenario 5: Git History Analysis

```
User: "/docs-sync --since=2w"

Agent:
1. Runs git log --name-only --since=2.weeks.ago
2. Maps changed files to categories and skills
3. Scans documentation for staleness relative to those commits
4. Proposes updates with before/after comparison
```

### Scenario 6: Template Development

```
User: "sync template docs"

Agent:
1. Forces Template Mode
2. Scans all template documentation
3. Validates Core rules and docs consistency
4. Updates CHANGELOG.md with changes
```

---

## Integration with Documentation Sync Agent

This command works with the Documentation Sync agent's proactive BEFORE/AFTER workflows:

| Aspect | AFTER-work auto-check | /docs-sync | /docs-sync --since |
|--------|----------------------|------------|-------------------|
| **Trigger** | Hook-suggested (user confirms) | On-demand (user initiated) | On-demand or hook-suggested |
| **Scope** | Current task's impact | Full documentation scan | Git history for specified period |
| **Mode** | Reactive | Proactive or Reactive | Historical analysis |
| **Use Case** | During development | Periodic maintenance | Post-sprint or release review |

---

## Related Documentation

- [Documentation Sync Agent](../agents/documentation-sync.md) - Agent handling this command
- [Documentation Management Skill](../skills/documentation-management/SKILL.md) - Registry and sync workflow
- [Hook Script](../hooks/docs-sync-check.js) - Automatic change detection on agent stop
- [Link Validator](../skills/project-initialization/scripts/validate-doc-links.js) - Authoritative internal link/anchor checker used by Steps 4 and 9 above
- [Guidelines Specificity Gate](../skills/project-initialization/scripts/check-guidelines-specificity.js) - Verifies synced context skills are installed, rendered, and grounded (Step 9, Project Mode only)
- [Workplace Documentation Map](../skills/project-initialization/references/workplace-docs.md) - Which upstream `docs/**` guide answers what, and how to resolve it (local first, then the template’s Git URL via `scripts/fetch-workplace-doc.js`) — those documents are **not** shipped into initialized projects
- [AGENT_CONTEXT_AND_DOCS_SYNC.md](https://git.netcracker.com/DEMO.SE.AI/nc-ai-workplace/-/blob/master/docs/core/AGENT_CONTEXT_AND_DOCS_SYNC.md) - Authoritative spec of the `stop` hook and the link validator this command drives ([hook](https://git.netcracker.com/DEMO.SE.AI/nc-ai-workplace/-/blob/master/docs/core/AGENT_CONTEXT_AND_DOCS_SYNC.md#documentation-stop-hook-docs-sync-checkjs), [validator](https://git.netcracker.com/DEMO.SE.AI/nc-ai-workplace/-/blob/master/docs/core/AGENT_CONTEXT_AND_DOCS_SYNC.md#link-validation-validate-doc-linksjs))
- [DEVELOPMENT_WORKFLOW.md](https://git.netcracker.com/DEMO.SE.AI/nc-ai-workplace/-/blob/master/docs/core/DEVELOPMENT_WORKFLOW.md#documentation-management) - Day-to-day documentation practice
- [CHANGELOG.md](mdc:../../CHANGELOG.md) - Version history

---

## Troubleshooting

### Agent doesn't detect changes

- Ensure you're in Agent mode (not Ask or Edit mode)
- Try specifying scope: "sync docs for API changes"
- Use full scan mode: `/docs-sync --report`

### Too many changes proposed

- Use interactive mode for careful review
- Specify narrower scope: "sync only README"
- Skip non-critical updates

### Cross-reference validation fails

- Run `node .cursor/skills/project-initialization/scripts/validate-doc-links.js` (add `--all` if a gitignored doc might be involved) to get an authoritative list of broken links/anchors instead of checking paths by hand
- Update broken links manually, then re-run the validator to confirm

---

*This is a Core command for on-demand documentation maintenance via the Documentation Sync agent.*
