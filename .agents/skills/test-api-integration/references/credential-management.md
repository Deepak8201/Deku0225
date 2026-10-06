# Credential and Configuration Management

How **OAuth 2.0** tokens, **API** endpoints, and secrets flow from environment configuration into **APIHelper** via **SettingsHelper**. All imports use `{config.importBasePath}` as the shared runtime root.

## OAuth 2.0 Token Management

### `APIHelper.getOAuthToken()`

Client-credentials flow (typical for service tests):

```typescript
import { APIHelper } from '{config.importBasePath}/APIHelper';
import { SettingsHelper } from '{config.importBasePath}/SettingsHelper';

const api = new APIHelper();
await api.initialize();
const oauth = SettingsHelper.getOAuthConfig('public-gateway');
await api.getOAuthToken(
  oauth.tokenEndpoint,
  oauth.clientId!,
  oauth.clientSecret!,
  oauth.scope ?? '',
  oauth.grantType
);
```

**Prerequisites:**

- `APIHelper.initialize()` must run first (request context).
- `tokenEndpoint`, `clientId`, `clientSecret`, and usually `scope` must be present in configuration for that auth system.

Password grant (when applicable) is available as `getOAuthTokenPasswordGrant` on **APIHelper**—still pass endpoints and credentials resolved from **SettingsHelper**, never literals.

## `SettingsHelper.getOAuthConfig(authSystemName)`

Returns an **`OAuthConfig`** built from the environment configuration:

- Resolves **`url`**, **`tokenEndpoint`**, **`grantType`** (required pieces per implementation)
- Composes full token URL: `tokenEndpoint` is typically relative; implementation joins `url + endpoint`
- Optionally includes **`clientId`**, **`clientSecret`**, **`scope`**, **`username`**, **`password`** when present in config

**Usage rule:** Pass the **identity / token issuer** system name (e.g. gateway or IdP entry in env JSON), not necessarily the same key as the REST API host.

## `SettingsHelper.getAPIConfiguration(apiSystemName)`

Returns **`APIConfiguration`** for the **API** you call after you have a token:

- **`url`** — base URL for REST/GraphQL (endpoints are appended in business code)
- **`ignoreHTTPSErrors`** — from env when configured
- **`defaultHeaders`** — typical JSON headers

**Usage rule:** Pass the **API** system name (resource server / backend). This can differ from **`authSystemName`** when OAuth is issued by a separate gateway.

## Separate Auth from API Configs

| Concern | Helper | Typical `systemName` |
|---------|--------|----------------------|
| Token endpoint, client id/secret, scope | `getOAuthConfig(authSystemName)` | IdP / `public-gateway` |
| Resource base URL | `getAPIConfiguration(apiSystemName)` | `CSRD`, `orders-api`, etc. |

Using **two names** avoids coupling one JSON block to both concerns and matches deployments where auth and API scale or route independently.

## Environment Configuration Structure (API Systems)

Configuration is read from the generated **`environment-configuration.json`** via `SettingsHelper` (pipeline file → local file → deprecated `ATP_ENVGENE_CONFIGURATION` variable as a fallback). See [test-standards/references/settings-helper.md](../../../../apm_modules/test-generation/.apm/skills/test-standards/references/settings-helper.md).

Documented shape (conceptual):

```json
{
  "systems": [
    {
      "public-gateway": {
        "connections": [
          {
            "HTTP": {
              "url": "https://auth.example.com",
              "tokenEndpoint": "/oauth/token",
              "grantType": "client_credentials",
              "clientId": "...",
              "clientSecret": "...",
              "scope": "api.read api.write"
            }
          }
        ]
      }
    },
    {
      "my-api-system": {
        "connections": [
          {
            "HTTP": {
              "url": "https://api.example.com/v1/"
            }
          }
        ]
      }
    }
  ]
}
```

Exact key names must match what **SettingsHelper** expects (`systems` array, system name as object key, `connections` array, connection type such as **`HTTP`**).

For parameters not covered by typed helpers, use:

- `SettingsHelper.getEnvParam(systemName, connectionType, paramName)`
- `SettingsHelper.getEnvParamOrNull(...)` when optional

## Security Requirements

- **No hardcoded URLs** for auth or APIs in test/business code—always **`SettingsHelper`** (or approved project wrapper).
- **No hardcoded credentials**—client secrets, passwords, and private keys belong only in secure env / secret stores, referenced through configuration.
- **No duplicated endpoint definitions**—single source in the environment configuration per environment.
- Do not log secrets; log system names and operation names at **businessStep** / **testStep** only.

## Imports

```typescript
import { SettingsHelper } from '{config.importBasePath}/SettingsHelper';
```

Do not use legacy paths like `Engine/Shared/SettingsHelper` in generated code.
