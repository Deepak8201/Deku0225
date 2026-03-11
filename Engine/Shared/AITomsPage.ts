import { Page, Locator } from '@playwright/test';
import { AIPage } from 'Engine/Shared/AIPage';

/**
 * Configuration options for AITomsPage table selectors
 */
export interface TomsPageConfig {
  tableSelector?: string;
  tableBodySelector?: string;
  tableHeaderSelector?: string;
  rowSelector?: string;
  checkboxColumnSelector?: string;
  toolbarSelector?: string;
}

/**
 * AITomsPage - AI-Enhanced TOMS Page Object Model Base Class
 *
 * @description
 * AITomsPage extends AIPage to provide specialized functionality for working with
 * TOMS pages that contain complex table structures
 * with filtering, sorting, and row-level operations.
 *
 * @features
 * - Table data extraction with filtering support
 * - Column-based filtering (single and multiple columns)
 * - Row-level operations (checkbox selection, data retrieval)
 * - Dynamic table structure handling
 * - Support for complex table headers with filter controls
 * - Configurable table selectors for different table structures
 *
 * @usage
 * ```typescript
 * import { AITomsPage } from 'Engine/Shared/AITomsPage';
 *
 * // Use default selectors
 * class TasksPage extends AITomsPage {
 *   constructor(page: Page) {
 *     super(page);
 *   }
 * }
 *
 * // Use custom selectors
 * class CustomPage extends AITomsPage {
 *   constructor(page: Page) {
 *     super(page, {
 *       tableSelector: 'table.customTable',
 *       rowSelector: 'tr.customRow'
 *     });
 *   }
 * }
 *
 * // Get rows where Status = "Error"
 * const errorRows = await tasksPage.getRowsWhere({ 'Status': 'Error' });
 *
 * // Get value from specific column
 * const name = await tasksPage.getCellValue(errorRows[0], 'Name');
 *
 * // Click checkbox in row
 * await tasksPage.clickRowCheckbox(errorRows[0]);
 * ```
 *
 * @author AI Test Automation Framework
 * @version 2.0.0
 * @since 2025
 */
export class AITomsPage extends AIPage {
  protected tableSelector: string;
  protected tableBodySelector: string;
  protected tableHeaderSelector: string;
  protected rowSelector: string;
  protected checkboxColumnSelector: string;
  protected toolbarSelector: string;

  /**
   * @param page - Playwright Page instance
   * @param pageIdentifier - Unique identifier for this page (used for locator cache lookup)
   * @param config - Optional configuration for table selectors
   */
  constructor(page: Page, pageIdentifier: string = 'DefaultPage', config?: TomsPageConfig) {
    super(page, pageIdentifier);

    // Set default values or use provided config
    this.tableSelector = config?.tableSelector ?? 'table.mainControl';
    this.tableBodySelector = config?.tableBodySelector ?? 'table.mainControl tbody';
    this.tableHeaderSelector = config?.tableHeaderSelector ?? 'table.mainControl thead';
    this.rowSelector = config?.rowSelector ?? 'tr.hoverable';
    this.checkboxColumnSelector =
      config?.checkboxColumnSelector ?? 'td.itemCheckboxAlign input[type="checkbox"]';
    this.toolbarSelector = config?.toolbarSelector ?? 'table.ControlPanel';
  }

  /**
   * Get all table headers (column names)
   * @returns Promise<string[]> Array of column names
   */
  async getTableHeaders(): Promise<string[]> {
    const headers: string[] = [];

    // Wait for table header to be visible
    await this.page.waitForSelector(`${this.tableHeaderSelector} th[abbr]`, { timeout: 10000 });

    // Get all header cells with abbr attribute
    const headerCells = await this.page
      .locator(`${this.tableHeaderSelector} tr`)
      .first()
      .locator('th[abbr]')
      .all();

    for (const cell of headerCells) {
      const abbr = await cell.getAttribute('abbr');
      if (abbr) {
        headers.push(abbr);
      }
    }

    return headers;
  }

  /**
   * Get the index of a column by its name
   * @param columnName - The name of the column
   * @returns Promise<number> The column index (0-based, accounting for checkbox column)
   */
  async getColumnIndex(columnName: string): Promise<number> {
    const headers = await this.getTableHeaders();
    const index = headers.indexOf(columnName);

    if (index === -1) {
      throw new Error(`Column "${columnName}" not found. Available columns: ${headers.join(', ')}`);
    }

    // Add 1 to account for checkbox column at index 0
    return index + 1;
  }

  /**
   * Get all rows from the table
   * @returns Promise<Locator[]> Array of row locators
   */
  async getAllRows(): Promise<Locator[]> {
    await this.page.waitForSelector(this.tableBodySelector, { timeout: 10000 });
    return await this.page.locator(`${this.tableBodySelector} ${this.rowSelector}`).all();
  }

  /**
   * Get cell value from a specific row and column
   * @param row - The row locator
   * @param columnName - The name of the column
   * @returns Promise<string> The cell text content
   */
  async getCellValue(row: Locator, columnName: string): Promise<string> {
    const columnIndex = await this.getColumnIndex(columnName);
    const cell = row.locator(`td:nth-child(${columnIndex + 1})`);

    // Try to get text from span or link first, fallback to direct text
    const spanOrLink = cell.locator('span, a').first();
    const hasSpanOrLink = (await spanOrLink.count()) > 0;

    if (hasSpanOrLink) {
      return (await spanOrLink.textContent())?.trim() || '';
    }

    return (await cell.textContent())?.trim() || '';
  }

  /**
   * Get all cell values from a row as an object
   * @param row - The row locator
   * @returns Promise<Record<string, string>> Object with column names as keys and cell values as values
   */
  async getRowData(row: Locator): Promise<Record<string, string>> {
    const headers = await this.getTableHeaders();
    const rowData: Record<string, string> = {};

    for (const header of headers) {
      rowData[header] = await this.getCellValue(row, header);
    }

    return rowData;
  }

  /**
   * Get rows that match the specified filter conditions
   * @param filters - Object with column names as keys and expected values as values
   * @returns Promise<Locator[]> Array of matching row locators
   *
   * @example
   * // Single filter
   * const rows = await page.getRowsWhere({ 'Status': 'Error' });
   *
   * // Multiple filters
   * const rows = await page.getRowsWhere({
   *   'Status': 'Error',
   *   'Name': 'Send notification: Acknowledgment'
   * });
   */
  async getRowsWhere(filters: Record<string, string>): Promise<Locator[]> {
    const allRows = await this.getAllRows();
    const matchingRows: Locator[] = [];

    for (const row of allRows) {
      let matches = true;

      for (const [columnName, expectedValue] of Object.entries(filters)) {
        const cellValue = await this.getCellValue(row, columnName);

        if (cellValue !== expectedValue) {
          matches = false;
          break;
        }
      }

      if (matches) {
        matchingRows.push(row);
      }
    }

    return matchingRows;
  }

  /**
   * Get rows that match partial text in specified columns
   * @param filters - Object with column names as keys and partial text as values
   * @returns Promise<Locator[]> Array of matching row locators
   *
   * @example
   * const rows = await page.getRowsWhereContains({ 'Name': 'notification' });
   */
  async getRowsWhereContains(filters: Record<string, string>): Promise<Locator[]> {
    const allRows = await this.getAllRows();
    const matchingRows: Locator[] = [];

    for (const row of allRows) {
      let matches = true;

      for (const [columnName, expectedValue] of Object.entries(filters)) {
        const cellValue = await this.getCellValue(row, columnName);

        if (!cellValue.includes(expectedValue)) {
          matches = false;
          break;
        }
      }

      if (matches) {
        matchingRows.push(row);
      }
    }

    return matchingRows;
  }

  /**
   * Click the checkbox in a specific row
   * @param row - The row locator
   * @returns Promise<void>
   */
  async clickRowCheckbox(row: Locator): Promise<void> {
    const checkbox = row.locator(this.checkboxColumnSelector);
    await checkbox.click();
  }

  /**
   * Check if row checkbox is selected
   * @param row - The row locator
   * @returns Promise<boolean> True if checkbox is checked
   */
  async isRowCheckboxSelected(row: Locator): Promise<boolean> {
    const checkbox = row.locator(this.checkboxColumnSelector);
    return await checkbox.isChecked();
  }

  /**
   * Get all data from rows matching filter conditions
   * @param filters - Object with column names as keys and expected values as values
   * @returns Promise<Record<string, string>[]> Array of row data objects
   *
   * @example
   * const errorRowsData = await page.getRowsDataWhere({ 'Status': 'Error' });
   * console.log(errorRowsData[0].Name); // Access Name column value
   */
  async getRowsDataWhere(filters: Record<string, string>): Promise<Record<string, string>[]> {
    const matchingRows = await this.getRowsWhere(filters);
    const rowsData: Record<string, string>[] = [];

    for (const row of matchingRows) {
      const rowData = await this.getRowData(row);
      rowsData.push(rowData);
    }

    return rowsData;
  }

  /**
   * Click link in a specific cell
   * @param row - The row locator
   * @param columnName - The name of the column
   * @returns Promise<void>
   */
  async clickCellLink(row: Locator, columnName: string): Promise<void> {
    const columnIndex = await this.getColumnIndex(columnName);
    const cell = row.locator(`td:nth-child(${columnIndex + 1})`);
    const link = cell.locator('a').first();

    await link.click();
  }

  /**
   * Get count of rows matching filter conditions
   * @param filters - Object with column names as keys and expected values as values
   * @returns Promise<number> Count of matching rows
   */
  async getRowsCount(filters?: Record<string, string>): Promise<number> {
    if (!filters) {
      const allRows = await this.getAllRows();
      return allRows.length;
    }

    const matchingRows = await this.getRowsWhere(filters);
    return matchingRows.length;
  }

  /**
   * Wait for table to load
   * @param timeout - Maximum wait time in milliseconds
   * @returns Promise<void>
   */
  async waitForTableLoad(timeout: number = 10000): Promise<void> {
    await this.page.waitForSelector(this.tableBodySelector, { timeout });
    await this.page.waitForLoadState('domcontentloaded');
  }

  /**
   * Get all table data as array of objects
   * @returns Promise<Record<string, string>[]> Array of all row data
   */
  async getAllTableData(): Promise<Record<string, string>[]> {
    const allRows = await this.getAllRows();
    const tableData: Record<string, string>[] = [];

    for (const row of allRows) {
      const rowData = await this.getRowData(row);
      tableData.push(rowData);
    }

    return tableData;
  }

  /**
   * Select multiple rows by filter conditions
   * @param filters - Object with column names as keys and expected values as values
   * @returns Promise<number> Count of selected rows
   */
  async selectRowsWhere(filters: Record<string, string>): Promise<number> {
    const matchingRows = await this.getRowsWhere(filters);

    for (const row of matchingRows) {
      const isSelected = await this.isRowCheckboxSelected(row);
      if (!isSelected) {
        await this.clickRowCheckbox(row);
      }
    }

    return matchingRows.length;
  }

  /**
   * Deselect multiple rows by filter conditions
   * @param filters - Object with column names as keys and expected values as values
   * @returns Promise<number> Count of deselected rows
   */
  async deselectRowsWhere(filters: Record<string, string>): Promise<number> {
    const matchingRows = await this.getRowsWhere(filters);

    for (const row of matchingRows) {
      const isSelected = await this.isRowCheckboxSelected(row);
      if (isSelected) {
        await this.clickRowCheckbox(row);
      }
    }

    return matchingRows.length;
  }

  /**
   * Click toolbar button by text
   * Finds the toolbar button that belongs to the same table as the selected rows
   * @param buttonText - The text of the button to click
   * @returns Promise<void>
   */
  async clickToolbarButton(buttonText: string): Promise<void> {
    // Find the table that contains selected checkboxes
    const tablesWithSelection = await this.page
      .locator(`${this.tableSelector}:has(input[type="checkbox"]:checked)`)
      .all();

    if (tablesWithSelection.length === 0) {
      throw new Error('No table found with selected checkboxes');
    }

    // Get the toolbar for the first table with selections
    // The toolbar is typically a sibling or parent element of the table
    const table = tablesWithSelection[0];

    // Try to find toolbar as preceding sibling
    const toolbar = this.page
      .locator(
        `${this.toolbarSelector}:has(+ ${this.tableSelector}:has(input[type="checkbox"]:checked))`
      )
      .first();
    const toolbarCount = await toolbar.count();

    if (toolbarCount > 0) {
      const button = toolbar.locator(`[role="button"]:has-text("${buttonText}")`);
      await button.click();
      return;
    }

    // Fallback: find any visible toolbar button with the text
    const buttons = await this.page
      .locator(`${this.toolbarSelector} [role="button"]:has-text("${buttonText}")`)
      .all();

    for (const button of buttons) {
      if (await button.isVisible()) {
        await button.click();
        return;
      }
    }

    throw new Error(
      `No toolbar button found with text "${buttonText}" for the table with selected rows`
    );
  }

  /**
   * Verify row exists with specified conditions
   * @param filters - Object with column names as keys and expected values as values
   * @returns Promise<boolean> True if at least one matching row exists
   */
  async verifyRowExists(filters: Record<string, string>): Promise<boolean> {
    const matchingRows = await this.getRowsWhere(filters);
    return matchingRows.length > 0;
  }

  /**
   * Get first row matching filter conditions
   * @param filters - Object with column names as keys and expected values as values
   * @returns Promise<Locator | null> First matching row or null if not found
   */
  async getFirstRowWhere(filters: Record<string, string>): Promise<Locator | null> {
    const matchingRows = await this.getRowsWhere(filters);
    const firstRow = matchingRows[0];
    return firstRow !== undefined ? firstRow : null;
  }

  /**
   * Get current table configuration
   * @returns TomsPageConfig Current configuration object
   */
  getTableConfig(): TomsPageConfig {
    return {
      tableSelector: this.tableSelector,
      tableBodySelector: this.tableBodySelector,
      tableHeaderSelector: this.tableHeaderSelector,
      rowSelector: this.rowSelector,
      checkboxColumnSelector: this.checkboxColumnSelector,
      toolbarSelector: this.toolbarSelector,
    };
  }

  /**
   * Update table configuration
   * @param config - Partial configuration to update
   * @returns void
   */
  updateTableConfig(config: Partial<TomsPageConfig>): void {
    if (config.tableSelector !== undefined) {
      this.tableSelector = config.tableSelector;
      // Update dependent selectors if not explicitly provided
      if (config.tableBodySelector === undefined) {
        this.tableBodySelector = `${config.tableSelector} tbody`;
      }
      if (config.tableHeaderSelector === undefined) {
        this.tableHeaderSelector = `${config.tableSelector} thead`;
      }
    }
    if (config.tableBodySelector !== undefined) {
      this.tableBodySelector = config.tableBodySelector;
    }
    if (config.tableHeaderSelector !== undefined) {
      this.tableHeaderSelector = config.tableHeaderSelector;
    }
    if (config.rowSelector !== undefined) {
      this.rowSelector = config.rowSelector;
    }
    if (config.checkboxColumnSelector !== undefined) {
      this.checkboxColumnSelector = config.checkboxColumnSelector;
    }
    if (config.toolbarSelector !== undefined) {
      this.toolbarSelector = config.toolbarSelector;
    }
  }
}

export default AITomsPage;
