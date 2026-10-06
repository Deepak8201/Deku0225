import { Locator } from '@playwright/test';
import { LocatorCacheManagement } from './LocatorCacheManagement';
import { AIPage } from './AIPage';
import { BoundElement } from './BoundElement';
import { CachedLocator, LocatorContext, LocatorContextType, LocatorStep, WaitOptions, LocatorNotFoundError } from './types';

/**
 * AIElement - Enhanced Element Locator Resolution Class
 *
 * @description
 * AIElement is responsible for resolving locators from cache and creating BoundElement instances
 * for interaction. It supports three types of locator resolution:
 * - Static: Direct cache lookup
 * - Dynamic: Parameterized locator with {param} substitution
 * - WithinDynamicParent: Child element within dynamically identified parent
 *
 * @features
 * - Intelligent caching system for performance optimization
 * - Cache-based element location
 * - Support for static, dynamic, and complex locators
 * - Iframe support using >>> combinator syntax
 * - Creates BoundElement instances for interaction
 * - Convenience methods that delegate to BoundElement
 *
 * @dependencies
 * - AIPage instance that provides access to Playwright Page
 * - Locator cache file at tests/Utils/locator_cache.json
 * - BoundElement for element interactions
 *
 * @usage
 * ```typescript
 * import { AIPage } from 'SharedRuntime/AIPage';
 * import { AIElement } from 'SharedRuntime/AIElement';
 *
 * class MyPage extends AIPage {
 *   private loginButton: AIElement;
 *   private usernameField: AIElement;
 *
 *   constructor(page: Page) {
 *     super(page, 'MyPage');
 *     this.loginButton = new AIElement(this, 'loginButton', 'Login button');
 *     this.usernameField = new AIElement(this, 'usernameField', 'Username input field');
 *   }
 *
 *   async performLogin(username: string): Promise<void> {
 *     // Option 1: Direct convenience methods
 *     await this.usernameField.fill(username);
 *     await this.loginButton.click();
 *
 *     // Option 2: Explicit locate() for more control
 *     const field = this.usernameField.locate();
 *     await field.fill(username);
 *     const value = await field.getInputValue();
 *   }
 * }
 * ```
 *
 * @author AI Test Automation Framework
 * @version 2.0.0
 * @since 2025
 */

export class AIElement {
  private description: string;
  private key: string;
  private locatorKey: string;
  private pageIdentifier: string;
  private cachedLocator: CachedLocator | null;
  private aiPage: AIPage;

  /**
   * Create a new AIElement instance
   * @param aiPage - AIPage instance that this element belongs to
   * @param locatorKey - Locator key within the page (e.g., "schoolNameInput")
   * @param description - Optional natural language description of the element (defaults to locatorKey)
   */
  constructor(aiPage: AIPage, locatorKey: string, description?: string) {
    this.aiPage = aiPage;
    this.pageIdentifier = aiPage.getPageIdentifier();
    this.locatorKey = locatorKey;
    this.key = `${this.pageIdentifier}.${this.locatorKey}`;
    this.description = description || locatorKey;
    this.cachedLocator = LocatorCacheManagement.get(this.key);
  }

  /**
   * Get the human-readable description of this element
   * @returns The element description
   */
  getDescription(): string {
    return this.description;
  }

  // ============================================================================
  // LOCATOR RESOLUTION - Creates BoundElement
  // ============================================================================

  /**
   * Locate and bind element based on context
   * Returns a BoundElement ready for interaction
   * 
   * @param ctx - Locator context (static, dynamic, or withinDynamicParent)
   * @returns BoundElement instance ready for interaction
   * 
   * @example
   * // Static locator
   * const element = myElement.locate();
   * await element.click();
   * 
   * @example
   * // Dynamic locator
   * const element = myElement.locate({ type: LocatorContextType.Dynamic, param: 'Router' });
   * await element.fill('192.168.1.1');
   * 
   * @example
   * // Child within dynamic parent
   * const element = myElement.locate({ 
   *   type: LocatorContextType.WithinDynamicParent, 
   *   parentParam: 'Router', 
   *   childKey: 'ipAddressInput' 
   * });
   * await element.fill('192.168.1.1');
   */
  locate(ctx: LocatorContext = { type: LocatorContextType.Static }): BoundElement {
    const locator = this.resolveLocator(ctx);
    return new BoundElement(locator, this.description, ctx);
  }

  /**
   * Recursively replace all occurrences of `placeholder` with `value` inside a
   * LocatorStep args array. Handles nested objects and arrays so that placeholders
   * inside `{ hasText: '{param}' }` options are substituted correctly.
   * @private
   */
  private deepReplaceParam(
    args: LocatorStep['args'],
    placeholder: string,
    value: string
  ): LocatorStep['args'] {
    return args.map(arg => {
      if (typeof arg === 'string') {
        return arg.replaceAll(placeholder, value);
      }
      if (typeof arg === 'object' && arg !== null && !Array.isArray(arg)) {
        const replaced: Record<string, unknown> = {};
        for (const [k, v] of Object.entries(arg)) {
          replaced[k] = typeof v === 'string' ? v.replaceAll(placeholder, value) : v;
        }
        return replaced;
      }
      return arg;
    });
  }

  /**
   * Execute a LocatorStep chain starting from the current page.
   * Optionally replaces `{param}` placeholders with the given value.
   * @private
   */
  private executeLocatorChain(steps: LocatorStep[], param?: string): Locator {
    let current: any = this.aiPage.getPage();
    for (const step of steps) {
      const resolvedArgs = param
        ? this.deepReplaceParam(step.args, '{param}', param)
        : step.args;
      current = (current[step.method] as (...a: unknown[]) => unknown)(...resolvedArgs);
    }
    return current as Locator;
  }

  /**
   * Resolve Playwright locator based on context
   * @private
   */
  private resolveLocator(ctx: LocatorContext): Locator {
    switch (ctx.type) {
      case LocatorContextType.Static:
        return this.resolveStatic();

      case LocatorContextType.Dynamic:
        return this.resolveDynamic(ctx.param);

      case LocatorContextType.WithinDynamicParent:
        return this.resolveWithinDynamicParent(ctx.parentParam, ctx.childKey);
    }
  }

  /**
   * Resolve static locator from cache.
   * Supports LocatorStep[] (Playwright API chain) and string (legacy CSS/XPath).
   * @private
   */
  private resolveStatic(): Locator {
    const locator = this.cachedLocator?.locator;
    if (!locator) {
      throw new LocatorNotFoundError(
        `${this.description} - No cached locator available. Please ensure the element exists in the cache at tests/Utils/locator_cache.json`,
        this.key
      );
    }

    if (Array.isArray(locator)) {
      return this.executeLocatorChain(locator);
    }

    if (locator.includes('>>>')) {
      return this.findInIframe(locator);
    }

    return this.aiPage.getPage().locator(locator);
  }

  /**
   * Resolve dynamic locator with {param} substitution.
   * Supports LocatorStep[] (Playwright API chain) and string (legacy CSS/XPath).
   * @private
   */
  private resolveDynamic(param: string): Locator {
    const locator = this.cachedLocator?.locator;
    if (!locator) {
      throw new Error(
        `No cached locator template found for "${this.description}". Parameterized locators require a cached template with {param} placeholder.`
      );
    }

    if (Array.isArray(locator)) {
      return this.executeLocatorChain(locator, param);
    }

    const locatorStr = locator.replaceAll('{param}', param);
    if (locatorStr.includes('>>>')) {
      return this.findInIframe(locatorStr);
    }

    return this.aiPage.getPage().locator(locatorStr);
  }

  /**
   * Resolve child locator within a dynamic parent.
   * Both parent and child support LocatorStep[] and legacy string formats.
   * @private
   */
  private resolveWithinDynamicParent(parentParam: string, childKey: string): Locator {
    const parentLocator = this.resolveDynamic(parentParam);

    const childCacheKey = `${this.pageIdentifier}.${childKey}`;
    const childCachedLocator = LocatorCacheManagement.get(childCacheKey);

    if (!childCachedLocator?.locator) {
      throw new Error(
        `No cached locator found for child element "${childKey}" in page "${this.pageIdentifier}". ` +
        `Expected cache key: ${childCacheKey}`
      );
    }

    const childLocator = childCachedLocator.locator;

    if (Array.isArray(childLocator)) {
      let current: any = parentLocator;
      for (const step of childLocator) {
        current = (current[step.method] as (...a: unknown[]) => unknown)(...step.args);
      }
      return current as Locator;
    }

    if (childLocator.includes('>>>')) {
      const parts = childLocator.split('>>>').map(s => s.trim()).filter(s => s.length > 0);

      if (parts.length < 2) {
        throw new Error(`Invalid iframe locator format: ${childLocator}. Expected format: "iframe#id >>> .element"`);
      }

      const iframePart: string = parts[0]!;
      const elementPart: string = parts.slice(1).join(' >>> ') || parts[1]!;

      const scopedIframe = parentLocator.frameLocator(iframePart);
      return scopedIframe.locator(elementPart);
    }

    return parentLocator.locator(childLocator);
  }

  /**
   * Find element inside iframe using legacy `>>>` syntax (CSS/XPath only).
   * @private
   */
  private findInIframe(locatorStr: string): Locator {
    const parts = locatorStr.split('>>>').map(s => s.trim());

    if (parts.length < 2) {
      throw new Error(`Invalid iframe locator format: ${locatorStr}. Expected format: "iframe#id >>> .element"`);
    }

    let currentLocator: any = this.aiPage.getPage();

    for (let i = 0; i < parts.length - 1; i++) {
      const iframePart = parts[i];
      currentLocator = currentLocator.frameLocator(iframePart);
    }

    const elementSelector = parts[parts.length - 1];
    return currentLocator.locator(elementSelector);
  }

  // ============================================================================
  // CONVENIENCE METHODS - Delegate to BoundElement
  // ============================================================================
  // These methods provide backward compatibility and convenience.
  // They create a BoundElement and immediately call the corresponding method.
  // ============================================================================

  /**
   * Click the element (convenience method)
   * @param ctx - Optional locator context
   * @returns Promise<void>
   */
  async click(ctx: LocatorContext = { type: LocatorContextType.Static }): Promise<void> {
    return await this.locate(ctx).click();
  }

  /**
   * Force click the element (convenience method)
   * @param ctx - Optional locator context
   * @returns Promise<void>
   */
  async forceClick(ctx: LocatorContext = { type: LocatorContextType.Static }): Promise<void> {
    return await this.locate(ctx).forceClick();
  }

  /**
   * Fill the element with a value (convenience method)
   * @param value - Value to fill
   * @param ctx - Optional locator context
   * @returns Promise<void>
   */
  async fill(value: string, ctx: LocatorContext = { type: LocatorContextType.Static }): Promise<void> {
    return await this.locate(ctx).fill(value);
  }

  /**
   * Hover over the element (convenience method)
   * @param ctx - Optional locator context
   * @returns Promise<void>
   */
  async hover(ctx: LocatorContext = { type: LocatorContextType.Static }): Promise<void> {
    return await this.locate(ctx).hover();
  }

  /**
   * Select an option (convenience method)
   * @param value - Value(s) to select
   * @param ctx - Optional locator context
   * @returns Promise<void>
   */
  async select(value: string | string[], ctx: LocatorContext = { type: LocatorContextType.Static }): Promise<void> {
    return await this.locate(ctx).select(value);
  }

  /**
   * Get text content (convenience method)
   * @param ctx - Optional locator context
   * @returns Promise<string | null>
   */
  async getText(ctx: LocatorContext = { type: LocatorContextType.Static }): Promise<string | null> {
    return await this.locate(ctx).getText();
  }

  /**
   * Get selected value (convenience method)
   * @param ctx - Optional locator context
   * @returns Promise<string | null>
   */
  async getSelectedValue(ctx: LocatorContext = { type: LocatorContextType.Static }): Promise<string | null> {
    return await this.locate(ctx).getSelectedValue();
  }

  /**
   * Get input value (convenience method)
   * @param ctx - Optional locator context
   * @returns Promise<string>
   */
  async getInputValue(ctx: LocatorContext = { type: LocatorContextType.Static }): Promise<string> {
    return await this.locate(ctx).getInputValue();
  }

  /**
   * Check if element is visible (convenience method)
   * @param ctx - Optional locator context
   * @returns Promise<boolean>
   */
  async isVisible(ctx: LocatorContext = { type: LocatorContextType.Static }): Promise<boolean> {
    return await this.locate(ctx).isVisible();
  }

  /**
   * Wait for element (convenience method)
   * @param options - Wait options
   * @param ctx - Optional locator context
   * @returns Promise<void>
   */
  async waitFor(options: WaitOptions = {}, ctx: LocatorContext = { type: LocatorContextType.Static }): Promise<void> {
    return await this.locate(ctx).waitFor(options);
  }

  /**
   * Check checkbox (convenience method)
   * @param ctx - Optional locator context
   * @returns Promise<void>
   */
  async check(ctx: LocatorContext = { type: LocatorContextType.Static }): Promise<void> {
    return await this.locate(ctx).check();
  }

  /**
   * Uncheck checkbox (convenience method)
   * @param ctx - Optional locator context
   * @returns Promise<void>
   */
  async uncheck(ctx: LocatorContext = { type: LocatorContextType.Static }): Promise<void> {
    return await this.locate(ctx).uncheck();
  }

  /**
   * Clear input (convenience method)
   * @param ctx - Optional locator context
   * @returns Promise<void>
   */
  async clear(ctx: LocatorContext = { type: LocatorContextType.Static }): Promise<void> {
    return await this.locate(ctx).clear();
  }

  /**
   * Type into the element one character at a time (convenience method)
   * @param value - Value to type
   * @param ctx - Optional locator context
   * @param options - Optional typing options (delay, etc.)
   * @returns Promise<void>
   */
  async type(value: string, ctx: LocatorContext = { type: LocatorContextType.Static }, options?: { delay?: number }): Promise<void> {
    return await this.locate(ctx).type(value, options);
  }

  /**
   * Press a single key on the element (convenience method)
   * @param key - Key to press (e.g. 'Enter', 'Tab')
   * @param ctx - Optional locator context
   * @returns Promise<void>
   */
  async press(key: string, ctx: LocatorContext = { type: LocatorContextType.Static }): Promise<void> {
    return await this.locate(ctx).press(key);
  }

  /**
   * Scroll element into view if needed (convenience method)
   * @param ctx - Optional locator context
   * @returns Promise<void>
   */
  async scrollIntoViewIfNeeded(ctx: LocatorContext = { type: LocatorContextType.Static }): Promise<void> {
    return await this.locate(ctx).scrollIntoViewIfNeeded();
  }

  /**
   * Focus the element (convenience method)
   * @param ctx - Optional locator context
   * @returns Promise<void>
   */
  async focus(ctx: LocatorContext = { type: LocatorContextType.Static }): Promise<void> {
    return await this.locate(ctx).focus();
  }

  /**
   * Upload file(s) (convenience method)
   * @param filePath - Path to file(s)
   * @param ctx - Optional locator context
   * @returns Promise<void>
   */
  async uploadFile(filePath: string | string[], ctx: LocatorContext = { type: LocatorContextType.Static }): Promise<void> {
    return await this.locate(ctx).uploadFile(filePath);
  }

  /**
   * Get uploaded files (convenience method)
   * @param ctx - Optional locator context
   * @returns Promise<string[]>
   */
  async getUploadedFiles(ctx: LocatorContext = { type: LocatorContextType.Static }): Promise<string[]> {
    return await this.locate(ctx).getUploadedFiles();
  }

  /**
   * Clear uploaded files (convenience method)
   * @param ctx - Optional locator context
   * @returns Promise<void>
   */
  async clearUploadedFiles(ctx: LocatorContext = { type: LocatorContextType.Static }): Promise<void> {
    return await this.locate(ctx).clearUploadedFiles();
  }

  /**
   * Get text at index (convenience method)
   * @param index - Element index
   * @param ctx - Optional locator context
   * @returns Promise<string | null>
   */
  async getTextAtIndex(index: number, ctx: LocatorContext = { type: LocatorContextType.Static }): Promise<string | null> {
    return await this.locate(ctx).getTextAtIndex(index);
  }

  /**
   * Count elements (convenience method)
   * @param ctx - Optional locator context
   * @returns Promise<number>
   */
  async count(ctx: LocatorContext = { type: LocatorContextType.Static }): Promise<number> {
    return await this.locate(ctx).count();
  }
}

export default AIElement;
