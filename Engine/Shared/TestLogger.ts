import { test } from '@playwright/test';

/**
 * TestLogger - Hierarchical Test Logging Utility
 *
 * @description
 * Provides structured hierarchical logging for test execution using Playwright's test.step API.
 * Creates readable reports with proper hierarchy: TC → BF → Functional POM → Base classes
 *
 * @features
 * - Hierarchical step tracking with automatic nesting
 * - Human-readable descriptions at TC, BF, and POM levels
 * - Technical details only at base class level
 * - Automatic step wrapping for async operations
 * - Support for nested steps with proper indentation
 * - Caller location tracking for better debugging
 *
 * @usage
 * ```typescript
 * // Test Scenario level
 * await TestLogger.testStep('Login with valid credentials', async () => {
 *   await loginWorkflow.performLogin(url, username, password);
 * });
 *
 * // Business Workflow level
 * await TestLogger.businessStep('Navigate to login page and authenticate user', async () => {
 *   await loginPage.navigateToLogin(baseUrl);
 *   await loginPage.login(username, password);
 * });
 *
 * // Functional POM level
 * await TestLogger.pageStep('Fill username and password, then click login button', async () => {
 *   await this.usernameInput.fill(username);
 *   await this.passwordInput.fill(password);
 *   await this.loginButton.click();
 * });
 *
 * // Base class level (technical details allowed)
 * await TestLogger.elementStep(`Click element: ${this.description}`, async () => {
 *   const locator = await this.find();
 *   await locator.click();
 * });
 * ```
 *
 * @author AI Test Automation Framework
 * @version 1.1.0
 * @since 2025
 */

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

/**
 * Log levels for hierarchical test execution tracking
 */
export enum LogLevel {
  TEST = 'TEST', // Test Scenario level
  BUSINESS = 'BUSINESS', // Business Workflow level
  PAGE = 'PAGE', // Functional POM level
  ELEMENT = 'ELEMENT', // AIElement level
  BASE = 'BASE', // AIPage base class level
}

/**
 * Configuration for step prefixes
 */
interface LevelConfig {
  emoji: string;
  prefix: string;
  showCounter: boolean;
}

// ============================================================================
// TESTLOGGER CLASS DEFINITION
// ============================================================================

export class TestLogger {
  private static currentLevel: LogLevel = LogLevel.TEST;
  private static stepCounter: Map<LogLevel, number> = new Map();

  /**
   * Configuration for each log level
   */
  private static readonly LEVEL_CONFIG: Record<LogLevel, LevelConfig> = {
    [LogLevel.TEST]: { emoji: '📋', prefix: 'TC Step', showCounter: true },
    [LogLevel.BUSINESS]: { emoji: '🔄', prefix: 'BF', showCounter: false },
    [LogLevel.PAGE]: { emoji: '📄', prefix: 'POM', showCounter: false },
    [LogLevel.ELEMENT]: { emoji: '🎯', prefix: 'Element', showCounter: false },
    [LogLevel.BASE]: { emoji: '⚙️', prefix: 'Base', showCounter: false },
  };

  /**
   * Initialize step counters
   */
  private static initCounters(): void {
    if (this.stepCounter.size === 0) {
      Object.values(LogLevel).forEach((level) => {
        this.stepCounter.set(level, 0);
      });
    }
  }

  /**
   * Reset step counters (call at test start)
   */
  public static reset(): void {
    this.stepCounter.clear();
    this.currentLevel = LogLevel.TEST;
  }

  /**
   * Get step prefix based on level
   */
  private static getStepPrefix(level: LogLevel, count: number): string {
    const config = this.LEVEL_CONFIG[level];
    if (!config) {
      return '';
    }

    const counterPart = config.showCounter ? ` ${count}` : '';
    return `${config.emoji} ${config.prefix}${counterPart}: `;
  }

  /**
   * Generic method to execute step with proper tracking
   * @param level - Log level for the step
   * @param description - Step description
   * @param action - Async function to execute
   * @param includeLocation - Whether to include caller location
   */
  private static async executeStepWithTracking<T>(
    level: LogLevel,
    description: string,
    action: () => Promise<T>,
    includeLocation: boolean = true
  ): Promise<T> {
    this.initCounters();

    const currentCount = (this.stepCounter.get(level) || 0) + 1;
    this.stepCounter.set(level, currentCount);

    const prefix = this.getStepPrefix(level, currentCount);
    const location = includeLocation ? this.getCallerLocation() : null;
    const fullDescription = location
      ? `${prefix}${description} — ${location}`
      : `${prefix}${description}`;

    const previousLevel = this.currentLevel;
    this.currentLevel = level;

    try {
      const result = await test.step(fullDescription, action);
      this.currentLevel = previousLevel;
      return result;
    } catch (error) {
      this.currentLevel = previousLevel;
      throw error;
    }
  }

  /**
   * Test Scenario level step
   * @param description - Human-readable test step description
   * @param action - Async function to execute
   */
  public static async testStep<T = void>(
    description: string,
    action: () => Promise<T>
  ): Promise<T> {
    return this.executeStepWithTracking(LogLevel.TEST, description, action, true);
  }

  /**
   * Business Workflow level step
   * @param description - Human-readable business workflow description
   * @param action - Async function to execute
   */
  public static async businessStep<T = void>(
    description: string,
    action: () => Promise<T>
  ): Promise<T> {
    return this.executeStepWithTracking(LogLevel.BUSINESS, description, action, true);
  }

  /**
   * Functional POM level step
   * @param description - Human-readable page interaction description
   * @param action - Async function to execute
   */
  public static async pageStep<T = void>(
    description: string,
    action: () => Promise<T>
  ): Promise<T> {
    return this.executeStepWithTracking(LogLevel.PAGE, description, action, true);
  }

  /**
   * AIElement level step (technical details allowed)
   * @param description - Element interaction description
   * @param action - Async function to execute
   */
  public static async elementStep<T = void>(
    description: string,
    action: () => Promise<T>
  ): Promise<T> {
    return this.executeStepWithTracking(LogLevel.ELEMENT, description, action, false);
  }

  /**
   * AIPage base class level step (technical details allowed)
   * @param description - Base class operation description
   * @param action - Async function to execute
   */
  public static async baseStep<T = void>(
    description: string,
    action: () => Promise<T>
  ): Promise<T> {
    return this.executeStepWithTracking(LogLevel.BASE, description, action, false);
  }

  /**
   * Log messages with appropriate formatting
   */
  private static log(level: 'info' | 'warn' | 'error', message: string, logLevel?: LogLevel): void {
    const targetLevel = logLevel || this.currentLevel;
    const prefix = this.getLogPrefix(targetLevel);

    const logMethod = {
      info: console.log,
      warn: console.warn,
      error: console.error,
    }[level];

    const icon = {
      info: '',
      warn: '⚠️ ',
      error: '❌ ',
    }[level];

    logMethod(`${prefix}${icon}${message}`);
  }

  /**
   * Log information message (non-step logging)
   * @param message - Message to log
   * @param level - Log level (defaults to current level)
   */
  public static info(message: string, level?: LogLevel): void {
    this.log('info', message, level);
  }

  /**
   * Log warning message
   * @param message - Warning message
   * @param level - Log level (defaults to current level)
   */
  public static warn(message: string, level?: LogLevel): void {
    this.log('warn', message, level);
  }

  /**
   * Log error message
   * @param message - Error message
   * @param level - Log level (defaults to current level)
   */
  public static error(message: string, level?: LogLevel): void {
    this.log('error', message, level);
  }

  /**
   * Get log prefix for non-step logging with proper indentation
   */
  private static getLogPrefix(level: LogLevel): string {
    const indentation = {
      [LogLevel.TEST]: '',
      [LogLevel.BUSINESS]: '  ',
      [LogLevel.PAGE]: '    ',
      [LogLevel.ELEMENT]: '      ',
      [LogLevel.BASE]: '        ',
    };

    const config = this.LEVEL_CONFIG[level];
    return `${indentation[level]}${config.emoji} `;
  }

  /**
   * Extract caller location from stack trace
   * Returns file path and line number of the actual caller (not TestLogger.ts)
   */
  private static getCallerLocation(): string | null {
    try {
      const stack = new Error().stack;
      if (!stack) {
        return null;
      }

      const lines = stack.split('\n');

      // Find the first stack frame that is NOT TestLogger.ts
      for (const line of lines) {
        // Skip if it's the Error line or TestLogger.ts
        if (
          !line.includes('at ') ||
          line.includes('TestLogger.ts') ||
          line.includes('TestLogger.js')
        ) {
          continue;
        }

        // Extract file path and line number
        // Format: "at ClassName.methodName (path/to/file.ts:123:45)"
        // or: "at path/to/file.ts:123:45"
        const match = line.match(/\((.+):(\d+):(\d+)\)/) || line.match(/at\s+(.+):(\d+):(\d+)/);

        if (match && match[1] && match[2]) {
          const filePath = match[1];
          const lineNumber = match[2];

          // Extract just the filename from the full path
          const fileName = filePath.split(/[/\\]/).pop() || filePath;

          return `${fileName}:${lineNumber}`;
        }
      }

      return null;
    } catch {
      // If stack trace parsing fails, return null
      return null;
    }
  }
}

export default TestLogger;
