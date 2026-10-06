---
name: test-locator-research
description: Locator selection knowledge for UI element investigation - the getByRole-first priority table, the action to record per control type, and the ElementsCollected.ts output structure. Use when collecting locators from a live application or a codegen recording, or when re-investigating an element whose locator failed.
---

# Test Locator Research

Shared domain knowledge for UI element investigation: locator priority, action selection, and output structures. Read this skill before any locator-related work.

For extended API patterns (chaining, filtering, iframes, dynamic `{param}` locators): read `references/playwright-locator-guide.md`.

---

## Locator priority table

Apply the highest-priority method whose required attribute is **confirmed present in the collected HTML**. Do not use an attribute you have not seen.

| Priority | Method | Required attribute in HTML |
|---:|---|---|
| 1 | `getByRole` | ARIA role + accessible name (`aria-label`, `aria-labelledby`, inner text, or `title`) |
| 2 | `getByLabel` | `<label>` element associated with the control |
| 3 | `getByPlaceholder` | `placeholder` attribute |
| 4 | `getByText` | Unique visible text content (non-interactive elements) |
| 5 | `getByAltText` | `alt` attribute on `<img>` |
| 6 | `getByTitle` | `title` attribute |
| 7 | `getByTestId` | `data-testid` attribute |
| 8 | `locator` | Last resort — CSS or XPath only. Document why no semantic method applied. |

`locator` field in `CollectedElement` must be a `LocatorStep[]`:

```json
[{ "method": "getByRole", "args": ["button", { "name": "Save" }] }]
[{ "method": "getByLabel", "args": ["Username"] }]
[{ "method": "getByPlaceholder", "args": ["Enter email"] }]
[{ "method": "getByTestId", "args": ["submit-btn"] }]
```

When the same role+name appears on multiple elements, scope to the nearest unique parent first:

```json
[
  { "method": "locator", "args": ["[role='dialog'][aria-label='Create Phone']"] },
  { "method": "getByRole", "args": ["button", { "name": "Create" }] }
]
```

---

## Action selection rules

Set the `action` field from collected HTML or element type — do not guess from element name or test description wording.

| Element type | HTML / role pattern | action |
|---|---|---|
| Button, link, any clickable | `<button>`, `<a>`, `role="button"` | `click` |
| Native visible checkbox | `<input type="checkbox">` — directly visible, not hidden | `click` |
| **Custom / React checkbox** | `<input type="checkbox">` with `opacity:0`, `position:absolute`, or visually-hidden class inside a wrapper | `click` on the **visible wrapper** — NEVER on the hidden input |
| Radio button | `<input type="radio">` — native or custom wrapper | `click` |
| Toggle / switch | Custom styled element, no native input | `click` |
| Text input, textarea | `<input type="text/email/password/number">`, `<textarea>` | `fill` |
| Dropdown (native) | `<select>` | `select` |
| Hover-triggered element | Menu trigger, tooltip anchor | `hover` |
| Non-interactive (assert only) | Label, badge, status text | `assertVisible` |
| Read text value | Span, div with dynamic text | `getText` |

**Playwright's `check()` and `uncheck()` are prohibited.** For all toggle-type elements (`checkbox`, `switch`, `radio`) always use `click()`. If `action` is `"click"` — call `element.click()`, no exceptions.

**Custom / React checkbox / radio detection:** Inspect `outerHTML` for `opacity:0`, `position:absolute`, or a visually-hidden class on `<input>`. If detected — collect `outerHTML` of the **visible wrapper**, build the locator targeting the wrapper, and note: `"Custom component — click() on visible wrapper, hidden input detected"`.

---

## CollectedElement interface

Every entry in `ElementsCollected.ts` must match this shape:

```typescript
{
  pageKey: 'PageClassName',        // top-level key in locator_cache.json
  elementKey: 'elementFieldName',  // key inside locators{} in locator_cache.json
  description: 'short label',
  action: 'click' | 'fill' | 'select' | 'assertVisible' | 'hover' | 'getText',
  testStep: 'exact text of the test description step',
  locator: [ /* LocatorStep[] */ ],
  html: '<outerHTML from browser_evaluate> | "[snapshot]: <accessibility tree snippet>"'
}
```

`html` field:
- If `browser_evaluate` was run → store `outerHTML` as-is.
- If `browser_evaluate` was NOT run → store the accessibility tree snippet for this element from `browser_snapshot`, prefixed with `[snapshot]:`.
- Never leave `html` empty or fabricate HTML.

---

## Browser state clearing

Execute once at the very start of any investigation session, before navigating to the application URL. Do not repeat mid-session — clearing mid-session will log the user out.

```javascript
document.cookie.split(';').forEach(c => document.cookie = c.replace(/^ +/, '').replace(/=.*/, '=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/'));
localStorage.clear(); sessionStorage.clear();
```

If the app opens already logged in — clear again and reload.
