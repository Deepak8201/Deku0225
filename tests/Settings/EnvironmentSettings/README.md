# Environment Settings (ATP_ENVGENE_CONFIGURATION)

This folder contains configuration and scripts for the **ATP_ENVGENE_CONFIGURATION** environment variable used by the test framework (SettingsHelper, DatabaseHelper, APIHelper).

---

## Overview

**ATP_ENVGENE_CONFIGURATION** is a JSON string that defines systems and their connection settings. The framework reads it via `SettingsHelper` to resolve URLs, credentials, DB connections, SSH connections and OAuth/API settings by **system name**.

---

## Top-Level Structure

```json
{
  "systems": [
    {
      "<systemName>": {
        "connections": [
          { "<connectionType>": { ... } }
        ]
      }
    }
  ]
}
```

| Level | Key | Description |
|-------|-----|-------------|
| Root | `systems` | Array of system objects. |
| System | `<systemName>` | Unique identifier of the system (e.g. `CSRD`, `public-gateway`). |
| System | `connections` | Array of connection objects. |
| Connection | `<connectionType>` | Identifier of the connection (e.g. `HTTP`, `DB`, `SSH`). |

---

## Connection Types and Parameters

### HTTP

Used for: base URL, login credentials, API base URL, OAuth (token endpoint, client credentials, etc.).

#### System as application (UI or API)

| Parameter | Required | Description |
|-----------|----------|-------------|
| `url` | Yes | Base URL (e.g. `https://app.example.com`). |
| `username` | Yes* | Login username. *Required for UI login.* |
| `password` | Yes* | Login password. *Required for UI login / default credentials.* |
| `startPage` | No | Path appended to `url` for full app URL (e.g. `/app`, `/login`). Full URL = `url` + this path. |
| `ignoreHTTPSErrors` | No | `"true"` / `"false"` – to ignore HTTPS certificate errors for API. |

**Example:**

```json
"HTTP": {
  "url": "https://app.example.com",
  "startPage": "/app",
  "username": "login_user",
  "password": "login_password",
  "ignoreHTTPSErrors": "true"
}
```

#### System as authorization service (OAuth)

| Parameter | Required | Description |
|-----------|----------|-------------|
| `url` | Yes | Base URL of the auth server (e.g. `https://auth.example.com`). |
| `tokenEndpoint` | Yes | Path to OAuth token endpoint (e.g. `/oauth/token`). Full URL = `url` + this path. |
| `grantType` | No | OAuth grant type (e.g. `client_credentials`). |
| `clientId` | No | OAuth client ID. |
| `clientSecret` | No | OAuth client secret. |
| `scope` | No | OAuth scope (e.g. `openid profile api:read`). |
| `username` | No | OAuth username. |
| `password` | No | OAuth password. |

**Example:**

```json
"HTTP": {
  "url": "https://auth.example.com",
  "tokenEndpoint": "/oauth/token",
  "grantType": "client_credentials",
  "clientId": "client_id",
  "clientSecret": "client_secret",
  "scope": "openid profile api:read",
  "username": "username",
  "password": "password"
}
```

#### Combined (UI + API + OAuth)

One system used for UI steps, OAuth authentification and for API requests:

**Example:**

```json
"HTTP": {
  "url": "https://app.example.com",
  "startPage": "/app",
  "tokenEndpoint": "/oauth/token",
  "username": "user",
  "password": "password",
  "grantType": "client_credentials",
  "clientId": "client_id",
  "clientSecret": "client_secret",
  "scope": "openid profile api:read",
  "ignoreHTTPSErrors": "false"
}
```

---

### DB

Used for: database connection parameters.

| Parameter | Required | Description |
|-----------|----------|-------------|
| `type` | Yes | One of: `mysql`, `postgresql`, `mssql`, `mongodb`, `oracle`. |
| `host` | Yes | Database host. |
| `port` | Yes | Port. |
| `database` | Yes | Database name. |
| `username` | Yes | Database user. |
| `password` | Yes | Database password. |
| `connectionTimeout` | No | Connection timeout in ms (e.g. `10000`). |
| `queryTimeout` | No | Query timeout in ms (e.g. `30000`). |
| `ssl` | No | `"true"` / `"false"` – use SSL. |

**Example:**

```json
"DB": {
  "type": "postgresql",
  "host": "db.example.com",
  "port": 5432,
  "database": "app_db",
  "username": "db_user",
  "password": "db_password",
  "connectionTimeout": 10000,
  "queryTimeout": 30000,
  "ssl": false
}
```

---

### SSH

Used for: SSH connection parameters.

| Parameter | Required | Description |
|-----------|----------|-------------|
| `host` | Yes | SSH host. |
| `port` | Yes | SSH port. |
| `username` | Yes | SSH user. |
| `password` | Yes | SSH password. |

**Example:**

```json
"SSH": {
  "host": "host.example.com",
  "port": 22,
  "username": "ssh_user",
  "password": "ssh_password"
}
```

---

## Environment config Example

```json
{
  "systems": [
    {
      "firstSystem": {
        "connections": [
          {
            "HTTP": {
              "url": "https://app.example.com",
              "tokenEndpoint": "/auth/token",
              "username": "testuser",
              "password": "testpass",
              "tokenEndpoint": "/oauth/token",
              "clientId": "client",
              "clientSecret": "secret",
              "scope": "openid"
            }
          }
        ]
      }
    },
    {
      "secondSystem": {
        "connections": [
          {
            "HTTP": {
              "url": "https://api.example.com",
              "startPage": "/app",
              "username": "testuser",
              "password": "testpass",
            }
          },
          {
            "DB": {
              "type": "mysql",
              "host": "db.example.com",
              "port": 3306,
              "database": "mydb",
              "username": "dbuser",
              "password": "dbpass"
            }
          }
        ]
      }
    }
  ]
}
```

---

## Setting the variable locally

1. Copy `envTemplateExample.json` to your own file (e.g. `env.local.json`) and replace values with your environment configuration.
2. Update `$jsonFilePath` in the `setEnvironmentScript.ps1` script to use your JSON file. 

   ```powershell
   $jsonFilePath = Join-Path $PSScriptRoot "env.local.json"
   ```

3. Run the PowerShell script:

   ```powershell
   .\tests\Settings\EnvironmentSettings\setEnvironmentScript.ps1
   ```

---

## Pipeline / EnvGen

When tests run in the pipeline, **ATP_ENVGENE_CONFIGURATION** is typically set by **EnvGen** from the selected environment. The same JSON structure and system/connection names apply so that tests use the same system names in both local and pipeline runs.
