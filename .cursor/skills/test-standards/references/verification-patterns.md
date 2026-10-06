# Verification Patterns

Mandatory verification practices for Page Objects and Business Workflows. Apply these so interactions do not proceed blindly.

All examples use `{config.importBasePath}` for imports.

---

## 1. Page load verification

**Requirement:** Call `waitForPageLoad()` before any element interaction on a freshly loaded or navigated view.

```typescript
async openPage(url: string): Promise<void> {
  await this.navigateTo(url);
  await this.waitForPageLoad();
}
```

When relevant, confirm the URL before continuing:

```typescript
const currentUrl = this.getCurrentUrl();
if (!currentUrl.includes('#expectedPage')) {
  await this.waitForTimeout(2000);
}
```

---

## 2. Element availability — waitFor before every interaction

**Requirement:** Call `waitFor()` with `state` and `timeout` immediately before every `click`, `fill`, `select`, `hover`. No exceptions unless an `isVisible()` guard already covers the element.

**Why this is mandatory:** Without `waitFor`, the test silently waits up to the global timeout (5 minutes) before failing with "Test timeout exceeded" — giving no actionable error and making fix cycles 5× longer.

```typescript
// ✅ CORRECT — default state is 'visible', only timeout is required
await this.submitButton.waitFor({ timeout: 10000 });
await this.submitButton.click();

await this.usernameInput.waitFor({ timeout: 5000 });
await this.usernameInput.fill(username);

// ✅ CORRECT — explicit state only when waiting for non-visible state
await this.overlay.waitFor({ state: 'hidden', timeout: 10000 });

// ✅ CORRECT — isVisible() guard as alternative for conditional elements
if (await this.alertClose.isVisible()) {
  await this.alertClose.click();
}

// ❌ WRONG — no waitFor, will silently hang until global timeout
await this.submitButton.click();
await this.usernameInput.fill(username);
```

**Timeout guidance:**
- Standard interactive elements (buttons, inputs): `3000–10000` ms
- Elements behind async loading (popups, date pickers, overlays): `15000–30000` ms
- Post-navigation elements: `30000–60000` ms

---

## 3. Action completion verification

**Requirement:** After critical actions (navigation, form submit, dialog confirm) — verify success before the next step.

**Navigation** — use `waitForNavigation()` at the Business layer:

```typescript
await this.somePage.clickNextButton();
try {
  await this.waitForNavigation(/.*#nextPage.*/, { timeout: 30000 });
} catch {
  const currentUrl = this.getCurrentUrl();
  TestLogger.warn(`Navigation timeout, current URL: ${currentUrl}`);
  await this.somePage.waitForTimeout(2000);
}
```

**UI update** — use `waitFor()` on the resulting element at the Page layer:

```typescript
await this.nextButton.waitFor({ state: 'visible', timeout: 5000 });
await this.nextButton.click();
await this.successMessage.waitFor({ state: 'visible', timeout: 5000 });
```

---

## 4. Navigation retry logic

Use when transitions are known to be flaky (heavy SPAs, slow hash routing):

```typescript
await this.currentPage.clickNextButton();
try {
  await this.waitForNavigation(/.*#targetPage.*/, { timeout: 30000 });
} catch {
  const currentUrl = this.getCurrentUrl();
  TestLogger.warn(`Navigation timeout, current URL: ${currentUrl}`);

  if (currentUrl.includes('#sourcePage')) {
    TestLogger.warn('Still on source page — retrying navigation');
    await this.currentPage.waitForTimeout(2000);
    await this.currentPage.clickNextButton();
    await this.waitForNavigation(/.*#targetPage.*/, { timeout: 30000 });
  }
}
```

