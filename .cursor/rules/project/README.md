# Project Identity

This directory holds the project's identity file:

- `metadata.json` -- Project name, team, environments, ownership, description. Created during initialization Phase 6.5 and read by other Core artifacts.

## What lives here

Just `metadata.json`. Nothing else.

## What used to live here (removed in v3.0.0)

Earlier versions of the template kept a parallel "project customizations" system in this directory: `*.mdc` rule files, a `.templates/` folder, and a `routing.mdc`. That system was removed because it duplicated the role-pack mechanism. Project adaptation is now done through three native channels:

1. **Adapt APM-installed artifacts** in `.cursor/agents/`, `.cursor/commands/`, `.cursor/skills/` after `apm install`. They sit outside `coreFiles`, so the Core copy step never writes over them — but APM owns those paths and redeploys them on every `apm install` / `apm update` with no per-file conflict prompt. Durable customizations belong in the project's own `.apm/` directory (deployed last, wins on collision).
2. **Add project conventions** to the `Project Conventions` section of the root `AGENTS.md`.
3. **Configure context skills** by editing `project-config.json` and regenerating `references/guidelines.md` (Initialization Phase 6).

If your project still has legacy `project-*` artifacts or `*.mdc` files in this directory, run `/update-workplace`. The `migration_v3_0_drop_project_customizations` step will detect them and offer per-file migration into the channels above.

## Related

- [Customization Guide](https://git.netcracker.com/DEMO.SE.AI/nc-ai-workplace/-/blob/master/docs/core/CUSTOMIZATION.md)
- [APM Packages](https://git.netcracker.com/DEMO.SE.AI/nc-ai-workplace/-/blob/master/docs/core/APM_PACKAGES.md)
- [APM workflow reference](../../skills/project-initialization/references/apm-workflow.md)
- [apm-packaging skill](../../skills/apm-packaging/SKILL.md)
