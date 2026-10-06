# Playwright Locator Guide — Extended API Reference

> Distilled from [playwright.dev/docs/locators](https://playwright.dev/docs/locators) and
> [playwright.dev/docs/other-locators](https://playwright.dev/docs/other-locators).
>
> **Priority order and action selection rules** are defined in `../SKILL.md`.
> This file covers extended patterns: method details with examples, chaining, filtering, dynamic locators, and iframes.

---

## Core Principle

Playwright's built-in API locators (`getByRole`, `getByLabel`, etc.) are resilient — they
reflect user-visible semantics rather than brittle DOM structure.

Prefer semantic and accessibility-oriented locators over DOM-structure-dependent selectors.

Use built-in Playwright locators exclusively unless there is no viable alternative, in which
case fall back to `locator` (CSS/XPath).

---

## Method Reference with LocatorStep[] Examples

### 1. `getByRole`

Locates by [ARIA role](https://www.w3.org/TR/wai-aria-1.2/#role_definitions) and accessible name.

**Options (all optional):**
- `name` — accessible name (string or regex)
- `exact` — exact match for `name`
- `checked`, `disabled`, `expanded`, `pressed`, `selected` — ARIA state filters
- `level` — heading level (1–6)
- `includeHidden` — include hidden elements

```json
[{ "method": "getByRole", "args": ["button", { "name": "Log In" }] }]
[{ "method": "getByRole", "args": ["textbox", { "name": "Username" }] }]
[{ "method": "getByRole", "args": ["checkbox", { "name": "Remember me" }] }]
[{ "method": "getByRole", "args": ["heading", { "name": "Sign in", "level": 2 }] }]
[{ "method": "getByRole", "args": ["link", { "name": "Home" }] }]
[{ "method": "getByRole", "args": ["combobox", { "name": "Country" }] }]
```

### 2. `getByLabel`

Locates a form control associated with a `<label>` element.

**Options:** `exact` (boolean)

```json
[{ "method": "getByLabel", "args": ["Password"] }]
[{ "method": "getByLabel", "args": ["First name", { "exact": true }] }]
```

### 3. `getByPlaceholder`

Locates inputs by `placeholder` attribute text.

**Options:** `exact` (boolean)

```json
[{ "method": "getByPlaceholder", "args": ["Search…"] }]
[{ "method": "getByPlaceholder", "args": ["Enter your email"] }]
```

### 4. `getByText`

Locates elements by their visible text content.

**Options:** `exact` (boolean)

```json
[{ "method": "getByText", "args": ["Welcome back"] }]
[{ "method": "getByText", "args": ["Submit", { "exact": true }] }]
```

> Prefer `getByRole` for interactive elements. Use `getByText` for labels, headings, or
> non-interactive content.

### 5. `getByAltText`

Locates `<img>` or other elements with a matching `alt` attribute.

**Options:** `exact` (boolean)

```json
[{ "method": "getByAltText", "args": ["Company logo"] }]
```

### 6. `getByTitle`

Locates elements by their `title` attribute.

**Options:** `exact` (boolean)

```json
[{ "method": "getByTitle", "args": ["Close dialog"] }]
```

### 7. `getByTestId`

Locates elements by `data-testid` attribute (or the attribute configured in `playwright.config.ts`).

```json
[{ "method": "getByTestId", "args": ["submit-button"] }]
```

### 8. `locator` — CSS/XPath fallback

Only when none of the semantic methods above can identify the element.

```json
[{ "method": "locator", "args": [".sidebar .nav-item.active"] }]
[{ "method": "locator", "args": ["xpath=//table[@id='results']//tr[1]"] }]
```

---

## Chaining and Filtering

### `filter` — narrow down a locator set

Use after any locator to narrow by text or child element.

**Options:** `hasText`, `hasNotText`, `has` (another locator), `hasNot`

```json
[
  { "method": "getByRole", "args": ["listitem"] },
  { "method": "filter", "args": [{ "hasText": "Product Name" }] }
]
```

Dynamic example (placeholder replaced at runtime with `{param}`):
```json
[
  { "method": "getByRole", "args": ["row"] },
  { "method": "filter", "args": [{ "hasText": "{param}" }] }
]
```

### `nth`, `first`, `last` — positional selection

Avoid `nth` unless the position is semantically meaningful (e.g., first item in a known-stable list).
Prefer `filter` with unique text instead.

```json
[
  { "method": "getByRole", "args": ["listitem"] },
  { "method": "first", "args": [] }
]
[
  { "method": "getByRole", "args": ["listitem"] },
  { "method": "nth", "args": [2] }
]
```

### `and` — combine locators (AND semantics)

Both conditions must match the **same** element.

```json
[
  { "method": "getByRole", "args": ["button"] },
  { "method": "and", "args": [{ "method": "getByTitle", "args": ["Delete"] }] }
]
```

> Note: the `and`/`or` `args` value is itself a locator object. In `LocatorStep[]` JSON store
> the nested locator inline as a plain object. `AIElement.executeLocatorChain` will pass it
> directly to Playwright's `.and()` / `.or()` API, which accept a `Locator` object.
> Pre-build the inner locator with `page.getByTitle(...)` before calling `.and()` — the
> research agent should document both steps clearly when this pattern is needed.

### `or` — combine locators (OR semantics)

Either condition can match.

### `frameLocator` — enter an iframe

```json
[
  { "method": "frameLocator", "args": ["iframe#myFrame"] },
  { "method": "getByRole", "args": ["button", { "name": "Submit" }] }
]
```

> `frameLocator` returns a `FrameLocator`, not a `Locator`. All subsequent steps operate inside
> that frame. The legacy `>>>` string syntax is still supported for backward compatibility but
> new locators must use the `frameLocator` step.

---

## Dynamic Locators — `{param}` Placeholder

Use `{param}` as a placeholder in any string argument. `AIElement.resolveDynamic(param)` will
call `deepReplaceParam` to substitute the placeholder recursively through the args before
executing the chain.

```json
[
  { "method": "getByRole", "args": ["row"] },
  { "method": "filter", "args": [{ "hasText": "{param}" }] }
]
```

```json
[{ "method": "getByRole", "args": ["button", { "name": "{param}" }] }]
```

---

## Decision Tree

```
Does the element have an ARIA role + accessible name?
  YES → getByRole

Is the element a form control with a <label>?
  YES → getByLabel

Does the element have unique placeholder text?
  YES → getByPlaceholder

Is the element identified by unique visible text?
  YES → getByText

Is the element an image with alt text?
  YES → getByAltText

Does the element have a title attribute?
  YES → getByTitle

Does the element have data-testid?
  YES → getByTestId

None of the above apply?
  → locator (CSS or XPath) — document the reason in InvestigationLog.md
```

---

## Locator Strictness

Playwright enforces that a locator matches **exactly one** element when performing actions.
If a locator matches multiple elements, add `filter`, `nth`, `first`, or a more specific name
option to make it strict before writing it to the cache.

---

## What NOT to use

| Anti-pattern | Why |
|---|---|
| `page.locator('button.btn-primary')` | Ties to CSS class, breaks on style changes |
| `page.locator('#id-123')` | Auto-generated IDs change between deployments |
| `nth(n)` for arbitrary position | Order-dependent, breaks when items reorder |
| XPath with `//div[3]/span[2]` | Structure-dependent, extremely fragile |
| CSS attribute selectors on non-semantic attrs | Hidden implementation detail |

---

## Stability Guidance

Prefer locators that are:

- accessibility-based,
- user-visible,
- stable across renders,
- independent from layout structure,
- independent from styling classes.

Avoid:

- generated IDs,
- CSS utility classes,
- deep hierarchy selectors,
- positional selectors,
- transient UI text when more stable semantics exist.

---

## References

- [Playwright Locators](https://playwright.dev/docs/locators) — recommended locators (primary)
- [Playwright Other Locators](https://playwright.dev/docs/other-locators) — CSS, XPath, legacy (fallback only)
- [`LocatorStep` type definition](../../../TestGeneration/SharedRuntime/types.ts)