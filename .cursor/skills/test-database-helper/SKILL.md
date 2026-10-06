---
name: test-database-helper
description: DatabaseHelper usage in tests - query API, connection lifecycle and caching, settings resolved from the environment configuration, layering rules, and adapter extension points. Use when a test or Business Workflow reads, inserts, verifies, or cleans up database data, or when SQL must be written for a specific database type.
---

# Test Database Helper

Use **DatabaseHelper** for safe, cached database access in automated tests. This skill describes core APIs, connection lifecycle, configuration, layering, and where to extend adapters.

## When to Use This Skill

The agent should read this skill whenever a test or workflow needs **database operations** (read, insert, verify, cleanup): generating Business-layer methods, reviewing DB usage, or explaining how connections and adapters work.

## Source Locations (project-relative)

- `{config.importBasePath}/DatabaseHelper.ts` — main helper
- `{config.importBasePath}/DatabaseAdapters.ts` — adapter interface and registry

## Configuration: environment configuration

Database settings load from the generated **`environment-configuration.json`** via `SettingsHelper`, which resolves the pipeline file, then the local file, then the deprecated `ATP_ENVGENE_CONFIGURATION` variable as a fallback. See [test-standards/references/settings-helper.md](../../../apm_modules/test-generation/.apm/skills/test-standards/references/settings-helper.md).

**Shape (conceptual):**

```json
{
  "systems": [{
    "systemName": {
      "connections": [{
        "DB": {
          "type": "db_type",
          "host": "prod-db.example.com",
          "port": 3306,
          "database": "prod_db",
          "username": "prod_user",
          "password": "prod_pass",
          "connectionTimeout": 10000,
          "queryTimeout": 30000,
          "ssl": false
        }
      }]
    }
  }]
}
```

**Key points:**

- Connection type for databases is **`DB`**.
- **`systemName`** is required (for example `'CSRD'`, `'public-gateway'`).
- Path in config: `systems[].{systemName}.connections[].DB.{parameter}`.

## Supported Database Types

`mysql`, `postgresql`, `mssql`, `mongodb`, `oracle`

## Oracle Database Patterns

### Column Name Casing

Oracle returns column names in **UPPERCASE** by default:

```typescript
const result = await DatabaseHelper.executeQuery(
  'SELECT name, email FROM users WHERE id = :1',
  [userId],
  'TOMS'
);

// ❌ WRONG - undefined
const name = result.rows[0].name;

// ✅ CORRECT - Oracle returns uppercase
const name = result.rows[0].NAME;
const email = result.rows[0].EMAIL;
```

**Workaround with alias**:

```sql
-- Use quoted alias to preserve casing
SELECT name AS "name", email AS "email" FROM users;
```

```typescript
// Now .name works
const name = result.rows[0].name;
```

### Bind Parameters

Oracle driver uses different bind syntax than MySQL/PostgreSQL:

```typescript
// ❌ WRONG (MySQL/PostgreSQL style with ?)
const query = 'SELECT * FROM users WHERE id = ? AND status = ?';
await DatabaseHelper.executeQuery(query, [userId, 'active'], 'TOMS');

// ✅ CORRECT (Oracle positional binds with :N)
const query = 'SELECT * FROM users WHERE id = :1 AND status = :2';
await DatabaseHelper.executeQuery(query, [userId, 'active'], 'TOMS');

// ✅ CORRECT (Oracle direct embedding for DECODE - see below)
const sanitizedValue = value.replace(/'/g, "''"); // Escape single quotes
const query = `SELECT DECODE('${sanitizedValue}', 'A', 'ResultA', 'B', 'ResultB', 'Default') AS RESULT FROM DUAL`;
await DatabaseHelper.executeQuery(query, [], 'TOMS'); // Empty bind array
```

**When to use direct embedding**:

- **DECODE statements** - bind parameters not supported in DECODE value positions
- **Static values** requiring SQL injection protection via `replace(/'/g, "''")`

**When to use :N binds**:

- Dynamic user input in WHERE clauses
- INSERT/UPDATE values
- Most standard SQL queries

### LIMIT vs ROWNUM

```sql
-- ❌ WRONG (MySQL/PostgreSQL)
SELECT * FROM users ORDER BY created_at DESC LIMIT 1;

-- ✅ CORRECT (Oracle)
SELECT * FROM users WHERE ROWNUM <= 1 ORDER BY created_at DESC;

-- ✅ CORRECT (Oracle with subquery for proper ordering)
SELECT * FROM (
  SELECT * FROM users ORDER BY created_at DESC
) WHERE ROWNUM <= 1;
```

**Why subquery?** `ROWNUM` is evaluated before `ORDER BY`, so ordering without a subquery may return wrong rows.

### FROM DUAL

Oracle requires FROM clause even for constant expressions:

```sql
-- ❌ WRONG
SELECT SYSDATE;

-- ✅ CORRECT
SELECT SYSDATE FROM DUAL;

-- ✅ CORRECT
SELECT DECODE('EUR', 'EUR', 'Euro', 'USD', 'Dollar', 'Unknown') AS CURRENCY FROM DUAL;

-- ✅ CORRECT (random date example)
SELECT TO_CHAR(DATE '1930-01-01' + TRUNC(DBMS_RANDOM.VALUE(0, 365*75)), 'YYYY-MM-DD') AS RANDOM_DATE FROM DUAL;
```

### Oracle-Specific Functions

| Function | Purpose | Example |
|----------|---------|---------|
| `FROM DUAL` | Dummy table for SELECT without source | `SELECT SYSDATE FROM DUAL` |
| `DECODE()` | If-then-else logic | `DECODE(val, 'A', 1, 'B', 2, 0)` |
| `NVL()` | Null coalescing | `NVL(column, 'default')` |
| `TO_CHAR()` | Type conversion | `TO_CHAR(SYSDATE, 'YYYY-MM-DD')` |
| `TO_DATE()` | String to date | `TO_DATE('2024-01-01', 'YYYY-MM-DD')` |
| `SYSDATE` | Current timestamp | `WHERE created_at > SYSDATE - 7` |
| `TRUNC()` | Truncate number/date | `TRUNC(DBMS_RANDOM.VALUE(0, 100))` |

### Detection

Detect Oracle database from test description keywords or SQL patterns:

- `FROM DUAL`
- `DECODE(...)`
- `SYSDATE`
- `TO_CHAR(...)`, `TO_DATE(...)`
- `NVL(...)`
- `ROWNUM`
- `:1`, `:2` bind parameters

When detected, apply Oracle-specific patterns above.

## Core Methods

| Method | Purpose |
| --- | --- |
| `executeQuery(query, params?, systemName?)` | Run a read/query; returns result rows/metadata. |
| `executeInsert(query, params?, systemName?)` | Run INSERT; returns inserted id where applicable. |
| `getCustomerIdFromResponse(response, fieldName?)` | Extract an id from API `Response`, JSON object, or string (default field vs named field). |
| `closeConnection(systemName?)` | Close connection for a system (or default behavior per implementation). |
| `closeAllConnections()` | Close all cached connections; use at end of test/hook. |

**Examples:**

```typescript
const result = await DatabaseHelper.executeQuery(
  'SELECT * FROM customers WHERE email = ?',
  ['john@example.com'],
  'CSRD'
);

const insertId = await DatabaseHelper.executeInsert(
  'INSERT INTO test_log (action, details) VALUES (?, ?)',
  ['customer_created', JSON.stringify({ customerId: 123 })],
  'CSRD'
);

const customerId = await DatabaseHelper.getCustomerIdFromResponse(response);
const orderId = await DatabaseHelper.getCustomerIdFromResponse(jsonData, 'orderId');
```

## Connection Management

- **Automatic caching** by key `{type}_{host}_{database}` (same logical DB reuses one connection).
- First `executeQuery` / `executeInsert` creates the connection; later calls reuse it.
- **Close at test end** in a `finally` block, or `afterEach` / `afterAll` as appropriate.
- **Do not** close between queries in the same test unless you intentionally want a new connection (avoid for normal flows).

```typescript
test('database test', async () => {
  try {
    await DatabaseHelper.executeQuery('SELECT * FROM users');
    await DatabaseHelper.executeQuery('SELECT * FROM orders');
    await DatabaseHelper.executeInsert('INSERT INTO logs VALUES (?)');
  } finally {
    await DatabaseHelper.closeAllConnections();
  }
});
```

**Anti-pattern** — closing between queries forces extra connection churn:

```typescript
// ❌ WRONG — do not close between queries in the same test
test('bad example', async () => {
  await DatabaseHelper.executeQuery('SELECT * FROM users');
  await DatabaseHelper.closeConnection();
  await DatabaseHelper.executeQuery('SELECT * FROM orders');
});
```

## Imports

Always resolve shared engine modules through the project import base:

```typescript
import { DatabaseHelper } from '{config.importBasePath}/DatabaseHelper';
import { DatabaseAdapter, DatabaseAdapterRegistry } from '{config.importBasePath}/DatabaseAdapters';
```

## Multiple Systems

When a test hits more than one configured database, pass the correct **`systemName`** on each call (third argument) so the helper picks the right `DB` block from the environment configuration. Still use **one** teardown (`closeAllConnections()` or targeted `closeConnection`) at the end.

## Layered Architecture

Follow: **Test Scenario → Business → Page Objects**.

- **DatabaseHelper calls belong in the Business layer only** (`tests/Business/` or equivalent).
- **Test Scenario** must call Business methods, not `DatabaseHelper` directly (except documented patterns such as `closeAllConnections()` in `finally` if your project places that in the scenario).

Wrap DB work in `TestLogger.businessStep()` inside Business classes.

**Scenario vs Business (summary):**

| Layer | DatabaseHelper `executeQuery` / `executeInsert` | Typical teardown |
| --- | --- | --- |
| Business (`tests/Business/`) | ✅ Yes | Usually none (scenario closes) |
| Test Scenario | ❌ No (call workflow methods) | ✅ `closeAllConnections()` in `finally` when applicable |

## Query Safety

- **Always** use **parameterized** queries: placeholders + array of values.
- **Never** build SQL with string interpolation or concatenation of untrusted values.

```typescript
// ✅ CORRECT
await DatabaseHelper.executeQuery('SELECT * FROM users WHERE id = ?', [userId]);

// ❌ WRONG
await DatabaseHelper.executeQuery(`SELECT * FROM users WHERE id = ${userId}`);
```

## Extensibility

To add a custom DB type, implement **`DatabaseAdapter`**, register with **`DatabaseAdapterRegistry`**, and keep usage behind Business-layer methods. See:

- [references/adapter-extensibility.md](references/adapter-extensibility.md)

## Quick Checklist

- [ ] DB config present in the environment configuration with `DB` connection and `systemName`.
- [ ] Parameterized queries only.
- [ ] DB operations implemented in Business layer; scenario orchestrates.
- [ ] `closeAllConnections()` (or scoped close) in `finally` / teardown, not between every query.
