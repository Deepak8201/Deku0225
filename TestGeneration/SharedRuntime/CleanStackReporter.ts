import type {
  FullConfig,
  FullResult,
  Reporter,
  Suite,
  TestCase,
  TestResult,
  TestStep,
} from '@playwright/test/reporter';

/**
 * Custom Playwright Reporter that filters out internal TestLogger stack traces
 * from test steps to keep reports clean and focused on test code.
 *
 * This reporter processes test results before they are passed to other reporters,
 * removing references to TestLogger.ts internal implementation.
 */
class CleanStackReporter implements Reporter {
  constructor(options: any = {}) {
    // No need to wrap another reporter - we'll just filter the data
  }

  onBegin(config: FullConfig, suite: Suite) {
    // No action needed
  }

  onTestBegin(test: TestCase, result: TestResult) {
    // No action needed
  }

  onStdOut(chunk: string | Buffer, test?: TestCase, result?: TestResult) {
    // No action needed
  }

  onStdErr(chunk: string | Buffer, test?: TestCase, result?: TestResult) {
    // No action needed
  }

  onTestEnd(test: TestCase, result: TestResult) {
    // Filter stack traces from test steps before other reporters process them
    this.filterStackTraces(result.steps);
  }

  async onEnd(result: FullResult) {
    // No action needed
  }

  async onExit() {
    // No action needed
  }

  printsToStdio(): boolean {
    return false;
  }

  /**
   * Recursively filter stack traces from test steps
   * Removes references to TestLogger.ts internal implementation
   */
  private filterStackTraces(steps: TestStep[]) {
    if (!steps) return;

    for (const step of steps) {
      // Filter error stack traces
      if (step.error && step.error.stack) {
        step.error.stack = this.cleanStackTrace(step.error.stack);
      }

      // Filter location if it points to TestLogger.ts
      if (step.location && this.isInternalLocation(step.location.file)) {
        // Remove the location to hide TestLogger.ts references
        delete (step as any).location;
      }

      // Recursively filter nested steps
      if (step.steps && step.steps.length > 0) {
        this.filterStackTraces(step.steps);
      }
    }
  }

  /**
   * Clean stack trace by removing internal TestLogger.ts frames
   */
  private cleanStackTrace(stack: string): string {
    const lines = stack.split('\n');
    const filteredLines = lines.filter((line) => {
      // Keep the error message (first line)
      if (!line.trim().startsWith('at ')) {
        return true;
      }

      // Filter out TestLogger.ts references
      if (line.includes('TestLogger.ts')) {
        return false;
      }

      // Filter out other internal Playwright frames
      if (line.includes('node_modules/@playwright')) {
        return false;
      }

      return true;
    });

    return filteredLines.join('\n');
  }

  /**
   * Check if location is internal (TestLogger.ts)
   */
  private isInternalLocation(file: string): boolean {
    return (
      file.includes('TestLogger.ts') ||
      file.includes('Engine/Shared/TestLogger.ts') ||
      file.includes('Engine\\Shared\\TestLogger.ts')
    );
  }
}

export default CleanStackReporter;
