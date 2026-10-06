$ErrorActionPreference = 'Stop'

$packageName = 'test-generation'
$pluginRoot  = if ($env:PLUGIN_ROOT) { $env:PLUGIN_ROOT } else { Split-Path -Parent $PSScriptRoot }
$projectRoot = if ($env:PROJECT_ROOT) { $env:PROJECT_ROOT } else { (Get-Location).Path }

# Idempotency check
$markerDir  = Join-Path $projectRoot '.workplace/activated'
$markerFile = Join-Path $markerDir "$packageName.marker"
New-Item -ItemType Directory -Force -Path $markerDir | Out-Null
if (Test-Path $markerFile) { exit 0 }

# 1. Copy config.json
$cfgDir = Join-Path $projectRoot '.workplace/test-generation'
New-Item -ItemType Directory -Force -Path $cfgDir | Out-Null
$cfgSrc = Join-Path $pluginRoot 'runtime/config.json'
$cfgDst = Join-Path $cfgDir 'config.json'
if ((Test-Path $cfgSrc) -and -not (Test-Path $cfgDst)) {
    Copy-Item $cfgSrc $cfgDst
}

# 2. Copy runtime/TestGeneration/ -> project root
$runtimeSrc = Join-Path $pluginRoot 'runtime/TestGeneration'
$runtimeDst = Join-Path $projectRoot 'TestGeneration'
if (Test-Path $runtimeSrc) {
    if (-not (Test-Path $runtimeDst)) {
        Copy-Item -Recurse $runtimeSrc $runtimeDst
    } else {
        # Merge: copy only files that do not already exist (preserve user edits)
        Get-ChildItem $runtimeSrc -Recurse | ForEach-Object {
            $rel    = $_.FullName.Substring($runtimeSrc.Length).TrimStart('\','/')
            $target = Join-Path $runtimeDst $rel
            if (-not (Test-Path $target)) {
                if ($_.PSIsContainer) {
                    New-Item -ItemType Directory -Force -Path $target | Out-Null
                } else {
                    New-Item -ItemType Directory -Force -Path (Split-Path $target -Parent) | Out-Null
                    Copy-Item $_.FullName $target
                }
            }
        }
    }
}

# 3. Copy runtime/BuildTests/ -> project root (contents only, not the folder itself)
$buildTestsSrc = Join-Path $pluginRoot 'runtime/BuildTests'
$buildTestsDst = $projectRoot
if (Test-Path $buildTestsSrc) {
    # Merge: copy only files that do not already exist (preserve user edits)
    Get-ChildItem $buildTestsSrc -Recurse | ForEach-Object {
        $rel    = $_.FullName.Substring($buildTestsSrc.Length).TrimStart('\','/')
        $target = Join-Path $buildTestsDst $rel
        if (-not (Test-Path $target)) {
            if ($_.PSIsContainer) {
                New-Item -ItemType Directory -Force -Path $target | Out-Null
            } else {
                New-Item -ItemType Directory -Force -Path (Split-Path $target -Parent) | Out-Null
                Copy-Item $_.FullName $target
            }
        }
    }
}

# 4. Update .workplace/state.json
$ts           = (Get-Date).ToUniversalTime().ToString('yyyy-MM-ddTHH:mm:ssZ')
$workplaceDir = Join-Path $projectRoot '.workplace'
New-Item -ItemType Directory -Force -Path $workplaceDir | Out-Null
$statePath = Join-Path $workplaceDir 'state.json'
$stateObj  = if (Test-Path $statePath) { Get-Content $statePath -Raw | ConvertFrom-Json } else { [pscustomobject]@{ packages = [pscustomobject]@{} } }
if (-not $stateObj.packages) { $stateObj | Add-Member -NotePropertyName packages -NotePropertyValue ([pscustomobject]@{}) -Force }
$stateObj.packages | Add-Member -NotePropertyName $packageName -NotePropertyValue ([pscustomobject]@{ status = 'active'; activatedAt = $ts }) -Force
$stateObj | ConvertTo-Json -Depth 10 | Set-Content -Path $statePath -Encoding utf8

$ts | Set-Content -Path $markerFile -NoNewline
exit 0
