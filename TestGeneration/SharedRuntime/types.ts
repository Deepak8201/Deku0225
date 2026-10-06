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

/**
 * A single step in a Playwright locator chain.
 *
 * Supported methods:
 *   Playwright API (preferred):
 *     getByRole, getByLabel, getByPlaceholder, getByText,
 *     getByAltText, getByTitle, getByTestId
 *   Chain/filter operators:
 *     filter, nth, first, last, and, or
 *   Frame navigation:
 *     frameLocator
 *   CSS/XPath fallback (use only when no API method fits):
 *     locator
 *
 * Use {param} as a placeholder in string args for dynamic locators.
 *
 * @example
 * // getByRole('button', { name: 'Log In' })
 * { method: 'getByRole', args: ['button', { name: 'Log In' }] }
 *
 * @example
 * // getByRole('listitem').filter({ hasText: '{param}' })
 * [
 *   { method: 'getByRole', args: ['listitem'] },
 *   { method: 'filter', args: [{ hasText: '{param}' }] }
 * ]
 */
export interface LocatorStep {
  method:
    | 'getByRole'
    | 'getByLabel'
    | 'getByPlaceholder'
    | 'getByText'
    | 'getByAltText'
    | 'getByTitle'
    | 'getByTestId'
    | 'locator'
    | 'filter'
    | 'nth'
    | 'first'
    | 'last'
    | 'and'
    | 'or'
    | 'frameLocator';
  args: (string | number | boolean | Record<string, unknown>)[];
}

export interface CachedLocator {
  key: string;
  description: string;
  /**
   * Locator definition. Two formats are supported:
   * - LocatorStep[] — preferred; Playwright API chain (e.g. getByRole, getByLabel, filter)
   * - string        — legacy CSS/XPath selector passed to page.locator(); kept for backward compatibility
   */
  locator: LocatorStep[] | string;
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

/**
 * Database connection settings from the environment configuration (`connections[].DB`).
 * Supports short keys (`host`, `type`, `port`, `database`, ...) and keys with prefixes (`db_host`, `db_type`, `db_port`, `db_name`, ...).
 */
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

/**
 * SSH connection settings from the environment configuration (`connections[].SSH`).
 * Supports keys with prefixes (`ssh_host`, `ssh_login`, ...) and short keys (`host`, `username`, ...).
 */
export interface SSHSettings {
  host: string;
  port: number;
  username: string;
  /** Non-interactive password auth: SSHHelper uses the `ssh2` package by default (no `sshpass` on Windows/Linux). */
  password?: string;
  /** Remote base path (e.g. `ssh_working_dir`). */
  workingDirectory?: string;
  /** Local private key path; when set, password auth is not used. */
  identityFilePath?: string;
  /** Key passphrase; batch runs typically need ssh-agent. */
  passphrase?: string;
  connectTimeoutSeconds?: number;
  commandTimeoutMs?: number;
  /** `false` sets StrictHostKeyChecking=no (lab only). */
  strictHostKeyChecking?: boolean;
  /** OpenSSH client binary (default `ssh`). */
  sshBinary?: string;
  /** sshpass binary when using password (default `sshpass`). */
  sshpassBinary?: string;
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

// ============================================================================
// TDM (Test Data Manager) Types
// ============================================================================

/** DB connection parameters in TDM create-env requests. */
export interface TDMConnectionParameters {
  db_host: string;
  db_name: string;
  db_port: string;
  db_type: string;
  db_login: string;
  db_password: string;
  jdbc_url: string;
}

/** Connection block for TDM create-env / update-env requests. */
export interface TDMConnection {
  name: string;
  type: string;
  parameters: TDMConnectionParameters;
}

/** Shared environment identity fields. */
export interface TDMEnvironmentIdentity {
  projectName: string;
  envName: string;
}

/**
 * Request body for POST /api/tdm/rest/create-env
 * `systemName` is optional.
 */
export interface TDMCreateEnvRequest {
  environment: TDMEnvironmentIdentity & {
    systemName?: string;
    connection: TDMConnection;
  };
}

/**
 * Request body for PUT /api/tdm/rest/create-env
 * `newEnvName` and `newSystemName` are optional.
 */
export interface TDMUpdateEnvRequest {
  environment: TDMEnvironmentIdentity & {
    systemName?: string;
    newEnvName?: string;
    newSystemName?: string;
    connection: TDMConnection;
  };
}

/**
 * Request body for DELETE /api/tdm/rest/create-env
 * Omit `systemDeleteName` to remove the whole environment; include it to remove one system only.
 */
export interface TDMDeleteEnvRequest {
  environment: TDMEnvironmentIdentity & {
    systemDeleteName?: string;
  };
}

/**
 * Request body for POST /api/tdm/rest/insert-records
 */
export interface TDMInsertRequest {
  environment: TDMEnvironmentIdentity & {
    systemName: string;
  };
  'title-table': string;
  'insert-records': Record<string, string>[];
}

/** Standard TDM REST response (insert-records, create-env, etc.). */
export interface TDMResponse {
  type: string;
  content: string;
  contentObject: unknown | null;
  link: string;
}

/** @deprecated Use TDMResponse */
export type TDMInsertResponse = TDMResponse;

/**
 * Explicit DB connection block for TDM create-env requests.
 * Used when DB settings are not available in the environment configuration.
 *
 * Required keys in `parameters`: db_host, db_port, db_type, db_name, db_login, db_password.
 * `jdbc_url` is computed internally — do NOT include it here.
 */
export interface TDMEnvConnection {
  /** Logical name for the connection in the TDM request body. Defaults to 'DB'. */
  name?: string;
  /** Connection type sent to TDM. Defaults to 'DB'. */
  type?: string;
  /** Raw DB parameters. Must include: db_host, db_port, db_type, db_name, db_login, db_password. */
  parameters: Record<string, string>;
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
