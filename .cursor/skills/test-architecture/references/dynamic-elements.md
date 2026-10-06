﻿# Dynamic Elements

How to handle UI that depends on **runtime data** (names, IDs, labels, row content). This aligns with layered design: page objects use **AIElement**; the cache holds patterns with placeholders.

---

## Rule

- **NEVER** `this.page.locator()` with **string interpolation** (or concatenation) for dynamic parts.
- **ALWAYS** use **AIElement** with a `{param}` placeholder in the locator cache and a **context** object in TypeScript.

---

## Imports

`LocatorContextType` (and related types if your project exports them) come from the shared types entry — use the configured import root, not a hardcoded engine path:

```typescript
import { LocatorContextType } from '{config.importBasePath}/types';
```

Replace `{config.importBasePath}` with the value from your test module `config.json` (same as for `AIElement.ts`).

---

## Locator cache entry format

Use `{param}` inside any step's `args` where runtime text must be substituted. Example (Playwright API chain - preferred):

```json
{
  "locator": [
    { "method": "getByRole", "args": ["row"] },
    { "method": "filter", "args": [{ "hasText": "{param}" }] }
  ]
}
```

Legacy CSS string format (still supported for backward compatibility):

```json
{
  "locator": "tr:has(strong:has-text(\"{param}\")) a.btn-outline-info i.fa-eye"
}
```

Keys and page grouping follow your project’s `locator_cache.json` schema (page name, `locators`, descriptions, etc.).

---

## Static usage

When the locator is fully fixed in the cache:

```typescript
await this.someButton.click();
await this.someInput.fill('value');
```

No context object is required.

---

## Dynamic usage

When one AIElement maps to many DOM nodes depending on a value (e.g. row by name, button by visible text):

```typescript
await this.icon.click({
  type: LocatorContextType.Dynamic,
  param: value,
});
```

`param` replaces `{param}` placeholders inside the `LocatorStep[]` args in the cache (per `AIElement.deepReplaceParam`). Legacy CSS string locators with `{param}` are also substituted.

---

## WithinDynamicParent usage

When the parent is dynamic and a **child** is addressed by a stable cache key under that parent:

```typescript
await this.childElement.click({
  type: LocatorContextType.WithinDynamicParent,
  parentParam: parentValue,
  childKey: 'childKeyInCache',
});
```

Adjust property names to match your `LocatorContextType` API if the project uses aliases (e.g. `parentParam` / `childKey` naming).

---

## `locate()` for performance

Resolve once, interact multiple times (visibility, click, text, etc.):

```typescript
const element = this.icon.locate({
  type: LocatorContextType.Dynamic,
  param: name,
});
await element.click();
const visible = await element.isVisible();
```

Use this when you would otherwise resolve the same dynamic locator several times in one method.

---

## Common patterns

| Goal | Approach |
| ---- | -------- |
| **Row by content** | Cache locator with `{param}` matching row-identifying text; `Dynamic` + `param` |
| **Button (or link) by text** | Placeholder for label; `Dynamic` + `param` |
| **Container with heading** | Optional `WithinDynamicParent` if structure is parent-gated + fixed child keys |

---

## Layering reminder

- **Page object**: owns `AIElement` fields and calls `.click()` / `.fill()` / `.locate()` with context.
- **Business / scenario**: no locators; they call page methods that encapsulate dynamic context.
- **Cache**: holds `{param}` (and parent/child patterns as required by your locator system).

For full-stack examples (login + mistakes to avoid), see **`layer-flow-examples.md`**.
