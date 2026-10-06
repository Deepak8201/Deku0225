# Layer Flow Examples

End-to-end patterns for **Test Scenario → Business → Page Object → AIElement → Locator Cache**, plus **incorrect** snippets and **business independence**.

Imports below use `{config.importBasePath}` — substitute your module’s `importBasePath` when copying into a real repo.

---

## 1. Full flow: login across all layers

### Test Scenario (`tests/TestScenario/`)

Calls **business only**. Uses `TestLogger.testStep` and `SettingsHelper`. No locators, no direct page object construction for UI steps beyond wiring the workflow.

```typescript
import { test } from '@playwright/test';
import { TestLogger } from '{config.importBasePath}/TestLogger';
import { SettingsHelper } from '{config.importBasePath}/SettingsHelper';
import { LoginWorkflow } from '../Business/LoginWorkflow';

test('User login', async ({ page }) => {
  TestLogger.reset();

  const baseUrl = SettingsHelper.getBaseUrl('systemName');
  const credentials = SettingsHelper.getDefaultCredentials('systemName');
  const loginWorkflow = new LoginWorkflow(page);

  await TestLogger.testStep('Login to application', async () => {
    await loginWorkflow.performLogin(baseUrl, credentials.username, credentials.password);
  });
});
```

### Business Workflow (`tests/Business/`)

Calls **page objects only**. Uses `TestLogger.businessStep`.

```typescript
import { Page } from '@playwright/test';
import { AIPage } from '{config.importBasePath}/AIPage';
import { TestLogger } from '{config.importBasePath}/TestLogger';
import { LoginPage } from '../Functional/LoginPage';

export class LoginWorkflow extends AIPage {
  private loginPage: LoginPage;

  constructor(page: Page) {
    super(page);
    this.loginPage = new LoginPage(page);
  }

  async performLogin(baseUrl: string, username: string, password: string): Promise<void> {
    await TestLogger.businessStep(`Login with username: ${username}`, async () => {
      await this.loginPage.navigateToLogin(baseUrl);
      await this.loginPage.login(username, password);
    });
  }
}
```

### Page Object (`tests/Functional/`)

Uses **AIElement** for all element interactions. Uses `TestLogger.pageStep`. No `this.page.locator` for elements.

```typescript
import { Page } from '@playwright/test';
import { AIPage } from '{config.importBasePath}/AIPage';
import { AIElement } from '{config.importBasePath}/AIElement';
import { TestLogger } from '{config.importBasePath}/TestLogger';

export class LoginPage extends AIPage {
  private usernameInput: AIElement;
  private passwordInput: AIElement;
  private loginButton: AIElement;

  constructor(page: Page) {
    super(page, 'LoginPage');
    this.usernameInput = new AIElement(
      this,
      'usernameInput',
      'Username input field in the login form',
    );
    this.passwordInput = new AIElement(
      this,
      'passwordInput',
      'Password input field in the login form',
    );
    this.loginButton = new AIElement(
      this,
      'loginButton',
      'Login submit button at the bottom of the form',
    );
  }

  async navigateToLogin(baseUrl: string): Promise<void> {
    await TestLogger.pageStep('Navigate to login page', async () => {
      await this.navigateTo(baseUrl);
      await this.waitForPageLoad();
    });
  }

  async login(username: string, password: string): Promise<void> {
    await TestLogger.pageStep('Fill login credentials', async () => {
      await this.usernameInput.fill(username);
      await this.passwordInput.fill(password);
      await this.loginButton.click();
    });
  }
}
```

### AIElement + Locator Cache

- **AIElement** (`{config.importBasePath}/AIElement.ts`) resolves keys like `usernameInput`, `loginButton` from **`tests/Utils/locator_cache.json`** (path may follow your config) and performs Playwright actions.
- Cache entries include descriptions and `LocatorStep[]` chains (or legacy CSS strings); no duplication of selectors in the page class.

---

## 2. Incorrect: direct locators in the test

```typescript
// ❌ WRONG
test('User login', async ({ page }) => {
  await page.click('#loginButton');
  await page.fill('#username', 'user');
});
```

**Why:** Scenarios must not own selectors or raw `page` element APIs.

**✅ Correct:** Call a business workflow inside `TestLogger.testStep`, with URLs/credentials from `SettingsHelper` (see scenario block above).

---

## 3. Incorrect: direct page interactions in business

```typescript
// ❌ WRONG
export class LoginWorkflow extends AIPage {
  async performLogin(username: string, password: string): Promise<void> {
    await this.page.fill('#username', username);
    await this.page.click('#loginBtn');
  }
}
```

**Why:** Business must delegate UI to page objects.

**✅ Correct:** Inject/use `LoginPage` and call `loginPage.login(...)` inside `TestLogger.businessStep` (see business block above).

---

## 4. Incorrect: direct locators in page objects

```typescript
// ❌ WRONG
export class LoginPage extends AIPage {
  async login(username: string, password: string): Promise<void> {
    await this.page.fill('#username', username);
    await this.page.click('#loginBtn');
  }
}
```

**Why:** All element interaction goes through **AIElement**; locators stay in the cache.

**✅ Correct:** Fields `AIElement`, constructor initialization with cache keys, `fill`/`click` on those instances (see page object block above).

---

## 5. Business layer independence

Business classes **must not** call each other. The **test scenario** composes multiple workflows when a journey spans domains.

```typescript
// ❌ WRONG — CheckoutWorkflow calling PaymentWorkflow internally
export class CheckoutWorkflow extends AIPage {
  async completeOrder(): Promise<void> {
    const payment = new PaymentWorkflow(this.page);
    await payment.payWithCard(); // cross-business call
  }
}
```

```typescript
// ✅ CORRECT — scenario orchestrates both workflows
await TestLogger.testStep('Checkout and pay', async () => {
  await checkoutWorkflow.fillShipping();
  await paymentWorkflow.payWithCard();
});
```

Each business class depends only on **page objects** for its own domain steps.

---

## 6. Related: dynamic elements

For `{param}`, `LocatorContextType.Dynamic`, `WithinDynamicParent`, and `locate()`, see **`dynamic-elements.md`**.
