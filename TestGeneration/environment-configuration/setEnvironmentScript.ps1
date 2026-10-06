# Prepares environment-configuration.json from a template + local env yaml file.
# Also sets ATP_ENVGENE_CONFIGURATION to the exact same JSON for backward compatibility.
# The script succeeds only when BOTH the file is written AND the variable is set.
#
# Usage:
#   .\environment-configuration\setEnvironmentScript.ps1 -TemplateFile "environment-configuration-template.json" -EnvFile "env-example.yaml"
#   .\environment-configuration\setEnvironmentScript.ps1 -EnvFile "env-example.yaml"
#
# Parameters:
#   -TemplateFile   Filename of the template (e.g. "environment-configuration-template-ndo.json").
#                   If omitted, uses environment-configuration-template.json.
#   -EnvFile        Name of the yaml file inside local-environment-configuration/ with real values.
#                   Defaults to "env.yaml".

param(
    [string]$TemplateFile = "environment-configuration-template.json",
    [string]$EnvFile = "env-example.yaml"
)

$scriptDir = $PSScriptRoot

# --- 1. Resolve template file ---
$templatePath = Join-Path $scriptDir $TemplateFile

if (-not (Test-Path $templatePath)) {
    Write-Host "[ERROR] Template file not found: $templatePath" -ForegroundColor Red
    Write-Host "Available templates:" -ForegroundColor Yellow
    Get-ChildItem -Path $scriptDir -Filter "environment-configuration-template*.json" | ForEach-Object {
        Write-Host "  -TemplateFile `"$($_.Name)`"" -ForegroundColor Yellow
    }
    exit 1
}

# --- 2. Resolve env yaml file ---
$localEnvDir = Join-Path $scriptDir "local-environment-configuration"
$envFilePath = Join-Path $localEnvDir $EnvFile

if (-not (Test-Path $envFilePath)) {
    Write-Host "[ERROR] Env file not found: $envFilePath" -ForegroundColor Red
    Write-Host "Create your env yaml file in: $localEnvDir" -ForegroundColor Yellow
    Write-Host "Use env-example.yaml as a reference." -ForegroundColor Yellow
    exit 1
}

# --- 3. Read template ---
$templateContent = Get-Content $templatePath -Raw -Encoding UTF8

# --- 4. Parse yaml (key: value) and replace ${PLACEHOLDER} in template ---
$yamlLines = Get-Content $envFilePath -Encoding UTF8
$replacedCount = 0

foreach ($line in $yamlLines) {
    if ($line -match '^\s*#') { continue }
    if ($line -match '^\s*$') { continue }

    if ($line -match '^([^:]+):\s*(.*)$') {
        $key   = $Matches[1].Trim()
        $value = $Matches[2].Trim()

        # Strip surrounding double quotes
        if ($value.Length -ge 2 -and $value.StartsWith('"') -and $value.EndsWith('"')) {
            $value = $value.Substring(1, $value.Length - 2)
        }
        # Strip surrounding single quotes
        elseif ($value.Length -ge 2 -and $value.StartsWith("'") -and $value.EndsWith("'")) {
            $value = $value.Substring(1, $value.Length - 2)
        }

        $placeholder = '${' + $key + '}'
        if ($templateContent.Contains($placeholder)) {
            $templateContent = $templateContent.Replace($placeholder, $value)
            $replacedCount++
        }
    }
}

Write-Host "[OK] Replaced $replacedCount placeholder(s) from: $EnvFile" -ForegroundColor Cyan

# --- 5. Warn about any unreplaced placeholders ---
$unreplacedList = @()
$matchCollection = [regex]::Matches($templateContent, '\$\{[^\}]+\}')
foreach ($m in $matchCollection) {
    if ($unreplacedList -notcontains $m.Value) {
        $unreplacedList += $m.Value
    }
}

if ($unreplacedList.Count -gt 0) {
    Write-Host "[WARNING] $($unreplacedList.Count) placeholder(s) not replaced - add missing keys to your yaml:" -ForegroundColor Yellow
    foreach ($p in $unreplacedList) {
        Write-Host "  - $p" -ForegroundColor Yellow
    }
}

# --- 6. Validate JSON ---
# The substituted template text is the single JSON payload: it goes verbatim into the file
# (primary source) and into the variable (fallback), so both sources can never diverge.
try {
    $jsonObject = $templateContent | ConvertFrom-Json
} catch {
    Write-Host "[ERROR] Result is not valid JSON after substitution: $_" -ForegroundColor Red
    exit 1
}

$jsonContent = $templateContent

# --- 7. Write environment-configuration.json into local-environment-configuration/ (gitignored) ---
$outputPath = Join-Path $localEnvDir "environment-configuration.json"
$jsonContent | Out-File $outputPath -Encoding UTF8
Write-Host "[OK] Written: $outputPath" -ForegroundColor Cyan

# --- 8. Set ATP_ENVGENE_CONFIGURATION (Machine -> User fallback -> Process) ---
try {
    [Environment]::SetEnvironmentVariable("ATP_ENVGENE_CONFIGURATION", $jsonContent, "Machine")
    Write-Host "[SUCCESS] Set GLOBALLY (Machine scope - all users)" -ForegroundColor Green
} catch {
    Write-Host "[WARN] Cannot set Machine scope (requires admin). Setting User scope instead..." -ForegroundColor Yellow
    try {
        [Environment]::SetEnvironmentVariable("ATP_ENVGENE_CONFIGURATION", $jsonContent, "User")
        Write-Host "[SUCCESS] Set for current user (User scope)" -ForegroundColor Green
    } catch {
        Write-Host "[ERROR] Cannot persist ATP_ENVGENE_CONFIGURATION (User scope): $_" -ForegroundColor Red
    }
}

[Environment]::SetEnvironmentVariable("ATP_ENVGENE_CONFIGURATION", $jsonContent, "Process")
$env:ATP_ENVGENE_CONFIGURATION = $jsonContent

# --- 9. Verify both outputs: the file (primary source) and the variable (fallback) ---
$failed = $false

if (-not (Test-Path $outputPath)) {
    Write-Host "[ERROR] Config file was not created: $outputPath" -ForegroundColor Red
    $failed = $true
} else {
    try {
        $written = (Get-Content $outputPath -Raw -Encoding UTF8) -replace "^\uFEFF", ""
        $null = $written | ConvertFrom-Json
    } catch {
        Write-Host "[ERROR] Config file is not valid JSON: $outputPath" -ForegroundColor Red
        $failed = $true
    }
}

if ($null -eq $env:ATP_ENVGENE_CONFIGURATION -or $env:ATP_ENVGENE_CONFIGURATION -eq "") {
    Write-Host "[ERROR] Environment variable ATP_ENVGENE_CONFIGURATION is not set" -ForegroundColor Red
    $failed = $true
}

if ($failed) {
    exit 1
}

$systemCount = $jsonObject.systems.Count

Write-Host ""
Write-Host "[SUCCESS] Environment configuration ready - $systemCount system(s) configured" -ForegroundColor Green
Write-Host "  Template : $templatePath" -ForegroundColor Cyan
Write-Host "  Env file : $envFilePath" -ForegroundColor Cyan
Write-Host "  Config   : $outputPath  (primary source, read by SettingsHelper)" -ForegroundColor Cyan
Write-Host "  Variable : ATP_ENVGENE_CONFIGURATION  (same JSON, backward-compat fallback)" -ForegroundColor Cyan
Write-Host ""
Write-Host "You can run tests immediately!" -ForegroundColor Yellow
