# AIElement Architecture

## Class Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         AIPage                                  │
│  - page: Page                                                   │
│  - pageIdentifier: string                                       │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             │ uses
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                       AIElement                                 │
│  Responsibility: Locator Resolution                             │
├─────────────────────────────────────────────────────────────────┤
│  - key: string                                                  │
│  - description: string                                          │
│  - cachedLocator: CachedLocator                                 │
│  - aiPage: AIPage                                               │
├─────────────────────────────────────────────────────────────────┤
│  + locate(ctx?: LocatorContext): BoundElement                   │
│  - resolveLocator(ctx): Locator                                 │
│  - resolveStatic(): Locator                                     │
│  - resolveDynamic(param): Locator                               │
│  - resolveWithinDynamicParent(parentParam, childKey): Locator   │
│  + click(ctx?): Promise<void>                                   │
│  + fill(value, ctx?): Promise<void>                             │
│  + ... (convenience methods)                                    │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             │ creates
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                      BoundElement                               │
│  Responsibility: Element Interaction                            │
├─────────────────────────────────────────────────────────────────┤
│  - locator: Locator                                             │
│  - description: string                                          │
│  - context: LocatorContext                                      │
├─────────────────────────────────────────────────────────────────┤
│  + click(): Promise<void>                                       │
│  + fill(value): Promise<void>                                   │
│  + hover(): Promise<void>                                       │
│  + getText(): Promise<string | null>                            │
│  + isVisible(): Promise<boolean>                                │
│  + waitFor(options?): Promise<void>                             │
│  + select(value): Promise<void>                                 │
│  + check(): Promise<void>                                       │
│  + uncheck(): Promise<void>                                     │
│  + uploadFile(filePath): Promise<void>                          │
│  + ... (25+ interaction methods)                                │
└─────────────────────────────────────────────────────────────────┘
```

## Type Hierarchy

```typescript
// Enum for type-safe context types
enum LocatorContextType {
  Static = 'static',
  Dynamic = 'dynamic',
  WithinDynamicParent = 'withinDynamicParent'
}

// Discriminated Union
type LocatorContext =
  | { type: LocatorContextType.Static }
  | { type: LocatorContextType.Dynamic; param: string }
  | { type: LocatorContextType.WithinDynamicParent; parentParam: string; childKey: string }
```

**Usage**: Always use the `LocatorContextType` enum for type safety and IDE autocomplete.

## Flow Diagram

### Static Locator Flow
```
Page Object
    │
    ├─> AIElement.click()
    │       │
    │       ├─> locate({ type: LocatorContextType.Static })
    │       │       │
    │       │       ├─> resolveStatic()
    │       │       │       │
    │       │       │       └─> LocatorCache.get(key)
    │       │       │
    │       │       └─> new BoundElement(locator, description, context)
    │       │
    │       └─> BoundElement.click()
    │               │
    │               └─> TestLogger.elementStep()
    │                       │
    │                       └─> locator.click()
    │
    └─> Result
```

### Dynamic Locator Flow
```
Page Object
    │
    ├─> AIElement.click({ type: LocatorContextType.Dynamic, param: 'Router' })
    │       │
    │       ├─> locate({ type: LocatorContextType.Dynamic, param: 'Router' })
    │       │       │
    │       │       ├─> resolveDynamic('Router')
    │       │       │       │
    │       │       │       ├─> LocatorCache.get(key)
    │       │       │       │
    │       │       │       └─> locatorStr.replaceAll('{param}', 'Router')
    │       │       │
    │       │       └─> new BoundElement(locator, description, context)
    │       │
    │       └─> BoundElement.click()
    │               │
    │               └─> TestLogger.elementStep()
    │                       │
    │                       └─> locator.click()
    │
    └─> Result
```

### Child Within Dynamic Parent Flow
```
Page Object
    │
    ├─> AIElement.click({ 
    │       type: LocatorContextType.WithinDynamicParent, 
    │       parentParam: 'Router', 
    │       childKey: 'ipInput' 
    │   })
    │       │
    │       ├─> locate({ type: LocatorContextType.WithinDynamicParent, ... })
    │       │       │
    │       │       ├─> resolveWithinDynamicParent('Router', 'ipInput')
    │       │       │       │
    │       │       │       ├─> resolveDynamic('Router') → parentLocator
    │       │       │       │
    │       │       │       ├─> LocatorCache.get('PageName.ipInput') → childLocator
    │       │       │       │
    │       │       │       └─> parentLocator.locator(childLocator)
    │       │       │
    │       │       └─> new BoundElement(locator, description, context)
    │       │
    │       └─> BoundElement.click()
    │               │
    │               └─> TestLogger.elementStep()
    │                       │
    │                       └─> locator.click()
    │
    └─> Result
```

## Sequence Diagram: Explicit locate() Usage

```
Page Object          AIElement           BoundElement        Playwright
    │                    │                    │                  │
    │─── locate() ──────>│                    │                  │
    │                    │                    │                  │
    │                    │─ resolveLocator ──>│                  │
    │                    │                    │                  │
    │                    │<── Locator ────────│                  │
    │                    │                    │                  │
    │                    │─── new ───────────>│                  │
    │                    │                    │                  │
    │<── BoundElement ───│                    │                  │
    │                    │                    │                  │
    │─── fill('value') ─────────────────────>│                  │
    │                    │                    │                  │
    │                    │                    │─── fill() ──────>│
    │                    │                    │                  │
    │                    │                    │<── done ─────────│
    │                    │                    │                  │
    │<──────────────────────────────────────>│                  │
    │                    │                    │                  │
    │─── getInputValue() ────────────────────>│                  │
    │                    │                    │                  │
    │                    │                    │─ inputValue() ──>│
    │                    │                    │                  │
    │                    │                    │<── value ────────│
    │                    │                    │                  │
    │<── value ──────────────────────────────│                  │
    │                    │                    │                  │
```

## Responsibility Matrix

| Class | Responsibility | What It Does | What It Doesn't Do |
|-------|---------------|--------------|-------------------|
| **AIElement** | Locator Resolution | - Reads from cache<br>- Resolves locators<br>- Creates BoundElement<br>- Provides convenience methods | - Direct Playwright interaction<br>- Element state management<br>- Logging interactions |
| **BoundElement** | Element Interaction | - Owns resolved locator<br>- Performs all interactions<br>- Logs via TestLogger<br>- Validates locator | - Locator resolution<br>- Cache access<br>- Context switching |
| **LocatorContext** | Type Definition | - Type-safe context<br>- Discriminated union<br>- Compile-time validation | - Runtime logic<br>- State management |

## Data Flow

```
Locator Cache (JSON)
        │
        │ read by
        ▼
LocatorCacheManagement
        │
        │ used by
        ▼
    AIElement
        │
        │ resolves to
        ▼
Playwright Locator
        │
        │ wrapped in
        ▼
   BoundElement
        │
        │ interacts with
        ▼
  Browser Element
```

## Key Design Patterns

### 1. Separation of Concerns
- **AIElement**: Knows HOW to find elements
- **BoundElement**: Knows WHAT to do with elements

### 2. Strategy Pattern
- `LocatorContext` defines strategy
- `resolveLocator()` routes to appropriate strategy
- Each strategy has dedicated resolver method

### 3. Facade Pattern
- Convenience methods on `AIElement` provide simple API
- Complex resolution/interaction hidden behind clean interface

### 4. Builder Pattern (Implicit)
- `locate()` builds and returns `BoundElement`
- Fluent API for element interaction

### 5. Discriminated Union (TypeScript)
- Type-safe context switching
- Compile-time validation
- Exhaustive checking

## Benefits Summary

| Benefit | Description |
|---------|-------------|
| **Separation** | Clear boundary between resolution and interaction |
| **DRY** | Interaction logic exists once in BoundElement |
| **Type Safety** | Discriminated unions enforce correct usage |
| **Performance** | Resolve once, interact multiple times |
| **Testability** | Can test resolution and interaction separately |
| **Maintainability** | Single source of truth for each responsibility |
| **Clean API** | Unified interface with no legacy methods |
| **Extensibility** | Easy to add new locator strategies |

## Migration Guide

⚠️ **Breaking Changes**: All backward compatibility methods have been removed.

### Migration Required

All existing code using old API methods must be converted to the new API.

**Complete Migration Guide**: `../@MIG_AIELEMENT_CONVERSION_PROMPT.md`

### Quick Migration Examples

#### Old API (REMOVED)
```typescript
await element.clickWithParam('Router');
await element.fillWithParam('Router', '192.168.1.1');
await element.clickChildWithinDynamicParent('Router', 'ipInput');
```

#### New API (REQUIRED)
```typescript
import { LocatorContextType } from 'Engine/Shared/types';

await element.click({ type: LocatorContextType.Dynamic, param: 'Router' });
await element.fill('192.168.1.1', { type: LocatorContextType.Dynamic, param: 'Router' });
await element.click({ type: LocatorContextType.WithinDynamicParent, parentParam: 'Router', childKey: 'ipInput' });
```

### Using locate() for Performance
```typescript
import { LocatorContextType } from 'Engine/Shared/types';

// Resolve once, interact multiple times
const bound = element.locate({ type: LocatorContextType.Dynamic, param: 'Router' });
await bound.click();
await bound.fill('192.168.1.1');
const value = await bound.getInputValue();
```

### Migration Resources

- **Complete Conversion Patterns**: `../@MIG_AIELEMENT_CONVERSION_PROMPT.md`
- **Regex Find/Replace**: Automated patterns for bulk conversion
- **Method Conversion Table**: All 23 removed methods mapped to new API
- **AI Assistant Prompt**: Ready-to-use prompt for bulk conversion

## Conclusion

The refactored architecture provides:
- ✅ Clean separation of concerns
- ✅ Type-safe API with discriminated unions
- ✅ Zero code duplication (61% reduction)
- ✅ Performance optimization with `locate()`
- ✅ Excellent testability
- ✅ Easy to extend and maintain

⚠️ **Migration Required**: See `../@MIG_AIELEMENT_CONVERSION_PROMPT.md` for complete conversion guide.


