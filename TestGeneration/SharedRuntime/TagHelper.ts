import * as fs from 'fs';
import * as path from 'path';
import { TestInfo } from '@playwright/test';
import { test as consoleCapturingTest } from './ConsoleCapture';
import {
  TestTagsMapping,
  TestTagEntry,
  TestTags,
  TagValidationError,
  TestNotFoundError,
} from './types';
import { TagRegistry } from './TagRegistry';
import { TestLogger } from './TestLogger';

/**
 * TagHelper - Runtime Tag Application
 *
 * @description
 * Provides runtime tag loading and application for tests.
 * Loads tags from TestTagsMapping.json and applies them as Playwright annotations.
 *
 * Integrates with ConsoleCapture to preserve browser console and network logging
 * capabilities while adding tag-based test management.
 *
 * IMPORTANT: This is the ONLY way to apply tags to tests.
 * Manual tag annotations in test files are NOT allowed.
 *
 * @usage
 * ```typescript
 * import { TagHelper } from 'SharedRuntime/TagHelper';
 *
 * const TEST_ID = 'TC_001_v001_CreateSchoolWithMandatoryFields';
 *
 * TagHelper.taggedTest(TEST_ID, async ({ page }) => {
 *   TestLogger.reset();
 *   // ... test implementation
 * });
 * ```
 *
 * @author AI Test Automation Framework
 * @version 1.0.0
 */
export class TagHelper {
  private static mapping: TestTagsMapping | null = null;
  private static readonly MAPPING_PATH = 'tests/Utils/TestTagsMapping.json';

  /**
   * Load test tags mapping from file
   * @returns TestTagsMapping object
   * @throws Error if mapping file cannot be loaded
   */
  private static loadMapping(): TestTagsMapping {
    if (!this.mapping) {
      const mappingPath = path.resolve(process.cwd(), this.MAPPING_PATH);

      if (!fs.existsSync(mappingPath)) {
        throw new Error(
          `Test tags mapping file not found: ${mappingPath}\n` +
            `Expected location: ${this.MAPPING_PATH}\n` +
            `Run test generation to create the mapping file.`
        );
      }

      try {
        const mappingContent = fs.readFileSync(mappingPath, 'utf-8');
        this.mapping = JSON.parse(mappingContent) as TestTagsMapping;
      } catch (error) {
        throw new Error(
          `Failed to parse test tags mapping from ${mappingPath}: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    }
    return this.mapping;
  }

  /**
   * Get test entry by testId
   * @param testId - Unique test identifier (format: TC_XXX_vYYY_Name)
   * @returns TestTagEntry object
   * @throws TestNotFoundError if test is not in mapping
   */
  static getTestEntry(testId: string): TestTagEntry {
    const mapping = this.loadMapping();
    const entry = mapping.tests[testId];

    if (!entry) {
      throw new TestNotFoundError(testId);
    }

    return entry;
  }

  /**
   * Get tags for a specific test
   * @param testId - Unique test identifier
   * @returns TestTags object
   * @throws TestNotFoundError if test is not in mapping
   */
  static getTestTags(testId: string): TestTags {
    const entry = this.getTestEntry(testId);
    return entry.tags;
  }

  /**
   * Get test description
   * @param testId - Unique test identifier
   * @returns Test description string
   * @throws TestNotFoundError if test is not in mapping
   */
  static getTestDescription(testId: string): string {
    const entry = this.getTestEntry(testId);
    return entry.description;
  }

  /**
   * Format tags as Playwright tag array
   * @param tags - TestTags object
   * @returns Array of tag strings prefixed with @
   */
  static formatAsPlaywrightTags(tags: TestTags): string[] {
    const result: string[] = [];

    // Suite tags
    const suites = Array.isArray(tags.suite) ? tags.suite : [tags.suite];
    result.push(...suites.map((s) => `@${s}`));

    // Priority
    result.push(`@${tags.priority}`);

    // Type
    result.push(`@${tags.type}`);

    // Data impact
    result.push(`@${tags.dataImpact}`);

    // Optional fixed tags
    if (tags.environment) {
      const envs = Array.isArray(tags.environment) ? tags.environment : [tags.environment];
      result.push(...envs.map((e) => `@${e}`));
    }

    if (tags.stability) {
      result.push(`@${tags.stability}`);
    }

    if (tags.speed) {
      result.push(`@${tags.speed}`);
    }

    // Extensible tags with prefix
    if (tags.feature && tags.feature.length > 0) {
      result.push(...tags.feature.map((f) => `@feature:${f}`));
    }

    if (tags.component && tags.component.length > 0) {
      result.push(...tags.component.map((c) => `@component:${c}`));
    }

    if (tags.team) {
      result.push(`@team:${tags.team}`);
    }

    return result;
  }

  /**
   * Format tags as Playwright annotations
   * @param tags - TestTags object
   * @returns Array of annotation objects
   */
  static formatAsAnnotations(
    tags: TestTags
  ): Array<{ type: string; description: string }> {
    const annotations: Array<{ type: string; description: string }> = [];

    // Suite
    const suites = Array.isArray(tags.suite) ? tags.suite : [tags.suite];
    annotations.push({ type: 'suite', description: suites.join(', ') });

    // Priority
    annotations.push({ type: 'priority', description: tags.priority });

    // Type
    annotations.push({ type: 'testType', description: tags.type });

    // Data impact
    annotations.push({ type: 'dataImpact', description: tags.dataImpact });

    // Optional fixed tags
    if (tags.environment) {
      const envs = Array.isArray(tags.environment) ? tags.environment : [tags.environment];
      annotations.push({ type: 'environment', description: envs.join(', ') });
    }

    if (tags.stability) {
      annotations.push({ type: 'stability', description: tags.stability });
    }

    if (tags.speed) {
      annotations.push({ type: 'speed', description: tags.speed });
    }

    // Extensible tags
    if (tags.feature && tags.feature.length > 0) {
      annotations.push({ type: 'feature', description: tags.feature.join(', ') });
    }

    if (tags.component && tags.component.length > 0) {
      annotations.push({ type: 'component', description: tags.component.join(', ') });
    }

    if (tags.team) {
      annotations.push({ type: 'team', description: tags.team });
    }

    return annotations;
  }

  /**
   * Create a tagged test - MAIN ENTRY POINT
   *
   * This is the ONLY way to define tests with tags.
   * Tags are loaded from TestTagsMapping.json automatically.
   *
   * @param testId - Unique test identifier (format: TC_XXX_vYYY_Name)
   * @param testFn - Test function to execute
   *
   * @example
   * ```typescript
   * const TEST_ID = 'TC_001_v001_CreateSchoolWithMandatoryFields';
   *
   * TagHelper.taggedTest(TEST_ID, async ({ page }) => {
   *   TestLogger.reset();
   *   // ... test implementation
   * });
   * ```
   */
  static taggedTest(
    testId: string,
    testFn: (args: { page: import('@playwright/test').Page } & TestInfo) => Promise<void>
  ): void {
    // Validate testId format
    if (!this.isValidTestIdFormat(testId)) {
      throw new Error(
        `Invalid testId format: "${testId}". Expected format: TC_XXX_vYYY_DescriptiveName`
      );
    }

    // Load test entry and validate
    const entry = this.getTestEntry(testId);
    const tags = entry.tags;

    // Validate tags
    const validationResult = TagRegistry.validateTags(tags);
    if (!validationResult.isValid) {
      throw new TagValidationError(testId, validationResult.errors);
    }

    // Log warnings if any
    if (validationResult.warnings.length > 0) {
      for (const warning of validationResult.warnings) {
        TestLogger.warn(`[TagHelper] ${warning}`);
      }
    }

    // Format tags for Playwright
    const playwrightTags = this.formatAsPlaywrightTags(tags);
    const annotations = this.formatAsAnnotations(tags);

    // Create test with tags and annotations using ConsoleCapture test fixture
    // This preserves browser console and network logging capabilities
    consoleCapturingTest(
      entry.description,
      {
        tag: playwrightTags,
        annotation: annotations,
      },
      async ({ page }, testInfo) => {
        // Log test metadata at start
        TestLogger.info(`[Test ID] ${testId}`);
        TestLogger.info(`[Tags] ${playwrightTags.join(' ')}`);

        // Execute test function
        await testFn({ page, ...testInfo });
      }
    );
  }

  /**
   * Validate testId format
   * Format: TC_XXX_vYYY_DescriptiveName
   * @param testId - Test ID to validate
   * @returns true if format is valid
   */
  static isValidTestIdFormat(testId: string): boolean {
    // Format: TC_XXX_vYYY_Name where XXX and YYY are 3-digit numbers
    const pattern = /^TC_\d{3}_v\d{3}_[A-Za-z][A-Za-z0-9]*$/;
    return pattern.test(testId);
  }

  /**
   * Check if a test exists in the mapping
   * @param testId - Test ID to check
   * @returns true if test exists
   */
  static testExists(testId: string): boolean {
    try {
      const mapping = this.loadMapping();
      return testId in mapping.tests;
    } catch {
      return false;
    }
  }

  /**
   * Get all test IDs in the mapping
   * @returns Array of test IDs
   */
  static getAllTestIds(): string[] {
    const mapping = this.loadMapping();
    return Object.keys(mapping.tests);
  }

  /**
   * Get tests by tag filter
   * @param category - Tag category to filter by
   * @param value - Tag value to match
   * @returns Array of matching test entries
   */
  static getTestsByTag(category: string, value: string): TestTagEntry[] {
    const mapping = this.loadMapping();
    const results: TestTagEntry[] = [];

    for (const entry of Object.values(mapping.tests)) {
      const tagValue = this.getTagValueFromEntry(entry, category);
      if (tagValue !== undefined) {
        if (Array.isArray(tagValue)) {
          if (tagValue.includes(value)) {
            results.push(entry);
          }
        } else if (tagValue === value) {
          results.push(entry);
        }
      }
    }

    return results;
  }

  /**
   * Get tag value from test entry by category
   */
  private static getTagValueFromEntry(
    entry: TestTagEntry,
    category: string
  ): string | string[] | undefined {
    const tags = entry.tags;
    switch (category) {
      case 'suite':
        return tags.suite;
      case 'priority':
        return tags.priority;
      case 'type':
        return tags.type;
      case 'dataImpact':
        return tags.dataImpact;
      case 'environment':
        return tags.environment;
      case 'stability':
        return tags.stability;
      case 'speed':
        return tags.speed;
      case 'feature':
        return tags.feature;
      case 'component':
        return tags.component;
      case 'team':
        return tags.team;
      default:
        return undefined;
    }
  }

  /**
   * Reload mapping from file (useful if file changes during runtime)
   */
  static reloadMapping(): void {
    this.mapping = null;
    this.loadMapping();
  }

  /**
   * Get mapping version
   * @returns Version string
   */
  static getVersion(): string {
    const mapping = this.loadMapping();
    return mapping.version;
  }
}

export default TagHelper;
