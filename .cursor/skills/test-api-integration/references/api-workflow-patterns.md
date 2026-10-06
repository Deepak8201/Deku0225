# API Workflow Patterns

Canonical code shapes for **API test scenarios** and **domain business workflows** built on `APIHelper` via the shared **`ApiSession`** primitive. Imports use `{config.importBasePath}` — replace with the resolved alias from module config.

Core rules (enforced by `SKILL.md`):

- The **test scenario** owns one **`ApiSession`** (create → inject → `dispose()` in `finally`). It imports `ApiSession`, **never** `APIHelper`, and issues **no** HTTP itself.
- **Domain workflows** receive `session.api` + `session.baseUrl` by **constructor injection**. No lifecycle, no auth, no `initialize`/`cleanup` on the workflow.
- **Split by resource-domain** — one focused workflow per API domain; the scenario composes them and threads ids/mkeys between calls.
- Workflows do **not** import a test-specific `TestData` class; response `interface`s and a private `assert…Success` helper are **local** to each workflow file.

---

## 1. `ApiSession` lifecycle (owned by the scenario)

`ApiSession.create(systemName, auth?)` performs the invariant bootstrap: `new APIHelper()` → `initialize()` → resolve base URL → authenticate. Auth is pluggable:

```typescript
await ApiSession.create('public-gateway');                          // default: password grant
await ApiSession.create('my-api', { kind: 'clientCredentials' });    // OAuth client credentials
await ApiSession.create('tbapi',  { kind: 'none' });                 // public / custom-header API
await ApiSession.create('legacy', {                                  // non-standard auth
  kind: 'custom',
  authenticate: async (api, baseUrl) => { /* multi-step login, cookies, ... */ },
});
```

## 2. Domain workflow — constructor injection

```typescript
import { APIHelper } from '{config.importBasePath}/APIHelper';
import { TestLogger } from '{config.importBasePath}/TestLogger';

// Response types are LOCAL to this workflow file.
interface CityCreateResult {
  cityId: string;
  cityMkey: string;
}

export class LocationWorkflow {
  constructor(
    private readonly api: APIHelper,
    private readonly baseUrl: string,
  ) {}

  async createCity(cityName: string, stateName: string): Promise<CityCreateResult> {
    return TestLogger.businessStep(`Create or resolve city ${cityName}`, async () => {
      const countryId = await this.resolveCountryStateCity(stateName);
      const created = await this.api.post<{ actionReport: unknown; id: string; mkey: string }>(
        `${this.baseUrl}/location-manager/cities`,
        { name: cityName, country: countryId },
      );
      this.assertActionReportSuccess(created.actionReport, 'create city');
      return { cityId: created.id, cityMkey: created.mkey };
    });
  }

  // --- private helpers (resolution, traversal, body builders) ---
  private async resolveCountryStateCity(stateName: string): Promise<string> {
    const resp = await this.api.get<{ country: { children: Array<{ name: string; id: string }> } }>(
      `${this.baseUrl}/location-manager/countries/US`,
    );
    const state = resp.country.children.find((c) => c.name === stateName);
    if (!state) throw new Error(`State not found: ${stateName}`);
    return state.id;
  }

  // Infra check — duplicated privately per workflow file, NOT a shared utility class.
  private assertActionReportSuccess(actionReport: unknown, context: string): void {
    const report = actionReport as { status?: string } | undefined;
    if (report?.status && report.status !== 'SUCCESS') {
      throw new Error(`Action report failed for ${context}: ${report.status}`);
    }
  }
}
```

## 3. Test scenario — composes multiple domain workflows

The scenario owns the session, creates the domain workflows, and threads returned ids/mkeys between them. No HTTP, no `APIHelper` import.

```typescript
import { ApiSession } from '{config.importBasePath}/ApiSession';
import { TagHelper } from '{config.importBasePath}/TagHelper';
import { TestLogger } from '{config.importBasePath}/TestLogger';
import { LocationWorkflow } from '../Business/LocationWorkflow';
import { NetworkInventoryWorkflow } from '../Business/NetworkInventoryWorkflow';

const TEST_ID = 'TC_XXX_v001_NetworkBuild';
const SYSTEM_NAME = 'public-gateway';

TagHelper.taggedTest(TEST_ID, async () => {
  TestLogger.reset();

  const session = await TestLogger.testStep('Initialize API session', async () =>
    ApiSession.create(SYSTEM_NAME),
  );

  try {
    const location = new LocationWorkflow(session.api, session.baseUrl);
    const inventory = new NetworkInventoryWorkflow(session.api, session.baseUrl);

    const city = await TestLogger.testStep('Create city', async () =>
      location.createCity('Montpelier', 'Vermont'),
    );

    // Explicit data flow: city.* is passed by the SCENARIO into the next workflow.
    const bng = await TestLogger.testStep('Create BNG', async () =>
      inventory.createBNG(city.cityId, city.cityMkey),
    );

    // ... further steps thread bng.* onward ...
  } finally {
    await TestLogger.testStep('Dispose API session', async () => session.dispose());
  }
});
```

## 4. Mixed scenario (`Test Type: UI + API`)

One scenario drives both surfaces: `page` for UI business workflows, injected `ApiSession` for API workflows.

```typescript
TagHelper.taggedTest(TEST_ID, async ({ page }) => {
  TestLogger.reset();
  const session = await ApiSession.create(API_SYSTEM);
  try {
    const catalogApi = new CatalogApiWorkflow(session.api, session.baseUrl);
    const checkoutUi = new CheckoutWorkflow(page); // UI: Business → Page Object → AIElement

    const sku = await catalogApi.createProduct({ name: 'Widget' }); // API seed
    await checkoutUi.buyProduct(sku);                               // UI act, using API result
  } finally {
    await session.dispose();
  }
});
```

## 5. REST CRUD via the injected `this.api`

Build the **full URL** in the business layer from `this.baseUrl` plus the resource path.

```typescript
// GET
const entity = await this.api.get<MyDto>(`${this.baseUrl}/resources/${id}`);

// POST
const created = await this.api.post<{ id: string }>(`${this.baseUrl}/resources`, { name: 'x' });

// PUT
await this.api.put(`${this.baseUrl}/resources/${id}`, { name: 'updated' });

// DELETE
await this.api.delete(`${this.baseUrl}/resources/${id}`);
```

### Notes

- **`useAuth`** defaults to `true` on REST helpers — the token obtained by `ApiSession` is reused automatically. Pass `useAuth: false` only for explicitly public endpoints.
- Prefer **typed** generics (`get<MyDto>`) for maintainability.
- **Data types matter:** send numeric body fields as numbers (no quotes); mirror the response schema/types from the descriptor exactly.
- Keep **assertions** either in the business method (domain checks) or in thin verification workflows — tests stay readable and free of HTTP details.
