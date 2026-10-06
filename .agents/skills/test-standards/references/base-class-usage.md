# Base Class Usage: AIPage, AIElement, TestFileHelper, ConsoleCapture

Detailed patterns for page objects, elements, test files, and automatic browser logging. Imports use `{config.importBasePath}`.

---

## AIPage

**Requirements**

- Page Object and Business Workflow classes **must** extend `AIPage`.
- Constructor: `super(page, 'PageIdentifier')` — the identifier is used for cache lookup and diagnostics.
- Use inherited helpers for navigation and timing instead of ad-hoc `page.waitFor*` when a shared method exists.

**Typical API surface (use as documented in project `AIPage`)**

| Area | Usage |
|------|--------|
| Construction | `super(page, 'UniquePageName')` |
| Navigation | `navigateTo(url)` or domain-specific wrappers that call underlying `page.goto` / app router |
| Load | `waitForPageLoad()` — align with `domcontentloaded`-friendly behavior |
| URL | `getCurrentUrl()` for assertions and retry decisions |
| Navigation wait | `waitForNavigation(urlRegexOrPredicate, options?)` after actions that change history/hash |
| Delay | `waitForTimeout(ms)` — use sparingly; prefer explicit waits on elements |

**Example**

```typescript
import { AIPage } from '{config.importBasePath}/AIPage';
import { Page } from '@playwright/test';
import { AIElement } from '{config.importBasePath}/AIElement';

export class LoginPage extends AIPage {
  private usernameInput: AIElement;
  private loginButton: AIElement;

  constructor(page: Page) {
    super(page, 'LoginPage');
    this.usernameInput = new AIElement(this, 'usernameInput', 'Username input in the login form at the top');
    this.loginButton = new AIElement(this, 'loginButton', 'Login submit button at the bottom of the form');
  }

  async open(baseUrl: string): Promise<void> {
    await this.navigateTo(baseUrl);
    await this.waitForPageLoad();
  }
}
```

**Anti-patterns**

- Direct `this.page.locator(...).click()` in page classes
- Skipping `waitForPageLoad` (or equivalent) before interacting on a freshly loaded view

---

## AIElement

**Constructor (three parameters)**

```typescript
new AIElement(parentPage, 'cacheKey', 'Extended natural language description')
```

- **parent**: The owning `AIPage` (or compatible parent exposing the resolution context).
- **cacheKey**: Stable key for locator cache.
- **description**: Long enough to disambiguate on the page (position, section, label text).

**Interaction methods**

`click`, `fill`, `hover`, `select`, `uploadFile`, plus retrieval helpers (`getText`, `getSelectedValue`, `isVisible`, `getInputValue`, …) and `waitFor`. **Never use `check()` or `uncheck()` — use `click()` for all toggle-type elements.**

**LocatorContext types**

Import `LocatorContextType` from `'{config.importBasePath}/types'`.

1. **Static** (default) — no extra context.
2. **Dynamic** — parameterize repeating rows/cards (e.g. by name).
3. **WithinDynamicParent** — target a child under a dynamic parent (`parentParam` + `childKey`).

**Examples**

```typescript
import { AIElement } from '{config.importBasePath}/AIElement';
import { LocatorContextType } from '{config.importBasePath}/types';

// Static
await element.click();

// Dynamic row/entity
await element.click({ type: LocatorContextType.Dynamic, param: 'Router' });

// Child under dynamic parent
await element.click({
  type: LocatorContextType.WithinDynamicParent,
  parentParam: 'Router',
  childKey: 'ipInput',
});
```

**Performance: `locate()`**

Resolve once, then issue multiple operations on the bound handle:

```typescript
const bound = element.locate({ type: LocatorContextType.Dynamic, param: 'Router' });
await bound.click();
await bound.fill('192.168.1.1');
const value = await bound.getInputValue();
```

---

## TestFileHelper (Gap 2 — upload and file-backed scenarios)

**Import**

```typescript
import { TestFileHelper } from '{config.importBasePath}/TestFileHelper';
```

**Two-directory architecture**

| Location | Role |
|----------|------|
| `tests/TestData/Files/` | Stable assets; **not** deleted by cleanup |
| `tests/Raw/Files/` | Generated/temp files for the run; **cleaned up** when tests finish |

**Core methods**

| Method | Purpose |
|--------|---------|
| `getFileForUpload(fileName)` | Resolve file from stable dir first, then temp |
| `createTextFile(name, content)` | Create text file under temp |
| `createJsonFile(name, obj)` | Write JSON fixture |
| `createCsvFile(name, rows, headers?)` | Build CSV |
| `createFileOfSize(name, sizeBytes)` | Binary payload for size limits |
| `createTypedFile(name, type, size?)` | Valid signature types: pdf, png, jpg, gif, zip, docx, xlsx, etc. |
| `copyToTemp(stableRelativeName)` | Copy template from stable tree into temp for mutation |
| `getFileStream(path)` / `createFileFromStream(...)` | Large downloads |
| `cleanupAllTestFiles()` | Remove temp test files only |

**Size helpers**

- `TestFileHelper.SIZE.KB` / `.MB` / `.GB`
- `TestFileHelper.SIZE.kb(n)` / `.mb(n)` / `.gb(n)`

**Upload example**

```typescript
async uploadDocument(fileName: string): Promise<void> {
  const filePath = await TestFileHelper.createTypedFile(fileName, 'pdf', TestFileHelper.SIZE.mb(1));
  await this.fileInput.uploadFile(filePath);
}

// After suite or in fixture teardown
await TestFileHelper.cleanupAllTestFiles();
```

---

## ConsoleCapture (Gap 3) + TagHelper

**ConsoleCapture** extends the Playwright test fixture so **browser console** and **network** activity are captured automatically for debugging and failure analysis.

**Integration path**: Do **not** wire `ConsoleCapture` manually in every file for standard ATP tests. Use **`TagHelper`**, which wraps the instrumented `test` implementation.

**Typical test entry**

```typescript
import { TagHelper } from '{config.importBasePath}/TagHelper';
import { expect } from '@playwright/test';

const TEST_ID = 'FEATURE-123';

TagHelper.taggedTest(TEST_ID, async ({ page }) => {
  // Console and network logging active via ConsoleCapture-backed fixture
  await expect(page).toHaveTitle(/./);
});
```

**Direct fixture import (advanced / non-TagHelper scenarios)**

```typescript
import { test, expect } from '{config.importBasePath}/ConsoleCapture';
```

**Summary**

- **TagHelper.taggedTest** — preferred; applies tags from `TestTagsMapping.json` and preserves ConsoleCapture behavior.
- **ConsoleCapture** — automatic console/network logs; reduces need for manual `page.on('console')` in each test.

See project tagging standards for `TEST_ID` conventions and mapping file layout.
