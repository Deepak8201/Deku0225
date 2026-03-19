# Test Tagging Migration Prompt

## Purpose
This prompt helps migrate existing test files to the new tagging architecture using `TagHelper.taggedTest()`.

---

## Migration Task

I need to migrate existing test file(s) to use the new tagging system.

### Input
- **Test file(s) to migrate**: [specify path or "all tests in tests/TestScenario/"]

### What the migration should do:

1. **Read the existing test file** to understand:
   - Test purpose and what it validates
   - Whether it modifies data (mutating) or only reads (readonly)
   - Feature area and components involved

2. **Generate unique testId**:
   - Read `tests/Utils/TestTagsMapping.json` to find highest existing sequential number
   - Increment by 1 for new test
   - Format: `TC_XXX_v001_DescriptiveName`
   - DescriptiveName in PascalCase, derived from test purpose

3. **Create TestTagsMapping.json entry** with:
   - Comprehensive description (not short/vague)
   - All 4 mandatory tags assigned:
     - `suite`: smoke, regression, full, or sanity
     - `priority`: critical, high, medium, or low
     - `type`: e2e, api, integration, ui, or unit
     - `dataImpact`: readonly or mutating
   - Optional tags as appropriate (environment, stability, speed)
   - Extensible tags (feature, component, team)

4. **Check and update TagConfiguration.json**:
   - Review existing extensible values in `tests/Settings/TagConfiguration.json`
   - REUSE existing feature/component/team values if semantically matching
   - ADD new values only if genuinely different concept
   - Update the file if new extensible values are added

5. **Modify the test file**:
   - Add `const TEST_ID = 'TC_XXX_v001_...'` constant at top
   - Replace `test('...', async ({ page }) => {` with `TagHelper.taggedTest(TEST_ID, async ({ page }) => {`
   - Update imports:
     - Remove: `import { test, expect } from 'Engine/Shared/ConsoleCapture';` or `import { test } from '@playwright/test';`
     - Add: `import { TagHelper } from 'Engine/Shared/TagHelper';`
     - Keep: `import { expect } from '@playwright/test';` if expect is used
   - Keep all existing test logic unchanged

---

## Migration Rules

### TestId Format
```
TC_XXX_vYYY_DescriptiveName

XXX = Sequential number (001, 002, ...) - find max from TestTagsMapping.json + 1
YYY = Version (always 001 for migration)
DescriptiveName = PascalCase, derived from test purpose
```

### Mandatory Tag Selection

| Tag | How to Determine |
|-----|------------------|
| **suite** | `smoke` if critical path, `regression` for standard tests |
| **priority** | `critical` if business-critical, `high`/`medium`/`low` based on impact |
| **type** | `e2e` for browser tests, `api` for API tests, `ui` for visual tests |
| **dataImpact** | `mutating` if creates/updates/deletes, `readonly` if only reads |

### Extensible Tag Reuse
1. Read existing values from `tests/Settings/TagConfiguration.json`
2. If test relates to existing feature → reuse that value
3. If genuinely new concept → add new value to TagConfiguration.json

---

## Before/After Example

### BEFORE (existing test):
```typescript
import { test, expect } from 'Engine/Shared/ConsoleCapture';
import { TestLogger } from 'Engine/Shared/TestLogger';
import { SettingsHelper } from 'Engine/Shared/SettingsHelper';
import { SchoolWorkflow } from 'tests/Business/SchoolWorkflow';

test('Create school with mandatory fields', async ({ page }) => {
  TestLogger.reset();
  
  const baseUrl = SettingsHelper.getBaseUrl();
  const credentials = SettingsHelper.getDefaultCredentials();
  const schoolWorkflow = new SchoolWorkflow(page);
  
  await TestLogger.testStep('Login to application', async () => {
    await schoolWorkflow.login(baseUrl, credentials.username, credentials.password);
  });
  
  await TestLogger.testStep('Create new school', async () => {
    await schoolWorkflow.createSchool(testData);
  });
  
  await TestLogger.testStep('Verify school in listing', async () => {
    await schoolWorkflow.verifySchoolInListing(testData.name);
  });
});
```

### AFTER (migrated test):
```typescript
import { expect } from '@playwright/test';
import { TagHelper } from 'Engine/Shared/TagHelper';
import { TestLogger } from 'Engine/Shared/TestLogger';
import { SettingsHelper } from 'Engine/Shared/SettingsHelper';
import { SchoolWorkflow } from 'tests/Business/SchoolWorkflow';

/**
 * Test ID constant - IMMUTABLE
 * Maps to entry in tests/Utils/TestTagsMapping.json
 */
const TEST_ID = 'TC_001_v001_CreateSchoolWithMandatoryFields';

/**
 * Test using TagHelper.taggedTest wrapper
 * Tags loaded from TestTagsMapping.json automatically
 */
TagHelper.taggedTest(TEST_ID, async ({ page }) => {
  TestLogger.reset();
  
  const baseUrl = SettingsHelper.getBaseUrl();
  const credentials = SettingsHelper.getDefaultCredentials();
  const schoolWorkflow = new SchoolWorkflow(page);
  
  await TestLogger.testStep('Login to application', async () => {
    await schoolWorkflow.login(baseUrl, credentials.username, credentials.password);
  });
  
  await TestLogger.testStep('Create new school', async () => {
    await schoolWorkflow.createSchool(testData);
  });
  
  await TestLogger.testStep('Verify school in listing', async () => {
    await schoolWorkflow.verifySchoolInListing(testData.name);
  });
});
```

### TestTagsMapping.json entry added:
```json
{
  "TC_001_v001_CreateSchoolWithMandatoryFields": {
    "testId": "TC_001_v001_CreateSchoolWithMandatoryFields",
    "testFile": "CreateSchoolTest.test.ts",
    "description": "Create a new school entity by filling all mandatory fields (name, address, type) and verify the school is successfully saved and appears in the school listing with correct data",
    "tags": {
      "suite": ["smoke", "regression"],
      "priority": "critical",
      "type": "e2e",
      "dataImpact": "mutating",
      "environment": "all",
      "stability": "stable",
      "speed": "medium",
      "feature": ["school-management"],
      "component": ["school-form", "school-list"],
      "team": "core-platform"
    },
    "createdAt": "2026-01-12T12:00:00Z",
    "lastModified": "2026-01-12T12:00:00Z"
  }
}
```

---

## Migration Checklist

For each test file:
- [ ] Read existing test to understand purpose
- [ ] Determine next sequential testId number
- [ ] Create descriptive PascalCase name
- [ ] Assign all 4 mandatory tags
- [ ] Check existing extensible values for reuse
- [ ] Add new extensible values to TagConfiguration.json if needed
- [ ] Create entry in TestTagsMapping.json
- [ ] Update test file imports
- [ ] Add TEST_ID constant
- [ ] Replace `test(` with `TagHelper.taggedTest(TEST_ID,`
- [ ] Keep all test logic unchanged
- [ ] Verify test still compiles: `npx tsc --noEmit`

---

## Reference Files

- **Tag Configuration**: `tests/Settings/TagConfiguration.json`
- **Test Tags Mapping**: `tests/Utils/TestTagsMapping.json`
- **TagHelper**: `Engine/Shared/TagHelper.ts`
- **Tagging Standards**: `.cursor/rules/TaggingStandards.mdc`

---

## Start Migration

Please migrate the following test file(s):

**[Specify test file path(s) here]**
