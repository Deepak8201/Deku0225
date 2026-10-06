# Core Update (Phase 4)

> Copy Core files from the cloned template to the project, replacing old Core versions.

## Template Source

All files are copied from the cloned template directory:

```
templateSource = ".cursor/.temp-update/"
```

## Step 1: Update Core Rules

```bash
# Overwrite Core rule files with template versions
cp ${templateSource}.cursor/rules/*.mdc .cursor/rules/
cp -r ${templateSource}.cursor/rules/taskmaster/ .cursor/rules/taskmaster/

# If template has additional rule subdirectories, copy them
# (but NEVER touch .cursor/rules/project/ — that's user-owned)
```

**Critical:** Do NOT copy anything into `.cursor/rules/project/`. That directory is entirely user-owned.

## Step 2: Update Agents

```bash
# Overwrite Core agent definitions
# Copy only files that are NOT prefixed with "project-"
for file in ${templateSource}.cursor/agents/*.md; do
  basename=$(basename "$file")
  if [[ "$basename" != project-* ]]; then
    cp "$file" .cursor/agents/
  fi
done
```

> **v4.0.0 note (updated v4.4.0):** The Core template ships only cross-functional agents (`initializer`, `documentation-sync`, `infra-specialist`, `project-updater`, `codebase-analyzer`). All role-specific agents — including `security-auditor` since v4.4.0 (now shipped by the `nc-code-security-audit` APM package) — are deployed by APM from each package's `<id>/.apm/agents/` (in the Workplace-Agent-Packages repo) into `.cursor/agents/` and are refreshed in **Step 3.5** below — not from this `cp` step. APM-deployed agents are project-owned (not in `coreFiles`) and survive Core copies.

## Step 3: Update Skills

```bash
# For each Core skill directory in the template:
for dir in ${templateSource}.cursor/skills/*/; do
  dirname=$(basename "$dir")
  # Skip project-prefixed skill directories
  if [[ "$dirname" == project-* ]]; then
    continue
  fi
  # Copy SKILL.md and references/ from template
  cp "${dir}SKILL.md" ".cursor/skills/${dirname}/SKILL.md"
  if [ -d "${dir}references/" ]; then
    cp -r "${dir}references/" ".cursor/skills/${dirname}/references/"
  fi
  if [ -d "${dir}assets/" ]; then
    cp -r "${dir}assets/" ".cursor/skills/${dirname}/assets/"
  fi
  if [ -d "${dir}scripts/" ]; then
    cp -r "${dir}scripts/" ".cursor/skills/${dirname}/scripts/"
  fi
  # NEVER overwrite project-config.json — it's user-owned
done
```

**Critical:** Never overwrite `project-config.json` files inside skill directories. Also never overwrite `references/guidelines.md` — that file is project-specific and protected like `project-config.json`.

> **`scripts/` must be copied.** Every Core gate an initialization or a migration shells out to — `compute-hashes.ps1`, `prepare-apm-packages.ps1`, `validate-apm-install.ps1`, `verify-apm-activation.ps1`, `check-guidelines-specificity.js`, `validate-analysis.js`, `validate-doc-links.js` — lives in `.cursor/skills/project-initialization/scripts/`. Without this branch an updated project keeps the previous release's scripts (or lacks the new ones entirely) while the migrations registered in Phase 2 invoke them by path, so the update reports success and every gate it just promised silently fails to run.

> **Scope of that guarantee.** It binds *this* step (the Core copy) only. The APM refresh in Step 3.5.b below re-runs `apm install`, which redeploys everything its packages own — including the `project-config.json` of every role-pack `*-context` skill, because that file ships inside the package (e.g. `frontend-developer/.apm/skills/frontend-context/project-config.json`). Only `references/guidelines.md` is safe in both steps: packages ship `references/template.md` and never the rendered output.

> **v4.0.0 note (updated v4.4.0):** Only Core context skills (`coding-standards-context`, `infrastructure-context`) and Core utility skills (`project-initialization`, `project-update`, `apm-packaging`, `documentation-management`, `codebase-analysis`, `code-quality-standards`) are written by this step. APM-installed skills (e.g., `frontend-context`, `testing-context`, `tdd-workflow`, `quality-check`, and — since v4.4.0 — `security-compliance`, …) live in each package's `<id>/.apm/skills/` (in the Workplace-Agent-Packages repo) and are deployed into `.cursor/skills/<id>/` by `apm install` — refreshed in **Step 3.5** below.

## Step 3.5: Refresh APM-Installed Packages

> **Replaces the v3.0.0 `Modules_Registry/role-packs/` copy step.** Since v4.0.0, packages are APM packages — and since the 2026-06-04 split they live as `<id>/` at the root of the standalone **Workplace-Agent-Packages** repo, never copied into the user's project. The user's `apm.yml` references them as APM **dict-form dependencies** (`git: <apmPackages.registryRepoUrl>`, `path: <id>`, `ref: <branch>`, `alias: <id>`) — see [`phase-1-7-apm.md` Step 4](../../project-initialization/references/phase-1-7-apm.md) for the canonical syntax. The legacy `<repo>/<id>#<ref>` string shorthand only resolves on `github.com` and breaks on every self-hosted host (APM v0.13.x). Refreshing primitives = re-running `apm install`.

### Step 3.5.a — Detect APM and migrate v3.x projects (one-time)

```bash
# If the project was on v3.x, the .core-version.json that just got overwritten
# in Step 1 already has version "4.0.0". The companion migration
# `migration_v4_0_apm_migration` (see migration-and-scan.md) runs in the
# migration pass AFTER Step 1 of the Core update; it:
#   1. Runs Phase 0 (apm CLI bootstrap) — see apm-bootstrap.md
#   2. Reads the old role-packs-state.json + .cursor/modules/ (if present)
#   3. Generates the project's apm.yml at repo root with one
#      dict-form entry per previously-active pack (git/path/ref/alias —
#      see phase-1-7-apm.md Step 4 for canonical syntax)
#   4. Deletes the legacy state files (.cursor/rules/role-packs-state.json,
#      .cursor/modules/)
#   5. Prompts the user to run `APM_LEGACY_SKILL_PATHS=1 apm install`.
#
# Step 3.5 itself does NOT clone Modules_Registry/. That folder no longer
# exists in the Workplace template.
true
```

### Step 3.5.b — Refresh APM primitives (every update, post-migration)

```bash
# Only runs once the project has a valid apm.yml. If apm.yml is missing the
# migration above hasn't run yet — skip with a warning.
if [ -f "apm.yml" ]; then
  # apm install is idempotent. It re-resolves the dict-form dependency entries
  # (git/path/ref) against the freshly-pulled Core template (Step 1 already updated
  # .core-version.json.templateSource), redeploys primitives into .cursor/...,
  # and merges hooks/MCP additively (AGENTS.md is co-owned via the
  # <!-- apm:start -->/<!-- apm:end --> managed section since v4.5.0).
  #
  # WARNING - there is NO interactive per-file conflict prompt in APM. Collisions
  # are reported in a grouped diagnostic summary at the END of the run; --force
  # (not used here) would overwrite locally-authored files outright. Any hand-edit
  # to an APM-deployed file may be replaced by this step. That includes
  # project-config.json of a role-pack *-context skill, which ships INSIDE its
  # package. Only references/guidelines.md is structurally safe (packages ship
  # references/template.md, never the rendered guidelines.md).
  #
  # The agent MUST surface the diagnostic summary to the user verbatim and list
  # every file APM reported as a collision or replacement, so the user can
  # re-apply lost edits. Durable customizations belong in the project's own
  # .apm/ directory - see docs/core/CUSTOMIZATION.md Channel 1b.
  APM_LEGACY_SKILL_PATHS=1 apm install
else
  echo "[warn] apm.yml missing — run migration_v4_0_apm_migration first or skip /update-workplace."
fi
```

After refresh, the v4 migration step (`migration_v4_0_apm_migration` in `migration-and-scan.md`) optionally re-validates each context-skill `references/guidelines.md` (Phase 6 Part 3.5 gate) and surfaces any packages that disappeared from the template registry between versions. When updating from 4.0.0 → 4.1.0, Phase 2 also runs `migration_v4_1_0_changelog_relocate` to remove stale `docs/CHANGELOG.md` after the root copy.

## Step 4: Update Commands

```bash
# Copy Core commands (non-project-prefixed)
for file in ${templateSource}.cursor/commands/*.md; do
  basename=$(basename "$file")
  if [[ "$basename" != project-* ]]; then
    cp "$file" .cursor/commands/
  fi
done

# NOTE (v4.0.0): `.cursor/commands/.templates/` was removed in v3.0.0 (no
# synthetic command generation). Role-specific commands now ship inside APM
# packages (each package's `<id>/.apm/commands/` in the Workplace-Agent-Packages
# repo) and are deployed into `.cursor/commands/` by `apm install` (re-run in
# Step 3.5.b above). This `cp` loop refreshes ONLY Core commands shipped by the
# Workplace template itself.
```

## Step 4.5: Update Hooks

> **New in v4.2.0.** `.cursor/hooks/docs-sync-check.js` is Core-owned (added to `coreFiles` in Step 8 below) but was never previously delivered by `/update-workplace` — existing projects were stuck on whatever version they got at `/initialize` time, including pre-fix versions with the git-layer, commit-tracking, and messaging bugs this release addresses.

### Step 4.5.a — Copy the hook script(s)

```bash
# Create the directory if the user deleted it entirely
mkdir -p .cursor/hooks/

# Copy only the *.js hook scripts — never .docs-sync-state.json (runtime state)
# or docs-sync-config.json (project-owned, additive config from Phase 3)
for file in ${templateSource}.cursor/hooks/*.js; do
  cp "$file" .cursor/hooks/
done
```

**Critical:** Do NOT copy `.docs-sync-state.json` or `docs-sync-config.json` even if they happen to exist under `${templateSource}.cursor/hooks/` — the former is runtime state, the latter is project-owned (see [stack-configuration.md → Part: Generate docs-sync-config.json](../../project-initialization/references/stack-configuration.md)). Neither should ever be sourced from the template.

### Step 4.5.b — Surgically update `.cursor/hooks.json` (never a wholesale copy)

`.cursor/hooks.json` is **not** copied like Step 1–4's Core files. [`apm-workflow.md`](../../project-initialization/references/apm-workflow.md) establishes that APM additively merges package hooks into this same file and maintains an ownership sidecar (`apm-hooks.json`) that must never be hand-edited. This step is allowed to touch only the `stop` array, and only for the single entry that runs `docs-sync-check.js`.

```javascript
const hooksPath = '.cursor/hooks.json';
const HOOK_CMD_PATTERN = /docs-sync-check\.js/; // matches regardless of exact relative path form

if (!fileExists(hooksPath)) {
  // Total absence is a distinct signal from `stop: []` — it could mean the user
  // removed the whole file deliberately, or that this is genuinely the first
  // time hooks.json would exist. Ask instead of silently creating it.
  askUser(
    '.cursor/hooks.json does not exist. Create it with the docs-sync-check.js ' +
    'stop hook (recommended), or skip and leave hooks disabled?'
  );
} else {
  const hooks = JSON.parse(readFile(hooksPath));
  const stopArray = hooks.hooks?.stop ?? hooks.stop; // schema per current hooks.json shape

  if (Array.isArray(stopArray) && stopArray.length === 0) {
    // Empty array is the recognized idiom for "[B] Disable" chosen in
    // Phase 0.5/Part 1.7. Never restore an entry the user explicitly removed.
    log('stop hooks explicitly disabled by user ([] present) — leaving as-is.');
  } else if (Array.isArray(stopArray) && stopArray.some(h => HOOK_CMD_PATTERN.test(JSON.stringify(h)))) {
    // Already present in some form — no-op, do not duplicate or reformat.
    log('docs-sync-check.js entry already present in stop hooks — no change needed.');
  } else {
    // Non-empty array without our entry, OR entries we don't recognize (e.g. an
    // APM-managed hook or something foreign). This is exactly the scenario the
    // plan flags as the real conflict risk with APM — never silently mutate.
    showCurrentContent(stopArray);
    askUser(
      'Current .cursor/hooks.json → stop hooks are shown above. Add the ' +
      'docs-sync-check.js entry alongside them (recommended), or leave unchanged?'
    );
    // Only append (never replace/reorder existing entries) if the user agrees.
  }
}
// apm-hooks.json and any hook event other than `stop` are never touched by this step.
```

### Step 4.5.c — Guard against a stale `coreFiles` entry

`.cursor/hooks/docs-sync-check.js` is added to `coreFiles` in this release (Step 8 below, `hash: "pending"` in the seed migration). Before this update ships, [`detection-and-backup.md` Step 5](detection-and-backup.md) must already skip missing `coreFiles` entries (`if (!fileExists(filePath)) continue;`) — otherwise a project where the user deleted `.cursor/hooks/` entirely would fail the pre-update scan before Step 4.5.a even runs to restore it.

## Step 5: Update Core Documentation

```bash
# Core docs
if [ -d "${templateSource}docs/core/" ]; then
  cp ${templateSource}docs/core/*.md docs/core/
  # v4.0.0: docs/core/Modules/ no longer exists in the template (replaced by
  # docs/core/APM_PACKAGES.md, copied by the wildcard above). If the project
  # still has a stale docs/core/Modules/ directory from a v3.x install, the
  # migration_v4_0_apm_migration step (in migration-and-scan.md) backs it up
  # to .cursor/.backups/v4-apm-migration/ and removes it.
fi

# Root-level Core docs (under docs/)
for file in GETTING_STARTED.md ARCHITECTURE.md PRESENTATION.md; do
  if [ -f "${templateSource}docs/${file}" ]; then
    cp "${templateSource}docs/${file}" docs/
  fi
done

# Changelog at project root (since v4.1.0)
if [ -f "${templateSource}CHANGELOG.md" ]; then
  cp "${templateSource}CHANGELOG.md" .
fi
```

## Step 6: Update Project Templates

```bash
# Update templates (these are starter templates, not user content)
if [ -d "${templateSource}.cursor/rules/project/.templates/" ]; then
  cp -r ${templateSource}.cursor/rules/project/.templates/ .cursor/rules/project/.templates/
fi
```

## Step 7: Smart Merge for `project_init.md`

`.cursor/project_init.md` contains both Core and Project sections. Apply a smart merge:

### Section Classification

```markdown
## Initialization Status (CORE)     → Replace with template version
## Project Metadata (PROJECT)       → Preserve current content
## Technology Stack (PROJECT)       → Preserve current content
## Existing Project Analysis (PROJECT) → Preserve current content
## Project Components (PROJECT)     → Preserve current content
## Constraints & Requirements (PROJECT) → Preserve current content
## Notes (MIXED)                    → Preserve user notes, append update note
```

### Merge Logic

1. **Read current file** — extract all PROJECT-marked sections
2. **Read template file** — get updated CORE sections
3. **Merge:** CORE sections from template + PROJECT sections from current
4. **Append to Notes:** `"Updated to template version [X.Y.Z] on [date]"`

## Step 8: Update Version File

Update `.cursor/rules/.core-version.json` with new version data from the template:

```javascript
const newCoreVersion = JSON.parse(
  readFile(`${templateSource}.cursor/rules/.core-version.json`)
);

// Keep initialization status as "active" (project is initialized)
newCoreVersion.initializationStatus = "active";
newCoreVersion.lastUpdate = new Date().toISOString();

// Recalculate hashes for all Core files
for (const [filePath, fileInfo] of Object.entries(newCoreVersion.coreFiles)) {
  if (fileExists(filePath)) {
    fileInfo.hash = calculateHash(readFile(filePath));
    fileInfo.lastModified = new Date().toISOString();
  }
}

// Preserve applied migrations from current, add any new ones
const currentMigrations = currentVersion.migrations.applied;
newCoreVersion.migrations.applied = [
  ...currentMigrations,
  ...newlyAppliedMigrations
];

// Persist template source so next update can pre-fill URL and branch
newCoreVersion.templateSource = {
  url: usedUrl,                       // set in git-source-setup.md Step 4
  branch: usedBranch || null          // null if default branch was used
};

writeFile('.cursor/rules/.core-version.json', JSON.stringify(newCoreVersion, null, 2));
```

**Encoding requirement (CRITICAL):** `.core-version.json` MUST be written as **UTF-8 without BOM**. Use the `Write` tool or Node `fs.writeFileSync(..., 'utf-8')`. Do **NOT** use PowerShell `Set-Content -Encoding utf8` / `Out-File -Encoding utf8` on Windows PowerShell 5.1 — they prepend `EF BB BF`, and PowerShell's default `Get-Content` can corrupt UTF-8 text during a JSON round trip. The docs stop-hook tolerates a leading BOM, but producers must still avoid creating one. Portable BOM-free PS form when shell write is unavoidable:

```powershell
$utf8NoBom = New-Object System.Text.UTF8Encoding $false
[System.IO.File]::WriteAllText($absolutePath, $json, $utf8NoBom)
# PowerShell 7+ only: Set-Content -Encoding utf8NoBOM ...
```

## Phase 4 Output

```
✅ Core files updated (Phase 4 complete)

Updated:
- [N] Core rules
- [N] agent definitions
- [N] skill files
- [N] commands
- [N] documentation files
- Version file updated to [newVer]

Proceeding to preservation verification...
```
