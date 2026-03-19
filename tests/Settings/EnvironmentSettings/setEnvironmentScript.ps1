# Run command in powershell: .\tests\Settings\EnvironmentSettings\setEnvironmentScript.ps1

# 1. Read JSON configuration from file
$jsonFilePath = Join-Path $PSScriptRoot "envTemplateExample.json"

if (-not (Test-Path $jsonFilePath)) {
    Write-Host "[ERROR] JSON file not found at: $jsonFilePath" -ForegroundColor Red
    exit 1
}

$jsonContent = Get-Content $jsonFilePath -Raw | ConvertFrom-Json | ConvertTo-Json -Compress -Depth 100

# 2. Set env var (User scope)
[Environment]::SetEnvironmentVariable(
  "ATP_ENVGENE_CONFIGURATION",
  $jsonContent,
  "User"
)

# 3. Verify env var was set correctly
$env:ATP_ENVGENE_CONFIGURATION = [Environment]::GetEnvironmentVariable("ATP_ENVGENE_CONFIGURATION", "User")

if ($null -eq $env:ATP_ENVGENE_CONFIGURATION -or $env:ATP_ENVGENE_CONFIGURATION -eq "") {
    Write-Host "[ERROR] Environment variable is not set" -ForegroundColor Red
    exit 1
}

if ($jsonContent -eq $env:ATP_ENVGENE_CONFIGURATION) {
    $systemCount = ($env:ATP_ENVGENE_CONFIGURATION | ConvertFrom-Json).systems.Count
    Write-Host "[SUCCESS] Environment variable set correctly - $systemCount systems configured" -ForegroundColor Green
    Write-Host "`nATP_ENVGENE_CONFIGURATION content:" -ForegroundColor Cyan
    Write-Host $env:ATP_ENVGENE_CONFIGURATION -ForegroundColor Gray
} else {
    Write-Host "[ERROR] Environment variable content mismatch" -ForegroundColor Red
    exit 1
}