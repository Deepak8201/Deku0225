import * as fs from 'fs';
import * as path from 'path';
import {
  TagConfiguration,
  TagCategoryConfig,
  TagValidationConfig,
  TestTags,
  TagValidationResult,
  SuiteTag,
  PriorityTag,
  TestTypeTag,
  DataImpactTag,
  EnvironmentTag,
  StabilityTag,
  SpeedTag,
} from './types';

/**
 * TagRegistry - Tag Management Service
 *
 * @description
 * Centralized service for managing test tags. Provides:
 * - Loading and caching of TagConfiguration.json
 * - Tag validation against configuration
 * - Access to category definitions
 * - Extensible tag value management
 *
 * @usage
 * ```typescript
 * import { TagRegistry } from 'SharedRuntime/TagRegistry';
 *
 * // Get all categories
 * const categories = TagRegistry.getCategories();
 *
 * // Validate tags
 * const result = TagRegistry.validateTags(tags);
 *
 * // Check if tag value is valid
 * const isValid = TagRegistry.isValidTagValue('priority', 'high');
 * ```
 *
 * @author AI Test Automation Framework
 * @version 1.0.0
 */
export class TagRegistry {
  private static configuration: TagConfiguration | null = null;
  private static readonly CONFIG_PATH = 'tests/Settings/TagConfiguration.json';

  /**
   * Load tag configuration from file
   * @returns TagConfiguration object
   * @throws Error if configuration file cannot be loaded
   */
  private static loadConfiguration(): TagConfiguration {
    if (!this.configuration) {
      const configPath = path.resolve(process.cwd(), this.CONFIG_PATH);

      if (!fs.existsSync(configPath)) {
        throw new Error(
          `Tag configuration file not found: ${configPath}\n` +
            `Expected location: ${this.CONFIG_PATH}\n` +
            `Create the file with tag category definitions.`
        );
      }

      try {
        const configContent = fs.readFileSync(configPath, 'utf-8');
        this.configuration = JSON.parse(configContent) as TagConfiguration;
      } catch (error) {
        throw new Error(
          `Failed to parse tag configuration from ${configPath}: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    }
    return this.configuration;
  }

  /**
   * Get validation configuration
   * @returns TagValidationConfig object
   */
  static getValidationConfig(): TagValidationConfig {
    const config = this.loadConfiguration();
    return config.validation;
  }

  /**
   * Get all category definitions
   * @returns Record of category name to TagCategoryConfig
   */
  static getCategories(): Record<string, TagCategoryConfig> {
    const config = this.loadConfiguration();
    return config.categories;
  }

  /**
   * Get specific category configuration
   * @param category - Category name
   * @returns TagCategoryConfig or null if not found
   */
  static getCategoryConfig(category: string): TagCategoryConfig | null {
    const categories = this.getCategories();
    return categories[category] || null;
  }

  /**
   * Get all mandatory categories
   * @returns Array of category names that are mandatory
   */
  static getMandatoryCategories(): string[] {
    const categories = this.getCategories();
    return Object.entries(categories)
      .filter(([_, config]) => config.mandatory)
      .map(([name, _]) => name);
  }

  /**
   * Get extensible categories
   * @returns Array of category names that are extensible
   */
  static getExtensibleCategories(): string[] {
    const categories = this.getCategories();
    return Object.entries(categories)
      .filter(([_, config]) => config.type === 'extensible')
      .map(([name, _]) => name);
  }

  /**
   * Get registered values for an extensible category
   * @param category - Extensible category name
   * @returns Array of registered values
   */
  static getExtensibleValues(category: string): string[] {
    const config = this.getCategoryConfig(category);
    if (!config || config.type !== 'extensible') {
      return [];
    }
    return config.values;
  }

  /**
   * Check if a tag value is valid for a category
   * @param category - Category name
   * @param value - Tag value to validate
   * @returns true if valid, false otherwise
   */
  static isValidTagValue(category: string, value: string): boolean {
    const config = this.getCategoryConfig(category);
    if (!config) {
      return false;
    }

    // For extensible categories, any value is potentially valid
    if (config.type === 'extensible') {
      return true;
    }

    // For fixed categories, check against allowed values
    return config.values.includes(value);
  }

  /**
   * Check if an extensible value is registered
   * @param category - Extensible category name
   * @param value - Value to check
   * @returns true if registered, false otherwise
   */
  static isRegisteredExtensibleValue(category: string, value: string): boolean {
    const values = this.getExtensibleValues(category);
    return values.includes(value);
  }

  /**
   * Get default value for a category
   * @param category - Category name
   * @returns Default value or null
   */
  static getDefaultValue(category: string): string | null {
    const config = this.getCategoryConfig(category);
    return config?.default || null;
  }

  /**
   * Validate test tags against configuration
   * @param tags - TestTags object to validate
   * @returns TagValidationResult with errors and warnings
   */
  static validateTags(tags: TestTags): TagValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    const validationConfig = this.getValidationConfig();

    if (!validationConfig.enabled) {
      return { isValid: true, errors: [], warnings: [] };
    }

    // Check mandatory tags
    if (validationConfig.failOnMissingMandatory) {
      const mandatoryCategories = this.getMandatoryCategories();

      for (const category of mandatoryCategories) {
        const value = this.getTagValue(tags, category);
        if (value === undefined || value === null || (Array.isArray(value) && value.length === 0)) {
          errors.push(`Mandatory tag "${category}" is missing`);
        }
      }
    }

    // Validate fixed tag values
    this.validateFixedTag(tags.suite, 'suite', SuiteTag, errors);
    this.validateFixedTag(tags.priority, 'priority', PriorityTag, errors);
    this.validateFixedTag(tags.type, 'type', TestTypeTag, errors);
    this.validateFixedTag(tags.dataImpact, 'dataImpact', DataImpactTag, errors);

    if (tags.environment !== undefined) {
      this.validateFixedTag(tags.environment, 'environment', EnvironmentTag, errors);
    }
    if (tags.stability !== undefined) {
      this.validateFixedTag(tags.stability, 'stability', StabilityTag, errors);
    }
    if (tags.speed !== undefined) {
      this.validateFixedTag(tags.speed, 'speed', SpeedTag, errors);
    }

    // Check extensible tags for unregistered values (warnings only)
    if (validationConfig.warnOnUnregisteredExtensible) {
      this.checkExtensibleValues(tags.feature, 'feature', warnings);
      this.checkExtensibleValues(tags.component, 'component', warnings);
      if (tags.team) {
        this.checkExtensibleValues([tags.team], 'team', warnings);
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Get tag value from TestTags by category name
   */
  private static getTagValue(
    tags: TestTags,
    category: string
  ): string | string[] | undefined {
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
   * Validate fixed tag values against enum
   */
  private static validateFixedTag<T extends Record<string, string>>(
    value: string | string[] | undefined,
    category: string,
    enumType: T,
    errors: string[]
  ): void {
    if (value === undefined) return;

    const validValues = Object.values(enumType);
    const values = Array.isArray(value) ? value : [value];

    for (const v of values) {
      if (!validValues.includes(v)) {
        errors.push(
          `Invalid value "${v}" for tag "${category}". Valid values: ${validValues.join(', ')}`
        );
      }
    }
  }

  /**
   * Check extensible values and add warnings for unregistered ones
   */
  private static checkExtensibleValues(
    values: string[] | undefined,
    category: string,
    warnings: string[]
  ): void {
    if (!values || values.length === 0) return;

    for (const value of values) {
      if (!this.isRegisteredExtensibleValue(category, value)) {
        warnings.push(
          `Unregistered ${category} tag value: "${value}". Consider adding to TagConfiguration.json`
        );
      }
    }
  }

  /**
   * Reload configuration from file (useful if file changes during runtime)
   */
  static reloadConfiguration(): void {
    this.configuration = null;
    this.loadConfiguration();
  }

  /**
   * Get configuration version
   * @returns Version string
   */
  static getVersion(): string {
    const config = this.loadConfiguration();
    return config.version;
  }
}

export default TagRegistry;
