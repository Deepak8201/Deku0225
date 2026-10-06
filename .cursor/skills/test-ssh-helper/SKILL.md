---
name: test-ssh-helper
description: SSHHelper usage for non-interactive remote shell execution in tests - core API, settings resolved from the environment configuration, command-injection safety, layering rules, and log redaction. Use when a test runs remote commands or inspects remote files, or when choosing between shell execution and a database query.
---

# Test SSH Helper

Use **SSHHelper** for safe, non-interactive remote shell execution in automated tests. This skill describes the core API, configuration, command safety, layering rules, and logging/redaction.

## ⚠️ SSH vs Database Operations - Critical Boundary

**SSHHelper is for FILE SYSTEM operations ONLY. NEVER use it for database queries.**

### Correct Tool Selection

| Task | Correct Tool | Example |
|------|-------------|---------|
| Read remote file | ✅ **SSHHelper** | `SSHHelper.executeRemoteCommand('SYS', 'cat /app/config.properties')` |
| Execute database query | ✅ **DatabaseHelper** | `DatabaseHelper.executeQuery('SELECT * FROM users', [], 'SYS')` |
| Check remote service status | ✅ **SSHHelper** | `SSHHelper.executeRemoteCommand('SYS', 'systemctl status myapp')` |
| Get configuration value | ✅ **SettingsHelper** | `SettingsHelper.getEnvParam('SYS', 'HTTP', 'baseUrl')` |
| List remote files | ✅ **SSHHelper** | `SSHHelper.executeRemoteCommand('SYS', 'ls -la /app/logs')` |
| Run SQL query | ✅ **DatabaseHelper** | `DatabaseHelper.executeQuery('INSERT INTO logs VALUES (?)', [data], 'SYS')` |

### ❌ NEVER Do This

```typescript
// ❌ WRONG - Executing SQL via SSH command
await SSHHelper.executeRemoteCommand('SYS', 'mysql -e "SELECT * FROM users"');
await SSHHelper.executeRemoteCommand('SYS', 'psql -c "SELECT * FROM users"');
await SSHHelper.executeRemoteCommand('SYS', 'sqlplus user/pass@db @query.sql');

// ✅ CORRECT - Use DatabaseHelper
await DatabaseHelper.executeQuery('SELECT * FROM users', [], 'SYS');
```

**Why?**

- DatabaseHelper manages connection pooling, bind parameters, error handling, and type mapping
- SSH execution of SQL bypasses all safety mechanisms
- Results from CLI tools are plain text (no type safety)
- Credentials should flow through SettingsHelper → DatabaseHelper, not be embedded in shell commands
- SQL injection protection requires parameterized queries, not string concatenation in shell

### Decision Tree

```
Need data from remote system?
├─ Data in FILE? → SSHHelper (cat, grep, awk, cut, tail, head)
├─ Data in DATABASE? → DatabaseHelper (SELECT, INSERT, UPDATE, DELETE)
└─ Data in CONFIGURATION? → SettingsHelper (getEnvParam, getBaseUrl, getSSHSettings)
```

### When to Use SSHHelper

- Reading configuration files (`cat`, `grep`)
- Checking service status (`systemctl`, `ps`, `service`)
- File system operations (`ls`, `find`, `tail`, `head`)
- Running shell scripts (`bash`, `sh`)
- Process management (`kill`, `pkill`)
- System information (`uname`, `df`, `free`)

### When to Use DatabaseHelper

- ANY SQL query (SELECT, INSERT, UPDATE, DELETE)
- Database operations requiring transactions
- Parameterized queries with bind variables
- Database-specific functions (even via SQL)

## When to Use This Skill

The agent should read this skill whenever a test or workflow needs **remote shell operations** via SSH: running commands on remote hosts, verifying remote file state, restarting services, or any scenario where the test description or investigation log mentions SSH, remote shell, or server-side commands.

If the scenario is UI-only or API-only with no remote shell surface, this skill is optional.

## Source Locations (project-relative)

- `{config.importBasePath}/SSHHelper.ts` — main helper (static methods, composite transport)
- `{config.importBasePath}/types.ts` — `SSHSettings` interface

## Configuration: environment configuration

SSH settings load from the generated **`environment-configuration.json`** via `SettingsHelper.getSSHSettings`, which resolves the pipeline file, then the local file, then the deprecated `ATP_ENVGENE_CONFIGURATION` variable as a fallback. See [test-standards/references/settings-helper.md](../../../apm_modules/test-generation/.apm/skills/test-standards/references/settings-helper.md).

**Shape (conceptual):**

```json
{
  "systems": [{
    "systemName": {
      "connections": [{
        "SSH": {
          "ssh_host": "remote-host.example.com",
          "ssh_login": "automation_user",
          "ssh_password": "secret",
          "ssh_working_dir": "/opt/app",
          "ssh_port": 22,
          "strictHostKeyChecking": false,
          "commandTimeoutMs": 120000,
          "connectTimeoutSeconds": 30
        }
      }]
    }
  }]
}
```

**Key points:**

- Connection type for SSH is **`SSH`** (default; a custom `connectionType` can be passed as the fourth argument to `executeRemoteCommand`).
- **`systemName`** is required (e.g. `'TOMS'`, `'backend-server'`).
- Path in config: `systems[].{systemName}.connections[].SSH.{parameter}`.

**Parameter aliases** (first match wins):

| Canonical | Alternative |
| --- | --- |
| `ssh_host` | `host` |
| `ssh_login` | `username` |
| `ssh_password` | `password` |
| `ssh_key` | `identityFilePath` |
| `ssh_working_dir` | `workingDirectory` |
| `ssh_port` | `port` |

Optional fields: `strictHostKeyChecking`, `commandTimeoutMs`, `connectTimeoutSeconds`, `sshBinary`, `sshpassBinary`.

## Core Methods

| Method | Purpose |
| --- | --- |
| `SSHHelper.executeRemoteCommand(systemName, remoteCommand, options?, connectionType?)` | Run a remote shell command; returns stdout. Throws on non-zero exit. |
| `SSHHelper.getSSHSettings(systemName, connectionType?)` | Retrieve resolved `SSHSettings` from config (throws if not found). |
| `SSHHelper.quoteRemoteShellArg(value)` | Single-quote a value for safe interpolation into a POSIX remote command. |
| `SSHHelper.assertSafeRemoteCommandSegment(value, label)` | Throws if the segment contains characters outside the allowlist (`[a-zA-Z0-9._/-]`). |
| `SSHHelper.joinRemoteWorkingDirPath(base, relative)` | Join `workingDirectory` base with a relative path segment. |

**Examples:**

```typescript
const output = await SSHHelper.executeRemoteCommand(
  'TOMS',
  'ls -la /opt/app/logs'
);

const settings = SSHHelper.getSSHSettings('TOMS');
const logPath = SSHHelper.joinRemoteWorkingDirPath(settings.workingDirectory!, 'logs/app.log');
const safeFilename = SSHHelper.quoteRemoteShellArg(userProvidedName);
const result = await SSHHelper.executeRemoteCommand(
  'TOMS',
  `cat ${SSHHelper.joinRemoteWorkingDirPath(settings.workingDirectory!, 'data')}/${safeFilename}`
);
```

## Transport Selection

SSHHelper uses a **composite transport** internally:

- **Password + no identity file** -- `ssh2` (pure JS; works on Windows and Linux without `sshpass`)
- **Key-based or explicit override** -- OpenSSH CLI (`ssh`), with optional `sshpass` when password-only

Callers do not choose the transport; it is resolved automatically from `SSHSettings`.

## Layered Architecture

Follow: **Test Scenario -> Business -> Page Objects**.

- **SSHHelper calls belong in the Business layer only** (`tests/Business/` or equivalent).
- **Test Scenario** must call Business methods, not `SSHHelper` directly.

Wrap SSH work in `TestLogger.businessStep()` inside Business classes.

**Layer rules (summary):**

| Layer | SSHHelper `executeRemoteCommand` | Typical usage |
| --- | --- | --- |
| Business (`tests/Business/`) | Yes | Domain SSH operations |
| Test Scenario | No (call workflow methods) | Orchestration only |

**Business Workflow structure:**

```typescript
import { SSHHelper } from '{config.importBasePath}/SSHHelper';
import { TestLogger } from '{config.importBasePath}/TestLogger';
import { AIPage } from '{config.importBasePath}/AIPage';
import { Page } from '@playwright/test';

export class ServerWorkflow extends AIPage {
  constructor(page: Page) {
    super(page, 'ServerWorkflow');
  }

  async checkServiceStatus(systemName: string, serviceName: string): Promise<string> {
    SSHHelper.assertSafeRemoteCommandSegment(serviceName, 'serviceName');
    return await TestLogger.businessStep(`Check service status: ${serviceName}`, async () => {
      return await SSHHelper.executeRemoteCommand(
        systemName,
        `systemctl status ${serviceName}`
      );
    });
  }

  async getRemoteFileContent(systemName: string, relativePath: string): Promise<string> {
    SSHHelper.assertSafeRemoteCommandSegment(relativePath, 'relativePath');
    const settings = SSHHelper.getSSHSettings(systemName);
    const fullPath = SSHHelper.joinRemoteWorkingDirPath(settings.workingDirectory!, relativePath);
    return await TestLogger.businessStep(`Read remote file: ${relativePath}`, async () => {
      return await SSHHelper.executeRemoteCommand(systemName, `cat ${fullPath}`);
    });
  }
}
```

**Test Scenario (orchestration only):**

```typescript
import { ServerWorkflow } from 'tests/Business/ServerWorkflow';

test('Verify service is running after deployment', async ({ page }) => {
  const serverWorkflow = new ServerWorkflow(page);
  await TestLogger.testStep('Check backend service', async () => {
    const status = await serverWorkflow.checkServiceStatus('TOMS', 'my-backend');
    expect(status).toContain('active (running)');
  });
});
```

## Command Safety

`remoteCommand` is an **opaque shell string** with no parameterized API like SQL placeholders. You must sanitize dynamic segments explicitly.

### Mandatory

- Interpolate dynamic segments with **`SSHHelper.quoteRemoteShellArg(value)`** (single-quotes the value with proper escaping).
- Validate constrained segments (file names, service names, paths) with **`SSHHelper.assertSafeRemoteCommandSegment(value, label)`** before building commands.

### Prohibited

- Building remote commands from untrusted input without validation and quoting.
- Putting secrets (tokens, passwords) inside the `remoteCommand` string without using `redactCommand: true`.

**Correct:**

```typescript
const safeName = SSHHelper.quoteRemoteShellArg(userInput);
await SSHHelper.executeRemoteCommand('TOMS', `grep ${safeName} /var/log/app.log`);
```

**Incorrect:**

```typescript
// Command injection risk
await SSHHelper.executeRemoteCommand('TOMS', `grep ${userInput} /var/log/app.log`);
```

## Logging and Redaction

SSHHelper uses **`TestLogger.pageStep`** internally with a truncated command summary, and **`TestLogger.info`** for the full `ssh user@host: command` line.

- Use **`redactCommand: true`** in options when the command line could expose tokens or secrets.
- Passwords from settings are never logged; secrets **inside** `remoteCommand` are logged unless redacted.

```typescript
await SSHHelper.executeRemoteCommand(
  'TOMS',
  `curl -H "Authorization: Bearer ${token}" http://localhost:8080/api/health`,
  { redactCommand: true }
);
```

## Timeouts and Errors

- Default command timeout: **120,000 ms** (overridden by `commandTimeoutMs` in settings or `timeoutMs` in options).
- Default connect timeout: **30 seconds** (overridden by `connectTimeoutSeconds` in settings).
- Non-zero remote exit code **throws** an error with stderr/stdout detail.
- Business workflows may catch and rethrow with clear domain-level error messages.

## Transport and Trust

- **`strictHostKeyChecking: false`** weakens MITM protection; use only for disposable lab hosts.
- Prefer **key-based** auth when practical.

## Security Requirements (Summary)

- **Never** hardcode SSH hosts, usernames, passwords, private key paths, or any SSH configuration in test or business source.
- **Always** resolve SSH configuration through **SettingsHelper**, backed by the generated `environment-configuration.json`.
- Do not put secrets inside `remoteCommand` — if unavoidable, use `redactCommand: true`.

## Imports (Critical)

All imports for shared runtime types and helpers MUST use the module **`importBasePath`** from config. Use the placeholder:

`{config.importBasePath}`

**Never** use legacy paths such as `Engine/Shared/...` in generated or skill examples.

```typescript
import { SSHHelper } from '{config.importBasePath}/SSHHelper';
import { SettingsHelper } from '{config.importBasePath}/SettingsHelper';
import { TestLogger } from '{config.importBasePath}/TestLogger';
import type { SSHSettings } from '{config.importBasePath}/types';
```

## Multiple Systems

When a test hits more than one configured SSH system, pass the correct **`systemName`** on each call (first argument) so the helper picks the right `SSH` block from the environment configuration. A custom `connectionType` (fourth argument) can be used when the connection block is named differently.

## Coordination With Other Skills

| Skill | Relationship |
| --- | --- |
| `test-architecture` | UI layers remain **Test -> Business -> Page Object -> AIElement**; SSH adds **Business -> SSHHelper** for server-side steps. |
| `test-standards` | Shared rules for **SettingsHelper**, environment safety, and logging apply to SSH usage. |
| `test-api-integration` | API and SSH may coexist in the same workflow when a test verifies server state alongside API calls. |
| `test-database-helper` | DB and SSH may coexist when a test needs both database queries and remote shell verification. |
| `test-tagging-standards` | SSH-involving tests still use **`TagHelper.taggedTest`**. |

## Generation Checklist (Agent)

Before finishing SSH-related generated code, confirm:

1. No **`SSHHelper`** import in test scenario files.
2. All **`{config.importBasePath}`** imports match the passed module config (no `Engine/Shared`).
3. SSH configuration uses **`SettingsHelper.getSSHSettings`** with correct system names.
4. Dynamic command segments use **`quoteRemoteShellArg`** or **`assertSafeRemoteCommandSegment`**.
5. Sensitive commands use **`redactCommand: true`**.
6. Business workflows wrap SSH calls in **`TestLogger.businessStep`**.

## Quick Checklist

- [ ] SSH config present in the environment configuration with `SSH` connection and `systemName`.
- [ ] SSH operations implemented in Business layer; scenario orchestrates.
- [ ] Dynamic command segments quoted with `quoteRemoteShellArg` or validated with `assertSafeRemoteCommandSegment`.
- [ ] No hardcoded hosts, passwords, or key paths in source.
- [ ] `redactCommand: true` used when command contains sensitive data.
- [ ] Imports use `{config.importBasePath}/SSHHelper`.
