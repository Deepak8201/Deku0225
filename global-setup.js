// Global setup for Playwright tests
// This file runs before all tests to initialize Allure environment info, executor info, test results categories info

const fs = require('fs');
const path = require('path');

/**
 * Create environment.properties file for Allure report
 * @returns Promise<void>
 */
async function createEnvironmentProperties() {
  try {
    const allureResultsDir = path.join(process.cwd(), 'allure-results');
    
    // Ensure allure-results directory exists
    if (!fs.existsSync(allureResultsDir)) {
      fs.mkdirSync(allureResultsDir, { recursive: true });
    }
    
    const envPropertiesPath = path.join(allureResultsDir, 'environment.properties');
    
    // Define environment variables
    const environment = process.env.ENVIRONMENT_NAME || 'undefined';
    const os = process.platform;
    const browser = process.env.PW_BROWSER_NAME || process.env.BROWSER || 'Unknown';
    const browserVersion = process.env.PW_BROWSER_VERSION || process.env.BROWSER_VERSION || 'Unknown';
    const testStartTime = new Date().toISOString();
    const testGitBranch = process.env.ATP_TESTS_GIT_REPO_BRANCH;
    const nodeJSVersion = process.version;
    
    // Safe Playwright version retrieval
    let playwrightVersion = 'Unknown';
    try {
      playwrightVersion = require('@playwright/test/package.json').version;
    } catch (error) {
      console.warn('⚠️ Could not determine Playwright version');
    }
    
    const properties = [
      `Environment=${environment}`,
      `OS=${os}`,
      `Browser=${browser}`,
      `Browser_Version=${browserVersion}`,
      `Test_Git_Branch=${testGitBranch}`,
      `Test_Start_Time=${testStartTime}`,
      `NodeJS_Version=${nodeJSVersion}`,
      `Playwright_Version=${playwrightVersion}`,
    ];
    
    fs.writeFileSync(envPropertiesPath, properties.join('\n'));
    console.log(`✅ Environment properties created: ${envPropertiesPath}`);
    
  } catch (error) {
    console.error('❌ Failed to create environment properties:', error);
  }
}

/**
 * Create executor.json file for Allure report
 * This file is required for executor information to display in Allure report
 * @returns Promise<void>
 */
async function createExecutorJson() {
  try {
    const allureResultsDir = path.join(process.cwd(), 'allure-results');
    
    // Ensure allure-results directory exists
    if (!fs.existsSync(allureResultsDir)) {
      fs.mkdirSync(allureResultsDir, { recursive: true });
    }
    
    const executorJsonPath = path.join(allureResultsDir, 'executor.json');

    const executorData = {
      name: require('os').userInfo().username || 'Unknown User'
    };
    
    fs.writeFileSync(executorJsonPath, JSON.stringify(executorData, null, 2));
    console.log(`✅ Executor JSON created: ${executorJsonPath}`);
    
  } catch (error) {
    console.error('❌ Failed to create executor JSON:', error);
  }
}

/**
 * Create categories.json file for Allure report
 * This file defines custom categories for test results
 * @returns Promise<void>
 */
async function createCategoriesJson() {
  try {
    const allureResultsDir = path.join(process.cwd(), 'allure-results');
    
    // Ensure allure-results directory exists
    if (!fs.existsSync(allureResultsDir)) {
      fs.mkdirSync(allureResultsDir, { recursive: true });
    }
    
    const categoriesJsonPath = path.join(allureResultsDir, 'categories.json');

    const categoriesData = [
      {
        "name": "🔴 Solution Issue",
        "messageRegex": ".*Error.*",
        "traceRegex": ".*",
        "matchedStatuses": ["failed", "broken"]
      },
      {
        "name": "🐛 Bug: Solution Error - Assertion",
        "messageRegex": ".*Assertion.*",
        "matchedStatuses": ["failed"]
      },
      {
        "name": "🐛 Bug: Solution Error - Business Logic",
        "messageRegex": ".*Expected.*but got.*",
        "matchedStatuses": ["failed"]
      },
      {
        "name": "⚙️ Test Configuration Error: Timeout",
        "messageRegex": ".*timeout.*",
        "matchedStatuses": ["broken"]
      },
      {
        "name": "⚙️ Test Configuration Error: Selector Not Found",
        "messageRegex": ".*waiting for locator.*",
        "matchedStatuses": ["broken"]
      },
      {
        "name": "🌐 Network Error",
        "messageRegex": ".*ECONNREFUSED.*|.*network.*",
        "matchedStatuses": ["broken"]
      }
    ];
    
    fs.writeFileSync(categoriesJsonPath, JSON.stringify(categoriesData, null, 2));
    console.log(`✅ Categories JSON created: ${categoriesJsonPath}`);
    
  } catch (error) {
    console.error('❌ Failed to create categories JSON:', error);
  }
}

/**
 * Global setup function for Playwright
 * Initializes Allure report test results info
 */
async function globalSetup() {
  console.log('🚀 Starting global setup...');
  
  try {
    // Initialize Allure environment information
    console.log('🌍 Initializing Allure report test results info...');
    await createEnvironmentProperties();
    await createExecutorJson();
    await createCategoriesJson();
    console.log('✅ Allure report test results info initialized');
    console.log('✅ Global setup completed successfully');
  } catch (error) {
    console.error('❌ Global setup failed:', error);
    throw error;
  }
}

module.exports = globalSetup;
