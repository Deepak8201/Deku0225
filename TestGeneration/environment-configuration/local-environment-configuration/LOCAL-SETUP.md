# Local Environment Setup

Guide for setting up environment configuration for local test execution.

---

## How It Works

```
environment-configuration/environment-configuration-template-<name>.json   (in git — no real values)
  +
local-environment-configuration/env-<name>.yaml  (local only — real values, gitignored)
  ↓
setEnvironmentScript.ps1  (replaces ${PLACEHOLDERS} with yaml values)
  ↓
local-environment-configuration/environment-configuration.json  (generated, gitignored — read by SettingsHelper)
```

Real credentials never enter the git repository. Only templates with `${PLACEHOLDER}` syntax are committed.

---

## Step 1 — Choose or create a template file

Templates are JSON files in `environment-configuration/` named `environment-configuration-template-<name>.json`.
Use `${PLACEHOLDER}` for every value that differs between environments. Commit template files to git.

```json
{
  "systems": [
    {
      "my-app": {
        "connections": [
          {
            "HTTP": {
              "url": "${MY_APP_URL}",
              "startPage": "/app",
              "username": "${MY_APP_USERNAME}",
              "password": "${MY_APP_PASSWORD}"
            }
          }
        ]
      }
    }
  ]
}
```

## Step 2 — Create your yaml file

Create `env-<yourenv>.yaml` in this folder with real values for each placeholder. This file is gitignored — never committed.

```yaml
MY_APP_URL: "https://my-app.example.com"
MY_APP_USERNAME: "system-username"
MY_APP_PASSWORD: "system-password"
```

## Step 3 — Run the script

```powershell
.\environment-configuration\setEnvironmentScript.ps1 -TemplateFile "environment-configuration-template-<name>.json" -EnvFile "env-<yourenv>.yaml"
```

The script will:
1. Read the template file
2. Read `env-<yourenv>.yaml`
3. Replace all `${PLACEHOLDER}` values
4. Write the result to `local-environment-configuration/environment-configuration.json` — the file `SettingsHelper` actually reads
5. Set `ATP_ENVGENE_CONFIGURATION` to the exact same JSON, as a deprecated backward-compat fallback

The script succeeds only when **both** the file was written and the variable was set. The file always wins over the variable, so editing the variable by hand has no effect while the file exists.

## Step 4 — Run tests

`SettingsHelper` will automatically pick up `local-environment-configuration/environment-configuration.json`. Run Playwright tests normally.

---

## Script Parameters

| Parameter | Default | Description |
|-----------|---------|-------------|
| `-TemplateFile` | `"environment-configuration-template.json"` | Template filename inside `environment-configuration/`. |
| `-EnvFile` | `"env.yaml"` | Yaml filename inside `local-environment-configuration/`. |

### Examples

```powershell
# NDO environment
.\environment-configuration\setEnvironmentScript.ps1 -TemplateFile "environment-configuration-template-ndo.json" -EnvFile "env-ndo.yaml"

# Default template + default env.yaml
.\environment-configuration\setEnvironmentScript.ps1
```

---

## Files in This Folder

| File | In git | Description |
|------|--------|-------------|
| `env-example.yaml` | Yes | Example yaml — copy to create your own |
| `LOCAL-SETUP.md` | Yes | This guide |
| `env-*.yaml` | **No** | Your local env files with real credentials |
| `environment-configuration.json` | **No** | Generated output — read by SettingsHelper |
