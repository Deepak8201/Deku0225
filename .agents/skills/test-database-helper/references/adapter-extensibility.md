# Database Adapter Extensibility

This reference describes the **adapter pattern** used to support additional database engines without changing `DatabaseHelper` core logic.

## `DatabaseAdapter` and `DatabaseAdapterRegistry`

- **`DatabaseAdapter`**: interface implemented per engine (`connect`, `executeQuery`, `getInsertedId`, `close`, etc., per your project’s `DatabaseAdapters.ts`).
- **`DatabaseAdapterRegistry`**: registry that maps a **type string** (matching `DB.type` in config) to an adapter instance. `DatabaseHelper` resolves the adapter by type when creating connections.

Imports must use the configured base path:

```typescript
import { DatabaseAdapter, DatabaseAdapterRegistry, QueryResult } from '{config.importBasePath}/DatabaseAdapters';
import type { DatabaseSettings } from '{config.importBasePath}/types';
```

## Adding a Custom DB Type (Pattern)

1. Implement `DatabaseAdapter` for the new engine.
2. Call `DatabaseAdapterRegistry.register('<type>', new YourAdapter())` once at startup or module init (where your framework registers defaults).
3. Set `"type": "<type>"` under `connections[].DB` in the environment configuration.

## SQLite Adapter Example (Illustrative)

Below is a **minimal sketch**; align method signatures with your actual `DatabaseAdapter` and `QueryResult` types.

```typescript
import { DatabaseAdapter, DatabaseAdapterRegistry, QueryResult } from '{config.importBasePath}/DatabaseAdapters';
import type { DatabaseSettings } from '{config.importBasePath}/types';

class SQLiteAdapter implements DatabaseAdapter {
  readonly type = 'sqlite';

  async connect(dbSettings: DatabaseSettings): Promise<unknown> {
    const sqlite = await import('better-sqlite3');
    return new sqlite.default(dbSettings.database);
  }

  async executeQuery(connection: unknown, query: string, params: unknown[]): Promise<QueryResult> {
    // Implement: run query, map rows to QueryResult
    throw new Error('Implement executeQuery for SQLite');
  }

  getInsertedId(result: QueryResult): number | string | null {
    return result.insertId ?? null;
  }

  async close(connection: unknown): Promise<void> {
    (connection as { close?: () => void })?.close?.();
  }
}

DatabaseAdapterRegistry.register('sqlite', new SQLiteAdapter());
```

## Registration

```typescript
DatabaseAdapterRegistry.register('sqlite', new SQLiteAdapter());
```

The string `'sqlite'` must match the `DB.type` value in configuration.

## Business Layer Usage of `DatabaseHelper`

**Correct:** Business class imports `DatabaseHelper` and exposes intent-focused methods.

```typescript
// tests/Business/CustomerWorkflow.ts
import { DatabaseHelper } from '{config.importBasePath}/DatabaseHelper';
import { TestLogger } from '{config.importBasePath}/TestLogger';
import { AIPage } from '{config.importBasePath}/AIPage';

export class CustomerWorkflow extends AIPage {
  async verifyCustomerInDatabase(customerId: string): Promise<boolean> {
    return await TestLogger.businessStep(`Verify customer in DB: ${customerId}`, async () => {
      const result = await DatabaseHelper.executeQuery(
        'SELECT * FROM customers WHERE id = ?',
        [customerId]
      );
      return result.rows.length > 0;
    });
  }
}
```

## Test Scenario: Orchestration vs Direct DB

**Acceptable in scenario (typical):** call Business methods; close connections in `finally` if your project standard places teardown here.

```typescript
// tests/TestScenario/CustomerCreationTest.test.ts
import { DatabaseHelper } from '{config.importBasePath}/DatabaseHelper';
import { CustomerWorkflow } from 'tests/Business/CustomerWorkflow';

test('Create customer and verify in database', async ({ page }) => {
  const customerWorkflow = new CustomerWorkflow(page);
  try {
    const exists = await customerWorkflow.verifyCustomerInDatabase(customerId);
    expect(exists).toBe(true);
  } finally {
    await DatabaseHelper.closeAllConnections();
  }
});
```

## Correct vs Incorrect Patterns

| Pattern | Verdict |
| --- | --- |
| `DatabaseHelper.executeQuery` inside **Business** workflow methods | ✅ Correct |
| Scenario calls `customerWorkflow.verifyCustomerInDatabase(...)` | ✅ Correct |
| Scenario calls `DatabaseHelper.executeQuery('INSERT ...')` directly | ❌ Incorrect (wrong layer) |
| Raw SQL built with `${userInput}` | ❌ Incorrect (unsafe) |

Keep **all** `executeQuery` / `executeInsert` usage behind Business APIs unless your project’s rules explicitly allow an exception.
