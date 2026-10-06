---
name: test-standards
description: API reference and patterns for layered Playwright tests - AIPage and AIElement methods, the TestLogger call per layer, Page Object structure, random test data, and mandatory import paths. Use when generating or reviewing Page Objects, Business Workflows, or Test Scenarios.
---

# Test Standards

API reference and patterns for layered Playwright tests: base classes (`AIPage`, `AIElement`), hierarchical logging, verification, configuration, and tagging.

## When to Use This Skill

Read during **test generation** when generating Page Objects, Business Workflows, or Test Scenarios. All enforcement rules live in the agent's Absolute rules and Checklist — this skill is the reference for *how* to implement them correctly.

---

## Layer architecture

```
Test Scenario → Business Workflow → Page Object → AIElement → locator_cache.json
```

| Layer | Location | Logger method |
|---|---|---|
| Test Scenario | `tests/TestScenario/` | `TestLogger.testStep()` |
| Business Workflow | `tests/Business/` | `TestLogger.businessStep()` |
| Page Object | `tests/Functional/` | `TestLogger.pageStep()` |

Always call `TestLogger.reset()` at the very start of each test.

---

## AIElement — API reference

| Method | Notes |
|---|---|
| `waitFor(options?, ctx?)` | Call before every interact. Default `state` is `'visible'` — only `timeout` is required in most cases. Pass explicit `state` only for non-default waits: `'hidden'`, `'detached'`, `'attached'`. |
| `click(ctx?)` | After `waitFor` |
| `fill(value, ctx?)` | After `waitFor` |
| `hover(ctx?)` | After `waitFor` |
| `select(value, ctx?)` | After `waitFor` |
| `getText(ctx?)` | Returns visible text |
| `getSelectedValue(ctx?)` | Returns current selection |
| `getInputValue(ctx?)` | Returns raw input value |
| `isVisible(ctx?)` | Visibility check — use as conditional guard |
| `uploadFile(filePath, ctx?)` | File upload |
| `locate(ctx?)` | Resolve once → call `click`/`fill`/… on bound handle. Use when the same element is clicked then filled — avoids duplicate AIElement fields. |

LocatorContext types: `Static` (default), `Dynamic` (param), `WithinDynamicParent` (parentParam + childKey).
Import: `import { LocatorContextType } from '{config.importBasePath}/types'`.

---

## Page Object pattern

```typescript
import { Page } from '@playwright/test';
import { AIPage } from '{config.importBasePath}/AIPage';
import { AIElement } from '{config.importBasePath}/AIElement';
import { TestLogger } from '{config.importBasePath}/TestLogger';

export class LoginPage extends AIPage {
  private usernameInput: AIElement;
  private loginButton: AIElement;

  constructor(page: Page) {
    super(page, 'LoginPage'); // must match pageKey in locator_cache.json
    this.usernameInput = new AIElement(this, 'usernameInput', 'Username input in the login form');
    this.loginButton = new AIElement(this, 'loginButton', 'Login submit button at the bottom');
  }

  async open(baseUrl: string): Promise<void> {
    await TestLogger.pageStep('Open login page', async () => {
      await this.navigateTo(baseUrl);
      await this.waitForPageLoad();
    });
  }

  async login(username: string, password: string): Promise<void> {
    await TestLogger.pageStep('Submit login credentials', async () => {
      await this.usernameInput.waitFor({ timeout: 5000 });
      await this.usernameInput.fill(username);
      await this.loginButton.waitFor({ timeout: 5000 });
      await this.loginButton.click();
    });
  }
}
```

For same-element click+fill use `locate()`:

```typescript
const bound = this.usernameInput.locate();
await bound.click();
await bound.fill(username);
```

---

## AITomsPage — when to use

Use `AITomsPage` (instead of `AIPage`) only when **all** are true:
- Table layout with header row, data rows, toolbar
- Checkbox column and row selection pattern consistent with TOMS-style UIs
- CSS/class patterns match project template table_view samples

Otherwise extend `AIPage` and model rows with `AIElement` fields.

---

## Random test data

Use timestamps and unique IDs per run to avoid collisions:

```typescript
const runId = Date.now();
const uniqueName = `Task_${runId}`;
const email = `automation.user.${runId}@example.test`;
```

---

## Mandatory import patterns

```typescript
import { AIPage } from '{config.importBasePath}/AIPage';
import { AIElement } from '{config.importBasePath}/AIElement';
import { TestLogger } from '{config.importBasePath}/TestLogger';
import { LocatorContextType } from '{config.importBasePath}/types';
import { SettingsHelper } from '{config.importBasePath}/SettingsHelper';
import { TagHelper } from '{config.importBasePath}/TagHelper';
```

Never use hardcoded paths like `Engine/Shared`.

---

## References

| Topic | File |
|---|---|
| `waitFor`, page load, action verification, navigation retry | [references/verification-patterns.md](references/verification-patterns.md) |
| `AIPage`, `locate()`, `TestFileHelper`, `ConsoleCapture` | [references/base-class-usage.md](references/base-class-usage.md) |
| `SettingsHelper`, environment configuration resolution | [references/settings-helper.md](references/settings-helper.md) |
