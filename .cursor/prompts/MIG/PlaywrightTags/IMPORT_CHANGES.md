# Import Changes Reference

## Before Migration

Tests may have one of these import patterns:

```typescript
// Pattern 1: ConsoleCapture
import { test, expect } from 'Engine/Shared/ConsoleCapture';

// Pattern 2: Direct Playwright
import { test, expect } from '@playwright/test';

// Pattern 3: Mixed
import { test } from '@playwright/test';
import { expect } from '@playwright/test';
```

## After Migration

All tests should use:

```typescript
// Import TagHelper for test wrapper
import { TagHelper } from 'Engine/Shared/TagHelper';

// Keep expect from Playwright if used in test
import { expect } from '@playwright/test';
```

## Key Changes

| Before | After |
|--------|-------|
| `import { test, expect } from 'Engine/Shared/ConsoleCapture';` | `import { TagHelper } from 'Engine/Shared/TagHelper';`<br>`import { expect } from '@playwright/test';` |
| `import { test, expect } from '@playwright/test';` | `import { TagHelper } from 'Engine/Shared/TagHelper';`<br>`import { expect } from '@playwright/test';` |
| `test('name', async ({ page }) => {` | `TagHelper.taggedTest(TEST_ID, async ({ page }) => {` |

## Note
- `expect` is NOT re-exported from TagHelper, import from `@playwright/test`
- ConsoleCapture capabilities are preserved (TagHelper uses it internally)
- Add `const TEST_ID = 'TC_XXX_v001_Name';` before the test
