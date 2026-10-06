
# Environment Setup Module

This module handles Phase 0 of project initialization: setting up the development environment with proper file exclusions and workflow commands.

**Parent Workflow:** [Project Initialization Skill](../SKILL.md)

---

## Phase 0: Environment Setup

Before starting the initialization process, ensure the project has:
1. Proper `.cursorignore` file to optimize Cursor's indexing
2. `.cursor/commands/` directory present and inventoried (read-only — Phase 0 never creates or templates command files; the Workplace template ships Core commands, and Phase 1.7-APM adds APM-package commands by running `APM_LEGACY_SKILL_PATHS=1 apm install`, which deploys files verbatim from `<id>/.apm/commands/` in the Workplace-Agent-Packages repo)
3. Core/Project directory structure

### Running the Workplace `.ps1` scripts (read before the first script call)

Every `.ps1` under `.cursor/skills/*/scripts/` runs unmodified under both PowerShell editions, but the **executable name differs by platform** and neither name exists everywhere. This template is cross-platform, so the documented commands are written in the Windows form and the rule below is what makes them portable.

> **Canonical invocation rule.** Use `pwsh -File <script>.ps1 [args]` when `pwsh` resolves; otherwise `powershell -ExecutionPolicy Bypass -File <script>.ps1 [args]`.
>
> Every `powershell -ExecutionPolicy Bypass -File …` command printed anywhere in this template means exactly that rule — it is written in the Windows form because that is where the trap is, not because the macOS/Linux branch is unsupported.

```powershell
# Windows (Windows PowerShell 5.1, present on every machine)
powershell -ExecutionPolicy Bypass -File <script>.ps1 [args]

# macOS / Linux, or any host with PowerShell 7+ installed
pwsh -File <script>.ps1 [args]
```

Why both halves matter:

- **On Windows,** `pwsh` (PowerShell 7+) is a separate optional install and is absent on most machines — `pwsh <script>` fails with "pwsh is not recognized" and costs a round-trip every time. `-ExecutionPolicy Bypass` is required there because the default machine policy blocks unsigned local scripts.
- **On macOS and Linux,** `pwsh` is the *only* PowerShell binary that exists — `powershell` is not a command, and `-ExecutionPolicy` is meaningless. Never rewrite a working `pwsh` invocation into `powershell` on these hosts.
- **If neither resolves** (a bare Linux box with no PowerShell at all), a `.ps1` gate cannot be evaluated. Do not improvise past it and do not declare it passed: record the gate as an Open Gap with the reason, and tell the user which check went unrun.

Two 5.1-specific traps the Workplace scripts already work around, worth knowing when writing new ones:

- **`2>&1` on a native executable** (git, node, apm) wraps each stderr line in an `ErrorRecord`; with `$ErrorActionPreference = 'Stop'` the first line of ordinary progress output aborts the script. Redirect stderr to a file and judge the run by `$LASTEXITCODE` instead — this is what `prepare-apm-packages.ps1` does around `git clone`.
- **`Get-Content` decodes UTF-8 as ANSI** in the console, so correct files display as mojibake (`â€"` for an em dash). Verify encoding with a byte-level check, not with terminal output. Likewise, never round-trip `.core-version.json` through `Get-Content | ConvertFrom-Json | ConvertTo-Json | Set-Content` — that is what corrupts it and adds a BOM.

Also note that Windows PowerShell 5.1 does not support the `&&` / `||` chaining operators. Issue dependent commands as separate calls.

---

## Part 1: .cursorignore Generation — MANDATORY

> **HARD RULE — applies to BOTH `NEW_PROJECT` and `EXISTING_PROJECT` modes.**
>
> After Phase 0.5 finishes, `.cursorignore` MUST exist in the project root and MUST be non-empty.
> The ONLY case in which the agent does not write to `.cursorignore` is when the file already exists AND already contains every base entry from the template below (i.e., nothing to append). Even then the file MUST be re-read and verified, and the run MUST be logged as `cursorignoreStatus: "retained"`.
>
> **Never skip this part because the project "looks already configured".** Missing `.cursorignore` after Phase 0.5 = Phase 0.5 incomplete (see Verification Step below and `SKILL.md → Phase Transition Validation → Phase 0`).

Optimize Cursor's indexing and context usage by managing file exclusions.

### Steps

1. **Check if `.cursorignore` exists** in the project root:
   ```
   If file exists:
     - Read current content
     - Identify missing essential entries from the base template
     - If at least one essential entry is missing → append only the missing entries (avoid duplicates) → cursorignoreStatus: "updated"
     - If every essential entry is already present → make no changes → cursorignoreStatus: "retained"
     - Either way: proceed to Verification Step (5) — the file MUST be re-read and confirmed non-empty
   
   If file does NOT exist:
     - MUST create new .cursorignore with the full base template below
     - cursorignoreStatus: "created"
     - This step is NOT optional and does NOT depend on project mode (NEW_PROJECT vs EXISTING_PROJECT)
   ```

2. **Base .cursorignore template** (always ensure these entries exist):
   ```
   # Dependencies
   node_modules/
   vendor/
   
   # Build outputs
   dist/
   build/
   out/
   .next/
   .nuxt/
   coverage/
   
   # System files
   .git/
   .DS_Store
   Thumbs.db
   
   # Logs
   logs/
   *.log
   npm-debug.log*
   yarn-debug.log*
   yarn-error.log*
   
   # Temporary files
   tmp/
   temp/
   .cache/
   
   # IDE
   .vscode/
   .idea/
   
   # TaskMaster task files (keep tasks.json only)
   .taskmaster/tasks/*.md
   
   # Environment files (keep .env.example)
   .env
   .env.local
   .env.*.local

   # APM (Agent Package Manager) artifacts — large, regenerable
   apm_modules/
   .workplace/activated/
   ```

   > **Note (v4.0.0+):** Three APM-managed paths are explicitly handled:
   >
   > - `apm_modules/` — APM's local package cache, large and regenerable. **Cursorignored AND gitignored.**
   > - `.workplace/activated/` — per-package activation markers regenerated on first session. **Cursorignored AND gitignored.**
   > - `.workplace/state.json` — local activation status (regenerable). **Gitignored.**
   >
   > Commit-required files (do NOT add to either ignore file):
   >
   > - `apm.yml` — project's APM manifest.
   > - `apm.lock.yaml` — exact pinned package versions.
   > - `.cursor/rules/packages-index.json` — offline registry snapshot.

3. **Smart Entry Detection**:
   - When appending to existing file, check if entry already exists (exact match or pattern match)
   - Normalize paths (handle trailing slashes, wildcards)
   - Skip duplicate entries
   - Add section comments only if section is new

4. **After Phase 3 (Stack Configuration)**, append stack-specific entries:
   
   **For React/Next.js:**
   ```
   # Next.js
   .next/
   .vercel/
   
   # React
   .eslintcache
   ```
   
   **For Vue/Nuxt:**
   ```
   # Nuxt
   .nuxt/
   .output/
   
   # Vue
   .vuepress/dist/
   ```
   
   **For Python:**
   ```
   # Python
   __pycache__/
   *.py[cod]
   *$py.class
   *.so
   .Python
   venv/
   env/
   ENV/
   .venv/
   ```
   
   **For Java:**
   ```
   # Java
   target/
   *.class
   *.jar
   *.war
   ```
   
   **For .NET:**
   ```
   # .NET
   bin/
   obj/
   *.suo
   *.user
   ```
   
   **For Go:**
   ```
   # Go
   *.exe
   *.test
   *.out
   vendor/
   ```

5. **Verification Step (MANDATORY — runs in ALL three branches: created / updated / retained)**:
   Phase 0.5 MUST NOT be marked complete unless this verification passes.
   ```
   a. Read .cursorignore from disk (do NOT rely on in-memory state)
   b. Check that the file exists
   c. Check that content is NOT empty
   d. Check that expected base entries exist (at least "node_modules/" and ".git/")
   e. If ANY check fails:
      - Log error: "⚠️ .cursorignore verification failed: <which check failed>"
      - If file is missing → fall back to the "create" branch from Step 1 and write the full base template
      - If file is empty / encoding-broken → retry write with explicit UTF-8 encoding via the Write tool
      - If retry still fails → do NOT mark Phase 0.5 complete, surface a hard error to the user
   ```

   > **Reminder:** an "already configured" project is NOT a valid reason to skip verification. The most common failure mode is the agent reading "Never overwrite existing configurations" (see Important Notes) and silently skipping Part 1 entirely. That note refers to **not clobbering custom entries** — it does NOT permit leaving `.cursorignore` absent.

   **Windows-specific note**: When using shell commands to write files on Windows, 
   always specify UTF-8 encoding to avoid UTF-16 encoding issues:
   ```powershell
   # PowerShell: Use -Encoding utf8
   Set-Content -Path ".cursorignore" -Value $content -Encoding utf8
   
   # Or use Out-File with encoding
   $content | Out-File -FilePath ".cursorignore" -Encoding utf8
   ```
   
   **Preferred approach**: Use the Write tool directly instead of shell commands,
   as it handles encoding correctly across platforms.

6. **Update Action** (only after successful verification):
   - Hold the result for the consolidated Phase 0 ledger update (see "MANDATORY: Phase Completion Actions" below). Do NOT update `project_init.md` from this step alone.
   - Store status in memory: `cursorignoreStatus: "created"`, `"updated"`, or `"retained"`; verification note: "`.cursorignore` verified: [N] entries present".
   - The Phase 0.5 row of the Initialization Summary table (rendered at the end of `/initialize`) MUST mention `.cursorignore` explicitly with its status. If the row says nothing about `.cursorignore`, the phase is incomplete.

---

## Part 1.5: .gitignore — Workplace Internal Files

Ensure that Workplace-generated runtime files are excluded from git.

### Steps

1. **Check if `.gitignore` exists** in the project root:
   ```
   If file exists:
     - Read current content
     - Check for missing Workplace entries (see list below)
     - Append only entries that are NOT already present
   
   If file does NOT exist:
     - Do NOT create .gitignore automatically (project may use a different VCS strategy)
     - Log: "⚠️ No .gitignore found — skipping Workplace exclusions. 
       Consider adding .cursor/hooks/.docs-sync-state.json to your VCS ignore file."
   ```

2. **Required Workplace entries** (append under `# AI Workplace` section if missing):
   ```
   # AI Workplace — internal runtime state (do not commit)
   .cursor/hooks/.docs-sync-state.json
   .cursor/.backups/
   .cursor/.update-backup/
   .cursor/.temp-update/

   # APM (Agent Package Manager) artifacts
   apm_modules/
   .workplace/activated/
   .workplace/state.json
   ```

   > `apm.yml`, `apm.lock.yaml`, `.cursor/rules/packages-index.json`, and **`.cursor/hooks/docs-sync-config.json`** MUST stay committed — do NOT add any of them to `.gitignore`. `docs-sync-config.json` is project-owned but intentionally tracked (it is a shared, per-project extension of the docs-sync hook's category/pattern rules — see [Configurable categories](https://git.netcracker.com/DEMO.SE.AI/nc-ai-workplace/-/blob/master/docs/core/AGENT_CONTEXT_AND_DOCS_SYNC.md#configurable-categories-docs-sync-configjson)), unlike the local-only `.docs-sync-state.json` above.

3. **Smart duplicate detection:**
   - Before appending, check if the exact entry already exists in the file
   - If present — skip silently
   - If absent — append with section comment (only if section comment is also missing)

4. **Verification:**
   - Read `.gitignore` back and confirm the entry is present
   - Log result: "`.gitignore` updated with Workplace exclusions" or "`.gitignore` already contains Workplace exclusions"

---

## Part 1.7: Docs Auto-Sync Hook Configuration

> **Goal:** Let the user decide whether the automatic documentation sync hook fires after every agent session, or whether docs sync should only be triggered manually via `/docs-sync`.

The Workplace template ships a `stop` hook (`.cursor/hooks/docs-sync-check.js`) that runs after each agent session and recommends running `/docs-sync` when significant file changes are detected. The hook is enabled by default in `.cursor/hooks.json`. This step lets the user configure their preferred mode.

### Steps

1. **Present the choice to the user:**

   ```
   📄 Documentation Sync Hook

   After each agent session, a stop hook can automatically analyze your changes
   and recommend running /docs-sync when significant files are modified
   (3+ source files, new dependencies, or architectural changes).

   The /docs-sync command remains available regardless of this setting.

   [A] Enable automatic checks (default — hook fires after each session and suggests /docs-sync when needed)
   [B] Disable automatic checks (run /docs-sync manually only — hook file is kept but deactivated)

   Your choice (default: A):
   ```

2. **Apply the selected configuration to `.cursor/hooks.json`:**

   **If [A] Enable (default)** — ensure the stop hook entry is present:
   ```json
   {
     "version": 1,
     "hooks": {
       "stop": [
         {
           "command": "node .cursor/hooks/docs-sync-check.js",
           "loop_limit": 1,
           "timeout": 15
         }
       ]
     }
   }
   ```
   If `.cursor/hooks.json` already matches this structure — no change needed.

   **If [B] Disable** — clear the `stop` array (do NOT delete the file or the hook script):
   ```json
   {
     "version": 1,
     "hooks": {
       "stop": []
     }
   }
   ```
   The `.cursor/hooks/docs-sync-check.js` file remains in place so the hook can be re-enabled by restoring the entry to `hooks.json` at any time.

3. **Confirm the applied setting:**
   - [A] chosen: "✅ Docs auto-sync hook **enabled** — the hook will recommend `/docs-sync` after significant changes."
   - [B] chosen: "✅ Docs auto-sync hook **disabled** — hook script preserved. Use `/docs-sync` to sync documentation manually."

4. **Hold the choice for the Phase 0 ledger update** — record `docsSyncHook: "enabled"` or `docsSyncHook: "disabled"` in memory. The consolidated Phase Completion Actions (below) append a Q-block to `## User Answers & Decision Log → ### Phase 0 — Environment Setup` with `Decision stored in: .cursor/hooks.json`.

> **Re-enabling later:** To re-enable the hook after disabling it, restore the stop-hook entry to `.cursor/hooks.json` manually, or re-run `/initialize` → Phase 0.

> **Stack-specific tuning happens later, in Phase 3.** The hook's category/dependency/build-config patterns are generic (JS/TS-oriented plus a handful of cross-language manifests) until Phase 3 (Stack Configuration) generates `.cursor/hooks/docs-sync-config.json` tailored to the detected stack — see [stack-configuration.md](stack-configuration.md). This choice ([A]/[B] above) only controls whether the hook fires at all, not which patterns it uses.

---

## Part 2: Commands Directory Preparation

Ensure the `.cursor/commands/` directory exists. **Phase 0 does not create or template any command files.**

> **Changed in v3.0.0; v4.0.0 update:** the previous Phase 0 → Phase 1.5 hand-off promised that "missing standard commands will be created in Phase 1.5". That was the synthetic-generation path for `review.md`, `bugfix.md`, `onboard.md`, `feature.md`, `refactor.md`, and `test.md`. **It has been removed.** No initialization phase generates command files inline. The only mechanisms that put `.md` files in `.cursor/commands/` are:
>
> 1. The Workplace template itself (which ships Core commands like `initialize`, `quick-init`, `package-new`, `update-workplace`, `taskmaster-init`, `docs-sync`).
> 2. Phase 1.7-APM (APM deploys commands from each installed APM package's `<id>/.apm/commands/` (in the Workplace-Agent-Packages repo) into `.cursor/commands/`).
> 3. Standalone `apm install` after the user adds the package (`git: <apmPackages.registryRepoUrl>`, `path: <id>`, `ref: master`) to `apm.yml`.
> 4. `/update-workplace` (restoring Core commands from the upstream template; APM-installed commands are refreshed by re-running `apm install` in `core-update.md` Step 3.5.b).

### Steps

1. **Check if `.cursor/commands/` directory exists**:
   ```
   If directory does NOT exist:
     - Create .cursor/commands/ directory (empty)
     - Log: "Created .cursor/commands/ directory (was missing — Core commands need to be restored via /update-workplace)"
   
   If directory exists:
     - Log: "Directory .cursor/commands/ already exists"
     - Proceed to inventory
   ```

2. **Inventory Core commands (informational only — read-only)**:
   
   The Workplace template ships six Core commands. Inspect their presence as part of the Phase 0 environment report:
   ```
   Core Commands (shipped by the Workplace template — never generated here):
   - [ ] initialize.md
   - [ ] quick-init.md
   - [ ] package-new.md
   - [ ] update-workplace.md
   - [ ] taskmaster-init.md
   - [ ] docs-sync.md
   
   Status: [N]/6 Core commands present.
   Missing Core commands are recoverable via /update-workplace — they are NOT created in Phase 1.5 or Phase 1.6.
   ```

   **Hard rule:** Do NOT create, copy, edit, or template any `.md` file in `.cursor/commands/` during Phase 0. This is a read-only inventory step.

3. **Track status**:
   - Note directory status: "created (empty)" or "existed"
   - Note Core command inventory: "[N]/6 Core commands present" + list of missing files (if any) for the Phase 1.6 / 1.7 summary

---

## Part 3: Project Identity Directory

Create the minimal `.cursor/rules/project/` directory that holds project identity. The full `metadata.json` is written in Phase 6.5; here we only ensure the directory and a stub README exist.

> **Changed in v3.0.0:** the parallel `project-*` customization system was removed. We no longer create `.templates/` for custom rules, custom command templates, or `docs/project/.templates/`. Project adaptation happens via role-pack artifact edits, the `Project Conventions` section in `AGENTS.md` (seeded in Phase 7), and per-skill `project-config.json` + `references/guidelines.md`.
>
> **Changed in v3.0.0 (APM-based since v4.0.0):** `.cursor/commands/.templates/` is no longer created — synthetic command generation has been replaced by APM-package installation (Phase 1.7-APM, `apm install`).

### Steps

1. **Create directory:**
   ```bash
   mkdir -p .cursor/rules/project
   ```

2. **Create README:** `.cursor/rules/project/README.md` (stub explaining that the directory only holds `metadata.json` and pointing to `docs/core/CUSTOMIZATION.md` for the project adaptation model).

3. **Track status:** Note that the project identity directory was created. `metadata.json` itself is created in Phase 6.5.

---

## Part 3.5: Analysis Artifact Directory

Create `.cursor/project/analysis/` — the destination for the Phase 4 analysis artifacts (`index.json` plus a `<component>.json` / `<component>.md` pair per component). Creating it here rather than in Phase 4 means the analysis subagents never have to create a directory outside their two named output files.

### Steps

1. **Create directory:**
   ```bash
   mkdir -p .cursor/project/analysis
   ```

2. **Do not seed `index.json`.** Phase 4 writes it just before the first dispatch (`codebase-analysis.md` → Step 0); an empty registry created here would be indistinguishable from an interrupted wave during a resume.

3. **NEW_PROJECT mode:** create the directory anyway and leave it empty. Phase 4 is skipped, so nothing lands in it until a later `/docs-sync` or re-analysis.

> These artifacts are **project-owned**: committed to the repository, absent from `coreFiles`, never touched by `/update-workplace`, and matched by an `IGNORED_PATTERNS` entry in `.cursor/hooks/docs-sync-check.js` so refreshing them does not trigger a documentation-sync recommendation. Contract: [`subagent-contract.md`](subagent-contract.md) §7.

---

## MANDATORY: Phase Completion Actions

> **These actions are REQUIRED before Phase 0 can be considered complete.**
> **The agent MUST NOT proceed to Phase 1 without completing ALL of them.**

After completing Phase 0:

> **Source-of-truth rule (v3.1.0+):** Phase 0 produces real files (`.cursorignore`, `.gitignore`, `.cursor/hooks.json`, `.cursor/commands/`, `.cursor/rules/project/`). Those files ARE the authoritative artifacts. The ledger (`.cursor/project_init.md`) only records the audit Q-block(s) and ticks the phase checkbox. Most users do NOT deviate from defaults — silent acceptances must still get a Q-block per the ledger schema.

1. **Append the audit trail** to `.cursor/project_init.md → ## User Answers & Decision Log → ### Phase 0 — Environment Setup` using the canonical Q-block format from `SKILL.md → Phase Reflection Checkpoint → Step 4`. Include one Q-block per user choice or notable deviation; silent acceptance = single Q-block with `Question asked: none — silent acceptance`. Examples to log:
   - `.cursorignore` outcome (`Decision stored in: .cursorignore`).
   - `.gitignore` outcome (`Decision stored in: .gitignore`, or `User answer: skipped — no .gitignore present`).
   - `.cursor/hooks.json` docs-sync hook choice from Part 1.7 (`Decision stored in: .cursor/hooks.json`).
   - Commands directory status (`Decision stored in: .cursor/commands/`; `User answer: existed` / `created (empty)`; missing Core commands listed under `Follow-up:` for `/update-workplace`).
   - Project identity directory created (`Decision stored in: .cursor/rules/project/`).
   - Analysis artifact directory created (`Decision stored in: .cursor/project/analysis/`).

2. **Tick `Phase 0`** in `.cursor/project_init.md → ## Phase Checklist`. (Phase 0 has no reflection sub-checkbox per `SKILL.md → Phase Transition Validation`.)

3. **Update `Artifact Pointers`** — set the `MCP configuration`, `apm.yml`, `apm.lock.yaml`, and `.workplace/state.json` rows only when the files exist (they will appear in Phase 1.5/1.7-APM); for now Phase 0 only confirms `.cursor/commands/` and `.cursor/rules/project/` exist and records that under the relevant Q-blocks.

4. **Mirror open gaps** — missing Core commands (recoverable via `/update-workplace`) get a bullet under `## Open Gaps` with `gap`, `source phase = 0`, `owner = user`, `suggested follow-up = run /update-workplace`.

5. **Verify artifacts** — Re-read `.cursorignore` to confirm it has content; if `.gitignore` exists, confirm Workplace exclusions are present; confirm `.cursor/commands/`, `.cursor/rules/project/` and `.cursor/project/analysis/` exist; confirm `.cursor/hooks.json` reflects the chosen docs-sync mode.

6. **Show progress:** "✅ Environment setup (0/9 phases complete)"

**Note:** No command creation happens during initialization. Phase 1.6 only inspects `.cursor/commands/` (read-only inventory of Core commands shipped with the Workplace template). Phase 1.7-APM ([phase-1-7-apm.md](phase-1-7-apm.md)) is the only mechanism that adds new files to `.cursor/commands/`, exclusively via `apm install` from APM packages under `<id>/.apm/commands/` in the Workplace-Agent-Packages repo.

---

## Related Modules

- **Parent:** [Project Initialization Skill](../SKILL.md) - Main initialization orchestrator
- **Next:** [mode-detection.md](mode-detection.md) - Phase 1: Mode detection

---

## Important Notes

1. **Never overwrite existing configurations** — Always check for file/directory existence before writing. **This does NOT mean "skip creating a missing file."** If `.cursorignore` is absent, you MUST create it (see Part 1, Step 1, "If file does NOT exist" branch). The non-overwrite rule only protects user-authored entries inside files that already exist.
2. **Smart duplicate detection** - Avoid adding entries that already exist in `.cursorignore`
3. **Stack-specific patterns** - Added after Phase 3 when framework is known
4. **No commands are generated by the initializer.** Phase 1.6 only inspects `.cursor/commands/` (read-only). Phase 1.7-APM deploys commands from APM packages under `<id>/.apm/commands/` (in the Workplace-Agent-Packages repo) via `apm install`. See [phase-1-7-apm.md](phase-1-7-apm.md) and [apm-workflow.md](apm-workflow.md).
5. **Preserve user customizations** - Existing `.cursor/commands/` and `.cursor/mcp.json` never modified
6. **CRITICAL: Verify before marking complete** - Always read back and verify file contents before checking completion checkboxes
7. **Use Write tool for file operations** - Prefer the Write tool over shell commands for file creation to avoid encoding issues

## Common Failure Modes & Solutions

### Problem: `.cursorignore` file is missing after initialization

**Symptoms:**
- `/initialize` finished and the Initialization Summary's Phase 0.5 row mentions only `.gitignore` and `.cursor/hooks.json`, with no entry for `.cursorignore`.
- `ls .cursorignore` in the project root returns no such file.

**Root Cause:**
The agent treated the project as "already configured" (typically in `EXISTING_PROJECT` mode) and skipped Part 1 of Phase 0.5 entirely, often by misreading the "Never overwrite existing configurations" note as "do not touch ignore files at all".

**Solution:**
1. Re-run Phase 0.5 Part 1 manually: create `.cursorignore` from the base template above (plus any stack-specific patterns from Step 4 that match the detected framework).
2. Run the Verification Step (5) to confirm the file exists and is non-empty.
3. Append a Q-block to `.cursor/project_init.md → ### Phase 0 — Environment Setup` with `Decision stored in: .cursorignore`, `User answer: created (recovered after initial run skipped it)`.
4. To prevent recurrence, treat Part 1 as MANDATORY for both modes — the "create" branch runs whenever the file is absent, regardless of how mature the project looks.

---

### Problem: `.cursorignore` file is empty after initialization

**Symptoms:**
- Phase 0 checkbox is marked complete
- `.cursorignore` file exists but has 0 bytes or no content

**Root Causes:**
1. Shell command encoding issues (UTF-16 on Windows PowerShell)
2. File write operation failed silently
3. Verification step was skipped
4. Agent marked checkbox before actual write

**Solution:**
1. Use the Write tool directly (not shell echo/cat commands)
2. Always verify file contents after writing
3. Only mark checkbox AFTER successful verification
4. If using shell on Windows, explicitly specify `-Encoding utf8`

### Problem: Checkbox marked but action not completed

**Prevention:**
```
ALWAYS follow this order:
1. Perform the action (create file, write content)
2. Verify the action succeeded (read back, check content)
3. ONLY THEN mark the checkbox as complete
```

This module ensures a clean, optimized development environment while preserving any existing configurations.
