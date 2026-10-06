#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Post-install health gate for APM packages.

.DESCRIPTION
    `apm install` reports success for a package whose lock entry it considers
    unchanged - even when the cached tree under apm_modules/ is an empty directory
    skeleton. A previous interrupted install can therefore poison apm.lock.yaml with

        version: unknown
        package_type: invalid
        content_hash: sha256:e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855

    (that hash is SHA-256 of the empty input), after which every later `apm install`
    prints "files unchanged" and never re-materialises the package. Nothing downstream
    notices: directories exist, so a directory-existence check passes, and initialization
    runs on for several phases before the Phase 6 Part 3.5 hard gate finally fails with a
    symptom far from the cause.

    This script closes that gap. Phase 1.7-APM runs it twice: as a pre-flight over
    inherited state (step 5.0b, with -PreInstall) and as the Transition Validation gate
    after `APM_LEGACY_SKILL_PATHS=1 apm install` (step 5.1a, no switch). It fails loudly
    with the exact remediation command.

    Checks:
      1. apm.lock.yaml    - no entry with package_type != apm_package, version: unknown,
                            or the empty-input content hash.
      2. apm_modules/     - no cached package tree with zero files.
      3. .cursor/skills/  - every required context skill exists AND carries SKILL.md and
                            references/template.md AND is non-empty.   [skipped by -PreInstall]
      4. .cursor/skills/  - no empty skill directory at all.

    The required set comes from `.cursor/.temp-apm-selection.json` (`requiredContextSkills`,
    written by prepare-apm-packages.ps1) unless -Required overrides it. Phase 6 Part 3.5
    consumes the same set.

    Check 3 asks whether packages *delivered* their content, which can only be true after
    an install. Running it before one - as step 5.0b does on a fresh project, where the
    selection file already exists but nothing is installed yet - would fail every role-matched
    context skill by definition. -PreInstall therefore restricts the run to checks 1, 2 and 4,
    which are exactly the inherited-state questions that step is asking.

    Scope boundary: this script judges whether packages were *installed* with content.
    Whether a full module was *activated* (its runtime/ payload relocated into the project)
    is a separate question owned by verify-apm-activation.ps1. Run order in Phase 1.7-APM is
    install health -> activation -> activation verification.

.PARAMETER Required
    Comma-separated context skill names to require, overriding the selection file.

.PARAMETER PreInstall
    Pre-flight mode for Phase 1.7-APM step 5.0b: run the inherited-state checks (1, 2, 4)
    and skip the required-context-skill check (3), which cannot pass before `apm install`.

.PARAMETER Json
    Machine-readable output.

.PARAMETER Quiet
    Print problems only.

.EXAMPLE
    powershell -ExecutionPolicy Bypass -File .cursor/skills/project-initialization/scripts/validate-apm-install.ps1 -PreInstall

.EXAMPLE
    powershell -ExecutionPolicy Bypass -File .cursor/skills/project-initialization/scripts/validate-apm-install.ps1

.EXAMPLE
    powershell -ExecutionPolicy Bypass -File .cursor/skills/project-initialization/scripts/validate-apm-install.ps1 -Required api-context,backend-context -Json

.NOTES
    Exit 0 = healthy, 1 = at least one problem. Windows ships Windows PowerShell 5.1
    as `powershell`; `pwsh` (PowerShell 7+) is a separate optional install. Output is
    ASCII-only so PS 5.1's ANSI-default console never mangles it.
#>

[CmdletBinding()]
param(
  [string]$LockFile = 'apm.lock.yaml',
  [string]$ApmModulesDir = 'apm_modules',
  [string]$SkillsDir = '.cursor/skills',
  [string]$SelectionFile = '.cursor/.temp-apm-selection.json',
  [string[]]$Required,
  [switch]$PreInstall,
  [switch]$Json,
  [switch]$Quiet
)

$ErrorActionPreference = 'Stop'

# SHA-256 of zero bytes. APM writes this when it hashes a package that produced no files.
$EmptyContentHash = 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'

# The canonical install command for this template. APM_LEGACY_SKILL_PATHS=1 keeps skills
# at .cursor/skills/<name>/, which Phase 6 Part 3.5 depends on. The env-var prefix form is
# POSIX shell syntax; PowerShell needs the assignment as a separate statement, so print the
# dialect the reader is actually in - remediation text is meant to be pasted, not translated.
$IsPosixHost = ($PSVersionTable.PSObject.Properties.Name -contains 'Platform') -and ($PSVersionTable.Platform -eq 'Unix')
$InstallCmd = if ($IsPosixHost) { 'APM_LEGACY_SKILL_PATHS=1 apm install' }
              else { '$env:APM_LEGACY_SKILL_PATHS = "1"; apm install' }

$errors = New-Object System.Collections.ArrayList
$warnings = New-Object System.Collections.ArrayList
$checked = [ordered]@{ lockEntries = 0; cachedPackages = 0; requiredSkills = 0; skillDirs = 0 }

function Add-Problem([string]$Message) { [void]$errors.Add($Message) }
function Add-Warning([string]$Message) { [void]$warnings.Add($Message) }

function Get-FileCount([string]$Path) {
  if (-not (Test-Path $Path)) { return 0 }
  return @(Get-ChildItem -Path $Path -Recurse -File -Force -ErrorAction SilentlyContinue).Count
}

function Read-TextFileNoBom([string]$Path) {
  $bytes = [System.IO.File]::ReadAllBytes((Resolve-Path $Path))
  if ($bytes.Length -ge 3 -and $bytes[0] -eq 0xEF -and $bytes[1] -eq 0xBB -and $bytes[2] -eq 0xBF) {
    $bytes = $bytes[3..($bytes.Length - 1)]
  }
  return [System.Text.Encoding]::UTF8.GetString($bytes)
}

<#
  Minimal reader for the `dependencies:` block of apm.lock.yaml. A real YAML parser is
  not available on a bare PS 5.1 host, and the block is a flat list of scalar key/value
  pairs, so a line reader is sufficient and has no install prerequisite. Nested
  sequences (deployed_files, deployed_file_hashes) are counted, not parsed.
#>
function Read-LockDependencies([string]$Path) {
  $entries = @()
  $current = $null
  $inDependencies = $false
  $deployedCount = 0

  foreach ($line in ((Read-TextFileNoBom $Path) -split "\r?\n")) {
    if ($line -match '^\s*$') { continue }

    if ($line -match '^[A-Za-z_][A-Za-z0-9_]*\s*:') {
      # A new top-level key ends the dependencies block.
      $inDependencies = ($line -match '^dependencies\s*:')
      if (-not $inDependencies -and $current) {
        $current.deployedFileCount = $deployedCount
        $entries += [pscustomobject]$current
        $current = $null
      }
      continue
    }
    if (-not $inDependencies) { continue }

    if ($line -match '^-\s+(\S+)\s*:\s*(.*)$') {
      if ($current) {
        $current.deployedFileCount = $deployedCount
        $entries += [pscustomobject]$current
      }
      $deployedCount = 0
      $current = [ordered]@{
        name = ''; version = ''; virtual_path = ''; package_type = ''
        content_hash = ''; repo_url = ''; deployedFileCount = 0
      }
      $current[$Matches[1]] = $Matches[2].Trim().Trim('"').Trim("'")
      continue
    }
    if (-not $current) { continue }

    if ($line -match '^\s{2}-\s') { $deployedCount++; continue }         # sequence item
    if ($line -match '^\s{2,}(\S+)\s*:\s*(.*)$') {
      $current[$Matches[1]] = $Matches[2].Trim().Trim('"').Trim("'")
    }
  }
  if ($current) {
    $current.deployedFileCount = $deployedCount
    $entries += [pscustomobject]$current
  }
  return $entries
}

function Get-PackageLabel($Entry) {
  if ($Entry.virtual_path) { return $Entry.virtual_path }
  if ($Entry.name) { return $Entry.name }
  return '(unnamed)'
}

# --- 1. Lock file integrity ---------------------------------------------------
if (-not (Test-Path $LockFile)) {
  Add-Warning "$LockFile does not exist - nothing installed yet (run '$InstallCmd')."
} else {
  $deps = Read-LockDependencies $LockFile
  $checked.lockEntries = $deps.Count
  if ($deps.Count -eq 0) {
    Add-Warning "$LockFile has no dependencies block - nothing to validate."
  }
  foreach ($d in $deps) {
    $label = Get-PackageLabel $d
    $bad = @()
    if ($d.package_type -and $d.package_type -ne 'apm_package') { $bad += "package_type='$($d.package_type)'" }
    if (-not $d.package_type)                                   { $bad += "package_type is missing" }
    if ($d.version -eq 'unknown' -or -not $d.version)           { $bad += "version='$($d.version)'" }
    if ($d.content_hash -match [regex]::Escape($EmptyContentHash)) { $bad += "content_hash is SHA-256 of empty input" }
    if ($bad.Count) {
      Add-Problem ("lock entry '{0}' is poisoned ({1}). The package is recorded as installed but holds no content, so 'apm install' will keep reporting 'files unchanged' and never re-materialise it. Remediate:`n      Remove-Item -Recurse -Force {2}/{0}`n      # then delete this entry from {3}, or delete {3} entirely to force a full re-resolve`n      {4}" -f $label, ($bad -join ', '), $ApmModulesDir, $LockFile, $InstallCmd)
    } elseif ($d.deployedFileCount -eq 0) {
      Add-Warning "lock entry '$label' records no deployed_files - it may be a runtime-only module, or the deploy step did not run."
    }
  }
}

# --- 2. Cached package trees --------------------------------------------------
if (Test-Path $ApmModulesDir) {
  foreach ($dir in (Get-ChildItem -Path $ApmModulesDir -Directory -ErrorAction SilentlyContinue)) {
    $checked.cachedPackages++
    if ((Get-FileCount $dir.FullName) -eq 0) {
      Add-Problem "cached package tree '$ApmModulesDir/$($dir.Name)' contains 0 files - directory skeleton left by a failed install. Delete it and re-run '$InstallCmd'."
    }
  }
}

# --- 3. Required context skills ----------------------------------------------
# Skipped in -PreInstall mode: before `apm install` runs, every role-matched context skill
# is absent by definition, so the check would fail on a healthy fresh project.
$requiredSkills = @()
if ($PreInstall) {
  Add-Warning "pre-flight mode: required-context-skill check skipped (it only has meaning after 'apm install'). Re-run without -PreInstall at step 5.1a."
} elseif ($Required) {
  $requiredSkills = @($Required | ForEach-Object { $_ -split ',' } | ForEach-Object { $_.Trim() } | Where-Object { $_ })
} elseif (Test-Path $SelectionFile) {
  try {
    $sel = Read-TextFileNoBom $SelectionFile | ConvertFrom-Json
    $requiredSkills = @($sel.requiredContextSkills | Where-Object { $_ })
  } catch {
    Add-Warning "could not parse $SelectionFile ($($_.Exception.Message)) - required-skill check skipped. Pass -Required explicitly."
  }
} else {
  Add-Warning "no $SelectionFile and no -Required argument - required-skill check skipped (only structural checks ran)."
}

# coreContextSkills are required unconditionally (Phase 6 Part 3.5).
if (-not $PreInstall) {
  foreach ($core in @('coding-standards-context', 'infrastructure-context')) {
    if ($requiredSkills -notcontains $core) { $requiredSkills += $core }
  }
}

foreach ($skill in $requiredSkills) {
  $checked.requiredSkills++
  $dir = Join-Path $SkillsDir $skill
  if (-not (Test-Path $dir)) {
    Add-Problem "required context skill '$skill' is missing from $SkillsDir/ - the package that owns it did not install. Add it to apm.yml if absent, then run '$InstallCmd'."
    continue
  }
  $count = Get-FileCount $dir
  if ($count -eq 0) {
    Add-Problem "required context skill '$skill' exists but contains 0 files - the package that owns it is installed but empty (see the lock findings above). Do NOT hand-create the files; purge and re-install the owning package."
    continue
  }
  foreach ($rel in @('SKILL.md', 'references/template.md')) {
    if (-not (Test-Path (Join-Path $dir $rel) -PathType Leaf)) {
      Add-Problem "required context skill '$skill' is incomplete - $rel is missing (has $count file(s))."
    }
  }
}

# --- 4. Any empty skill directory --------------------------------------------
if (Test-Path $SkillsDir) {
  foreach ($dir in (Get-ChildItem -Path $SkillsDir -Directory -ErrorAction SilentlyContinue)) {
    $checked.skillDirs++
    if ((Get-FileCount $dir.FullName) -eq 0) {
      if ($requiredSkills -notcontains $dir.Name) {
        Add-Problem "skill directory '$SkillsDir/$($dir.Name)' contains 0 files - leftover of a failed install; delete it or re-install its package."
      }
    }
    if ($dir.Name -like '*.__apm-staging') {
      Add-Problem "staging directory '$SkillsDir/$($dir.Name)' was left behind - an install was interrupted. Delete it and re-run '$InstallCmd'."
    }
  }
}

# --- Report -------------------------------------------------------------------
$ok = ($errors.Count -eq 0)

if ($Json) {
  $payload = [ordered]@{
    ok = $ok
    mode = $(if ($PreInstall) { 'pre-install' } else { 'post-install' })
    checked = $checked
    requiredContextSkills = $requiredSkills
    errors = @($errors)
    warnings = @($warnings)
  }
  Write-Output ($payload | ConvertTo-Json -Depth 6)
  if ($ok) { exit 0 } else { exit 1 }
}

Write-Host ("=== validate-apm-install{0} ===" -f $(if ($PreInstall) { ' (pre-flight)' } else { '' }))
if (-not $Quiet) {
  Write-Host ("  lock entries: {0}   cached packages: {1}   required context skills: {2}   skill dirs: {3}" -f `
    $checked.lockEntries, $checked.cachedPackages, $checked.requiredSkills, $checked.skillDirs)
  Write-Host ""
}
foreach ($w in $warnings) { Write-Host "  warn  $w" -ForegroundColor Yellow }
foreach ($e in $errors)   { Write-Host "  FAIL  $e" -ForegroundColor Red }

Write-Host ""
if ($ok) {
  if ($PreInstall) {
    Write-Host "Inherited APM state is clean: no poisoned lock entry, no empty cached package tree, no leftover staging directory. Safe to install." -ForegroundColor Green
  } else {
    Write-Host "APM install is healthy: every required context skill has SKILL.md + references/template.md and no lock entry is poisoned." -ForegroundColor Green
  }
  exit 0
}
Write-Host ("$($errors.Count) problem(s) found. Initialization MUST NOT continue past Phase 1.7-APM until they are resolved.") -ForegroundColor Red
Write-Host "Re-running 'apm install' does NOT fix an empty package - APM sees the lock entry as current and redeploys nothing." -ForegroundColor Red
exit 1
