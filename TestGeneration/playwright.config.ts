import { defineConfig, devices } from '@playwright/test';

/**
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  testDir: './tests/TestScenario',
  /* Run tests in files in parallel */
  fullyParallel: true,
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.TRIGGER_PIPELINE_SOURCE,
  /* Retry on CI only */
  retries: process.env.TRIGGER_PIPELINE_SOURCE ? 2 : 0,
  /* Opt out of parallel tests on CI. */
  workers: process.env.TRIGGER_PIPELINE_SOURCE ? 1 : 1,

  /* Output directories according to global project structure rules */
  outputDir: './tests/Raw/Report/test-results',

  /* Timeout for each test in milliseconds */
  timeout: 1800000, // 30 minutes

  /* Reporter configuration with proper output paths */
  reporter: [
    ['allure-playwright'],
    ['./SharedRuntime/CleanStackReporter.ts'],
    [
      'html',
      {
        outputFolder: './tests/Raw/Report/html-reports',
        open: 'never',
        attachmentsBaseURL: undefined,
      },
    ],
    ['json', { outputFile: './tests/Raw/Report/test-results.json' }],
    ['list'],
  ],

  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Base URL to use in actions like `await page.goto('/')`. */
    baseURL: 'http://localhost:8090',

    /* Timeout for each individual action (click, fill, waitFor, etc.) */
    actionTimeout: 60000, // 60 seconds

    /* Ignore HTTPS certificate errors - needed for testing environments with self-signed certificates */
    ignoreHTTPSErrors: true,

    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: process.env.TRIGGER_PIPELINE_SOURCE ? 'on-first-retry' : 'off',

    /* Take screenshot on failure - save to proper location */
    screenshot: 'only-on-failure',

    /* Record video on failure - save to proper location */
    video: process.env.TRIGGER_PIPELINE_SOURCE ? 'retain-on-failure' : 'off',
  },

  /* Global test options for output directories */
  globalSetup: './global-setup.js',

  /* Configure projects for major browsers */
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        /* Screenshot and video output directories */
        screenshot: { mode: 'only-on-failure', fullPage: true },
        video: { mode: process.env.TRIGGER_PIPELINE_SOURCE ? 'retain-on-failure' : 'off', size: { width: 1280, height: 720 } },
      },
    },
  ],
});
