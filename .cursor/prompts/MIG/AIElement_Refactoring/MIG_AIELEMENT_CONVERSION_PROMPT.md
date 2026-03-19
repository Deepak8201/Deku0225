# AIElement Architecture Conversion Prompt

## Purpose
This document provides patterns and instructions for converting code from the old AIElement API (with separate methods like `clickWithParam`, `fillChildWithinDynamicParent`) to the new unified API using `LocatorContext`.

## LocatorContext Type

The new API uses `LocatorContext` discriminated union with `LocatorContextType` enum:

```typescript
import { LocatorContextType } from 'Engine/Shared/types';

// Three context types:
{ type: LocatorContextType.Static }
{ type: LocatorContextType.Dynamic, param: string }
{ type: LocatorContextType.WithinDynamicParent, parentParam: string, childKey: string }
```

**Important**: Always use the `LocatorContextType` enum for type safety and IDE autocomplete.

## Quick Reference: Conversion Patterns

### Pattern 1: Static Locator (No Change)
```typescript
// Old API (no change needed)
await element.click();
await element.fill('value');
await element.hover();

// New API (same)
await element.click();
await element.fill('value');
await element.hover();
```

### Pattern 2: Dynamic Locator (Parameterized)
```typescript
// Old API - separate methods with "WithParam" suffix
await element.clickWithParam('Router');
await element.fillWithParam('Router', '192.168.1.1');
await element.isVisibleWithParam('Router');
await element.waitForWithParam('Router', { timeout: 5000 });
await element.getTextWithParam('Router');
await element.selectWithParam('Router', 'option1');
await element.clearWithParam('Router');
await element.getInputValueWithParam('Router');

// New API - unified method with context parameter
import { LocatorContextType } from 'Engine/Shared/types';

await element.click({ type: LocatorContextType.Dynamic, param: 'Router' });
await element.fill('192.168.1.1', { type: LocatorContextType.Dynamic, param: 'Router' });
await element.isVisible({ type: LocatorContextType.Dynamic, param: 'Router' });
await element.waitFor({ timeout: 5000 }, { type: LocatorContextType.Dynamic, param: 'Router' });
await element.getText({ type: LocatorContextType.Dynamic, param: 'Router' });
await element.select('option1', { type: LocatorContextType.Dynamic, param: 'Router' });
await element.clear({ type: LocatorContextType.Dynamic, param: 'Router' });
await element.getInputValue({ type: LocatorContextType.Dynamic, param: 'Router' });
```

### Pattern 3: Text-Based Dynamic Locator
```typescript
// Old API - methods with "WithText" suffix
await element.clickWithText('Submit');
await element.isVisibleWithText('Submit', { timeout: 3000 });
await element.waitForWithText('Submit', { timeout: 5000 });

// New API - use dynamic context (text is just a param)
import { LocatorContextType } from 'Engine/Shared/types';

await element.click({ type: LocatorContextType.Dynamic, param: 'Submit' });
await element.isVisible({ type: LocatorContextType.Dynamic, param: 'Submit' });
await element.waitFor({ timeout: 5000 }, { type: LocatorContextType.Dynamic, param: 'Submit' });
```

### Pattern 4: Child Within Dynamic Parent
```typescript
// Old API - methods with "ChildWithinDynamicParent" suffix
await element.clickChildWithinDynamicParent('Router', 'ipAddressInput');
await element.fillChildWithinDynamicParent('Router', 'ipAddressInput', '192.168.1.1');
await element.isChildVisibleWithinDynamicParent('Router', 'ipAddressInput');
await element.waitForChildWithinDynamicParent('Router', 'ipAddressInput', { timeout: 5000 });
await element.getChildTextWithinDynamicParent('Router', 'statusLabel');
await element.hoverChildWithinDynamicParent('Router', 'editButton');
await element.selectChildOptionWithinDynamicParent('Router', 'protocolDropdown', 'SNMP');
await element.checkChildWithinDynamicParent('Router', 'enableLoggingCheckbox');
await element.uncheckChildWithinDynamicParent('Router', 'enableLoggingCheckbox');
await element.getChildInputValueWithinDynamicParent('Router', 'ipAddressInput');
await element.countChildrenWithinDynamicParent('Router', 'listItems');

// New API - unified method with withinDynamicParent context
import { LocatorContextType } from 'Engine/Shared/types';

await element.click({ type: LocatorContextType.WithinDynamicParent, parentParam: 'Router', childKey: 'ipAddressInput' });
await element.fill('192.168.1.1', { type: LocatorContextType.WithinDynamicParent, parentParam: 'Router', childKey: 'ipAddressInput' });
await element.isVisible({ type: LocatorContextType.WithinDynamicParent, parentParam: 'Router', childKey: 'ipAddressInput' });
await element.waitFor({ timeout: 5000 }, { type: LocatorContextType.WithinDynamicParent, parentParam: 'Router', childKey: 'ipAddressInput' });
await element.getText({ type: LocatorContextType.WithinDynamicParent, parentParam: 'Router', childKey: 'statusLabel' });
await element.hover({ type: LocatorContextType.WithinDynamicParent, parentParam: 'Router', childKey: 'editButton' });
await element.select('SNMP', { type: LocatorContextType.WithinDynamicParent, parentParam: 'Router', childKey: 'protocolDropdown' });
await element.check({ type: LocatorContextType.WithinDynamicParent, parentParam: 'Router', childKey: 'enableLoggingCheckbox' });
await element.uncheck({ type: LocatorContextType.WithinDynamicParent, parentParam: 'Router', childKey: 'enableLoggingCheckbox' });
await element.getInputValue({ type: LocatorContextType.WithinDynamicParent, parentParam: 'Router', childKey: 'ipAddressInput' });
await element.count({ type: LocatorContextType.WithinDynamicParent, parentParam: 'Router', childKey: 'listItems' });
```

### Pattern 5: File Upload
```typescript
// Old API
await element.uploadFile(filePath);
await element.uploadFileWithParam('document', filePath);

// New API
import { LocatorContextType } from 'Engine/Shared/types';

await element.uploadFile(filePath);
await element.uploadFile(filePath, { type: LocatorContextType.Dynamic, param: 'document' });
```

## Complete Method Conversion Table

**Note**: Import `LocatorContextType` from `'Engine/Shared/types'` for all conversions.

| Old Method | New Method | Context |
|------------|------------|---------|
| `click()` | `click()` | Static |
| `clickWithParam(param)` | `click({ type: LocatorContextType.Dynamic, param })` | Dynamic |
| `clickWithText(text)` | `click({ type: LocatorContextType.Dynamic, param: text })` | Dynamic |
| `clickChildWithinDynamicParent(parent, child)` | `click({ type: LocatorContextType.WithinDynamicParent, parentParam: parent, childKey: child })` | Complex |
| `fill(value)` | `fill(value)` | Static |
| `fillWithParam(param, value)` | `fill(value, { type: LocatorContextType.Dynamic, param })` | Dynamic |
| `fillChildWithinDynamicParent(parent, child, value)` | `fill(value, { type: LocatorContextType.WithinDynamicParent, parentParam: parent, childKey: child })` | Complex |
| `isVisible()` | `isVisible()` | Static |
| `isVisibleWithParam(param)` | `isVisible({ type: LocatorContextType.Dynamic, param })` | Dynamic |
| `isVisibleWithText(text, opts)` | `isVisible({ type: LocatorContextType.Dynamic, param: text })` | Dynamic |
| `isChildVisibleWithinDynamicParent(parent, child)` | `isVisible({ type: LocatorContextType.WithinDynamicParent, parentParam: parent, childKey: child })` | Complex |
| `waitFor(opts)` | `waitFor(opts)` | Static |
| `waitForWithParam(param, opts)` | `waitFor(opts, { type: LocatorContextType.Dynamic, param })` | Dynamic |
| `waitForWithText(text, opts)` | `waitFor(opts, { type: LocatorContextType.Dynamic, param: text })` | Dynamic |
| `waitForChildWithinDynamicParent(parent, child, opts)` | `waitFor(opts, { type: LocatorContextType.WithinDynamicParent, parentParam: parent, childKey: child })` | Complex |
| `getText()` | `getText()` | Static |
| `getTextWithParam(param)` | `getText({ type: LocatorContextType.Dynamic, param })` | Dynamic |
| `getChildTextWithinDynamicParent(parent, child)` | `getText({ type: LocatorContextType.WithinDynamicParent, parentParam: parent, childKey: child })` | Complex |
| `getInputValue()` | `getInputValue()` | Static |
| `getInputValueWithParam(param)` | `getInputValue({ type: LocatorContextType.Dynamic, param })` | Dynamic |
| `getChildInputValueWithinDynamicParent(parent, child)` | `getInputValue({ type: LocatorContextType.WithinDynamicParent, parentParam: parent, childKey: child })` | Complex |
| `select(value)` | `select(value)` | Static |
| `selectWithParam(param, value)` | `select(value, { type: LocatorContextType.Dynamic, param })` | Dynamic |
| `selectChildOptionWithinDynamicParent(parent, child, value)` | `select(value, { type: LocatorContextType.WithinDynamicParent, parentParam: parent, childKey: child })` | Complex |
| `check()` | `check()` | Static |
| `checkChildWithinDynamicParent(parent, child)` | `check({ type: LocatorContextType.WithinDynamicParent, parentParam: parent, childKey: child })` | Complex |
| `uncheck()` | `uncheck()` | Static |
| `uncheckChildWithinDynamicParent(parent, child)` | `uncheck({ type: LocatorContextType.WithinDynamicParent, parentParam: parent, childKey: child })` | Complex |
| `clear()` | `clear()` | Static |
| `clearWithParam(param)` | `clear({ type: LocatorContextType.Dynamic, param })` | Dynamic |
| `hover()` | `hover()` | Static |
| `hoverChildWithinDynamicParent(parent, child)` | `hover({ type: LocatorContextType.WithinDynamicParent, parentParam: parent, childKey: child })` | Complex |
| `count()` | `count()` | Static |
| `countChildrenWithinDynamicParent(parent, child)` | `count({ type: LocatorContextType.WithinDynamicParent, parentParam: parent, childKey: child })` | Complex |
| `uploadFile(path)` | `uploadFile(path)` | Static |
| `uploadFileWithParam(param, path)` | `uploadFile(path, { type: LocatorContextType.Dynamic, param })` | Dynamic |

## Regex Find/Replace Patterns

**Note**: After applying regex patterns, add `import { LocatorContextType } from 'Engine/Shared/types';` at the top of each file.

### Pattern 1: clickWithParam
```regex
Find:    \.clickWithParam\(([^)]+)\)
Replace: .click({ type: LocatorContextType.Dynamic, param: $1 })
```

### Pattern 2: fillWithParam
```regex
Find:    \.fillWithParam\(([^,]+),\s*([^)]+)\)
Replace: .fill($2, { type: LocatorContextType.Dynamic, param: $1 })
```

### Pattern 3: isVisibleWithParam
```regex
Find:    \.isVisibleWithParam\(([^)]+)\)
Replace: .isVisible({ type: LocatorContextType.Dynamic, param: $1 })
```

### Pattern 4: waitForWithParam
```regex
Find:    \.waitForWithParam\(([^,]+),\s*([^)]+)\)
Replace: .waitFor($2, { type: LocatorContextType.Dynamic, param: $1 })
```

### Pattern 5: getTextWithParam
```regex
Find:    \.getTextWithParam\(([^)]+)\)
Replace: .getText({ type: LocatorContextType.Dynamic, param: $1 })
```

### Pattern 6: clickWithText
```regex
Find:    \.clickWithText\(([^)]+)\)
Replace: .click({ type: LocatorContextType.Dynamic, param: $1 })
```

### Pattern 7: isVisibleWithText
```regex
Find:    \.isVisibleWithText\(([^,]+),\s*([^)]+)\)
Replace: .isVisible({ type: LocatorContextType.Dynamic, param: $1 })
```

### Pattern 8: clickChildWithinDynamicParent
```regex
Find:    \.clickChildWithinDynamicParent\(([^,]+),\s*([^)]+)\)
Replace: .click({ type: LocatorContextType.WithinDynamicParent, parentParam: $1, childKey: $2 })
```

### Pattern 9: fillChildWithinDynamicParent
```regex
Find:    \.fillChildWithinDynamicParent\(([^,]+),\s*([^,]+),\s*([^)]+)\)
Replace: .fill($3, { type: LocatorContextType.WithinDynamicParent, parentParam: $1, childKey: $2 })
```

### Pattern 10: isChildVisibleWithinDynamicParent
```regex
Find:    \.isChildVisibleWithinDynamicParent\(([^,]+),\s*([^)]+)\)
Replace: .isVisible({ type: LocatorContextType.WithinDynamicParent, parentParam: $1, childKey: $2 })
```

## Advanced: Using locate() for Performance

When you need to interact with the same element multiple times, use `locate()`:

### Before (Multiple Resolutions)
```typescript
// Each call resolves the locator again
await element.fillWithParam('Router', '192.168.1.1');
const value = await element.getInputValueWithParam('Router');
const visible = await element.isVisibleWithParam('Router');
```

### After (Single Resolution)
```typescript
import { LocatorContextType } from 'Engine/Shared/types';

// Resolve once, interact multiple times
const bound = element.locate({ type: LocatorContextType.Dynamic, param: 'Router' });
await bound.fill('192.168.1.1');
const value = await bound.getInputValue();
const visible = await bound.isVisible();
```

## Step-by-Step Conversion Process

### Step 1: Identify Pattern
Look at the method name to identify which pattern it uses:
- No suffix → Static (no change needed)
- `WithParam` suffix → Dynamic
- `WithText` suffix → Dynamic (text is just a param)
- `ChildWithinDynamicParent` suffix → Complex

### Step 2: Apply Conversion
Use the conversion table or regex patterns above to convert the method call.

### Step 3: Test
Run your tests to ensure the conversion works correctly.

### Step 4: Optimize (Optional)
If you interact with the same element multiple times, consider using `locate()` for better performance.

## Example: Complete Page Object Conversion

### Before (Old API)
```typescript
class DeviceConfigPage extends AIPage {
  private deviceOption: AIElement;
  private configPanel: AIElement;

  async selectAndConfigureDevice(deviceType: string, ipAddress: string): Promise<void> {
    await this.deviceOption.clickWithParam(deviceType);
    await this.configPanel.fillChildWithinDynamicParent(deviceType, 'ipAddressInput', ipAddress);
    const value = await this.configPanel.getChildInputValueWithinDynamicParent(deviceType, 'ipAddressInput');
    const visible = await this.configPanel.isChildVisibleWithinDynamicParent(deviceType, 'statusLabel');
    TestLogger.info(`Device configured: ${deviceType}, IP: ${value}, Status visible: ${visible}`);
  }
}
```

### After (New API - Method 1: Direct Conversion)
```typescript
import { LocatorContextType } from 'Engine/Shared/types';

class DeviceConfigPage extends AIPage {
  private deviceOption: AIElement;
  private configPanel: AIElement;

  async selectAndConfigureDevice(deviceType: string, ipAddress: string): Promise<void> {
    await this.deviceOption.click({ type: LocatorContextType.Dynamic, param: deviceType });
    await this.configPanel.fill(ipAddress, { 
      type: LocatorContextType.WithinDynamicParent, 
      parentParam: deviceType, 
      childKey: 'ipAddressInput' 
    });
    const value = await this.configPanel.getInputValue({ 
      type: LocatorContextType.WithinDynamicParent, 
      parentParam: deviceType, 
      childKey: 'ipAddressInput' 
    });
    const visible = await this.configPanel.isVisible({ 
      type: LocatorContextType.WithinDynamicParent, 
      parentParam: deviceType, 
      childKey: 'statusLabel' 
    });
    TestLogger.info(`Device configured: ${deviceType}, IP: ${value}, Status visible: ${visible}`);
  }
}
```

### After (New API - Method 2: Optimized with locate())
```typescript
import { LocatorContextType } from 'Engine/Shared/types';

class DeviceConfigPage extends AIPage {
  private deviceOption: AIElement;
  private configPanel: AIElement;

  async selectAndConfigureDevice(deviceType: string, ipAddress: string): Promise<void> {
    // Select device type
    await this.deviceOption.click({ type: LocatorContextType.Dynamic, param: deviceType });
    
    // Resolve IP input once, interact multiple times
    const ipInput = this.configPanel.locate({ 
      type: LocatorContextType.WithinDynamicParent, 
      parentParam: deviceType, 
      childKey: 'ipAddressInput' 
    });
    await ipInput.fill(ipAddress);
    const value = await ipInput.getInputValue();
    
    // Check status visibility
    const visible = await this.configPanel.isVisible({ 
      type: LocatorContextType.WithinDynamicParent, 
      parentParam: deviceType, 
      childKey: 'statusLabel' 
    });
    
    TestLogger.info(`Device configured: ${deviceType}, IP: ${value}, Status visible: ${visible}`);
  }
}
```

## Common Mistakes to Avoid

### ❌ Mistake 1: Wrong Parameter Order
```typescript
import { LocatorContextType } from 'Engine/Shared/types';

// Wrong - value before context
await element.fill({ type: LocatorContextType.Dynamic, param: 'Router' }, '192.168.1.1');

// Correct - value first, context second
await element.fill('192.168.1.1', { type: LocatorContextType.Dynamic, param: 'Router' });
```

### ❌ Mistake 2: Missing Context Type
```typescript
import { LocatorContextType } from 'Engine/Shared/types';

// Wrong - missing 'type' field
await element.click({ param: 'Router' });

// Correct - include 'type' field
await element.click({ type: LocatorContextType.Dynamic, param: 'Router' });
```

### ❌ Mistake 3: Wrong Context Type
```typescript
import { LocatorContextType } from 'Engine/Shared/types';

// Wrong - using Dynamic for child within parent
await element.click({ type: LocatorContextType.Dynamic, param: 'Router', childKey: 'ipInput' });

// Correct - use WithinDynamicParent
await element.click({ type: LocatorContextType.WithinDynamicParent, parentParam: 'Router', childKey: 'ipInput' });
```

### ❌ Mistake 4: Forgetting Options Parameter
```typescript
import { LocatorContextType } from 'Engine/Shared/types';

// Wrong - options missing for waitFor
await element.waitFor({ type: LocatorContextType.Dynamic, param: 'Router' });

// Correct - options first, context second
await element.waitFor({ timeout: 5000 }, { type: LocatorContextType.Dynamic, param: 'Router' });
```

## AI Assistant Prompt for Bulk Conversion

Use this prompt with an AI assistant to convert your code:

```
I need to convert AIElement method calls from the old API to the new API. 

Old API uses separate methods:
- clickWithParam(param)
- fillWithParam(param, value)
- clickChildWithinDynamicParent(parent, child)

New API uses unified methods with LocatorContextType enum:
- click({ type: LocatorContextType.Dynamic, param })
- fill(value, { type: LocatorContextType.Dynamic, param })
- click({ type: LocatorContextType.WithinDynamicParent, parentParam, childKey })

Please convert the following code:
[PASTE YOUR CODE HERE]

Follow these rules:
1. Add import: import { LocatorContextType } from 'Engine/Shared/types';
2. Static methods (no suffix) remain unchanged
3. Methods with "WithParam" or "WithText" → use { type: LocatorContextType.Dynamic, param }
4. Methods with "ChildWithinDynamicParent" → use { type: LocatorContextType.WithinDynamicParent, parentParam, childKey }
5. For methods with options (like waitFor), options come first, context second
6. For fill methods, value comes first, context second
7. Preserve all variable names and logic
8. Use LocatorContextType enum, not string literals
```

## Summary

The new API provides:
- ✅ Unified interface (one method name instead of three)
- ✅ Type safety (TypeScript enforces correct context structure)
- ✅ Better performance (can use locate() to resolve once)
- ✅ Cleaner code (less method name variations)
- ✅ Easier to maintain (single source of truth)

Convert your code using the patterns and tools provided in this document!

