import { Page } from '@playwright/test';
import { TestLogger } from './TestLogger';

/**
 * AIPage - AI-Enhanced Page Object Model Base Class
 *
 * @description
 * AIPage provides a foundation for AI-enhanced page object model implementations.
 * It offers common page-level operations and utilities that can be extended by
 * specific page classes. This class focuses exclusively on page navigation, validation,
 * and general page management functionality.
 *
 * For element interactions, use the AIElement class which provides intelligent
 * locator caching with AI fallback capabilities.
 *
 * @features
 * - Page navigation and URL management
 * - Page load state monitoring
 * - Title verification and retrieval
 * - Screenshot capture capabilities
 * - Multi-page/tab management
 * - Extensible design for custom page implementations
 * - Hierarchical logging with TestLogger integration
 *
 * @usage
 * ```typescript
 * import { AIPage } from 'Engine/Shared/AIPage';
 * import { AIElement } from 'Engine/Shared/AIElement';
 *
 * export class MyCustomPage extends AIPage {
 *   private inputField: AIElement;
 *   private submitButton: AIElement;
 *
 *   constructor(aiPage: AIPage, pageIdentifier: string) {
 *     super(aiPage);
 *     this.inputField = new AIElement(this, 'inputField', 'Input field description');
 *     this.submitButton = new AIElement(this, 'submitButton', 'Submit button');
 *   }
 *
 *   async performAction(value: string): Promise<void> {
 *     await this.inputField.fill(value);
 *     await this.submitButton.click();
 *   }
 * }
 * ```
 *
 * @author AI Test Automation Framework
 * @version 2.1.0
 * @since 2025
 */
export class AIPage {
  protected page: Page;
  protected pageIdentifier: string;

  /**
   * @param page - Playwright Page instance
   * @param pageIdentifier - Unique identifier for this page (used for locator cache lookup)
   */
  constructor(page: Page, pageIdentifier: string = 'DefaultPage') {
    this.page = page;
    this.pageIdentifier = pageIdentifier;
  }

  /**
   * Get the page identifier
   * @returns The page identifier string
   */
  getPageIdentifier(): string {
    return this.pageIdentifier;
  }

  /**
   * Get the Playwright Page instance
   * @returns The Page instance
   */
  getPage(): Page {
    return this.page;
  }

  /**
   * Navigate to a specific URL
   * @param url - The URL to navigate to
   * @param options - Optional Playwright navigation options
   * @returns Promise<void>
   */
  async navigateTo(url: string, options?: any): Promise<void> {
    await TestLogger.baseStep(`Navigate to URL: ${url}`, async () => {
      if (options) {
        await this.page.goto(url, options);
      } else {
        await this.page.goto(url);
        await this.page.waitForLoadState('domcontentloaded');
      }
      const currentUrl = this.page.url();
      TestLogger.info(`Current URL after navigation: ${currentUrl}`);
    });
  }

  /**
   * Wait for page to finish loading
   * @returns Promise<void>
   */
  async waitForPageLoad(): Promise<void> {
    await this.page.waitForLoadState('domcontentloaded');
    const currentUrl = this.page.url();
    TestLogger.info(`Page loaded, current URL: ${currentUrl}`);
  }

  /**
   * Get the current page title
   * @returns Promise<string> The page title
   */
  async getPageTitle(): Promise<string> {
    return await this.page.title();
  }

  /**
   * Verify that the page title contains expected text
   * @param expectedTitle - The expected title text
   * @throws Error if title doesn't contain expected text
   * @returns Promise<void>
   */
  async verifyPageTitle(expectedTitle: string): Promise<void> {
    const title = await this.page.title();
    if (!title.includes(expectedTitle)) {
      throw new Error(`Expected page title to contain "${expectedTitle}", but got "${title}"`);
    }
  }

  /**
   * Take a screenshot of the current page
   * @param name - The name for the screenshot file
   * @returns Promise<void>
   */
  async takeScreenshot(name: string): Promise<void> {
    await this.page.screenshot({ path: `screenshots/${name}.png` });
  }

  /**
   * Wait for a specified amount of time
   * @param ms - Milliseconds to wait
   * @returns Promise<void>
   */
  async waitForTimeout(ms: number): Promise<void> {
    await this.page.waitForTimeout(ms);
  }

  /**
   * Reload the current page
   * @returns Promise<void>
   */
  async reloadPage(): Promise<void> {
    await TestLogger.baseStep('Reload current page', async () => {
      const currentUrl = this.page.url();
      TestLogger.info(`Reloading page: ${currentUrl}`);
      await this.page.reload();
      await this.page.waitForLoadState('domcontentloaded');
    });
  }

  /**
   * Go back to the previous page
   * @returns Promise<void>
   */
  async goBack(): Promise<void> {
    await TestLogger.baseStep('Navigate back to previous page', async () => {
      const beforeUrl = this.page.url();
      TestLogger.info(`Going back from: ${beforeUrl}`);
      await this.page.goBack();
      await this.page.waitForLoadState('domcontentloaded');
      const afterUrl = this.page.url();
      TestLogger.info(`After going back, current URL: ${afterUrl}`);
    });
  }

  /**
   * Get current page URL
   * @returns string
   */
  getCurrentUrl(): string {
    return this.page.url();
  }

  /**
   * Wait for navigation to URL matching pattern
   * @param urlPattern - URL pattern to match (string or RegExp)
   * @param options - Optional wait options (timeout, etc.)
   * @returns Promise<void>
   */
  async waitForNavigation(
    urlPattern: string | RegExp,
    options?: { timeout?: number }
  ): Promise<void> {
    await this.page.waitForURL(urlPattern, options);
  }

  /**
   * Wait for new page/tab to open
   * @returns Promise<Page>
   */
  async waitForNewPage() {
    return await this.page.context().waitForEvent('page');
  }

  /**
   * Get all pages in context
   * @returns Page[]
   */
  getAllPages() {
    return this.page.context().pages();
  }

  /**
   * Close a specific page
   * @param pageToClose - Page to close
   * @returns Promise<void>
   */
  async closePage(pageToClose: any): Promise<void> {
    await pageToClose.close();
  }
}

export default AIPage;
