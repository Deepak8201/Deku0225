import fs from 'fs';
import path from 'path';
import {
  CachedLocator,
  CacheStructure,
  CacheStats,
  ValidationIssue,
  ValidationResult,
  CacheOperationError,
} from './types';

/**
 * LocatorCacheManagement - Intelligent Locator Caching System
 *
 * @description
 * LocatorCacheManagement provides a centralized caching system for AI-generated element locators.
 * It manages the storage, retrieval, and persistence of locator data to improve
 * performance and reduce API calls to AI services. The cache automatically handles
 * file path resolution and provides robust error handling.
 *
 * @features
 * - Automatic cache file path resolution across different execution contexts
 * - Persistent storage of locator data in JSON format
 * - Efficient cache lookup and storage operations
 * - Automatic cache file creation and management
 * - Support for cache validation and cleanup
 * - Thread-safe cache operations
 *
 * @dependencies
 * - Node.js fs module for file operations
 * - Node.js path module for path resolution
 * - Cache file at tests/Utils/locator_cache.json
 *
 * @usage
 * ```typescript
 * import { LocatorCacheManagement } from 'Engine/Shared/LocatorCacheManagement';
 *
 * // Get cached locator
 * const cachedLocator = LocatorCacheManagement.get('Login button');
 *
 * // Store new locator
 * LocatorCacheManagement.set('Login button', 'Login button', 'button[type="submit"]');
 *
 * // Check if cache exists
 * const exists = LocatorCacheManagement.has('Login button');
 * ```
 *
 * @author AI Test Automation Framework
 * @version 1.0.0
 * @since 2024
 */

// Type definitions now imported from shared types

// ============================================================================
// CACHE CONFIGURATION AND CONSTANTS
// ============================================================================

/**
 * Cache file configuration constants
 */
const CACHE_CONFIG = {
  /** Relative path to cache file from project root */
  CACHE_FILE_PATH: 'tests/Utils/locator_cache.json',

  /** Relative path from this module to cache file */
  CACHE_FILE_RELATIVE_PATH: '../../tests/Utils/locator_cache.json',

  /** Cache key separator */
  KEY_SEPARATOR: '.',

  /** Default page URL */
  DEFAULT_PAGE_URL: '/',
} as const;

/**
 * Error messages constants
 */
const ERROR_MESSAGES = {
  INVALID_KEY_FORMAT: (key: string) =>
    `Invalid cache key format: "${key}". Key must be in format "PageName.locatorKey"`,
  CACHE_SAVE_FAILED: (filePath: string, error: string) =>
    `Failed to save locator cache to ${filePath}: ${error}`,
  CACHE_LOAD_FAILED: (filePath: string, error: string) =>
    `Failed to load locator cache from ${filePath}: ${error}`,
  FILE_STATS_FAILED: (error: string) => `Failed to get file stats: ${error}`,
  MISSING_PAGE_FIELDS: 'Page missing required fields (name, url, description, or locators)',
  MISSING_LOCATOR_FIELDS: 'Missing required fields (key, description, or locator)',
} as const;

/**
 * Determine the correct cache file path based on execution context
 * @private
 */
function getCacheFilePath(): string {
  // Try project root path first
  if (fs.existsSync(CACHE_CONFIG.CACHE_FILE_PATH)) {
    return CACHE_CONFIG.CACHE_FILE_PATH;
  }

  // Fallback to relative path from module
  return path.join(__dirname, CACHE_CONFIG.CACHE_FILE_RELATIVE_PATH);
}

// Cache file path (resolved once at module load)
const CACHE_FILE: string = getCacheFilePath();

// Hierarchical locator cache - page-based structure
let LOCATOR_CACHE: CacheStructure = {};

/**
 * Load existing cache from file
 * @private
 */
function loadCacheFromFile(): void {
  if (!fs.existsSync(CACHE_FILE)) {
    return;
  }

  try {
    const fileContent = fs.readFileSync(CACHE_FILE, 'utf-8');
    LOCATOR_CACHE = JSON.parse(fileContent);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.warn(ERROR_MESSAGES.CACHE_LOAD_FAILED(CACHE_FILE, errorMessage));
    LOCATOR_CACHE = {};
  }
}

// Load existing cache on module initialization
loadCacheFromFile();

// ============================================================================
// CACHE MANAGEMENT CLASS
// ============================================================================

export class LocatorCacheManagement {
  /**
   * Parse and validate cache key format
   * @private
   * @param key - The cache key to parse
   * @returns Tuple of [pageName, locatorKey]
   * @throws Error if key format is invalid
   */
  private static parseAndValidateKey(key: string): [string, string] {
    if (!key.includes(CACHE_CONFIG.KEY_SEPARATOR)) {
      throw new Error(ERROR_MESSAGES.INVALID_KEY_FORMAT(key));
    }

    const [pageName, locatorKey] = key.split(CACHE_CONFIG.KEY_SEPARATOR);

    if (!pageName || !locatorKey) {
      throw new Error(ERROR_MESSAGES.INVALID_KEY_FORMAT(key));
    }

    return [pageName, locatorKey];
  }

  /**
   * Save the current locator cache to the file system
   * @private
   * @throws CacheOperationError When file write operation fails
   */
  private static saveCache(): void {
    try {
      // Ensure directory exists
      const cacheDir = path.dirname(CACHE_FILE);
      if (!fs.existsSync(cacheDir)) {
        fs.mkdirSync(cacheDir, { recursive: true });
      }

      fs.writeFileSync(CACHE_FILE, JSON.stringify(LOCATOR_CACHE, null, 2));
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(ERROR_MESSAGES.CACHE_SAVE_FAILED(CACHE_FILE, errorMessage));
      throw new CacheOperationError('save', errorMessage);
    }
  }

  /**
   * Retrieve a locator from the cache by key
   * @param key - The cache key in format "PageName.locatorKey" (REQUIRED)
   * @returns The cached locator object or null if not found
   */
  static get(key: string): CachedLocator | null {
    const [pageName, locatorKey] = this.parseAndValidateKey(key);

    const page = LOCATOR_CACHE[pageName];
    if (!page?.locators) {
      return null;
    }

    return page.locators[locatorKey] ?? null;
  }

  /**
   * Store a locator in the cache
   * @param key - The cache key in format "PageName.locatorKey" (REQUIRED)
   * @param description - The element description
   * @param locator - The generated locator string
   * @param pageUrl - Optional page URL (used when creating new page entry)
   * @param pageDescription - Optional page description (used when creating new page entry)
   * @throws Error When cache save operation fails or invalid key format
   */
  static set(
    key: string,
    description: string,
    locator: string,
    pageUrl?: string,
    pageDescription?: string
  ): void {
    const [targetPage, targetKey] = this.parseAndValidateKey(key);

    // Ensure page exists in cache
    if (!LOCATOR_CACHE[targetPage]) {
      LOCATOR_CACHE[targetPage] = {
        name: targetPage,
        url: pageUrl || CACHE_CONFIG.DEFAULT_PAGE_URL,
        description: pageDescription || `Locators for ${targetPage}`,
        locators: {},
      };
    }

    // Add or update the locator
    const pageEntry = LOCATOR_CACHE[targetPage];
    pageEntry.locators[targetKey] = {
      key: targetKey,
      description: description,
      locator: locator,
      timestamp: new Date().toISOString(),
    };

    this.saveCache();
  }

  /**
   * Check if a locator exists in the cache
   * @param key - The cache key in format "PageName.locatorKey" (REQUIRED)
   * @returns True if the locator exists in cache
   * @throws Error if key format is invalid
   */
  static has(key: string): boolean {
    try {
      return this.get(key) !== null;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Remove a locator from the cache
   * @param key - The cache key in format "PageName.locatorKey" (REQUIRED)
   * @returns True if the locator was removed, false if it didn't exist
   * @throws Error if key format is invalid
   */
  static delete(key: string): boolean {
    const [pageName, locatorKey] = this.parseAndValidateKey(key);

    const page = LOCATOR_CACHE[pageName];
    if (!page?.locators?.[locatorKey]) {
      return false;
    }

    delete page.locators[locatorKey];
    this.saveCache();
    return true;
  }

  /**
   * Clear all cached locators
   * @throws Error When cache save operation fails
   */
  static clear(): void {
    LOCATOR_CACHE = {};
    this.saveCache();
  }

  /**
   * Get all cached locator keys
   * @returns Array of all cache keys in format "PageName.locatorKey"
   */
  static keys(): string[] {
    const keys: string[] = [];

    for (const [pageName, page] of Object.entries(LOCATOR_CACHE)) {
      if (!page?.locators) continue;

      for (const locatorKey of Object.keys(page.locators)) {
        keys.push(`${pageName}${CACHE_CONFIG.KEY_SEPARATOR}${locatorKey}`);
      }
    }

    return keys;
  }

  /**
   * Get the total number of cached locators
   * @returns Number of cached locators across all pages
   */
  static size(): number {
    return Object.values(LOCATOR_CACHE).reduce((count, page) => {
      return count + (page?.locators ? Object.keys(page.locators).length : 0);
    }, 0);
  }

  /**
   * Get cache statistics
   * @returns Cache statistics including size, file path, and last modified
   */
  static getStats(): CacheStats {
    const stats: CacheStats = {
      size: this.size(),
      filePath: CACHE_FILE,
      fileExists: fs.existsSync(CACHE_FILE),
    };

    if (stats.fileExists) {
      try {
        const fileStats = fs.statSync(CACHE_FILE);
        stats.lastModified = fileStats.mtime.toISOString();
        stats.fileSize = fileStats.size;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        stats.error = ERROR_MESSAGES.FILE_STATS_FAILED(errorMessage);
      }
    }

    return stats;
  }

  /**
   * Validate cache integrity
   * @returns Validation results with any issues found
   */
  static validate(): ValidationResult {
    const issues: ValidationIssue[] = [];
    const validEntries: string[] = [];

    for (const [pageName, page] of Object.entries(LOCATOR_CACHE)) {
      // Validate page structure
      if (!page?.name || !page?.url || !page?.description || !page?.locators) {
        issues.push({
          key: pageName,
          issue: ERROR_MESSAGES.MISSING_PAGE_FIELDS,
          entry: { key: pageName, description: '', locator: '' },
        });
        continue;
      }

      // Validate locators in page
      for (const [locatorKey, entry] of Object.entries(page.locators)) {
        const fullKey = `${pageName}${CACHE_CONFIG.KEY_SEPARATOR}${locatorKey}`;

        if (!entry.key || !entry.description || !entry.locator) {
          issues.push({
            key: fullKey,
            issue: ERROR_MESSAGES.MISSING_LOCATOR_FIELDS,
            entry,
          });
        } else {
          validEntries.push(fullKey);
        }
      }
    }

    return {
      isValid: issues.length === 0,
      totalEntries: this.size(),
      validEntries: validEntries.length,
      issues: issues,
    };
  }
}

export default LocatorCacheManagement;
