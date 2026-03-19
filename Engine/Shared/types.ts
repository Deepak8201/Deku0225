/**
 * Shared Type Definitions
 *
 * @description
 * Centralized type definitions used across the framework
 *
 * @author AI Test Automation Framework
 * @version 1.0.0
 */

// ============================================================================
// LOCATOR CACHE TYPES
// ============================================================================

export interface CachedLocator {
  key: string;
  description: string;
  locator: string;
  timestamp?: string;
}

export interface PageLocators {
  name: string;
  url: string;
  description: string;
  tableConfig?: TomsPageConfig;
  locators: Record<string, CachedLocator>;
}

export interface CacheStructure {
  [pageName: string]: PageLocators;
}

// ============================================================================
// LOCATOR CONTEXT TYPES
// ============================================================================

/**
 * Enum for locator context types
 * Defines how locators are resolved from cache
 */
export enum LocatorContextType {
  /** Static locator - resolved directly from cache */
  Static = 'static',
  /** Dynamic locator - parameterized with runtime value */
  Dynamic = 'dynamic',
  /** Complex locator - child within dynamic parent */
  WithinDynamicParent = 'withinDynamicParent'
}

/**
 * Discriminated union for locator resolution context
 * Used by AIElement to determine how to resolve locators
 */
export type LocatorContext =
  | { type: LocatorContextType.Static }
  | { type: LocatorContextType.Dynamic; param: string }
  | {
      type: LocatorContextType.WithinDynamicParent;
      parentParam: string;
      childKey: string;
    };

// ============================================================================
// WAIT OPTIONS
// ============================================================================

export interface WaitOptions {
  timeout?: number;
  state?: 'attached' | 'detached' | 'visible' | 'hidden';
}

export interface NavigationOptions {
  timeout?: number;
  waitUntil?: 'load' | 'domcontentloaded' | 'networkidle' | 'commit';
}

// ============================================================================
// TOMS PAGE CONFIGURATION
// ============================================================================

export interface TomsPageConfig {
  tableSelector?: string;
  tableBodySelector?: string;
  tableHeaderSelector?: string;
  rowSelector?: string;
  checkboxColumnSelector?: string;
  toolbarSelector?: string;
}

// ============================================================================
// SETTINGS TYPES
// ============================================================================


export interface UserCredentials {
  username: string;
  password: string;
}

export interface DatabaseSettings {
  type: 'mysql' | 'postgresql' | 'mssql' | 'mongodb' | 'oracle';
  host: string;
  port: number;
  database: string;
  username: string;
  password: string;
  connectionTimeout?: number;
  queryTimeout?: number;
  ssl?: boolean;
  options?: Record<string, unknown>;
}

// ============================================================================
// API CONFIGURATION TYPES
// ============================================================================

export interface OAuthConfig {
  tokenEndpoint: string;
  grantType: string;
  clientId?: string;
  clientSecret?: string;
  scope?: string;
  username?: string;
  password?: string;
}

export interface APIConfiguration {
  url: string;
  ignoreHTTPSErrors?: boolean;
  defaultHeaders?: Record<string, string>;
}


// ============================================================================
// CACHE VALIDATION TYPES
// ============================================================================

export interface CacheStats {
  size: number;
  filePath: string;
  fileExists: boolean;
  lastModified?: string;
  fileSize?: number;
  error?: string;
}

export interface ValidationIssue {
  key: string;
  issue: string;
  entry: CachedLocator;
}

export interface ValidationResult {
  isValid: boolean;
  totalEntries: number;
  validEntries: number;
  issues: ValidationIssue[];
}

// ============================================================================
// ERROR TYPES
// ============================================================================

export class FrameworkError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly context?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'FrameworkError';
    Error.captureStackTrace(this, this.constructor);
  }
}

export class LocatorNotFoundError extends FrameworkError {
  constructor(description: string, key?: string) {
    super(`Locator not found: ${description}${key ? ` (key: ${key})` : ''}`, 'LOCATOR_NOT_FOUND', {
      description,
      key,
    });
    this.name = 'LocatorNotFoundError';
  }
}

export class CacheOperationError extends FrameworkError {
  constructor(operation: string, details: string) {
    super(`Cache operation failed: ${operation} - ${details}`, 'CACHE_OPERATION_FAILED', {
      operation,
      details,
    });
    this.name = 'CacheOperationError';
  }
}

export class ElementInteractionError extends FrameworkError {
  constructor(action: string, description: string, originalError?: Error) {
    super(
      `Element interaction failed: ${action} on "${description}"${originalError ? ` - ${originalError.message}` : ''}`,
      'ELEMENT_INTERACTION_FAILED',
      { action, description, originalError: originalError?.message }
    );
    this.name = 'ElementInteractionError';
  }
}

// ============================================================================
// UTILITY TYPES
// ============================================================================

export type RequireAtLeastOne<T, Keys extends keyof T = keyof T> = Pick<T, Exclude<keyof T, Keys>> &
  {
    [K in Keys]-?: Required<Pick<T, K>> & Partial<Pick<T, Exclude<Keys, K>>>;
  }[Keys];

export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export type Nullable<T> = T | null;

export type Optional<T> = T | undefined;

// ============================================================================
// TAG SYSTEM TYPES
// ============================================================================

/**
 * Tag category type - fixed values are validated strictly,
 * extensible values can be added during test generation
 */
export type TagCategoryType = 'fixed' | 'extensible';

/**
 * Suite tag - test execution suite classification
 */
export enum SuiteTag {
  Smoke = 'smoke',
  Regression = 'regression',
  Full = 'full',
  Sanity = 'sanity',
}

/**
 * Priority tag - business priority level
 */
export enum PriorityTag {
  Critical = 'critical',
  High = 'high',
  Medium = 'medium',
  Low = 'low',
}

/**
 * Test type tag - test type classification
 */
export enum TestTypeTag {
  E2E = 'e2e',
  API = 'api',
  Integration = 'integration',
  UI = 'ui',
  Unit = 'unit',
}

/**
 * Data impact tag - whether test modifies application data
 */
export enum DataImpactTag {
  Readonly = 'readonly',
  Mutating = 'mutating',
}

/**
 * Environment tag - target execution environment
 */
export enum EnvironmentTag {
  Dev = 'dev',
  Staging = 'staging',
  Production = 'production',
  All = 'all',
}

/**
 * Stability tag - test reliability status
 */
export enum StabilityTag {
  Stable = 'stable',
  Flaky = 'flaky',
  WIP = 'wip',
  Deprecated = 'deprecated',
}

/**
 * Speed tag - expected execution time category
 */
export enum SpeedTag {
  Fast = 'fast',
  Medium = 'medium',
  Slow = 'slow',
}

/**
 * Extensible tag types (string-based, defined during test generation)
 */
export type FeatureTag = string;
export type ComponentTag = string;
export type TeamTag = string;

/**
 * Complete test tags interface
 * Contains all tag categories for a test
 */
export interface TestTags {
  // Mandatory fixed tags
  suite: SuiteTag | SuiteTag[];
  priority: PriorityTag;
  type: TestTypeTag;
  dataImpact: DataImpactTag;

  // Optional fixed tags
  environment?: EnvironmentTag | EnvironmentTag[];
  stability?: StabilityTag;
  speed?: SpeedTag;

  // Extensible tags (defined during test generation)
  feature?: FeatureTag[];
  component?: ComponentTag[];
  team?: TeamTag;
}

/**
 * Test tag entry in TestTagsMapping.json
 * Maps a test to its tags via immutable testId
 */
export interface TestTagEntry {
  /** Unique test identifier - format: TC_XXX_vYYY_Name (IMMUTABLE) */
  testId: string;
  /** Test file name */
  testFile: string;
  /** Comprehensive test description */
  description: string;
  /** Test tags */
  tags: TestTags;
  /** Creation timestamp */
  createdAt: string;
  /** Last modification timestamp */
  lastModified: string;
}

/**
 * Tag category configuration in TagConfiguration.json
 */
export interface TagCategoryConfig {
  /** Category type: fixed or extensible */
  type: TagCategoryType;
  /** Allowed values (for fixed) or registered values (for extensible) */
  values: string[];
  /** Default value for this category */
  default: string | null;
  /** Whether this tag is mandatory for all tests */
  mandatory: boolean;
  /** Whether multiple values can be assigned */
  allowMultiple: boolean;
  /** Human-readable description of this category */
  description: string;
}

/**
 * Tag validation configuration
 */
export interface TagValidationConfig {
  /** Whether validation is enabled */
  enabled: boolean;
  /** Strict mode - fail on any validation error */
  strictMode: boolean;
  /** Fail if mandatory tags are missing */
  failOnMissingMandatory: boolean;
  /** Warn on unregistered extensible tag values */
  warnOnUnregisteredExtensible: boolean;
}

/**
 * Tag configuration file structure (TagConfiguration.json)
 */
export interface TagConfiguration {
  /** Configuration version */
  version: string;
  /** Validation settings */
  validation: TagValidationConfig;
  /** Tag category definitions */
  categories: Record<string, TagCategoryConfig>;
}

/**
 * Test tags mapping file structure (TestTagsMapping.json)
 */
export interface TestTagsMapping {
  /** Mapping version */
  version: string;
  /** Last update timestamp */
  lastUpdated: string;
  /** Map of testId to test entry */
  tests: Record<string, TestTagEntry>;
}

/**
 * Tag validation result
 */
export interface TagValidationResult {
  /** Whether all validations passed */
  isValid: boolean;
  /** Validation errors (blocking) */
  errors: string[];
  /** Validation warnings (non-blocking) */
  warnings: string[];
}

/**
 * Tag validation error
 */
export class TagValidationError extends FrameworkError {
  constructor(testId: string, errors: string[]) {
    super(
      `Tag validation failed for test "${testId}": ${errors.join('; ')}`,
      'TAG_VALIDATION_FAILED',
      { testId, errors }
    );
    this.name = 'TagValidationError';
  }
}

/**
 * Test not found in mapping error
 */
export class TestNotFoundError extends FrameworkError {
  constructor(testId: string) {
    super(
      `Test not found in TestTagsMapping.json: "${testId}"`,
      'TEST_NOT_FOUND',
      { testId }
    );
    this.name = 'TestNotFoundError';
  }
}
