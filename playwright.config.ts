import { defineConfig, devices } from '@playwright/test';

/**
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  testDir: './tests/TestScenario',
  /* Run tests in files in parallel */
  fullyParallel: true,
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,
  /* Opt out of parallel tests on CI. */
  workers: process.env.CI ? 1 : undefined,

  /* Output directories according to global project structure rules */
  outputDir: './tests/Raw/Report/test-results',

  /* Timeout for each test in milliseconds */
  timeout: 3600000, // 60 minutes

  /* Reporter configuration with proper output paths */
  reporter: [
    ['allure-playwright'],
    ['./Engine/Shared/CleanStackReporter.ts'], // Filter TestLogger.ts references first
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

    /* Ignore HTTPS certificate errors - needed for testing environments with self-signed certificates */
    ignoreHTTPSErrors: true,

    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: 'on-first-retry',

    /* Take screenshot on failure - save to proper location */
    screenshot: 'only-on-failure',

    /* Record video on failure - save to proper location */
    video: 'retain-on-failure',
  },

  /* Global test options for output directories */
  globalSetup: './global-setup.js',
  globalTeardown: undefined,

  /* Configure projects for major browsers */
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        /* Screenshot and video output directories */
        screenshot: { mode: 'only-on-failure', fullPage: true },
        video: { mode: 'retain-on-failure', size: { width: 1280, height: 720 } },
      },
      //outputDir: './tests/Raw/Report/test-results/chromium',
    },
  ],
});
