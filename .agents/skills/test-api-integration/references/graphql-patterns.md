# GraphQL Patterns

Using **`APIHelper.executeGraphQLQuery()`** (and **`executeGraphQLMutation()`**) from **business workflows**, with variables, error handling, and verification-style workflows. Imports use `{config.importBasePath}`.

## Executing a GraphQL Query

### Method signature (conceptual)

`executeGraphQLQuery<T>(endpoint, query, variables?, operationName?, bearerToken?)`

- **`endpoint`** — full GraphQL HTTP URL (base from `SettingsHelper.getAPIConfiguration(apiSystemName).url` + path if needed)
- **`query`** — query string
- **`variables`** — optional object mapped to GraphQL variables
- **`operationName`** — optional; helps logs and some gateways
- **`bearerToken`** — optional override; otherwise uses token from **`getOAuthToken`**

### Prerequisites

1. `await api.initialize()`
2. Obtain bearer token (usually `getOAuthToken` via **`getOAuthConfig`**)
3. Compose **`endpoint`** from **`getAPIConfiguration`**

```typescript
import { APIHelper } from '{config.importBasePath}/APIHelper';
import { SettingsHelper } from '{config.importBasePath}/SettingsHelper';
import { TestLogger } from '{config.importBasePath}/TestLogger';

const api = new APIHelper();
await api.initialize();
const oauth = SettingsHelper.getOAuthConfig('public-gateway');
await api.getOAuthToken(
  oauth.tokenEndpoint,
  oauth.clientId!,
  oauth.clientSecret!,
  oauth.scope ?? ''
);
const { url } = SettingsHelper.getAPIConfiguration('my-api-system');
const endpoint = `${url}graphql`;
```

## Query with Variables

```typescript
const query = `
  query GetUser($id: ID!) {
    user(id: $id) {
      id
      email
      displayName
    }
  }
`;

type UserData = { user: { id: string; email: string; displayName: string } };

const response = await TestLogger.businessStep('Fetch user via GraphQL', async () => {
  return await api.executeGraphQLQuery<UserData>(endpoint, query, { id: userId }, 'GetUser');
});
```

## Response and Error Handling

**APIHelper** returns **`GraphQLResponse<T>`** with:

- **`data`** — typed payload when successful
- **`errors`** — array of GraphQL errors (message, locations, path)

HTTP 200 can still include **`errors`**. Always validate before asserting on **`data`**.

```typescript
if (response.errors && response.errors.length > 0) {
  const messages = response.errors.map((e) => e.message).join('; ');
  throw new Error(`GraphQL errors: ${messages}`);
}
if (!response.data) {
  throw new Error('GraphQL response missing data');
}
// Safe to use response.data
```

Combine with domain checks:

```typescript
const email = response.data.user.email;
if (!email?.includes('@')) {
  throw new Error(`Unexpected email format: ${email}`);
}
```

## DataVerificationWorkflow Example

A business workflow focused on **read-only** GraphQL checks (e.g. after a UI or REST action):

```typescript
import { APIHelper } from '{config.importBasePath}/APIHelper';
import { SettingsHelper } from '{config.importBasePath}/SettingsHelper';
import { TestLogger } from '{config.importBasePath}/TestLogger';

export class DataVerificationWorkflow {
  private api: APIHelper | null = null;
  private isInitialized = false;

  constructor(
    private readonly apiSystemName: string,
    private readonly authSystemName: string
  ) {}

  async initialize(): Promise<void> {
    this.api = new APIHelper();
    await this.api.initialize();
    const oauth = SettingsHelper.getOAuthConfig(this.authSystemName);
    await this.api.getOAuthToken(
      oauth.tokenEndpoint,
      oauth.clientId!,
      oauth.clientSecret!,
      oauth.scope ?? ''
    );
    this.isInitialized = true;
  }

  async verifyUserEmail(userId: string, expectedEmail: string): Promise<void> {
    if (!this.isInitialized) await this.initialize();
    const { url } = SettingsHelper.getAPIConfiguration(this.apiSystemName);
    const endpoint = `${url}graphql`;

    const query = `query ($id: ID!) { user(id: $id) { email } }`;
    const res = await TestLogger.businessStep('Verify user email via GraphQL', async () => {
      return await this.api!.executeGraphQLQuery<{ user: { email: string } }>(
        endpoint,
        query,
        { id: userId },
        'VerifyUserEmail'
      );
    });

    if (res.errors?.length) {
      throw new Error(res.errors.map((e) => e.message).join('; '));
    }
    if (!res.data?.user || res.data.user.email !== expectedEmail) {
      throw new Error(`Email mismatch: expected ${expectedEmail}, got ${res.data?.user?.email}`);
    }
  }

  async cleanup(): Promise<void> {
    if (this.api) {
      await this.api.dispose();
      this.api = null;
    }
    this.isInitialized = false;
  }
}
```

## GraphQL Verification from a Test Scenario

Tests call the workflow only:

```typescript
import { test } from '@playwright/test';
import { DataVerificationWorkflow } from '../business/DataVerificationWorkflow';
import { TagHelper } from '{config.importBasePath}/TagHelper';

TagHelper.taggedTest(test, 'GQL-VERIFY-001', async () => {
  const verify = new DataVerificationWorkflow('my-api-system', 'public-gateway');
  await test.step('Verify backend state', async () => {
    await verify.initialize();
    await verify.verifyUserEmail('user-123', 'expected@example.com');
  });
  await verify.cleanup();
});
```

## Mutations

Use **`executeGraphQLMutation`** when you want mutation-oriented logging; it delegates to the same execution path as queries.

```typescript
const mutation = `mutation ($input: CreateItemInput!) { createItem(input: $input) { id } }`;
const res = await api.executeGraphQLMutation<{ createItem: { id: string } }>(
  endpoint,
  mutation,
  { input: { name: 'item' } },
  'CreateItem'
);
```

Apply the same **`errors` / `data`** checks as for queries.

## Imports

```typescript
import { APIHelper } from '{config.importBasePath}/APIHelper';
import { SettingsHelper } from '{config.importBasePath}/SettingsHelper';
import { TestLogger } from '{config.importBasePath}/TestLogger';
```

Never use `Engine/Shared/...` in generated examples.
