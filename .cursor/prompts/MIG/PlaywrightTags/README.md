# Playwright Tags Migration Guide

## Overview

This folder contains prompts to migrate existing tests to the new tagging architecture using `TagHelper.taggedTest()`.

---

## Files

| File | Purpose |
|------|---------|
| `MIG_TEST_TAGGING_PROMPT.md` | Main migration prompt for individual tests |
| `MIG_BATCH_MIGRATION.md` | Prompt for batch migration of multiple tests |
| `IMPORT_CHANGES.md` | Quick reference for import pattern changes |

---

## Usage Examples

### Example 1: Migrate a Single Test

**In Cursor chat, type:**

```
@MIG_TEST_TAGGING_PROMPT.md

Migrate this test: tests/TestScenario/LoginTest.test.ts
```

**Result:**
- Reads existing test file
- Generates unique testId (e.g., `TC_002_v001_UserLoginWithValidCredentials`)
- Creates entry in `tests/Utils/TestTagsMapping.json`
- Updates `tests/Settings/TagConfiguration.json` if new extensible tags
- Modifies test to use `TagHelper.taggedTest()`

---

### Example 2: Migrate Multiple Tests (Batch)

**In Cursor chat, type:**

```
@MIG_BATCH_MIGRATION.md

Migrate all tests in tests/TestScenario/
```

**Result:**
- Processes each `.test.ts` file sequentially
- Assigns incremental testId to each test
- Creates all TestTagsMapping.json entries
- Modifies all test files

---

### Example 3: Migrate Specific Tests

**In Cursor chat, type:**

```
@MIG_TEST_TAGGING_PROMPT.md

Migrate these tests:
1. tests/TestScenario/CreateSchoolTest.test.ts
2. tests/TestScenario/EditSchoolTest.test.ts
3. tests/TestScenario/DeleteSchoolTest.test.ts
```

---

### Example 4: With Tag Hints

**If you know the tags to apply:**

```
@MIG_TEST_TAGGING_PROMPT.md

Migrate: tests/TestScenario/CheckoutFlowTest.test.ts

Tags hints:
- Feature: checkout, payment
- Priority: critical
- Suite: smoke, regression
```

---

## What Migration Does

### Before Migration
```typescript
import { test, expect } from 'Engine/Shared/ConsoleCapture';
import { TestLogger } from 'Engine/Shared/TestLogger';

test('Create school with all fields', async ({ page }) => {
  TestLogger.reset();
  // ... test code
});
```

### After Migration
```typescript
import { expect } from '@playwright/test';
import { TagHelper } from 'Engine/Shared/TagHelper';
import { TestLogger } from 'Engine/Shared/TestLogger';

const TEST_ID = 'TC_001_v001_CreateSchoolWithAllFields';

TagHelper.taggedTest(TEST_ID, async ({ page }) => {
  TestLogger.reset();
  // ... test code (unchanged)
});
```

### TestTagsMapping.json Entry Created
```json
{
  "TC_001_v001_CreateSchoolWithAllFields": {
    "testId": "TC_001_v001_CreateSchoolWithAllFields",
    "testFile": "CreateSchoolTest.test.ts",
    "description": "Create a new school with all mandatory and optional fields, verifying successful creation and data persistence",
    "tags": {
      "suite": ["regression"],
      "priority": "high",
      "type": "e2e",
      "dataImpact": "mutating",
      "feature": ["school-management"],
      "component": ["school-form"]
    },
    "createdAt": "2026-01-12T12:00:00Z",
    "lastModified": "2026-01-12T12:00:00Z"
  }
}
```

---

## Verification After Migration

Run these commands to verify:

```bash
# Check TypeScript compilation
npx tsc --noEmit

# Run migrated test
npx playwright test CreateSchoolTest.test.ts --workers=1 --headed --project=chromium

# Run tests by tag
npx playwright test --grep "@smoke"
npx playwright test --grep "@critical"
npx playwright test --grep "@mutating"
```

---

## Important Notes

1. **testId is IMMUTABLE** - once generated, never change it
2. **Tags come from JSON only** - no manual `@tag` annotations in test files
3. **ConsoleCapture preserved** - TagHelper uses it internally
4. **Reuse extensible tags** - check TagConfiguration.json before adding new feature/component/team values

---

## Related Files

- **Tag Configuration**: `tests/Settings/TagConfiguration.json`
- **Test Tags Mapping**: `tests/Utils/TestTagsMapping.json`
- **TagHelper Source**: `Engine/Shared/TagHelper.ts`
- **Tagging Standards Rule**: `.cursor/rules/TaggingStandards.mdc`
