---
name: test-tagging-standards
description: Test tagging and test ID standards - TagConfiguration.json and TestTagsMapping.json structure, mandatory and optional tag categories, and the TagHelper.taggedTest() file pattern. Use when assigning or validating tags for a test, updating the tag mapping files, or structuring a test file's test ID.
---

# Test Tagging Standards

Defines how tests get **tags** and **test IDs**: configuration flow, mandatory and optional categories, file structure, and prohibited shortcuts. Use this so generated tests stay consistent and filterable.

## When to Use This Skill

The agent should read this skill **during test generation** (and when editing tagging metadata) whenever it must:

- Assign or validate **tags** for a new or updated test
- Create or update **`TestTagsMapping.json`** / **`TagConfiguration.json`**
- Structure a test file to use **`TagHelper.taggedTest()`** and a **`TEST_ID`** constant

## Tagging System Architecture

Data flows in one direction:

```
TagConfiguration.json (tests/Settings/)
    → defines categories, allowed values, validation rules

TestTagsMapping.json (tests/Utils/)
    → single source of truth: testId → tags + description

TagHelper.taggedTest() ({config.importBasePath}/TagHelper.ts)
    → loads mapping at runtime and applies tags to the test
```

**Rule:** Tags for a test are **not** authored ad hoc in the test body; they come from **TestTagsMapping.json** via **TagHelper**.

## TestId Format (from config, not hardcoded)

Use the project’s configured pattern — typically exposed as **`config.testIdFormat`** (or equivalent in your generator). Do **not** hardcode a one-off format in generated files.

**Canonical shape (when config matches default):**

`TC_{XXX}_v{YYY}_{Name}`

| Part | Meaning |
| --- | --- |
| `TC_` | Test case prefix |
| `XXX` | Zero-padded sequential number (e.g. `001`) |
| `_v` | Version separator |
| `YYY` | Version digits (default **`001`** for new tests) |
| `Name` | **PascalCase** descriptive name |

Examples: `TC_001_v001_CreateSchoolWithMandatoryFields`, `TC_001_v002_CreateSchoolWithMandatoryFields` (new version only when explicitly required).

**Immutability:** After generation, **testId must not change**.

## Mandatory Tag Categories

Every mapped test must include:

| Category | Values (fixed) | Cardinality |
| --- | --- | --- |
| **suite** | `smoke`, `regression`, `full`, `sanity` | Allow multiple |
| **priority** | `critical`, `high`, `medium`, `low` | Single |
| **type** | `e2e`, `api`, `integration`, `ui`, `unit` | Single |
| **dataImpact** | `readonly`, `mutating` | Single |

Details and semantics: [references/tag-taxonomy.md](references/tag-taxonomy.md).

## Optional Tags

| Category | Notes |
| --- | --- |
| **environment** | e.g. `dev`, `staging`, `production`, `all` |
| **stability** | e.g. `stable`, `flaky`, `wip`, `deprecated` |
| **speed** | `fast`, `medium`, `slow` |

## Extensible Tags

| Category | Rule |
| --- | --- |
| **feature** | Prefer **reuse** of existing values in `TagConfiguration.json` when semantics match; add only for genuinely new concepts. Multiple allowed. |
| **component** | Same reuse rule; multiple allowed. |
| **team** | Same reuse rule; typically single value. |

Naming style for extensible values: **lowercase with hyphens** (e.g. `school-management`, `user-authentication`).

## `TagHelper.taggedTest()` Wrapper

**Only** this pattern (or project-approved equivalent) should attach tags from the mapping:

```typescript
const TEST_ID = 'TC_001_v001_CreateSchoolWithMandatoryFields';

TagHelper.taggedTest(TEST_ID, async ({ page }) => {
  // test body
});
```

Do not duplicate tag lists in the test file; the helper resolves tags using **TEST_ID** → **TestTagsMapping.json**.

## Test File Structure (required pattern)

1. Import **`TagHelper`** from `{config.importBasePath}/TagHelper`.
2. Define **`const TEST_ID = '...'`** matching a **TestTagsMapping.json** key.
3. Wrap the test body with **`TagHelper.taggedTest(TEST_ID, async ({ page }) => { ... })`**.
4. Import other shared utilities (e.g. `TestLogger`, `SettingsHelper`) from `{config.importBasePath}/...` per project conventions.

```typescript
import { TagHelper } from '{config.importBasePath}/TagHelper';
import { TestLogger } from '{config.importBasePath}/TestLogger';
import { SettingsHelper } from '{config.importBasePath}/SettingsHelper';

const TEST_ID = 'TC_001_v001_CreateSchoolWithMandatoryFields';

TagHelper.taggedTest(TEST_ID, async ({ page }) => {
  TestLogger.reset();
  // ...
});
```

## Prohibited

- **Manual** Playwright tag annotations (`@smoke` in title, `test(..., { tag: [...] })`, etc.)
- **Hardcoded** tag arrays or strings in the test file as the source of truth
- **Inventing** testId format strings that ignore **`config.testIdFormat`** / project rules

```typescript
// ❌ WRONG — manual annotations
test('Create school @smoke @critical', async ({ page }) => {});

// ❌ WRONG — manual tag option
test('Create school', { tag: ['@smoke', '@critical'] }, async ({ page }) => {});

// ❌ WRONG — tags as source of truth in file
const tags = ['@smoke', '@critical', '@e2e'];

// ✅ CORRECT — TEST_ID + TagHelper
const TEST_ID = 'TC_001_v001_CreateSchoolWithMandatoryFields';
TagHelper.taggedTest(TEST_ID, async ({ page }) => {});
```

## `TestTagsMapping.json` Entry Format

Each entry is keyed by **testId** (immutable). Typical fields (align with your repo’s schema):

- **tags** (or structured tag object per category)
- **description** — comprehensive human-readable summary
- **timestamps** — created/updated if your template requires them

**Illustrative object** (property names may differ slightly per template):

```json
{
  "TC_001_v001_CreateSchoolWithMandatoryFields": {
    "suite": ["smoke", "regression"],
    "priority": "high",
    "type": "e2e",
    "dataImpact": "mutating",
    "environment": ["all"],
    "stability": "stable",
    "speed": "medium",
    "feature": ["school-management"],
    "component": ["school-form"],
    "team": "core-platform",
    "description": "Create a school with mandatory fields, verify listing, assert persisted data.",
    "createdAt": "2025-03-25T12:00:00.000Z",
    "updatedAt": "2025-03-25T12:00:00.000Z"
  }
}
```

### CRITICAL: Nested Tags Structure Requirement

**The above example shows INCORRECT flat structure. The CORRECT structure requires a nested `tags` object:**

**✅ CORRECT Structure (use this)**:

```json
{
  "TC_001_v001_CreateSchoolWithMandatoryFields": {
    "testId": "TC_001_v001_CreateSchoolWithMandatoryFields",
    "testFile": "tests/TestScenario/tc_001_create_school.test.ts",
    "tags": {
      "suite": ["smoke", "regression"],
      "priority": "high",
      "type": "e2e",
      "dataImpact": "mutating",
      "environment": ["all"],
      "stability": "stable",
      "speed": "medium",
      "feature": ["school-management"],
      "component": ["school-form"],
      "team": "core-platform"
    },
    "description": "Create a school with mandatory fields, verify listing, assert persisted data.",
    "createdAt": "2025-03-25T12:00:00.000Z",
    "updatedAt": "2025-03-25T12:00:00.000Z"
  }
}
```

**Why this is required**: `TagHelper` and `TagRegistry` expect `entry.tags.suite` not `entry.suite`. Flat structure causes `TypeError: Cannot read properties of undefined (reading 'suite')`.

**Schema Requirements**:

| Field | Type | Required | Location |
|-------|------|----------|----------|
| `testId` | string | Yes | Root level |
| `testFile` | string | Yes | Root level |
| `tags` | object | **Yes** | Root level - **NESTED OBJECT** |
| `tags.suite` | string[] | Yes | Inside `tags` object |
| `tags.priority` | string | Yes | Inside `tags` object |
| `tags.type` | string | Yes | Inside `tags` object |
| `tags.dataImpact` | string | Yes | Inside `tags` object |
| `tags.*` (optional) | various | No | Inside `tags` object |
| `description` | string | Yes | Root level |

When adding a test:

1. Read existing mapping; find **highest** sequential `XXX`; increment by 1.
2. Default version **`v001`** unless the user explicitly requests a new version.
3. Add the new **testId** and full tag set + description.
4. Update **TagConfiguration.json** only if new **extensible** values are required.

## Selection and Descriptions

For how to pick suite/priority/type/dataImpact and how to write descriptions, see:

- [references/tag-taxonomy.md](references/tag-taxonomy.md)
- [references/tag-selection-guidelines.md](references/tag-selection-guidelines.md)

## Execution Filtering (CLI)

Tags applied via **TagHelper** should be discoverable with Playwright’s grep filters (exact `@` names depend on how **TagHelper** serializes categories). Examples:

```bash
npx playwright test --grep "@smoke"
npx playwright test --grep "@critical"
npx playwright test --grep "@feature:school-management"
npx playwright test --grep-invert "@flaky"
npx playwright test --grep "@smoke" --grep-invert "@slow"
npx playwright test --grep "@readonly"
npx playwright test --grep "@mutating"
```

Prefer project scripts or documented grep patterns if the template wraps these commands.

## Generation Checklist

- [ ] Next **testId** derived from **TestTagsMapping.json** + **`config.testIdFormat`**
- [ ] Highest existing `XXX` found and incremented; default version **`v001`**
- [ ] **PascalCase** descriptive name; starts with a letter
- [ ] All **mandatory** tags present (**suite**, **priority**, **type**, **dataImpact**)
- [ ] Optional tags set where relevant (**environment**, **stability**, **speed**)
- [ ] Extensible tags: checked **TagConfiguration.json**, reused or added with config update
- [ ] **Description** is complete (not vague); see [references/tag-selection-guidelines.md](references/tag-selection-guidelines.md)
- [ ] **TestTagsMapping.json** updated with new entry; **TagConfiguration.json** updated only if new extensible values
- [ ] Test file uses **`TagHelper.taggedTest`** + **`TEST_ID`** only — no manual tags

## Success Criteria

- Mandatory categories populated with **valid** values per **TagConfiguration.json**
- **Single source of truth**: tags live in **TestTagsMapping.json**, not duplicated in test source
- **Immutable** **testId** after creation
- **No** manual `@` tags or hardcoded tag arrays in generated tests
