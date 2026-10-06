# Migration & Customization Scan (Phases 2-3)

> Run pending migrations and scan for project customizations to preserve.

## Phase 2: Migration

**Run this phase for every update type — Patch, Minor and Major — and let `pendingMigrations` decide.** Step 1 already computes it as `migrations.available` (template) minus `migrations.applied` (project); when that list is empty the phase is a no-op and costs nothing.

> **Why not "major only".** Migrations are keyed to a *release*, not to a SemVer class. `v4.5.1-activation-verification`, `v4.5.2-init-reliability` and `v4.6.0-init-restructure` all ship in patch or minor releases, and all of them do work a file copy cannot: registering new Core files in the project's map, flagging `docs/**` optional so Phase 8 stops blocking, creating `.cursor/project/analysis/`, and running the two new health gates in report-only mode. Gating on the bump class skipped every one of them.

### Step 1: Check for Pending Migrations

```javascript
const templateSource = '.cursor/.temp-update/';
const templateVersion = JSON.parse(
  readFile(`${templateSource}.cursor/rules/.core-version.json`)
);
const currentVersion = JSON.parse(
  readFile('.cursor/rules/.core-version.json')
);

const appliedMigrations = currentVersion.migrations.applied.map(m =>
  typeof m === 'string' ? m : m.version
);

const availableMigrations = templateVersion.migrations?.available || [];
const pendingMigrations = availableMigrations.filter(
  m => !appliedMigrations.includes(typeof m === 'string' ? m : m.version)
);
```

### Step 2: Execute Pending Migrations

For each pending migration, execute the migration steps and log changes.

#### Example Migration: `v2.0.0-subagent-architecture`

```javascript
migration_v2_subagent_architecture() {
  // 1. Create project rules subdirectory
  mkdir -p .cursor/rules/project/.templates
  mkdir -p .cursor/commands/.templates

  // 2. Move user rules from old structure if present
  if (directoryExists('.cursor/project/rules/')) {
    const userRules = listFiles('.cursor/project/rules/', '*.mdc');
    for (const file of userRules) {
      mv file .cursor/rules/project/
    }
  }

  // 3. Move user commands from old structure if present
  if (directoryExists('.cursor/project/commands/')) {
    const userCommands = listFiles('.cursor/project/commands/', '*.md');
    for (const file of userCommands) {
      mv file .cursor/commands/project-${basename(file)}
    }
  }

  // 4. Move metadata from old location
  if (fileExists('.cursor/project/config/metadata.json')) {
    mv '.cursor/project/config/metadata.json' '.cursor/rules/project/metadata.json'
  } else {
    createFile('.cursor/rules/project/metadata.json', defaultMetadata);
  }

  // 5. Remove old directory
  if (directoryExists('.cursor/project/')) {
    rmdir '.cursor/project/'
  }

  // 6. Record migration
  updateCoreVersion({
    migrations: { applied: [...applied, 'v2.0.0-subagent-architecture'] }
  });
}
```

#### Example Migration: `v3.0.0-role-packs`

This migration moves role-specific artifacts that older Workplace versions placed in core `.cursor/{agents,commands,skills}/` into the role-pack model. After the migration, only role-pack-activated artifacts (and core artifacts) live in `.cursor/`. Project customizations (`project-*` prefix or under `.cursor/rules/project/`) are NEVER touched.

```javascript
migration_v3_role_packs() {
  // Roleful artifacts that pre-v3 lived in core .cursor/ but are now provided by role packs
  const orphanCandidates = {
    agents: [
      'frontend-specialist.md', 'backend-specialist.md', 'database-specialist.md',
      'api-specialist.md', 'performance-specialist.md', 'testing-specialist.md',
      'coding-standards.md',
    ],
    commands: [
      'quality-check.md', 'codegen-benchmark.md', 'tdd-workflow.md', 'test-verify.md',
      'ba-confluence-import.md', 'ba-generate-tasks.md', 'ba-impact-analysis.md', 'ba-uml.md',
    ],
    skills: [
      'frontend-context', 'backend-context', 'database-context', 'api-context',
      'performance-context', 'testing-context', 'tdd-workflow',
      'quality-check', 'codegen-benchmark', 'codegen-scorer',
      'ba-confluence-import', 'ba-impact-analysis', 'ba-task-generation', 'ba-uml-modeling',
    ],
  };

  // 1. Read selected roles & determine active role packs
  const selectedRoles = readSelectedRoles('.cursor/project_init.md');
  const activePacks   = scanRolePacks('Modules_Registry/role-packs/').filter(
                          p => intersect(p.targetRoles, selectedRoles).length > 0);

  // 2. Compute the union of artifacts that role packs would re-introduce
  const owned = unionArtifactsFrom(activePacks);

  // 3. For each orphan candidate that is NOT owned by an active pack:
  //    - if the file/dir is unmodified vs the pre-v3 Core hash → delete (it will be re-copied if a pack is later activated)
  //    - if modified → present to user with options: keep (mark as project customisation), move to Modules_Registry/role-packs/{custom-pack}/, delete
  for (const type of ['agents', 'commands', 'skills']) {
    for (const name of orphanCandidates[type]) {
      const targetPath = `.cursor/${type}/${name}`;
      if (!exists(targetPath)) continue;
      if (owned[type].has(name)) continue; // pack owns it; leave it alone — pack copy keeps it fresh
      if (isUnmodifiedAgainstPreV3Hash(targetPath)) {
        rm(targetPath); // recursive for skill dirs
        log('removed orphan: ' + targetPath);
      } else {
        promptUserForOrphan(targetPath); // keep / move-to-pack / delete
      }
    }
  }

  // 4. Drop the synthetic command template directory
  if (directoryExists('.cursor/commands/.templates/')) {
    promptUserBeforeDelete('.cursor/commands/.templates/'); // synthetic generation removed in v3
  }

  // 5. Re-run Phase 1.7 (role-pack auto-activation) for currently selected roles
  reRunRolePackActivation(selectedRoles);

  // 6. Run Phase 6 Part 3.5 to re-validate guidelines.md across coreContextSkills + active packs
  validateGuidelinesGate();

  // 7. Record migration
  updateCoreVersion({
    migrations: { applied: [...applied, 'v3.0.0-role-packs'] }
  });
}
```

#### Migration: `v3.0.0-tdd-into-skills`

**Purpose:** Retire the standalone `tdd_workflow.mdc` rule. Its content has been merged into `code-quality-standards/SKILL.md` (universal RED-GREEN-REFACTOR discipline) and `coding-standards-context/references/template.md` → `references/guidelines.md` (project-specific TDD policy).

```javascript
migration_v3_0_tdd_into_skills() {
  const RULE = '.cursor/rules/tdd_workflow.mdc';

  // 1. If the rule still exists from a pre-v3 install, remove it.
  if (fileExists(RULE)) {
    if (isUnmodifiedAgainstPreV3_Hash(RULE)) {
      rm(RULE);
      log('removed obsolete rule: ' + RULE);
    } else {
      // User edited the rule. Back it up, then ask whether to delete or keep
      // (keeping it as a project rule means it WILL conflict with the new
      // code-quality-standards content; warn the user explicitly).
      const backup = `.cursor/.update-backup/tdd_workflow.mdc.${timestamp()}`;
      mkdirp(dirname(backup));
      cp(RULE, backup);
      promptUser({
        question: `tdd_workflow.mdc has local edits. Delete it? (Custom edits preserved at ${backup}.)`,
        choices: [
          { id: 'delete',  label: 'Delete (recommended; content lives in code-quality-standards skill now)' },
          { id: 'keep',    label: 'Keep as-is (WARNING: duplicates the universal TDD discipline)' },
          { id: 'project', label: `Move to .cursor/rules/project/tdd_workflow.mdc as a project override` },
        ],
      });
      // Apply user's choice.
    }
  }

  // 2. Make sure the new sections are present in the skill files (they ship
  //    with the v3.0.0 Core, but verify the `Test-Driven Development (TDD)`
  //    headings exist after the Core copy step).
  assertContains('.cursor/skills/code-quality-standards/SKILL.md',
                 '## Test-Driven Development (TDD)');
  assertContains('.cursor/skills/coding-standards-context/references/template.md',
                 '## Test-Driven Development (TDD) Policy');

  // 3. Migrate any existing project-config.json so it has the new `testing.*`
  //    block. Existing configuration is preserved; only new fields are added
  //    with `null` defaults.
  const cfgPath = '.cursor/skills/coding-standards-context/project-config.json';
  if (fileExists(cfgPath)) {
    const cfg = JSON.parse(readFile(cfgPath));
    if (!cfg.testing) {
      cfg.testing = {
        tddPolicy: null,
        mandatoryCategories: [],
        framework: null, e2eFramework: null, coverageTool: null,
        runCommand: null, runAllCommand: null, watchCommand: null,
        fileNaming: null, fileLocation: null, nameStyle: null,
        mockingStrategy: null,
        coverageThresholds: { statements: null, branches: null,
                              functions: null, lines: null, enforcement: null },
        outputDir: 'tests_output/', ciIntegration: null,
        taskmasterUsage: null, notes: '',
      };
      writeFile(cfgPath, JSON.stringify(cfg, null, 2));
      log('extended project-config.json with testing.* block');
    }
  }

  // 4. If the project has a rendered `references/guidelines.md` already,
  //    re-run Phase 6 Part 3 for `coding-standards-context` so the file picks
  //    up the new "TDD Policy" section. The Phase 6 Part 3.5 hard gate then
  //    enforces that all placeholders are resolved before the update finishes.
  reRenderGuidelinesFor('coding-standards-context');
  validateGuidelinesGate();

  // 5. Record migration.
  updateCoreVersion({
    migrations: { applied: [...applied, 'v3.0.0-tdd-into-skills'] }
  });
}
```

> **Safety:** the migration never touches `.cursor/rules/project/` (project rules), and offers a third option to move a customised `tdd_workflow.mdc` there as a project override if the user wants to keep it. The new `testing.*` block in `project-config.json` is purely additive — existing values are not overwritten.

#### Migration: `v3.0.0-reflection-checkpoints`

**Purpose:** Land the **Adaptive Initialization + Phase Reflection Checkpoint** workflow on top of an existing pre-v3 install. The bulk of this change is delivered by replacing Core skill / agent files (handled by the standard core-update step), but `.cursor/project_init.md` is a **project-owned** file and therefore needs additive, idempotent injection of the new Reflection sub-checkboxes and Reflection Notes template subsections without destroying anything the user has already filled in.

```javascript
migration_v3_0_reflection_checkpoints() {
  const PROJECT_INIT = '.cursor/project_init.md';
  const PHASES = [1, 2, 4, 5, 6];

  // 1. Verify the v3.0.0 Core copy step has already replaced the SKILL +
  //    references that this migration depends on. These files are listed in
  //    `.core-version.json#coreFiles` and are refreshed by the standard
  //    update flow before any migration runs.
  assertContains('.cursor/skills/project-initialization/SKILL.md',
                 '## Phase Reflection Checkpoint (MANDATORY between phases)');
  assertContains('.cursor/skills/project-initialization/references/mode-detection.md',
                 'Auto-Mode');
  assertContains('.cursor/agents/initializer.md',
                 'Mandatory Phase Reflection Checkpoint');

  // 2. Inject Reflection state into project_init.md. Skip silently if the
  //    file does not exist (project not initialised yet — fresh install,
  //    no migration needed) or if the markers are already present (idempotent).
  if (!fileExists(PROJECT_INIT)) {
    log('skip: project_init.md not present (fresh install)');
  } else {
    const original = readFile(PROJECT_INIT);
    let body = original;

    // 2a. Add `Phase {N} reflection completed` sub-checkbox under each existing
    //     Phase 1 / 2 / 4 / 5 / 6 status entry. Match by phase header line; do
    //     not insert if a "reflection completed" line already follows.
    for (const N of PHASES) {
      const checkboxMarker = `Phase ${N} reflection completed`;
      if (body.includes(checkboxMarker)) continue;
      body = insertSubCheckboxAfterPhaseHeader(body, N,
        `  - [ ] ${checkboxMarker}`);
    }

    // 2b. Append `### Phase {N} Reflection Notes` template subsections to the
    //     "Notes & Additional Context" section. Each block is added only when
    //     the heading is missing.
    for (const N of PHASES) {
      const heading = `### Phase ${N} Reflection Notes`;
      if (body.includes(heading)) continue;
      body = appendUnderNotesSection(body, renderReflectionNotesTemplate(N));
    }

    // 2c. If the legacy "Ask for confirmation" instruction in the
    //     Initialization Mode section is byte-identical to the pre-v3 Core
    //     baseline, replace it with the v3.0.0 wording that points at
    //     `mode-detection.md`. If the user has edited it, leave it alone and
    //     emit a warning so they can reconcile manually.
    if (containsUnmodifiedPreV3Snippet(body, 'Ask for confirmation')) {
      body = replaceModeInstructionsWithV3_0(body);
    } else if (body.includes('Ask for confirmation')) {
      log('warning: project_init.md "Ask for confirmation" block has local '
        + 'edits — leaving untouched. Reconcile manually against '
        + '.cursor/skills/project-initialization/references/mode-detection.md.');
    }

    if (body !== original) {
      const backup = `.cursor/.update-backup/project_init.md.${timestamp()}`;
      mkdirp(dirname(backup));
      writeFile(backup, original);
      writeFile(PROJECT_INIT, body);
      log(`updated project_init.md (backup: ${backup})`);
    } else {
      log('project_init.md already on v3.0.0 reflection schema (no-op)');
    }
  }

  // 3. Record migration.
  updateCoreVersion({
    migrations: { applied: [...applied, 'v3.0.0-reflection-checkpoints'] }
  });
}
```

> **Safety:** this migration is **purely additive** to `.cursor/project_init.md` — it never deletes user-entered values, never reorders existing checklist items, and always backs up the file to `.cursor/.update-backup/` before writing. All injections are guarded by `body.includes(...)` markers so re-running the migration is a no-op. The legacy "Ask for confirmation" wording is only auto-rewritten when it matches the pre-v3 byte-identical baseline; any local edits cause a warning instead of an overwrite, so user customisations to the Initialization Mode section are preserved for manual reconciliation.

> **Safety:** orphan removal NEVER touches files matching the project-customisation conventions (`.cursor/commands/project-*`, `.cursor/agents/project-*`, `.cursor/skills/project-*`, anything under `.cursor/rules/project/`). It only operates on the explicit `orphanCandidates` list, and only if the file is byte-identical to the pre-v3 Core version (so user-edited files are preserved with a prompt instead of silent delete).

#### Migration: `v4.1.0-changelog-relocate`

**Purpose:** Relocate `CHANGELOG.md` from `docs/` to the project root (Keep a Changelog convention) when updating from Workplace template **4.0.0** (or any pre-4.1.0 version that still had `docs/CHANGELOG.md`). The standard core-update Step 5 already copies the new root-level `CHANGELOG.md` from the template; this migration removes the stale `docs/CHANGELOG.md` copy so only one authoritative file remains.

**Runs when:** `.core-version.json` showed version `4.0.0` (or lower) **before** the Core copy step, and `docs/CHANGELOG.md` still exists on disk after Step 5.

```javascript
migration_v4_1_0_changelog_relocate() {
  const STALE = 'docs/CHANGELOG.md';
  const BACKUP_ROOT = '.cursor/.backups/v4.1.0-changelog-relocate/';

  if (!fileExists(STALE)) {
    log('skip: docs/CHANGELOG.md not present (already on v4.1.0 layout or fresh install)');
    recordMigration('v4.1.0-changelog-relocate');
    return;
  }

  // Idempotency: if root CHANGELOG already exists and docs/ copy is gone, no-op.
  if (fileExists('CHANGELOG.md') && !fileExists(STALE)) {
    recordMigration('v4.1.0-changelog-relocate');
    return;
  }

  mkdirp(BACKUP_ROOT);
  cp(STALE, path.join(BACKUP_ROOT, 'CHANGELOG.md'));

  // Step 5 of core-update.md already copied template CHANGELOG.md to repo root.
  // Remove the stale docs/ copy only — never delete a root CHANGELOG the user edited.
  rm(STALE);

  // Optional: remove empty docs/CHANGELOG.md sibling references in project README
  // if they still point at docs/CHANGELOG.md (informational warning only).

  recordMigration('v4.1.0-changelog-relocate');
}
```

> **Safety:** backs up `docs/CHANGELOG.md` to `.cursor/.backups/v4.1.0-changelog-relocate/` before deletion. Re-running is a no-op once `docs/CHANGELOG.md` is absent. Does not touch user-edited root `CHANGELOG.md` content beyond what the standard Core copy step already overwrote (root `CHANGELOG.md` is listed in `coreFiles`).

#### Migration: `v4.0.0-apm-migration`

**Purpose:** Move a v3.x project off the legacy Workplace module system onto APM packages. Reads the previous activation state (`.cursor/rules/role-packs-state.json`, `.cursor/modules/*/module-config.json`, or a filename heuristic), generates the project's `apm.yml` with one dict-form entry per previously-active pack, deletes the legacy state files, runs the Phase 0 APM CLI bootstrap, and then instructs the user to run `APM_LEGACY_SKILL_PATHS=1 apm install`.

Runs **only** when `.core-version.json` showed a 3.x version *before* the Core copy step. Idempotent — every step checks whether the artifact still exists.

**Algorithm:**

```javascript
migration_v4_0_apm_migration() {
  // Migrates a v3.x project to v4.0.0 (APM-based packages). Runs ONLY when
  // .cursor/rules/.core-version.json showed version 3.x BEFORE the Core copy
  // step. Idempotent: re-running after partial completion is safe because
  // every step checks for the artifact's prior existence.
  //
  // The standard core-update step (run before this migration) already:
  //   - replaced orchestrator.mdc, development.mdc,
  //     project-initialization/SKILL.md + new references
  //     (apm-workflow.md, apm-bootstrap.md, phase-1-7-apm.md,
  //     updated environment-setup.md / configuration-updates.md /
  //     documentation.md / user-roles-mcp.md),
  //   - installed apm-packaging skill, package-new command, APM_PACKAGES.md,
  //     root apm.yml, prepare-apm-packages.ps1,
  //   - deleted Core legacy files (moduleActivate.md, module-activation/,
  //     Modules_Registry/, docs/core/Modules/, prepare-role-packs.ps1).
  //
  // This migration handles the PROJECT-OWNED legacy artifacts the Core copy
  // step intentionally leaves alone.
  const BACKUP_ROOT = '.cursor/.backups/v4-apm-migration/';
  mkdirp(BACKUP_ROOT);

  // 1. DISCOVER previously-activated packs/modules. Sources, in priority order:
  //    a. .cursor/rules/role-packs-state.json   (v3.x role-pack activation log)
  //    b. .cursor/modules/<Name>/module-config.json with status:"active"
  //    c. Heuristic: scan .cursor/agents/, .cursor/skills/, .cursor/commands/
  //       for filenames known to belong to each v3.x role-pack/module.
  const activatedPackages = discoverActivatedPackages();

  // 2. BACKUP legacy state files (just to .cursor/.backups/ for audit).
  for (const f of ['.cursor/rules/role-packs-state.json',
                   '.cursor/modules/']) {
    if (exists(f)) copyTo(f, BACKUP_ROOT);
  }

  // 3. DELETE legacy state files (Core copy step already deleted the *system*
  //    files; this removes the *runtime* artifacts).
  rmf('.cursor/rules/role-packs-state.json');
  rmf('.cursor/modules/');                // entire directory

  // 4. GENERATE the project's apm.yml at repo root if absent. If present,
  //    merge into existing dependencies.apm: preserving user-added entries.
  //    Packages live at the root of the Workplace-Agent-Packages repo
  //    (apmPackages.registryRepoUrl); each dep uses dict form with path:<name>
  //    (the only form that works on non-GitHub hosts in APM v0.13.x).
  const apmCfg  = readVersionFile().apmPackages || {};
  const repoUrl = apmCfg.registryRepoUrl || readVersionFile().templateSource.url;
  const branch  = apmCfg.registryBranch || readVersionFile().templateSource.branch || 'master';
  const entries = activatedPackages.map(name =>
    ({ git: repoUrl, path: name, ref: branch, alias: name }));
  upsertApmYml({ dependencies: { apm: entries } });

  // 5. APPEND APM ignore rules to .gitignore and .cursorignore. Reuse the same
  //    smart-duplicate-detection used by environment-setup.md Part 1 / 1.5.
  ensureLines('.gitignore',
              ['apm_modules/',
               '.workplace/activated/',
               '.workplace/state.json']);
  ensureLines('.cursorignore',
              ['apm_modules/',
               '.workplace/activated/']);

  // 6. RUN Phase 0 (apm CLI bootstrap) inline -- see
  //    .cursor/skills/project-initialization/references/apm-bootstrap.md.
  //    On success, persist apmVersion to .core-version.json.
  runPhase0_ApmBootstrap();

  // 7. PROMPT the user to run:
  //      APM_LEGACY_SKILL_PATHS=1 apm install
  //    This writes apm.lock.yaml and refreshes primitives in
  //    .cursor/agents/, .cursor/skills/, .cursor/commands/.  APM has NO
  //    per-file conflict prompt: collisions land in a grouped diagnostic
  //    summary at the END of the run, so hand-edited primitives may come
  //    back with package defaults.  The agent MUST surface that summary
  //    verbatim and list every reported collision/replacement so the user
  //    can re-apply lost edits.
  emitInstructions();

  return { migratedPackages: activatedPackages,
           backupRoot: BACKUP_ROOT,
           note: 'Files in .cursor/{agents,skills,commands}/ are left alone ' +
                 'by the Core copy step, but apm install redeploys the ones ' +
                 'its packages own -- without asking. Durable customizations ' +
                 'belong in the project-level .apm/ directory (see ' +
                 'docs/core/CUSTOMIZATION.md Channel 1b).' };
}
```

#### Migration: `v3.0.0-drop-project-customizations`

**Purpose:** Retire the parallel `project-*` customization system. v3.0.0 collapses three overlapping mechanisms (custom `project-*` agents/commands/skills, `.cursor/rules/project/*.mdc` rule files, `routing.mdc`) into the three native channels documented in `orchestrator.mdc` → "Project Adaptation":

1. **Adapt APM-deployed artifacts** in `.cursor/agents/`, `.cursor/commands/`, `.cursor/skills/` after `apm install` — quick edits in place, durable overrides in the project's own `.apm/`. (In v3.x the equivalent was editing the copies made by `/moduleActivate <pack>`; those copies pass through `migration_v4_0_apm_migration` untouched, but the first `apm install` afterwards redeploys whichever of them a package now owns.)
2. **Add team rules to the `Project Conventions` section** of root `AGENTS.md`.
3. **Edit `project-config.json`** in any context skill and regenerate `references/guidelines.md`.

The standard core-update step (run before this migration) already replaced `orchestrator.mdc`, `project-initialization/SKILL.md`, this `migration-and-scan.md`, and `docs/core/CUSTOMIZATION.md`, and deleted Core file `.cursor/rules/project_customizations.mdc`. This migration handles the **project-owned** legacy artifacts that the Core copy step intentionally leaves alone, plus the legacy `.templates/` and `routing.mdc` files in `.cursor/rules/project/`.

**Algorithm (interactive, per-file resolution, full backup):**

```javascript
migration_v3_0_drop_project_customizations() {
  const BACKUP_ROOT = '.cursor/.backups/customizations/';
  mkdirp(BACKUP_ROOT);

  // 1. DISCOVER (read-only) — group findings into 5 buckets.
  const findings = {
    rules:        listFiles('.cursor/rules/project/', '*.mdc')
                    .filter(f => !f.includes('/.templates/') &&
                                 basename(f) !== 'README.md'),
    routing:      fileExists('.cursor/rules/project/routing.mdc')
                    ? ['.cursor/rules/project/routing.mdc'] : [],
    templatesDir: directoryExists('.cursor/rules/project/.templates/')
                    ? '.cursor/rules/project/.templates/' : null,
    agents:       listFiles('.cursor/agents/',   'project-*.md'),
    commands:     listFiles('.cursor/commands/', 'project-*.md'),
    skills:       listDirectories('.cursor/skills/', 'project-*'),
  };

  const totalArtifacts =
    findings.rules.length + findings.routing.length +
    findings.agents.length + findings.commands.length + findings.skills.length +
    (findings.templatesDir ? 1 : 0);

  if (totalArtifacts === 0) {
    log('no legacy project-* artifacts found; nothing to migrate');
    recordMigration('v3.0.0-drop-project-customizations');
    return;
  }

  // 2. INVENTORY ROLE-PACK / CONTEXT-SKILL TARGETS — needed to suggest
  //    fold targets for each finding. Read each currently-installed skill
  //    and agent so the proposal table can name a concrete destination.
  const installedSkills = listDirectories('.cursor/skills/')
    .filter(d => !basename(d).startsWith('project-'));
  const installedAgents = listFiles('.cursor/agents/', '*.md')
    .filter(f => !basename(f).startsWith('project-'));
  const installedCommands = listFiles('.cursor/commands/', '*.md')
    .filter(f => !basename(f).startsWith('project-'));

  // 3. PROPOSE A TARGET FOR EACH FINDING. The proposals follow this map:
  //
  //    .cursor/rules/project/<name>.mdc
  //      → if name matches a domain (frontend/backend/api/db/perf/qa/coding/infra),
  //        propose:  fold into .cursor/skills/<domain>-context/references/guidelines.md
  //      → otherwise propose:  fold into AGENTS.md → "Project Conventions" → "<name>"
  //    .cursor/rules/project/routing.mdc
  //      → propose: drop  (slash commands self-route; agent description does the rest)
  //    .cursor/agents/project-<name>.md
  //      → if a similarly-named role-pack agent exists in installedAgents:
  //        propose: fold instructions into that agent file
  //      → otherwise propose: fold into AGENTS.md → "Project Conventions" → "<name>"
  //    .cursor/commands/project-<name>.md
  //      → propose: rename to .cursor/commands/<name>.md (drop project- prefix);
  //        commands without prefix already survive update because they're not in
  //        .core-version.json
  //    .cursor/skills/project-<domain>/
  //      → if .cursor/skills/<domain>-context/ exists:
  //        propose: merge SKILL.md sections + references/* into the existing skill
  //      → otherwise propose: rename to .cursor/skills/<domain>/ (drop project- prefix)
  //
  //    .cursor/rules/project/.templates/
  //      → propose: archive whole directory (it was for an opt-in workflow that
  //        no longer exists in the template)
  const proposals = buildProposals(findings, {
    skills:   installedSkills,
    agents:   installedAgents,
    commands: installedCommands,
  });

  // 4. PRESENT PER-FILE RESOLUTION TABLE.
  //    Each row offers: yes (apply), edit (let user adjust the target), skip.
  //    Whole-bucket "apply all", "skip all", or "skip remaining" shortcuts.
  const table = renderResolutionTable(proposals);
  const decisions = askUserForResolutions(table);
  // Example rendering:
  //
  // | # | Source file                                  | Proposed target                                                | Action                       |
  // |---|----------------------------------------------|----------------------------------------------------------------|------------------------------|
  // | 1 | .cursor/rules/project/team_react.mdc         | .cursor/skills/frontend-context/references/guidelines.md       | append section [yes/edit/skip] |
  // | 2 | .cursor/rules/project/team_security.mdc      | AGENTS.md → Project Conventions → "Security"                   | append section [yes/edit/skip] |
  // | 3 | .cursor/agents/project-deploy.md             | AGENTS.md → Project Conventions → "Deployment"                 | append section [yes/edit/skip] |
  // | 4 | .cursor/commands/project-staging-deploy.md   | rename to .cursor/commands/staging-deploy.md                   | rename       [yes/skip]        |
  // | 5 | .cursor/skills/project-internal-api/         | merge SKILL.md + references/* into .cursor/skills/api-context/ | merge        [yes/edit/skip]   |
  // | 6 | .cursor/rules/project/routing.mdc            | drop (Cursor self-routes via agent descriptions)               | drop         [yes/keep]        |
  // | 7 | .cursor/rules/project/.templates/            | archive whole directory                                        | archive      [yes/keep]        |

  // 5. APPLY ACCEPTED ACTIONS. Each action backs up before mutating.
  for (const decision of decisions) {
    if (decision.action === 'skip' || decision.action === 'keep') continue;

    const src = decision.source;
    const backupTarget = path.join(BACKUP_ROOT, src);
    mkdirp(dirname(backupTarget));
    cp(src, backupTarget); // recursive for directories

    switch (decision.action) {
      case 'append-to-guidelines':
        appendSectionToGuidelines(decision.target, src,
          { heading: decision.heading, body: readFile(src) });
        rm(src);
        break;
      case 'append-to-agents-md':
        appendSubsectionToProjectConventions('AGENTS.md',
          decision.heading, readFile(src));
        rm(src);
        break;
      case 'fold-into-role-pack-agent':
        appendDelimitedBlockToAgent(decision.target,
          { sourceLabel: src, body: readFile(src) });
        rm(src);
        break;
      case 'rename':
        mv(src, decision.target); // commands without project- prefix
        break;
      case 'merge-into-context-skill':
        mergeProjectSkillInto(src, decision.target); // copies SKILL.md sections + references/*
        rm(src, { recursive: true });
        break;
      case 'drop':
      case 'archive':
        rm(src, { recursive: true });
        break;
    }
    log(`${decision.action}: ${src} → ${decision.target || '(removed)'}`);
  }

  // 6. ALWAYS-DONE CLEAN-UP (independent of user choices)
  //    .cursor/rules/project_customizations.mdc is a Core-managed file and
  //    was already removed by the standard core-update step (it is no longer
  //    listed in coreFiles in v3.0.0). This migration only needs to clean up
  //    project-owned residue.
  //    Rewrite README.md to the v3.0.0 stub (only if user is still on the
  //    pre-v3 README that describes the customization workflow).
  const README = '.cursor/rules/project/README.md';
  if (fileExists(README) && containsLegacyCustomizationGuidance(readFile(README))) {
    cp(README, path.join(BACKUP_ROOT, README));
    writeFile(README, V3_0_PROJECT_README_STUB);
  }

  // 7. RE-RUN PHASE 6 PART 3.5 to confirm every requiredContextSkill still
  //    has a valid project-config.json + references/guidelines.md after any
  //    folds we performed.
  validateGuidelinesGate();

  // 8. RECORD MIGRATION.
  recordMigration('v3.0.0-drop-project-customizations');
}
```

> **Safety:**
> - **No file is ever deleted without a copy under `.cursor/.backups/customizations/<original-path>`.** This is a separate location from `.cursor/.update-backup/` so a user can re-apply a fold by hand long after the update finishes.
> - **The user can `skip` every row.** If every proposal is skipped, the migration only rewrites the legacy `README.md` stub and records itself; it does not touch any artifact.
> - **Conflicting content is shown as a diff first.** If a proposed fold would append content that semantically contradicts what is already in the target `references/guidelines.md` or in the role-pack agent, the migration prints a unified diff against the existing target and forces the user to choose `apply`, `edit-target-first`, or `skip`.
> - **`metadata.json` is never touched.** It survives unchanged in `.cursor/rules/project/metadata.json`.
> - **Nothing under `.cursor/skills/*/project-config.json`, `.cursor/skills/*/references/guidelines.md`, or any non-`project-*` `.cursor/{agents,commands,skills}/` file is touched** unless the user explicitly accepts a fold whose target points there. The Phase 3 preservation list (Step 3 below) keeps protecting those files for the rest of `/update-workplace`.

#### Migration: `v3.1.0-thin-project-init-ledger`

**Purpose:** Convert a legacy expanded `.cursor/project_init.md` (pre-v3.1.0 schema with full Technology Stack / Existing Project Analysis / Project Components / API Documentation Sources / Project Architecture / Web Performance Requirements / Constraints & Requirements / Security Requirements sections) into the compact ledger schema introduced in v3.1.0. The new schema records only initialization state, artifact pointers, a phase checklist, the supplemental source manifest, the User Answers & Decision Log, open gaps, and the initialization summary. All operational facts now live in authoritative artifacts (`development.mdc`, per-domain `project-config.json`, `security-sources.json` **when the `nc-code-security-audit` package is installed** — see `v4.4.0-security-extraction` above, `metadata.json`).

The migration is **safe-by-default**: it reads the legacy file, cross-checks each section against the corresponding authoritative artifact, and only collapses a section into a Decision-Log Q-block once its content is confirmed present (or explicitly empty) in the authoritative artifact. Any unmatched content is preserved verbatim under a new `## Migration Notes (v3.1.0)` section so the user can review and route it manually. The full pre-migration file is always backed up.

```javascript
migration_v3_1_thin_project_init_ledger() {
  const PROJECT_INIT = '.cursor/project_init.md';
  const BACKUP_ROOT  = '.cursor/.backups/project_init/';
  if (!fileExists(PROJECT_INIT)) {
    log('skip: project_init.md not present (fresh install — Core copy already wrote v3.1.0 ledger)');
    recordMigration('v3.1.0-thin-project-init-ledger');
    return;
  }

  const original = readFile(PROJECT_INIT);

  // 0. Idempotency — if the file already declares the v3.1.0 schema, skip.
  if (original.includes('# Project Initialization Ledger') &&
      original.includes('## Source-of-Truth Map') &&
      original.includes('## User Answers & Decision Log')) {
    log('project_init.md already on v3.1.0 ledger schema (no-op)');
    recordMigration('v3.1.0-thin-project-init-ledger');
    return;
  }

  // 1. BACKUP — full byte-for-byte copy under .cursor/.backups/project_init/
  //    so the legacy expanded file can always be recovered.
  mkdirp(BACKUP_ROOT);
  const backupPath = path.join(BACKUP_ROOT, `project_init.md.${timestamp()}.legacy`);
  writeFile(backupPath, original);
  log(`backed up legacy project_init.md to ${backupPath}`);

  // 2. PARSE the legacy file into a section map keyed by H2 / H3 heading.
  const legacy = parseMarkdownSections(original);

  // 3. RECONCILIATION TABLE — for each known legacy section, point to the
  //    authoritative artifact that should now own its content. Reconcile in
  //    a non-destructive way: only collapse a legacy section into a Q-block
  //    if the authoritative artifact already contains the equivalent content
  //    (or if the legacy section is empty / `[TO_BE_FILLED]` placeholders).
  const reconciliation = [
    { legacyHeading: '## Project Metadata',
      owner: '.cursor/rules/project/metadata.json',
      ledgerSection: '### Phase 2 — Project Metadata',
      collapseRule: 'metadataMatchesJsonOrEmpty' },
    { legacyHeading: '## Technology Stack',
      owner: '.cursor/rules/development.mdc',
      ledgerSection: '### Phase 3 — Technology Stack',
      collapseRule: 'stackMatchesDevelopmentMdcOrEmpty' },
    { legacyHeading: '## Existing Project Analysis',
      owner: 'per-domain project-config.json (database/api/backend/coding-standards)',
      ledgerSection: '### Phase 4 — Codebase Analysis (EXISTING_PROJECT)',
      collapseRule: 'analysisHasBeenPersistedToDomainConfigs' },
    { legacyHeading: '## Project Components & Their Purpose',
      owner: 'backend-context or frontend-context project-config.json (businessModules)',
      ledgerSection: '### Phase 5 — Requirements',
      collapseRule: 'componentsPersistedToDomainConfigs' },
    { legacyHeading: '## API Documentation Sources',
      owner: 'api-context/project-config.json (references.*, endpoints, externalIntegrations)',
      ledgerSection: '### Phase 5 — Requirements',
      collapseRule: 'apiContentPersistedToApiContext' },
    { legacyHeading: '## Project Architecture & Key Decisions',
      owner: 'development.mdc + per-domain project-config.json',
      ledgerSection: '### Phase 5 — Requirements',
      collapseRule: 'architecturePersistedAcrossArtifacts' },
    { legacyHeading: '## Web Performance Requirements',
      owner: 'performance-context/project-config.json',
      ledgerSection: '### Phase 5 — Requirements',
      collapseRule: 'performancePersistedToPerformanceContext' },
    { legacyHeading: '## Constraints & Requirements',
      owner: 'coding-standards-context/project-config.json (constraints)',
      ledgerSection: '### Phase 5 — Requirements',
      collapseRule: 'constraintsPersistedToCodingStandardsContext' },
    { legacyHeading: '## Security Requirements',
      owner: '.cursor/skills/security-compliance/assets/security-sources.json (only when nc-code-security-audit is installed) + coding-standards-context (compliance)',
      ledgerSection: '### Phase 5 — Requirements',
      collapseRule: 'securityPersistedToSecurityArtifacts' },
    { legacyHeading: '## Notes & Additional Context',
      owner: '## User Answers & Decision Log (per-phase Q-blocks) + ## Open Gaps',
      ledgerSection: 'multiple phase sections',
      collapseRule: 'splitReflectionNotesIntoQBlocks' },
  ];

  // 4. BUILD THE NEW LEDGER. Start from the v3.1.0 template that the Core
  //    copy step already shipped to the project (it lives next to the
  //    legacy file under a temp path during update). For every legacy
  //    section that was successfully reconciled, append a single audit
  //    Q-block to the matching ledger section. Anything that could NOT
  //    be reconciled is appended verbatim to a new "## Migration Notes
  //    (v3.1.0)" section at the bottom of the ledger so it is never lost.
  const ledgerTemplate = readFile('.cursor/.temp-update/.cursor/project_init.md');
  let ledger = ledgerTemplate;

  // Carry forward the project's existing Initialization State + Artifact
  // Pointers + Phase Checklist values when they exist in the legacy file.
  ledger = carryForwardInitializationState(ledger, legacy);
  ledger = carryForwardArtifactPointers(ledger, legacy);
  ledger = carryForwardPhaseChecklist(ledger, legacy);
  ledger = carryForwardSupplementalManifestPointers(ledger, legacy);

  const unresolved = [];
  for (const r of reconciliation) {
    const section = legacy[r.legacyHeading];
    if (!section) continue;
    if (isPlaceholderOnly(section)) {
      // Section was never filled — nothing to migrate, but record an audit Q-block
      // so future audits can see the section was skipped.
      ledger = appendAuditQBlock(ledger, r.ledgerSection, {
        title: `Migrated from legacy section ${r.legacyHeading}`,
        whatIFound: 'Section contained only [TO_BE_FILLED] placeholders.',
        questionAsked: 'none — auto-migrated by v3.1.0',
        userAnswer: 'n/a (no data to preserve)',
        decisionStoredIn: 'ledger only',
        followUp: 'none',
      });
      continue;
    }
    if (collapseRuleMatches(r.collapseRule, section, r.owner)) {
      // Authoritative artifact already carries the content — collapse into a
      // single Q-block citing the new owner.
      ledger = appendAuditQBlock(ledger, r.ledgerSection, {
        title: `Migrated from legacy section ${r.legacyHeading}`,
        whatIFound: summariseLegacySection(section),
        questionAsked: 'none — auto-migrated by v3.1.0',
        userAnswer: 'preserved in authoritative artifact',
        decisionStoredIn: r.owner,
        followUp: 'none',
      });
    } else {
      // Authoritative artifact does NOT yet carry the content. Preserve the
      // legacy section verbatim under "## Migration Notes (v3.1.0)" so the
      // user can manually route it (or run /initialize again to fill the
      // domain configs from the preserved data).
      unresolved.push({ heading: r.legacyHeading, body: section, owner: r.owner });
    }
  }

  if (unresolved.length > 0) {
    ledger = appendMigrationNotesSection(ledger, 'v3.1.0', unresolved);
  }

  // 5. WRITE the new ledger and a one-line audit entry under "### Update
  //    History". The legacy file is preserved at backupPath.
  writeFile(PROJECT_INIT, ledger);
  appendUpdateHistoryEntry(PROJECT_INIT, {
    timestamp: new Date().toISOString(),
    version:   '3.1.0',
    note:      `Migrated to thin project_init ledger; legacy backup at ${backupPath}; unresolved sections: ${unresolved.length}`,
  });

  // 6. Surface results to the user so they can act on unresolved sections.
  if (unresolved.length > 0) {
    log(`⚠️  ${unresolved.length} legacy section(s) could not be auto-collapsed.`);
    log(`    They are preserved verbatim under "## Migration Notes (v3.1.0)" in ${PROJECT_INIT}.`);
    log(`    Suggested next step: route their content into the matching authoritative`);
    log(`    artifact (development.mdc, per-domain project-config.json, security-sources.json`);
    log(`    if nc-code-security-audit is installed), then delete the migration note.`);
    log(`    The legacy backup remains at ${backupPath}.`);
  } else {
    log(`✅ project_init.md migrated to v3.1.0 ledger; all legacy sections collapsed.`);
  }

  // 7. Record migration.
  recordMigration('v3.1.0-thin-project-init-ledger');
}
```

> **Safety guarantees:**
> - **Full backup before any mutation.** The pre-migration `project_init.md` is copied to `.cursor/.backups/project_init/project_init.md.<timestamp>.legacy` and never deleted by the migration.
> - **Idempotent.** If `project_init.md` already has the v3.1.0 markers (`# Project Initialization Ledger`, `## Source-of-Truth Map`, `## User Answers & Decision Log`), the migration is a no-op.
> - **No silent data loss.** A legacy section is only collapsed into a Q-block if its content is already present in the matching authoritative artifact (or if it contains only `[TO_BE_FILLED]` placeholders). Any section that fails the `collapseRule` check is appended verbatim under `## Migration Notes (v3.1.0)` for manual routing — nothing is dropped.
> - **Project-owned values carried forward.** `## Initialization State` field values, `## Artifact Pointers` rows, `## Phase Checklist` checkbox states, and `## Supplemental Source Manifest` pointer cells are copied from the legacy file into the new ledger before reconciliation runs.
> - **`## User Answers & Decision Log`, `## Open Gaps`, `## Initialization Summary`, and `### Update History` are project-owned forever.** Smart Merge and `/update-workplace` MUST NOT overwrite them after this migration runs (see `preservation-and-validation.md → Phase 5 Step 7`).
> - **Audit trail.** Every reconciled section produces an audit Q-block in the matching Decision Log section, so the project keeps a record of what was migrated, where its content now lives, and whether the migration was lossless.

#### Migration: `v4.2.0-docs-sync-config`

**Purpose:** Generate `.cursor/hooks/docs-sync-config.json` for a project initialized before v4.2.0. New installs get this file from `/initialize` Phase 3 (see [stack-configuration.md → Part: Generate docs-sync-config.json](../../project-initialization/references/stack-configuration.md)); existing projects need it backfilled once, from whatever stack signals are already on disk, so the `docs-sync-check.js` hook (refreshed to v2 by Step 4.5 of `core-update.md`) stops being JS/TS-centric-only for non-JS/TS stacks.

**Runs when:** `.cursor/hooks/docs-sync-config.json` does not already exist. Idempotent — a second run is a no-op.

```javascript
migration_v4_2_docs_sync_config() {
  const CONFIG_PATH = '.cursor/hooks/docs-sync-config.json';

  if (fileExists(CONFIG_PATH)) {
    log('skip: docs-sync-config.json already present (already migrated or created at init time)');
    recordMigration('v4.2.0-docs-sync-config');
    return;
  }

  // 1. Infer the stack from the same two sources /initialize Phase 3 uses:
  //    a. The "Project Technology Stack" section of development.mdc (framework,
  //       build tool, testing, package manager — already resolved and trusted).
  //    b. Repo markers that development.mdc alone would not surface:
  //       pom.xml, MODULE.bazel / WORKSPACE(.bazel) / BUILD.bazel, build.gradle*,
  //       helm/, charts/, k8s/, .gitlab-ci.yml, Jenkinsfile, *.sql, openapi*/swagger*.
  const stackSummary = readDevelopmentMdcStackSection('.cursor/rules/development.mdc');
  const markers = scanRepoMarkers([
    'pom.xml', 'MODULE.bazel', 'WORKSPACE', 'WORKSPACE.bazel', 'BUILD.bazel',
    'build.gradle', 'build.gradle.kts', 'helm/', 'charts/', 'k8s/',
    '.gitlab-ci.yml', 'Jenkinsfile', '*.sql', 'openapi*.yaml', 'openapi*.json', 'swagger*',
  ]);

  // 2. Apply the same signal → pattern-addition table as stack-configuration.md
  //    Part "Generate docs-sync-config.json" (Step 1). Only propose additions
  //    beyond docs-sync-check.js's built-in JS/TS-centric defaults.
  const proposedConfig = buildDocsSyncConfigFromSignals(stackSummary, markers);

  // 3. Show the proposal and require explicit approval before writing —
  //    unlike the Phase 3 init-time flow (silent, since the user is already
  //    mid-initialization dialogue), an update running unattended must not
  //    write a new committed, project-owned file without confirmation.
  const approved = askUser({
    question:
      `Detected stack (${summarizeOneLine(stackSummary, markers)}). Generate ` +
      `${CONFIG_PATH} with the following additions to the docs-sync hook's ` +
      `defaults?\n\n${JSON.stringify(proposedConfig, null, 2)}`,
    choices: [
      { id: 'yes',  label: 'Yes — write the proposed config' },
      { id: 'edit', label: 'Let me adjust the proposal first' },
      { id: 'skip', label: 'Skip — hook keeps using built-in defaults only' },
    ],
  });

  if (approved.choice === 'skip') {
    log('user skipped docs-sync-config.json generation — hook uses defaults only');
    recordMigration('v4.2.0-docs-sync-config');
    return;
  }

  const finalConfig = approved.choice === 'edit' ? approved.editedConfig : proposedConfig;

  mkdirp('.cursor/hooks/');
  // Same BOM pitfall as .core-version.json — write UTF-8 without BOM.
  writeFileUtf8NoBom(CONFIG_PATH, JSON.stringify(finalConfig, null, 2));
  log(`wrote ${CONFIG_PATH}`);

  // 4. Record migration.
  recordMigration('v4.2.0-docs-sync-config');
}
```

> **Safety:** never overwrites an existing `docs-sync-config.json` — the file is project-owned per `stack-configuration.md`, not in `coreFiles`, and this migration only fires when the file is absent. Requires explicit user approval before writing (unlike the init-time generation, which runs silently as part of an interactive dialogue the user is already driving). The proposal-building logic mirrors the signal table in [stack-configuration.md](../../project-initialization/references/stack-configuration.md) so a project migrated by `/update-workplace` ends up with the same config shape a fresh `/initialize` would have produced for the same stack.

#### Migration: `v4.4.0-security-extraction`

**Purpose:** The security-auditor agent, `/security-validate` and `/security-update` commands, and the `security-compliance` skill were removed from Core in v4.4.0 — this functionality is now shipped exclusively by the standalone-published [`nc-code-security-audit`](https://git.netcracker.com/DEMO.SE.AI/Workplace-Agent-Packages/-/tree/master/nc-code-security-audit) APM package. This migration removes the four now-obsolete Core artifacts from an existing project and offers to install the replacement package, **without losing any project-specific BASS guide selections, custom requirements, or notification settings** already recorded in `security-sources.json`.

**Runs when:** `.core-version.json` showed version `4.3.0` (or lower) **before** the Core copy step. Idempotent — a second run is a no-op once none of the four artifact paths exist.

```javascript
migration_v4_4_0_security_extraction() {
  const ARTIFACTS = [
    '.cursor/agents/security-auditor.md',
    '.cursor/commands/security-validate.md',
    '.cursor/commands/security-update.md',
    '.cursor/skills/security-compliance/',
  ];
  const SOURCES_JSON = '.cursor/skills/security-compliance/assets/security-sources.json';
  const BACKUP_ROOT = '.cursor/.backups/v4.4.0-security-extraction/';

  const present = ARTIFACTS.filter(fileExists);
  if (present.length === 0) {
    log('skip: none of the four Core security artifacts are present (already migrated, never installed, or package already replaced them)');
    recordMigration('v4.4.0-security-extraction');
    return;
  }

  // 1. Full backup of everything about to be removed — including any
  //    project-specific references/*.md edits the user made to the guides.
  mkdirp(BACKUP_ROOT);
  for (const artifact of present) {
    cpRecursive(artifact, path.join(BACKUP_ROOT, artifact));
  }

  // 2. Explicitly preserve the customized security-sources.json (active guide
  //    toggles, customRequirements[], notifications.*) as a standalone file so
  //    it survives even if the user later deletes the whole backup directory,
  //    and so Step 4 below can restore it over the package's shipped default.
  let preservedSources = null;
  if (fileExists(SOURCES_JSON)) {
    preservedSources = JSON.parse(readFile(SOURCES_JSON));
    writeFileUtf8NoBom(
      path.join(BACKUP_ROOT, 'security-sources.preserved.json'),
      JSON.stringify(preservedSources, null, 2)
    );
    log(`preserved project security-sources.json (guides/customRequirements/notifications) to ${BACKUP_ROOT}security-sources.preserved.json`);
  }

  // 3. Delete the four obsolete Core artifacts.
  for (const artifact of present) {
    rmRecursive(artifact);
    log(`removed ${artifact} (backed up first)`);
  }

  // 4. Scrub the four corresponding coreFiles entries from this project's own
  //    .core-version.json — they no longer exist upstream so leaving them
  //    would make every future update report false "missing Core file" drift.
  const versionFile = '.cursor/rules/.core-version.json';
  const cv = JSON.parse(readFile(versionFile));
  for (const key of [
    '.cursor/agents/security-auditor.md',
    '.cursor/skills/security-compliance/SKILL.md',
    '.cursor/commands/security-validate.md',
    '.cursor/commands/security-update.md',
  ]) {
    delete cv.coreFiles[key];
  }
  writeFileUtf8NoBom(versionFile, JSON.stringify(cv, null, 2));

  // 5. Offer to install the replacement package. Never auto-installs —
  //    consistent with the rest of the APM workflow (explicit consent only).
  const answer = askUser({
    question:
      'Security validation (BASS guides, /security-validate, /security-update) now ships as ' +
      'the standalone nc-code-security-audit APM package instead of Core. Add it to apm.yml ' +
      'and install it now?' +
      (preservedSources
        ? ' Your existing guide selections and custom requirements will be restored over the package default.'
        : ''),
    choices: [
      { id: 'yes',   label: 'Yes — add to apm.yml and run APM_LEGACY_SKILL_PATHS=1 apm install' },
      { id: 'no',    label: 'No — I do not need security validation in this project' },
      { id: 'later', label: 'Later — I will add it manually when I need it' },
    ],
  });

  if (answer.choice === 'yes') {
    addApmDependency('apm.yml', {
      alias: 'nc-code-security-audit',
      git: readCoreVersionField('apmPackages.registryRepoUrl'),
      path: 'nc-code-security-audit',
      ref: 'master',
    });
    runShell('APM_LEGACY_SKILL_PATHS=1 apm install');

    // Restore the preserved customization over whatever default the package shipped.
    if (preservedSources && fileExists(SOURCES_JSON)) {
      writeFileUtf8NoBom(SOURCES_JSON, JSON.stringify(preservedSources, null, 2));
      log('restored preserved security-sources.json over the package default');
    }
    log('nc-code-security-audit installed');
  } else {
    log(`user chose "${answer.choice}" — package not installed. Preserved security-sources.json remains at ${BACKUP_ROOT}security-sources.preserved.json for later manual restoration.`);
  }

  recordMigration('v4.4.0-security-extraction');
}
```

> **Safety:** every artifact is copied to `.cursor/.backups/v4.4.0-security-extraction/` before deletion — nothing is destroyed unrecoverably. `security-sources.json` gets an additional standalone preserved copy specifically so its guide selections, `customRequirements[]`, and `notifications.*` can be restored over the package's shipped default if/when the user installs `nc-code-security-audit` (immediately, in this same run, or manually later by copying `security-sources.preserved.json` back). Package installation is never automatic — the user is always asked, matching the consent model used everywhere else in the APM workflow (see [`apm-workflow.md`](../../project-initialization/references/apm-workflow.md)). Re-running this migration after it has already removed the four artifacts is a no-op.

#### Migration: `v4.5.0-apm-0-28-baseline`

**Purpose:** Template v4.5.0 rebases Workplace onto **APM 0.28.0** and replaces the retired per-package `<!-- APM:<name> begin/end -->` AGENTS.md contract (never actually emitted by `apm compile`) with APM's `managed_section` co-ownership mode. This migration brings a project initialized on template ≤4.4.0 onto the new contract without touching any hand-written AGENTS.md content.

**Runs when:** `.core-version.json` showed version `4.4.0` (or lower) **before** the Core copy step. Idempotent — each step no-ops when its artifact is already in place.

```javascript
migration_v4_5_0_apm_0_28_baseline() {
  // 1. CLI gate: APM 0.28.0 is the new baseline (apmVersionExpected). If the
  //    detected CLI is older, warn and offer a consent-gated pinned install —
  //    same UX as Phase 0 (see apm-bootstrap.md). Never auto-install.
  const detected = runShell('apm --version').stdout.trim();
  if (semverLt(detected, '0.28.0')) {
    const answer = askUser({
      question: `This update targets APM 0.28.0, but the installed CLI is ${detected || 'missing'}. ` +
                'Install the pinned baseline now (python -m pip install "apm-cli==0.28.0")?',
      choices: [
        { id: 'yes', label: 'Yes — install apm-cli==0.28.0' },
        { id: 'no',  label: 'No — continue on the current CLI (not recommended)' },
      ],
    });
    if (answer.choice === 'yes') {
      runShell('python -m pip install "apm-cli==0.28.0"');
    }
  }

  // 2. apm.yml: ensure the managed_section compilation block. Add it only when
  //    no compilation.agents_md.mode is set; an explicitly-set mode (e.g. full)
  //    is a project decision — report it, do not overwrite.
  const manifest = readYaml('apm.yml');
  if (!manifest.compilation?.agents_md?.mode) {
    manifest.compilation = { agents_md: { mode: 'managed_section' } };
    writeYaml('apm.yml', manifest);
    log('apm.yml: added compilation.agents_md.mode: managed_section');
  } else if (manifest.compilation.agents_md.mode !== 'managed_section') {
    log(`apm.yml: compilation.agents_md.mode is '${manifest.compilation.agents_md.mode}' — left untouched (project override); report to user`);
  }

  // 3. AGENTS.md: ensure the <!-- apm:start --> / <!-- apm:end --> pair exists.
  //    Insert an EMPTY pair (append before the trailing footer or at EOF) when
  //    absent. NEVER move, duplicate, or delete existing hand-written content;
  //    never touch content already between existing markers.
  const agentsPath = 'AGENTS.md';
  if (fileExists(agentsPath)) {
    const content = readFile(agentsPath);
    if (!content.includes('<!-- apm:start -->')) {
      const block =
        '\n## Package Instructions (managed by APM)\n\n' +
        '> Region between the markers is owned by `apm compile` ' +
        '(`compilation.agents_md.mode: managed_section`). Do not hand-edit inside.\n\n' +
        '<!-- apm:start -->\n<!-- apm:end -->\n';
      writeFileUtf8NoBom(agentsPath, content.replace(/\s*$/, '') + '\n' + block);
      log('AGENTS.md: inserted empty apm:start/apm:end managed-section pair');
    }
  }

  // 4. Redeploy packages under the new baseline and populate the managed region.
  //    Plain `apm install` is always safe; `apm compile` only when the project
  //    has the marker pair (it now does) — compile rewrites ONLY that region.
  runShell('APM_LEGACY_SKILL_PATHS=1 apm install');
  runShell('APM_LEGACY_SKILL_PATHS=1 apm compile --target cursor');

  // 5. Report stale references to the retired <!-- APM:<name> begin/end -->
  //    contract in PROJECT-OWNED files (docs/, AGENTS.md prose). Report only —
  //    no silent rewrites of files the template does not own.
  const stale = grepProjectFiles('<!-- APM:', { exclude: ['.cursor/', 'apm_modules/'] });
  if (stale.length > 0) {
    log(`stale <!-- APM:<name> --> references found (report only): ${stale.join(', ')}`);
  }

  recordMigration('v4.5.0-apm-0-28-baseline');
}
```

> **Safety:** the migration is additive-only — it never deletes or reorders AGENTS.md content, never rewrites a `compilation.agents_md.mode` the project set explicitly, and never installs the CLI without consent. `apm compile` in `managed_section` mode is scoped to the marker region, so hand-written sections survive. If the project has no `AGENTS.md` at all, only steps 1, 2, and 4 have an effect. See [`apm-workflow.md`](../../project-initialization/references/apm-workflow.md) Section 5 → "AGENTS.md co-ownership (managed_section)" for the contract this migration enforces.

#### Migration: `v4.5.1-activation-verification`

**Purpose:** Template v4.5.1 stops trusting `.workplace/activated/<pkg>.marker` as proof of module activation. A module's `scripts/activate.*` is deployed twice — into the package cache (with the `runtime/` payload) and into `.cursor/hooks/<pkg>/scripts/` (without it) — and the hook-side copy silently no-ops every copy step while still writing the marker and the `status: "active"` state entry. Any project that activated a full module before v4.5.1 may therefore be carrying a **false-positive activation**: marked active, nothing extracted, and immune to re-activation because activation is idempotent on the marker. This migration finds and repairs that state.

**Runs when:** `.core-version.json` showed version `4.5.0` (or lower) **before** the Core copy step, AND the project has `apm_modules/`. Read-only unless the user approves a repair. Idempotent.

The verifier script itself (`.cursor/skills/project-initialization/scripts/verify-apm-activation.ps1`) is delivered by the standard Core copy step, because it is listed in `coreFiles`.

```javascript
migration_v4_5_1_activation_verification() {
  // 0. Nothing installed by APM => nothing to check.
  if (!dirExists('apm_modules')) {
    recordMigration('v4.5.1-activation-verification');
    return;
  }

  // 1. Read-only scan. Exit code 1 means at least one module is FALSE_POSITIVE
  //    or PARTIAL; the JSON payload carries per-package detail.
  const scan = runShell(
    'powershell -ExecutionPolicy Bypass -File .cursor/skills/project-initialization/scripts/verify-apm-activation.ps1 -Json'
  );
  const report = JSON.parse(scan.stdout);

  if (report.decoyScripts?.length > 0) {
    log(`hook-side activation copies present (never invoke these): ${report.decoyScripts.join(', ')}`);
  }

  const broken = report.modules.filter(m => m.Status === 'FALSE_POSITIVE' || m.Status === 'PARTIAL');
  if (broken.length === 0) {
    log('module activation verified: no false-positive markers found');
    recordMigration('v4.5.1-activation-verification');
    return;
  }

  // 2. Report first, repair only on consent — a repair deletes markers/state
  //    entries and the follow-up activation relocates folders into the project
  //    root, which is a project-data change, not a Core-file change.
  const answer = askUser({
    question:
      `${broken.length} module(s) are marked activated but their runtime payload is missing ` +
      `(${broken.map(m => `${m.Package}: ${m.Status}`).join(', ')}). ` +
      'Clear the false markers and re-run activation from the correct package root now?',
    choices: [
      { id: 'yes',    label: 'Yes — repair and re-activate' },
      { id: 'repair', label: 'Repair markers only — I will activate manually' },
      { id: 'no',     label: 'No — report only (recorded as an Open Gap)' },
    ],
  });

  if (answer.choice === 'no') {
    log(`activation gaps reported, not repaired: ${broken.map(m => m.Package).join(', ')}`);
    recordMigration('v4.5.1-activation-verification');
    return;
  }

  // 3. -Repair clears the sticky markers and the state.json entries so the next
  //    real activation run is not swallowed by idempotency.
  runShell('powershell -ExecutionPolicy Bypass -File .cursor/skills/project-initialization/scripts/verify-apm-activation.ps1 -Repair');

  // 4. Re-activate using the command the verifier resolved for each package
  //    (package-cache root, never the .cursor/hooks/ copy), then re-verify.
  if (answer.choice === 'yes') {
    for (const m of broken) {
      if (!m.ActivateCommand) {
        log(`${m.Package}: no activation script found under ${m.PackageRoot} — reinstall the package`);
        continue;
      }
      runShell(m.ActivateCommand);
    }
    const recheck = runShell(
      'powershell -ExecutionPolicy Bypass -File .cursor/skills/project-initialization/scripts/verify-apm-activation.ps1 -Json'
    );
    const still = JSON.parse(recheck.stdout).modules
      .filter(m => m.Status === 'FALSE_POSITIVE' || m.Status === 'PARTIAL');
    if (still.length > 0) {
      log(`still not activated after re-run (report to user as Open Gap): ${still.map(m => m.Package).join(', ')}`);
    }
  }

  recordMigration('v4.5.1-activation-verification');
}
```

> **Safety:** the scan is read-only and the repair is consent-gated. `-Repair` touches only `.workplace/activated/*.marker` and the matching `.workplace/state.json` entries — never a relocated runtime folder, so a partially-extracted module keeps whatever the user has already edited (activation merges no-clobber). `powershell` is Windows PowerShell 5.1, present on every Windows machine; substitute `pwsh -File …` where PowerShell 7+ is installed. If neither exists (bare Linux without PowerShell), skip the migration and report the manual check from [`apm-workflow.md`](../../project-initialization/references/apm-workflow.md) §6.2 instead of failing the update.

#### Migration: `v4.5.2-init-reliability`

**Purpose:** Template v4.5.2 fixed a set of mechanical defects and added two health gates. The refreshed scripts themselves arrive through the standard Core copy step (all of them are in `coreFiles`), so this migration covers only what a file copy cannot do: the project's own `.core-version.json` `coreFiles` map, and the diagnosis of state the new gates now detect.

**Runs when:** `.core-version.json` showed version `4.5.1` or lower **before** the Core copy step. Read-only apart from step 1 and the consent-gated rewrites in step 4. Idempotent.

```javascript
function migration_v4_5_2_init_reliability(ctx) {
  // 1. The template's own docs/** are optional in a consumer project. Before
  //    v4.5.2 they were plain required entries, so compute-hashes reported them
  //    as missing required files on every finalization.
  const optionalDocs = [
    'docs/GETTING_STARTED.md',
    'docs/core/ROLES.md',
    'docs/core/APM_PACKAGES.md',
    'docs/PRESENTATION.md',
  ];
  let flagged = 0;
  for (const p of optionalDocs) {
    if (coreFileEntryExists(p) && !coreFileIsOptional(p)) {
      setCoreFileOptional(p, true);
      flagged++;
    }
  }
  // Stale entry for a file the template never shipped at that path.
  if (coreFileEntryExists('.cursor/rules/components/README.md')) {
    removeCoreFileEntry('.cursor/rules/components/README.md');
    log('removed stale coreFiles entry: .cursor/rules/components/README.md');
  }
  if (flagged > 0) log(`${flagged} template docs/** entries flagged optional`);

  // 2. APM install health. Read-only: a purge deletes the cached package tree,
  //    which is the user's call, not the updater's.
  if (dirExists('apm_modules')) {
    const health = runShell(
      'powershell -ExecutionPolicy Bypass -File .cursor/skills/project-initialization/scripts/validate-apm-install.ps1'
    );
    if (health.exitCode !== 0) {
      log('APM install health gate failed — reporting, not repairing:');
      log(health.stdout);
      recordOpenGap('apm-install-health', health.stdout);
    }
  }

  // 3. Guidelines specificity. Only meaningful in an initialized project, and
  //    only ever a report: re-rendering a domain's guidelines.md is Phase 6
  //    work that needs the user's approval.
  if (isInitialized()) {
    // Always compute the set here. `.cursor/.temp-apm-selection.json` belongs to a live
    // Phase 1.7-APM run and is deleted at the end of that phase, so in an initialized
    // project it is absent — and the script now refuses (exit 2) to run an empty gate
    // from an explicit --required-from rather than reporting a false pass.
    const required = deriveRequiredContextSkills(); // installed packages' x-workplace.contextSkills + the two core skills
    const gate = runShell(
      'node .cursor/skills/project-initialization/scripts/check-guidelines-specificity.js ' +
      `--required ${required.join(',')}`
    );
    if (gate.exitCode !== 0) {
      log('context skill guidelines need attention (install vs render classes below):');
      log(gate.stdout);
      recordOpenGap('context-skill-guidelines', gate.stdout);
    }
  }

  // 4. Bare `pwsh <script>` fails on a stock Windows machine, which ships only
  //    Windows PowerShell 5.1 as `powershell`. Scan the project's OWN documents:
  //    everything under .cursor/ and docs/core/ was just replaced by the Core copy
  //    and already carries the correct form, so scanning there can only ever
  //    "fix" a file the update is about to overwrite again.
  //
  //    On macOS and Linux `pwsh` is the ONLY PowerShell binary that exists, so the
  //    rewrite is correct on Windows and destructive everywhere else. Offer it only
  //    where `powershell` actually resolves; elsewhere report and move on.
  const bare = grepProjectFiles(/pwsh\s+(-File\s+)?[^\s]*\.cursor\//, {
    exclude: ['.cursor/', 'docs/core/', 'apm_modules/'],
  });
  if (bare.length > 0) {
    if (!commandExists('powershell')) {
      log(`${bare.length} project document(s) invoke Workplace scripts as \`pwsh\`. That is correct on this host — \`powershell\` does not exist here — so nothing was rewritten: ${bare.join(', ')}`);
    } else {
      const answer = askUser({
        question: `${bare.length} project document(s) invoke Workplace scripts as \`pwsh\`, which is absent on a stock Windows machine (only Windows PowerShell 5.1 is present, as \`powershell\`). Rewrite them to \`powershell -ExecutionPolicy Bypass -File …\`? Choose "No" if your team also works on macOS or Linux, where \`pwsh\` is the only binary that exists.`,
        choices: [
          { id: 'yes', label: 'Yes — rewrite' },
          { id: 'no',  label: 'No — report only' },
        ],
      });
      if (answer.choice === 'yes') rewritePwshInvocations(bare);
      else log(`bare pwsh invocations left as-is: ${bare.join(', ')}`);
    }
  }

  // 5. Report-only: stale catalogue facts in project-owned prose.
  const staleCounts = grepProjectFiles(/\b19 packages\b/, { exclude: ['.cursor/', 'apm_modules/'] });
  if (staleCounts.length > 0) {
    log(`project docs still cite the pre-v4.5.2 package count (now 21): ${staleCounts.join(', ')}`);
  }

  recordMigration('v4.5.2-init-reliability');
}
```

> **Safety:** step 1 is the only unconditional write, and it edits two fields of the project's own `.core-version.json` `coreFiles` map (adding `"optional": true`, removing one stale key) — never a hash, never a project file. Steps 2 and 3 are pure diagnosis: they report and record Open Gaps rather than purging an APM package tree or re-rendering a domain's `guidelines.md`, both of which destroy work the user may want to keep. Step 4 is consent-gated, scoped to **project-owned** documents (the Workplace-owned ones were just replaced by the Core copy and already carry the correct form), and offered only on a host where `powershell` resolves — on macOS and Linux `pwsh` is the only PowerShell binary that exists, so rewriting it there would break working invocations. If no PowerShell interpreter is available at all (bare Linux), skip step 2 and note it as an Open Gap instead of failing the update.

#### Migration: `v4.6.0-init-restructure`

**Purpose:** Template v4.6.0 restructured initialization: the three Phase 4/5/6 monoliths became routers plus 19 step files, Phase 4 now writes analysis artifacts under `.cursor/project/analysis/`, and a fifth Core agent (`codebase-analyzer`) appeared. The new and rewritten files arrive through the standard Core copy step. This migration covers what a copy cannot: reconciling the project's own `coreFiles` map with the split structure, creating the analysis directory, and reporting project-owned prose that still points at content which moved.

**Runs when:** `.core-version.json` showed version `4.5.2` or lower **before** the Core copy step. One directory creation; everything else is reconciliation of the project's own version file, or report-only. Idempotent.

```javascript
function migration_v4_6_0_init_restructure(ctx) {
  // 1. Register the 19 step files and the new Core artifacts in the project's
  //    coreFiles map, so the map is coherent for every migration that runs after
  //    this one and for the pre-update modification scan on the NEXT update.
  //    Note what this does NOT do: file delivery comes from the recursive
  //    `cp -r references/` and `cp -r scripts/` in core-update.md Step 3, not from
  //    the manifest, and core-update.md Step 8 later replaces the project's whole
  //    coreFiles map with the template's. So this step is bookkeeping, not plumbing.
  const added = [];
  for (const p of ctx.templateCoreFiles) {           // the map shipped by v4.6.0
    if (!coreFileEntryExists(p)) {
      addCoreFileEntry(p, { hash: 'pending', lastModified: null });
      added.push(p);
    }
  }
  if (added.length > 0) {
    log(`${added.length} new Core file(s) registered (Phase 4/5/6 step files, codebase-analyzer, analysis schema + validator)`);
  }

  // 2. The routers kept their paths, so nothing is removed here. Guard anyway:
  //    a consumer that had hand-deleted a monolith would otherwise silently
  //    keep a dangling entry.
  for (const p of [
    '.cursor/skills/project-initialization/references/codebase-analysis.md',
    '.cursor/skills/project-initialization/references/requirements.md',
    '.cursor/skills/project-initialization/references/configuration-updates.md',
  ]) {
    if (coreFileEntryExists(p) && !fileExists(p)) {
      log(`WARNING: ${p} is registered but absent — the Core copy step should have restored it as a router. Re-run /update-workplace after checking write permissions.`);
    }
  }

  // 3. Phase 0.5 creates .cursor/project/analysis/ in a fresh run; an already
  //    initialized project needs it now, so Phase 4 has somewhere to write on
  //    the next re-analysis. Project-owned and committed: NOT added to coreFiles.
  if (!dirExists('.cursor/project/analysis')) {
    createDir('.cursor/project/analysis');
    log('created .cursor/project/analysis/ (project-owned; artifacts are committed, not tracked in coreFiles)');
  }

  // 4. Report-only: project-owned prose citing content that moved into a step
  //    file. The links still resolve (the routers kept their paths), so this is
  //    a precision hint, not a break — rewriting a team's own docs is their call.
  const monolithRefs = grepProjectFiles(
    /references\/(codebase-analysis|requirements|configuration-updates)\.md\s*(#|→|->)\s*(Part|Round|Section)/,
    { exclude: ['.cursor/skills/project-initialization/', 'apm_modules/'] }
  );
  if (monolithRefs.length > 0) {
    log('project docs cite a section inside a former monolith; the link still resolves to the router, but the section now lives in a step file:');
    for (const r of monolithRefs) log(`  - ${r}`);
    recordOpenGap('phase-doc-deep-links', monolithRefs.join(', '));
  }

  // 5. Report-only: stale Core agent count. Four became five.
  const staleAgentCount = grepProjectFiles(/\b4 (Core )?agents?\b/, { exclude: ['.cursor/', 'apm_modules/', 'CHANGELOG.md'] });
  if (staleAgentCount.length > 0) {
    log(`project docs still cite 4 Core agents (now 5, with codebase-analyzer): ${staleAgentCount.join(', ')}`);
  }

  recordMigration('v4.6.0-init-restructure');
}
```

> **Safety:** the only writes are to the project's own `.core-version.json` `coreFiles` map (adding entries with `hash: "pending"`, which the next `compute-hashes` run fills) and one `mkdir`. No analysis artifact is generated — this migration never dispatches a subagent, so an updated project keeps whatever analysis it already had and gains the artifact model on its next `/initialize` re-analysis or `/docs-sync`. Steps 4 and 5 are report-only by design: the deep links still resolve, and rewriting project-owned prose is the team's decision.

### Phase 2 Output

```
✅ Migration complete (Phase 2)

[If migrations ran:]
Migrations applied:
- [migration name]: [description]

[If no migrations needed:]
No migrations required for this update type.

Proceeding to customization scan...
```

---

## Phase 3: User Customization Scan

### Step 1: Scan for Project-Owned Files

Scan Cursor-native directories for project-owned artifacts that must survive Core update. In v3.0.0+ the recommended adaptation channels are:
- per-skill `project-config.json` + `references/guidelines.md`
- the `Project Conventions` section of root `AGENTS.md`
- direct edits to role-pack-activated artifacts in `.cursor/{agents,commands,skills}/` (project-owned after activation)

Legacy `project-*` artifacts (from pre-v3 installs) are ALSO discovered here so they are preserved through the Core copy step. They will be offered for migration by `migration_v3_0_drop_project_customizations` (Phase 2 above) if that migration has not yet run.

```bash
# Recommended channels (v3.0.0+)
find .cursor/skills/ -name "project-config.json"
find .cursor/skills/ -name "references/guidelines.md"
test -f AGENTS.md && echo "AGENTS.md"

# Project identity (always preserved)
test -f .cursor/rules/project/metadata.json && echo ".cursor/rules/project/metadata.json"

# Role-pack activation state
test -f .cursor/rules/role-packs-state.json && echo ".cursor/rules/role-packs-state.json"

# Project documentation
find docs/project/ -name "*.md" ! -path "*/.templates/*"

# LEGACY (pre-v3 installs). Preserve through Core copy; migration_v3_0_drop_project_customizations
# will offer to fold these into the recommended channels.
find .cursor/rules/project/ -name "*.mdc" ! -path "*/.templates/*" 2>/dev/null
find .cursor/commands/ -name "project-*.md"
find .cursor/agents/   -name "project-*.md"
find .cursor/skills/   -maxdepth 1 -name "project-*" -type d
```

### Step 2: Read Project Metadata

```javascript
if (fileExists('.cursor/rules/project/metadata.json')) {
  const metadata = JSON.parse(readFile('.cursor/rules/project/metadata.json'));
}
```

### Step 3: Create Preservation List

Build a complete inventory of files that must survive the update. Recommended-channel files (`project-config.json`, `references/guidelines.md`, `AGENTS.md`, `metadata.json`, role-pack-activated artifacts) are always preserved. Legacy `project-*` files are also preserved here so the migration can later offer them for fold/rename/drop.

```json
{
  "skillConfigs": [
    ".cursor/skills/frontend-context/project-config.json",
    ".cursor/skills/backend-context/project-config.json",
    ".cursor/skills/coding-standards-context/project-config.json",
    ".cursor/skills/infrastructure-context/project-config.json"
  ],
  "skillGuidelines": [
    ".cursor/skills/frontend-context/references/guidelines.md",
    ".cursor/skills/coding-standards-context/references/guidelines.md",
    ".cursor/skills/infrastructure-context/references/guidelines.md"
  ],
  "agentsMd": "AGENTS.md",
  "rolePackState": ".cursor/rules/role-packs-state.json",
  "projectMetadata": ".cursor/rules/project/metadata.json",
  "customDocs": ["docs/project/architecture.md"],
  "legacyArtifacts": {
    "rules":    [".cursor/rules/project/team_conventions.mdc"],
    "commands": [".cursor/commands/project-deploy-staging.md"],
    "agents":   [".cursor/agents/project-infra.md"],
    "skills":   [".cursor/skills/project-deployment/"]
  }
}
```

> Files listed under `legacyArtifacts.*` are preserved through the Core copy step exactly the same way as the recommended-channel files, so nothing is lost. They are then offered for migration by `migration_v3_0_drop_project_customizations` (Phase 2) on the same `/update-workplace` invocation.

Store this list — it will be verified in Phase 5 after the Core update.

### Step 4: Re-Sync Active Role Packs

After the Core update completes (handled in a later phase), re-run Phase 1.7 role-pack auto-activation for the project's selected roles:

1. Read `.cursor/rules/role-packs-state.json` (preserved from Step 3) to learn which packs were active.
2. For every pack still listed under `Modules_Registry/role-packs/{id}/`, re-run RP-1 → RP-5 from the role-pack format spec (removed in v4.0.0). This refreshes any pack artifact that has changed in the new Workplace template.
3. For packs that disappeared from the registry (renamed/removed in the new template), prompt the user: keep their copies in `.cursor/`, delete them, or move them under `Modules_Registry/role-packs/{custom-id}/` for in-repo preservation.
4. Re-run Phase 6 Part 3.5 (`guidelines.md` gate) to confirm every `requiredContextSkill` is still valid against the (possibly updated) `template.md` files.

### Phase 3 Output

```
✅ Customization scan complete (Phase 3)

Recommended channels:
- [N] domain skill configs (project-config.json)
- [N] domain skill guidelines (references/guidelines.md)
- AGENTS.md present: yes/no
- Project identity: metadata.json present: yes/no

Legacy artifacts (will be offered for migration_v3_0_drop_project_customizations fold/rename/drop):
- [N] custom rules in .cursor/rules/project/
- [N] custom commands (project-* prefix)
- [N] custom agents (project-* prefix)
- [N] custom skills (project-* prefix)

All preserved through the Core copy step.
Proceeding to Core update...
```
