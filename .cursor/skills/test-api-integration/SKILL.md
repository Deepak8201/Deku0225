---
name: test-api-integration
description: Standards for layered API tests - authorization pattern detection, OAuth 2.0 token acquisition, REST CRUD and GraphQL calls through Business Workflows and APIHelper, with endpoints and credentials taken only from SettingsHelper. Use when the test involves HTTP calls, REST, GraphQL, bearer tokens, or an API gateway.
---

# Test API Integration

Standards for layered API tests: OAuth 2.0, GraphQL, and REST CRUD through **Business Workflows** and **APIHelper**, with credentials and endpoints sourced only from **SettingsHelper** and environment configuration.

## When to Use This Skill

The agent should read this skill when the test description or investigation log involves:

- **REST** HTTP calls (CRUD, JSON APIs, microservices)
- **GraphQL** queries or mutations
- **OAuth 2.0** (client credentials, password grant, or bearer-protected APIs)
- Token acquisition, API gateways, or service-to-service authentication

If the scenario is UI-only with no HTTP/API surface, this skill is optional.

## Authorization Pattern Detection

**BEFORE generating API code**, analyze test description headers to determine auth pattern:

### Detection Decision Tree

```
1. Check test description for explicit authorization headers
   ├─ "Authorization: Bearer {token}" → OAuth flow (see OAuth section)
   ├─ "Authorization: Trusted application=..." → Custom header pattern
   ├─ "Authorization: ApiKey ..." → API key pattern
   ├─ "X-API-Key: ..." → API key header pattern
   ├─ "Cookie: session=..." → Session-based auth
   └─ No auth headers mentioned → Unauthenticated

2. If OAuth detected:
   └─ Use APIHelper.getOAuthToken() + SettingsHelper.getOAuthConfig()

3. If custom headers detected:
   └─ Pass headers to APIHelper.post/get with useAuth: false

4. ALWAYS call APIHelper.initialize() regardless of auth pattern
```

### Custom Authorization Headers

When test description specifies custom headers (not OAuth): the scenario creates the session with **no OAuth** — `ApiSession.create(systemName, { kind: 'none' })` — and the workflow attaches the custom headers per request on the **injected** `this.api`.

**Pattern** (inside a business workflow method; `this.api` is injected, already initialized by `ApiSession`):

```typescript
const customHeaders = {
  'Authorization': 'Trusted application=MyApp',
  'X-Custom-Header': 'value'
};

const response = await this.api.post(
  endpoint,
  payload,
  customHeaders,
  { useAuth: false } // Disable Bearer/OAuth for this call
);
```

**DO NOT**:

- Call `getOAuthToken()` when test description uses custom headers (create the session with `{ kind: 'none' }` or `{ kind: 'custom' }`).
- Call `initialize()` in the workflow — `ApiSession` owns the request-context lifecycle.
- Hardcode header values (use SettingsHelper for dynamic values).

**Example from test description**:

```
Request Headers:
  Authorization: Trusted application=telecom-business-api
  Content-Type: application/json
```

**Generated code**:

```typescript
const appName = SettingsHelper.getEnvParam('TBAPI', 'HTTP', 'applicationName');
const headers = {
  'Authorization': `Trusted application=${appName}`,
  'Content-Type': 'application/json'
};
const response = await this.api.post(url, payload, headers, { useAuth: false });
```

**See also**: [references/custom-auth-patterns.md](references/custom-auth-patterns.md) for detailed examples

## Layered Architecture for API (Mandatory)

Required call chain:

```
Test Scenario → Business Workflow → APIHelper
```

| Layer | Responsibility |
|-------|----------------|
| **Test Scenario** | Arrange/act/assert at scenario level; calls **only** business workflow methods |
| **Business Workflow** | Domain operations, orchestration, assertions on business outcomes; owns **APIHelper** usage |
| **APIHelper** | Low-level HTTP/GraphQL/OAuth; Playwright request context; no test assertions |

**APIHelper is mandatory** for generated API traffic: do not use raw `fetch`, ad-hoc `request.newContext()` in tests, or duplicate HTTP clients in the test layer.

### Call Hierarchy (Strict)

1. **Test Scenario** calls **ONLY** public methods on **Business Workflow** classes (plus standard harness helpers such as tagging/logging and the **`ApiSession`** lifecycle described below).
2. **Business Workflow** receives an already-authenticated **APIHelper** by constructor injection (`session.api`) and calls `get` / `post` / `put` / `patch` / `delete` / `executeGraphQLQuery` on it. It does **not** create, initialize, authenticate, or dispose the helper.
3. The **test scenario** owns the session via **`ApiSession`** (`ApiSession.create(...)` → inject → `dispose()`), but MUST NOT perform HTTP itself — no `api.get/post/put/patch/delete` or GraphQL calls in `*.test.ts`. All actual API traffic flows through Business Workflow methods.

The test scenario imports **`ApiSession`** (from SharedRuntime), **not** `APIHelper`. `ApiSession` owns the raw helper internally; the scenario never touches `APIHelper` directly.

## Core Capabilities Overview

- **OAuth 2.0** — `APIHelper.getOAuthToken()` (client credentials), optional password grant; tokens stored on the helper for subsequent calls.
- **GraphQL** — `APIHelper.executeGraphQLQuery()` / `executeGraphQLMutation()` with variables and optional `operationName`.
- **REST CRUD** — `APIHelper.get`, `post`, `put`, `patch`, `delete` with JSON bodies and optional `useAuth` for Bearer tokens.

Base URLs and paths are composed in the business layer using `SettingsHelper.getAPIConfiguration(apiSystemName)` (see references).

### Token and Request Context Lifecycle — via `ApiSession`

**Ownership rule:** the **test scenario** owns one **`ApiSession`** (a SharedRuntime primitive that wraps the APIHelper lifecycle); **business workflows receive its ready, authenticated `session.api` + `session.baseUrl` by constructor injection** and never create, initialize, or dispose the helper.

`ApiSession.create(systemName, auth?)` does the invariant work: `new APIHelper()` → `initialize()` → resolve base URL from `SettingsHelper.getAPIConfiguration` → authenticate. The variable `auth` is pluggable:

- `{ kind: 'passwordGrant' }` — Keycloak resource-owner password grant (**default**; creds from `SettingsHelper.getDefaultCredentials`).
- `{ kind: 'clientCredentials' }` — client-credentials (config from `SettingsHelper.getOAuthConfig`).
- `{ kind: 'custom', authenticate }` — escape hatch for non-standard auth (multi-step, cookie, custom headers).
- `{ kind: 'none' }` — public API.

Scenario flow:

1. `const session = await ApiSession.create(systemName);` (one session, one token, reused across all workflows).
2. Inject into each domain workflow: `new LocationWorkflow(session.api, session.baseUrl)`.
3. Business workflow methods call `this.api.get/post/...` — they hold **no** `initialize` / `cleanup` / `ensureInitialized`.
4. `await session.dispose();` in a **`finally`** block so contexts and tokens do not leak between tests or workers.

> **Superseded (legacy) pattern:** workflow (or test) constructs its own `APIHelper` and owns `initialize()` / `cleanup()`. This couples domain logic to connection management and produces multiple tokens when a scenario composes several domain workflows. Do not generate it — use `ApiSession` + injection.

### Mixed UI and API Scenarios

For a mixed `Test Type` (e.g. `UI + API`), one scenario drives both surfaces:

- UI steps follow **Page Object → AIElement** rules from `test-architecture` / `test-standards`, using the `page` argument.
- API steps go through **Business Workflow → APIHelper** via an injected **`ApiSession`**.
- The test file composes both — UI business workflows (from `page`) and API business workflows (from `session.api`/`session.baseUrl`) — threading data between UI and API steps. Never raw HTTP from the test layer.

## Failure Handling Expectations

- **REST** — `APIHelper` throws on non-OK HTTP status after logging the body; business workflows may catch, enrich the message with domain context, and rethrow.
- **GraphQL** — HTTP may succeed while **`response.errors`** is populated; business code must check **`errors`** and **`data`** before asserting (see `references/graphql-patterns.md`).
- Prefer **failing fast** with clear messages that include operation name and correlation ids if the API returns them (without logging secrets).

### Public Endpoints and `useAuth`

Some health or metadata endpoints may be anonymous. **APIHelper** REST methods accept **`useAuth: false`** to skip the Bearer header. Only use this when the contract is explicitly public; default remains authenticated calls after OAuth.

### Idempotency and Retries

Prefer **explicit** business-level retry (e.g. one retry on 429 with backoff) inside the workflow when the test description requires it. Do not blanket-retry inside tests. Document any retry policy in the workflow class comment if non-obvious.

## Security Requirements (Summary)

- **Never** hardcode URLs, token endpoints, client secrets, passwords, or API keys in test or business source.
- **Always** resolve configuration through **SettingsHelper**, backed by the generated `environment-configuration.json` (or project-equivalent env contract).
- Treat **auth system names** and **API system names** as separate configuration entries when the IdP and API host differ (see `references/credential-management.md`).

## Business Workflow Structure

A domain API workflow follows this shape:

1. **Constructor injection** — `constructor(private readonly api: APIHelper, private readonly baseUrl: string) {}`. No lifecycle, no auth here; the helper arrives ready and authenticated from the scenario.
2. **Business operations** — public methods named by domain intent (`createCity`, `createBNG`, `insertCardToDevice`) that build full URLs from `baseUrl`, then delegate to `this.api.get/post/...`. Wrap each in `TestLogger.businessStep(...)`.
3. **Private helpers** — resolution/traversal/POST-body builders and a private `assert...Success(...)` response check.

There is **no** `initialize` / `cleanup` / `isInitialized` / `ensureInitialized` on the workflow — those belong to the scenario's lifecycle (see Token and Request Context Lifecycle above).

### One workflow per resource-domain (splitting rule)

Do **not** put every API operation into a single mega-workflow. Split by **API resource-domain**, derived from the URL path segment:

- `location-manager/...` → `LocationWorkflow`
- network-element inventory (`business-operation-manager` NE ops + `consolidated-inventory-*` + `device-library`) → `NetworkInventoryWorkflow`

Rules:

- Group a domain's operations together in one workflow file; keep each focused (target: a few hundred lines, not ~1000).
- Do **not** create a separate workflow for a domain with only 1–2 methods — fold it into the closest related domain workflow.
- The **test scenario composes** multiple domain workflows (per `test-architecture` "business independence" — workflows never call each other).

### Workflow decoupling & internal helpers

- **No dependency on a test-specific TestData class.** A reusable domain workflow must not import `SomeTestCaseTestData`. Generate internal resource ids/coordinates locally (`import { randomUUID } from 'crypto'`; small private `randomLatitude()`/… helpers). The test-specific TestData class is used **only in the scenario** (run tokens, per-run values) and passed into workflow methods as plain parameters.
- **Explicit data flow, no hidden re-fetches.** A value produced by one workflow method (id, mkey, …) is returned and passed by the **scenario** into the next call. Do not silently re-resolve upstream entities inside a later method.
- **Infra helpers are duplicated privately, not shared.** Small response-envelope checks (e.g. `assertActionReportSuccess`) are duplicated as `private` in each workflow file rather than extracted into a shared utility class — this avoids cross-file reuse/lookup rules the generator would have to reason about.
- **Domain response types are local.** Declare the response `interface`s the workflow needs at the top of its own file; do not build a shared cross-domain types module.

## Logging Standards by Layer

Align with **TestLogger** (or project equivalent):

| Layer | Wrapper | Usage |
|-------|---------|--------|
| **Test Scenario** | `testStep` | High-level scenario steps visible in reports |
| **Business Workflow** | `businessStep` | Domain operations spanning one or more API calls |
| **APIHelper** (internal) | `baseStep` | Already used inside shared `APIHelper` for each HTTP/OAuth operation |

Business workflows should log domain intent at **businessStep**; avoid duplicating low-level HTTP logs in tests.

## Do's and Don'ts (Condensed)

### Do

- Keep **one** API access path: Business → APIHelper (injected via `ApiSession`).
- Separate **auth** config (`getOAuthConfig`) from **API** config (`getAPIConfiguration`) when systems differ.
- Own the session in the **scenario** via `ApiSession`: `create()` once, inject `session.api`/`session.baseUrl`, `session.dispose()` in `finally`.
- Split workflows by **resource-domain**; let the scenario compose them and thread ids/mkeys between calls.
- Assert on **business-relevant** response shapes in the business layer or via dedicated verification helpers invoked from tests.

### Don't

- Issue HTTP directly from test scenario files (`api.get/post/...` or GraphQL in `*.test.ts`).
- Import `APIHelper` in a `*.test.ts`, or give a workflow its own `initialize`/`cleanup`/construct/dispose.
- Import a **test-specific TestData class** into a domain workflow, or re-fetch upstream entities the scenario already resolved.
- Hardcode credentials, OAuth client secrets, or environment-specific URLs.
- Bypass **SettingsHelper** for anything that belongs in the environment configuration.
- Scatter raw endpoint strings across layers—centralize URL building in business methods.

## Imports (Critical)

All imports for shared runtime types and helpers MUST use the module **`importBasePath`** from config (passed by the orchestrator or read from `config.json`). Use the placeholder:

`{config.importBasePath}`

**Never** use legacy paths such as `Engine/Shared/...` in generated or skill examples.

Example (illustrative):

```typescript
import { APIHelper } from '{config.importBasePath}/APIHelper';
import { SettingsHelper } from '{config.importBasePath}/SettingsHelper';
import { TestLogger } from '{config.importBasePath}/TestLogger';
```

Adjust subpaths to match the actual layout under `importBasePath` for the target project.

## Generation Checklist (Agent)

Before finishing API-related generated code, confirm:

1. Test scenario imports **`ApiSession`**, not `APIHelper`; no direct HTTP (`api.get/post/...` / GraphQL) in `*.test.ts`.
2. All **`{config.importBasePath}`** imports match the passed module config (no `Engine/Shared`).
3. Base URLs use **`getAPIConfiguration`**; auth is chosen via the `ApiSession` `auth` mode (password grant / client credentials / custom).
4. Scenario does `ApiSession.create(...)` → injects `session.api`/`session.baseUrl` → `session.dispose()` in `finally`; workflows are injected and hold no lifecycle.
5. Workflows are split by **resource-domain**, carry no test-specific `TestData` import, and re-use no hidden upstream re-fetches.
6. GraphQL paths validate **`errors`** array when present.

## Naming and Placement

- Place API business workflows under the configured **business** folder (see module `config.paths.business`).
- Name workflows by **resource-domain** (`LocationWorkflow`, `NetworkInventoryWorkflow`), not by HTTP verb and not as one catch-all per test.
- Keep GraphQL operation strings and large payloads in **constants** or **private methods** on the workflow class to keep public methods readable.
- Scenario-side bootstrap is already centralized in the shared **`ApiSession`** primitive — reuse it (`ApiSession.create`) rather than re-implementing auth/lifecycle per test. For non-standard auth, pass `{ kind: 'custom', authenticate }` instead of hand-rolling a new factory.

## Coordination With Other Skills

| Skill | Relationship |
|-------|----------------|
| `test-architecture` | UI layers remain **Test → Business → Page Object → AIElement**; API adds **Business → APIHelper** in parallel branches of the scenario. |
| `test-standards` | Shared rules for **SettingsHelper**, environment safety, and logging. |
| `test-tagging-standards` | Non-UI (`API`/`DB`/`SSH`) tests still use **`TagHelper.taggedTest`** (or project equivalent). |

## Fixture Ownership

- Workflows that **create** data via API should expose **matching delete** methods when the API supports it, and tests should call them in **`finally`** blocks when possible.
- When deletion is impossible (event-sourced systems, retention policies), document **why** in the workflow and prefer unique identifiers (timestamp suffixes) to reduce collision.
- Avoid relying on **shared global** mutable API state unless the test description explicitly covers concurrent use; prefer isolated entities per test.

## Config Keys (Illustrative)

Exact names come from the environment configuration for your environment. Typical pattern:

- **`authSystemName`**: entry holding `tokenEndpoint`, `clientId`, `clientSecret`, `scope` (e.g. `public-gateway`).
- **`apiSystemName`**: entry holding API **`url`** (e.g. `my-api-system`).

The agent must read the real JSON or project docs—do not invent system names; reuse names already present in config or in existing workflows in the repo.

## Reference Documents

| Topic | File |
|-------|------|
| `ApiSession` lifecycle, injected domain workflows, worked + mixed examples, REST patterns | `references/api-workflow-patterns.md` |
| OAuth, SettingsHelper, env structure, security | `references/credential-management.md` |
| GraphQL queries, variables, errors, verification workflows | `references/graphql-patterns.md` |

Read the relevant reference(s) before generating or refactoring API tests.
