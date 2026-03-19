# Batch Test Tagging Migration

## Purpose
Migrate all existing tests in a directory to the new tagging architecture.

---

## Migration Command

Migrate all tests in `tests/TestScenario/` to use `TagHelper.taggedTest()` following the tagging architecture.

### Process

1. **List all test files** in `tests/TestScenario/*.test.ts`

2. **For each test file**:
   - Read current TestTagsMapping.json to get next sequential number
   - Analyze test to determine appropriate tags
   - Create TestTagsMapping.json entry
   - Update TagConfiguration.json if new extensible values needed
   - Modify test file to use TagHelper.taggedTest()

3. **Verification**:
   - Run `npx tsc --noEmit` to verify compilation
   - Check TestTagsMapping.json has all entries
   - Verify no test uses manual `test()` call

---

## Quick Tag Selection Guide

| Test Purpose | suite | priority | type | dataImpact |
|--------------|-------|----------|------|------------|
| Login/Auth tests | smoke, regression | critical | e2e | readonly |
| Entity creation | regression | high | e2e | mutating |
| Entity editing | regression | medium | e2e | mutating |
| Entity deletion | regression | high | e2e | mutating |
| Data viewing | regression | medium | e2e | readonly |
| Search/Filter | regression | medium | e2e | readonly |
| Form validation | regression | high | e2e | readonly |
| Navigation tests | smoke | medium | e2e | readonly |
| API tests | regression | high | api | varies |
| Visual/UI tests | regression | low | ui | readonly |

---

## Start Batch Migration

Migrate all tests in: `tests/TestScenario/`

**Note**: Process each file sequentially, incrementing testId for each.
