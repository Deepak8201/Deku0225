import { Locator } from '@playwright/test';
import { TestLogger } from './TestLogger';
import { LocatorContext, LocatorContextType, WaitOptions, ElementInteractionError } from './types';

/**
 * BoundElement - Represents a resolved element ready for interaction
 *
 * @description
 * BoundElement owns a resolved Playwright locator and provides all interaction methods.
 * It is created by AIElement.locate() and represents a specific element instance ready for use.
 *
 * @features
 * - Owns resolved Playwright locator
 * - Provides all element interaction methods
 * - Integrated with TestLogger for hierarchical logging
 * - Context-aware logging (static, dynamic, withinDynamicParent)
 * - Comprehensive error handling
 *
 * @usage
 * ```typescript
   * // Get bound element from AIElement
   * const boundElement = myElement.locate({ type: LocatorContextType.Dynamic, param: 'Router' });
   * 
   * // Interact with bound element
   * await boundElement.click();
   * await boundElement.fill('value');
   * const text = await boundElement.getText();
   * ```
 *
 * @author AI Test Automation Framework
 * @version 2.0.0
 * @since 2025
 */
export class BoundElement {
  constructor(
    private readonly locator: Locator,
    private readonly description: string,
    private readonly context: LocatorContext
  ) {}

  /**
   * Build human-readable description for logging
   * @private
   */
  private buildDescription(action: string): string {
    switch (this.context.type) {
      case LocatorContextType.Static:
        return `${action}: ${this.description}`;

      case LocatorContextType.Dynamic:
        return `${action}: ${this.description} (param: ${this.context.param})`;

      case LocatorContextType.WithinDynamicParent:
        return `${action} child "${this.context.childKey}" within ${this.description} (param: ${this.context.parentParam})`;
    }
  }

  /**
   * Assert locator is resolved
   * @private
   */
  private assertResolved(): void {
    if (!this.locator) {
      throw new Error(`Locator was not resolved for element: ${this.description}`);
    }
  }

  // ============================================================================
  // INTERACTION METHODS
  // ============================================================================

  /**
   * Click the element
   * @returns Promise<void>
   * @throws ElementInteractionError When click operation fails
   */
  async click(): Promise<void> {
    await TestLogger.elementStep(this.buildDescription('Click'), async () => {
      this.assertResolved();
      try {
        await this.locator.click();
      } catch (error) {
        throw new ElementInteractionError(
          'click',
          this.description,
          error instanceof Error ? error : undefined
        );
      }
    });
  }

  /**
   * Force click the element using JavaScript click
   * Useful for elements that don't respond to standard Playwright click
   * @returns Promise<void>
   */
  async forceClick(): Promise<void> {
    await TestLogger.elementStep(this.buildDescription('Force click'), async () => {
      this.assertResolved();
      await this.locator.evaluate((element: HTMLElement) => element.click());
    });
  }

  /**
   * Fill the element with a value
   * @param value - Value to fill
   * @returns Promise<void>
   * @throws ElementInteractionError When fill operation fails
   */
  async fill(value: string): Promise<void> {
    await TestLogger.elementStep(this.buildDescription('Fill'), async () => {
      this.assertResolved();
      try {
        await this.locator.fill(value);
      } catch (error) {
        throw new ElementInteractionError(
          'fill',
          this.description,
          error instanceof Error ? error : undefined
        );
      }
    });
  }

  /**
   * Hover over the element
   * @returns Promise<void>
   */
  async hover(): Promise<void> {
    await TestLogger.elementStep(this.buildDescription('Hover'), async () => {
      this.assertResolved();
      await this.locator.hover();
    });
  }

  /**
   * Select an option in a dropdown/select element
   * @param value - Value(s) to select
   * @returns Promise<void>
   */
  async select(value: string | string[]): Promise<void> {
    await TestLogger.elementStep(this.buildDescription('Select option'), async () => {
      this.assertResolved();
      await this.locator.waitFor({ state: 'visible' });

      try {
        await this.locator.selectOption({ label: value as string });
      } catch (error) {
        await this.locator.selectOption(value);
      }
    });
  }

  /**
   * Get the text content of the element
   * @returns Promise<string | null> Element text content
   */
  async getText(): Promise<string | null> {
    return await TestLogger.elementStep(this.buildDescription('Get text'), async () => {
      this.assertResolved();
      return await this.locator.textContent();
    });
  }

  /**
   * Get the selected value of a select element
   * @returns Promise<string | null> Selected value
   */
  async getSelectedValue(): Promise<string | null> {
    return await TestLogger.elementStep(this.buildDescription('Get selected value'), async () => {
      this.assertResolved();
      return await this.locator.inputValue();
    });
  }

  /**
   * Get input value from element
   * @returns Promise<string> Input value
   */
  async getInputValue(): Promise<string> {
    return await TestLogger.elementStep(this.buildDescription('Get input value'), async () => {
      this.assertResolved();
      return await this.locator.inputValue();
    });
  }

  /**
   * Check if the element is visible
   * @returns Promise<boolean> True if element is visible
   */
  async isVisible(): Promise<boolean> {
    return await TestLogger.elementStep(this.buildDescription('Check visibility'), async () => {
      this.assertResolved();
      return await this.locator.isVisible();
    });
  }

  /**
   * Wait for the element with specified options
   * @param options - Wait options (timeout, state, etc.)
   * @returns Promise<void>
   */
  async waitFor(options: WaitOptions = {}): Promise<void> {
    await TestLogger.elementStep(this.buildDescription('Wait for'), async () => {
      this.assertResolved();
      await this.locator.waitFor(options);
    });
  }

  /**
   * Check a checkbox element
   * @returns Promise<void>
   */
  async check(): Promise<void> {
    await TestLogger.elementStep(this.buildDescription('Check'), async () => {
      this.assertResolved();
      await this.locator.check();
    });
  }

  /**
   * Uncheck a checkbox element
   * @returns Promise<void>
   */
  async uncheck(): Promise<void> {
    await TestLogger.elementStep(this.buildDescription('Uncheck'), async () => {
      this.assertResolved();
      await this.locator.uncheck();
    });
  }

  /**
   * Clear input element
   * @returns Promise<void>
   */
  async clear(): Promise<void> {
    await TestLogger.elementStep(this.buildDescription('Clear'), async () => {
      this.assertResolved();
      await this.locator.clear();
    });
  }

  /**
   * Type into the element one character at a time (simulates keystrokes)
   * @param value - Value to type
   * @param options - Optional typing options (delay, etc.)
   * @returns Promise<void>
   */
  async type(value: string, options?: { delay?: number }): Promise<void> {
    await TestLogger.elementStep(this.buildDescription('Type'), async () => {
      this.assertResolved();
      await this.locator.pressSequentially(value, options);
    });
  }

  /**
   * Press a single key on the element
   * @param key - Key to press (e.g. 'Enter', 'Tab', 'ArrowDown')
   * @returns Promise<void>
   */
  async press(key: string): Promise<void> {
    await TestLogger.elementStep(this.buildDescription(`Press ${key}`), async () => {
      this.assertResolved();
      await this.locator.press(key);
    });
  }

  /**
   * Scroll element into view if needed
   * @returns Promise<void>
   */
  async scrollIntoViewIfNeeded(): Promise<void> {
    await TestLogger.elementStep(this.buildDescription('Scroll into view'), async () => {
      this.assertResolved();
      await this.locator.scrollIntoViewIfNeeded();
    });
  }

  /**
   * Focus the element
   * @returns Promise<void>
   */
  async focus(): Promise<void> {
    await TestLogger.elementStep(this.buildDescription('Focus'), async () => {
      this.assertResolved();
      await this.locator.focus();
    });
  }

  /**
   * Get text content from an element at a specific index
   * @param index - The index of the element in the list
   * @returns Promise<string | null> The text content
   */
  async getTextAtIndex(index: number): Promise<string | null> {
    return await TestLogger.elementStep(this.buildDescription(`Get text at index ${index}`), async () => {
      this.assertResolved();
      return await this.locator.nth(index).textContent();
    });
  }

  /**
   * Count the number of elements matching the locator
   * @returns Promise<number> The count of matching elements
   */
  async count(): Promise<number> {
    return await TestLogger.elementStep(this.buildDescription('Count'), async () => {
      this.assertResolved();
      return await this.locator.count();
    });
  }

  // ============================================================================
  // FILE UPLOAD METHODS
  // ============================================================================

  /**
   * Upload file(s) to a file input element
   * @param filePath - Path to file(s) to upload. Can be a single path (string) or multiple paths (string[])
   * @returns Promise<void>
   * @throws ElementInteractionError When file upload operation fails
   */
  async uploadFile(filePath: string | string[]): Promise<void> {
    await TestLogger.elementStep(this.buildDescription('Upload file(s)'), async () => {
      this.assertResolved();
      try {
        await this.locator.setInputFiles(filePath);
        const files = Array.isArray(filePath) ? filePath : [filePath];
        TestLogger.info(`Uploaded ${files.length} file(s): ${files.join(', ')}`);
      } catch (error) {
        throw new ElementInteractionError(
          'uploadFile',
          this.description,
          error instanceof Error ? error : undefined
        );
      }
    });
  }

  /**
   * Get the list of uploaded files from a file input element
   * @returns Promise<string[]> Array of file names
   */
  async getUploadedFiles(): Promise<string[]> {
    return await TestLogger.elementStep(this.buildDescription('Get uploaded files'), async () => {
      this.assertResolved();
      const files = await this.locator.inputValue();
      return files ? files.split('\n').filter((f) => f.trim().length > 0) : [];
    });
  }

  /**
   * Clear uploaded files from a file input element
   * @returns Promise<void>
   */
  async clearUploadedFiles(): Promise<void> {
    await TestLogger.elementStep(this.buildDescription('Clear uploaded files'), async () => {
      this.assertResolved();
      await this.locator.setInputFiles([]);
    });
  }

  // ============================================================================
  // ADVANCED METHODS
  // ============================================================================

  /**
   * Get the underlying Playwright locator
   * Use with caution - prefer using BoundElement methods
   * @returns Locator The Playwright locator
   */
  getLocator(): Locator {
    this.assertResolved();
    return this.locator;
  }
}

export default BoundElement;

