---
name: test-locator-management
description: Locator cache structure and cache-first resolution - the locator_cache.json format, AIElement wiring by page id and element key, and mapping ElementsCollected.ts entries into cache entries and Page Object fields. Use when reading, generating, or updating locator_cache.json, or when wiring Page Object elements to cache keys.
---

# Test Locator Management

Centralized locator cache structure, AIElement integration, and cache-first resolution for Playwright-based tests.

## When to Use This Skill

Read this skill during **test generation** whenever work involves:

- Reading, updating, or generating `locator_cache.json`
- Wiring **Page Objects** with **AIElement** and cache keys
- Mapping `ElementsCollected.ts` entries to cache and Page Object code

---

## Cache Architecture

Resolution flows in one direction:

```
Page Object (AIElement fields)
    ↓ requests action / locator
AIElement
    ↓ looks up by page id + element key
Locator Cache (locator_cache.json)
    ↓ provides LocatorStep[] chain
AIElement.executeLocatorChain()
    ↓ calls getByRole / getByLabel / filter / … in sequence
Playwright Locator API
```

---

## `locator_cache.json` Structure

Typical location (adjust per project config): `tests/Utils/locator_cache.json`.

Top level: **PageName** — must match the string passed to `AIPage`.

| Field | Purpose |
| --- | --- |
| `name` | Human-readable page title |
| `url` | Route or path for context |
| `description` | What the page is for |
| `locators` | Map of element entries |

Each locator entry:

| Field | Purpose |
| --- | --- |
| `key` | Same as the map key |
| `description` | Short natural-language description |
| `locator` | `LocatorStep[]` — Playwright API chain; or legacy CSS/XPath `string` for backward compatibility |

---

## ElementsCollected.ts → Cache → Page Object mapping

The test-gen-agent receives `ElementsCollected.ts` from the research phase. Each `CollectedElement` entry maps directly to cache and Page Object:

| `CollectedElement` field | Maps to |
|---|---|
| `pageKey` | Top-level key in `locator_cache.json` AND second argument of `AIPage` constructor |
| `elementKey` | Key inside `locators{}` AND second argument of `AIElement` constructor |
| `description` | `locators[key].description` in cache |
| `locator` | `locators[key].locator` in cache — copy verbatim, do not modify |
| `html` | Diagnostic only — not used in cache or Page Object code |

**Workflow:**
1. Read `ElementsCollected.ts`.
2. Group entries by `pageKey` — each group becomes one page entry in `locator_cache.json` and one Page Object class.
3. For each entry: copy `locator` verbatim to cache, use `elementKey` as the `AIElement` constructor second argument.
4. Verify key consistency: `super(page, pageKey)` and `new AIElement(this, elementKey, …)` must match cache exactly.

---

## AIElement Integration

```typescript
import { AIElement } from '{config.importBasePath}/AIElement';
import { AIPage } from '{config.importBasePath}/AIPage';

export class LoginPage extends AIPage {
  private usernameInput: AIElement;
  private loginButton: AIElement;

  constructor(page: Page) {
    super(page, 'LoginPage');                                         // must match pageKey
    this.usernameInput = new AIElement(this, 'usernameInput', '…');  // must match elementKey
    this.loginButton   = new AIElement(this, 'loginButton', '…');
  }
}
```

Replace `{config.importBasePath}` with the value from `.workplace/test-generation/config.json`.

Third-argument descriptions appear in error messages when a locator is not found — make them specific enough to identify the element.

For parameterized locators (`{param}` in cache args) and `LocatorContextType` usage at call sites, see `.cursor/skills/test-architecture/references/dynamic-elements.md`.

---

## Cache-First Behavior

- **Cache hit** — locator resolves immediately.
- **Cache miss** — `LocatorNotFoundError` is thrown with a clear message.

Do not bypass the cache with raw `page.locator(…)` in Page Object bodies.

---

## Full Cache Example

```json
{
  "LoginPage": {
    "name": "Login Page",
    "url": "/login",
    "description": "User authentication page",
    "locators": {
      "usernameInput": {
        "key": "usernameInput",
        "description": "Username input field",
        "locator": [{ "method": "getByLabel", "args": ["Username"] }]
      },
      "loginButton": {
        "key": "loginButton",
        "description": "Login submit button",
        "locator": [{ "method": "getByRole", "args": ["button", { "name": "Log In" }] }]
      },
      "userRow": {
        "key": "userRow",
        "description": "Table row identified by user name (dynamic)",
        "locator": [
          { "method": "getByRole", "args": ["row"] },
          { "method": "filter", "args": [{ "hasText": "{param}" }] }
        ]
      }
    }
  }
}
```

---

## Quick Compliance Checklist

- [ ] `locator_cache.json` exists at path from config
- [ ] JSON matches the documented shape: page → `name`, `url`, `description`, `locators` → `key`, `description`, `locator`
- [ ] `pageKey` from `ElementsCollected.ts` matches top-level cache key and `AIPage` second argument
- [ ] `elementKey` from `ElementsCollected.ts` matches `locators{}` key and `AIElement` second argument
- [ ] `locator` copied verbatim from `ElementsCollected.ts` — not rewritten or guessed
- [ ] No hardcoded selector strings in Page Object bodies
- [ ] All element interactions go through `AIElement`
- [ ] Cache miss produces `LocatorNotFoundError` — no silent fallback
