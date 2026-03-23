# AI-Enhanced Test Automation Framework Template

> **Template Repository**: This is a template for creating AI-driven test automation projects using Playwright, TypeScript, and intelligent test generation capabilities.


## 🎯 About This Template

This template provides a complete AI-enhanced test automation framework with:

- **AI-Driven Test Generation**: Intelligent test generation through Cursor AI rules
- **Playwright Integration**: Modern browser automation with TypeScript
- **Layered Architecture**: Clean separation of concerns (Test Scenarios → Business → Page Objects)
- **Smart Element Location**: Cache-first locator management with AI fallback
- **Comprehensive Logging**: Hierarchical logging system (TestLogger)
- **API Integration**: REST, GraphQL, and OAuth 2.0 support via APIHelper
- **Database Support**: Multi-database connectivity (MySQL, PostgreSQL, MSSQL, MongoDB, Oracle)
- **File Management**: TestFileHelper for upload testing with stable/temp file structure
- **Tag-Based Execution**: Flexible test filtering and categorization
- **Configuration Management**: Environment configuration via EnvGen or locally using environment variable

---

## 🚀 Installation

### Step 1: Clone and Setup Project Repository

**Scenario A:** Set Up Template in Empty/Existing Project Repository

**Use this when**: You're setting up the template structure for the first time in a project repository.

```bash
# 1. Clone the target project repository
git clone <project-repository-url>

# 2. Navigate to project repository
cd project-repo

# 3. Add template repository as temporary remote (alias "template")
git remote add template https://git.netcracker.com/PROD.ATP/product.atp/atp3-templates/atp3-tests-template.git

# 4. Fetch data from template without merging
git fetch template

# 5. Copy ALL files from template/master branch to current directory
# - without history
# - without .git
# - just as content
git checkout template/master -- .

# 6. Initialize and download submodules specified in template
git submodule update --init --recursive

# 7. Remove connection to template repository
git remote remove template

# 8. Commit and push changes
git add .
git commit -m "Init project from template"
git push

# 9. Verify setup (optional but recommended)
# Check submodules status (should show commit hashes for core-prompts, core-rules and Shared submodules)
git submodule status

# Check remote connections (should show ONLY 'project' remote)
git remote -v
```

**Scenario B:** Clone Repository That Already Has Template Structure

**Use this when**: You're cloning a project that already has the template set up (most common for team members).

```bash
# 1. Clone the project repository
git clone <project-repository-url>

# 2. Navigate to project repository
cd project-repo

# 3. Initialize and download submodules
git submodule update --init --recursive

# 4. Verify setup (optional but recommended)
# Check submodules status (should show commit hashes for core-prompts, core-rules and Shared submodules)
git submodule status
```

### Step 2: Install Dependencies and Browsers

```bash
# Install Node.js packages
npm install

# Install Playwright browsers
npx playwright install
```

### Step 3: Add MCP Server (Required for Browser Automation)

1. Open Cursor Settings
2. Got to 'Tools & MCP' tab
3. Click "New MCP Server"
4. Add the following MCP server configuration:

```json
{
  "mcpServers": {
    "Playwright": {
      "command": "npx -y @playwright/mcp@latest",
      "env": {},
      "args": []
    }
  }
}
```

5. Save the settings.json file
6. Enable "Playwright" MCP Server
7. Check that MCP Server enabled witout errors

### Step 4: Configure Environment Settings for Local execution (ATP_ENVGENE_CONFIGURATION environment variable)

1. Create Environment configuration file in `tests/Settings/EnvironmentSettings` folder.
- **Structure**: systems[].{systemName}.connections[].{connectionType}.{parameters}
- **Example**: tests\Settings\EnvironmentSettings\envTemplateExample.json
2. Update `tests\Settings\EnvironmentSettings\setEnvironmentScript.ps1` script with created configuration file name.
3. Run `tests\Settings\EnvironmentSettings\setEnvironmentScript.ps1` script using Terminal
4. **Restart Cursor** to ensure the environment variable is loaded

**ATP_ENVGENE_CONFIGURATION** environment variable with specified configuration will be created localy.

When running tests via Pipeline **ATP_ENVGENE_CONFIGURATION** environment variable will be created by **EnvGen** according to selected environment in job.

## 📦 Submodules

This project uses Git submodules for shared components:

| Submodule | Path | Description |
|-----------|------|-------------|
| core-engine | `Engine/Shared` | Core framework (AIPage, AIElement, TestLogger, etc.) |
| core-prompts | `.cursor/prompts/core-prompts` | Cursor AI core prompts for test generation |
| core-rules | `.cursor/rules/core-rules` | Cursor AI core rules for test generation |

### Update submodules to latest version

```bash
# Update all submodules to latest commit from their remote
git submodule update --remote

# Update specific submodule
git submodule update --remote .cursor/rules/core-rules

# After updating, commit the changes
git add .cursor/rules/core-rules
git commit -m "Update submodules to latest version"
```

### Check submodule status

```bash
git submodule status
```

## 📁 Project Structure

```
atp3-tests-template/
├── .cursor/
│   ├── prompts/                               # Cursor AI prompts
│   │   └── core-prompts/                         # Core prompts for test generation
│   └── rules/                                 # Cursor AI rules
│       └── core-rules/                           # Core rules for test generation
│           ├── RuleRegistry.mdc                      # Central registry and index of all rules
│           ├── MainGenerationOrchestrator.mdc        # Main workflow orchestrator
│           ├── Phase0_ReusabilityAnalysis.mdc        # Component reusability check
│           ├── Phase1_LocatorResearch.mdc            # Page investigation and element collection
│           ├── Phase2_PreGenerationVerification.mdc  # Research completion gate
│           ├── Phase3_ImplementationStandards.mdc    # Implementation patterns
│           ├── Phase4_TestGeneration.mdc             # Code generation phase
│           ├── Phase5_Validation.mdc                 # Test execution and validation
│           ├── ArchitectureLayeredDesign.mdc         # Layered architecture requirements
│           ├── LocatorManagementSystem.mdc           # Locator cache management
│           ├── TaggingStandards.mdc                  # Test tagging system
│           ├── TestExecutionRequirements.mdc         # Playwright execution parameters
│           ├── ReportingRequirements.mdc             # Report generation standards
│           ├── InvestigationTracking.mdc             # Investigation documentation
│           ├── DatabaseHelperRule.mdc                # Database integration patterns
│           ├── APIIntegrationRule.mdc                # API integration patterns
│           └── project-custom-rule.mdc               # Add your custom rules here
│
├── Engine/
│   └── Shared/                           # Core implementation
│       ├── AIElement.ts                  # Smart element locator with cache
│       ├── AIPage.ts                     # Base page class
│       ├── AITomsPage.ts                 # Table view page base class
│       ├── BoundElement.ts               # Resolved element interaction wrapper
│       ├── TestLogger.ts                 # Hierarchical logging system
│       ├── SettingsHelper.ts             # Configuration management
│       ├── TagHelper.ts                  # Test tagging system
│       ├── TagRegistry.ts                # Tag validation and management
│       ├── ConsoleCapture.ts             # Browser console/network capture
│       ├── CleanStackReporter.ts         # Clean stack trace reporter
│       ├── APIHelper.ts                  # REST/GraphQL/OAuth integration
│       ├── DatabaseHelper.ts             # Multi-database support
│       ├── DatabaseAdapters.ts           # Database adapter registry
│       ├── TestFileHelper.ts             # File creation/management for uploads
│       ├── LocatorCacheManagement.ts     # Intelligent locator caching system
│       └── types.ts                      # TypeScript type definitions
│
├── tests/
│   ├── Business/                         # Business workflow layer
│   ├── Functional/                       # Page Object layer
│   ├── TestScenario/                     # Test scenario layer
│   ├── TestDesign/                       # Test design specifications
│   ├── TestData/                         # Test data generators (in-memory)
│   │   └── Files/                        # Stable test files (not cleaned)
│   ├── Settings/
│   │   ├── EnvironmentSettings/          # Environment configuration folder
│   │   │   ├── envTemplateExample.json   # Environment template example
│   │   │   └── setEnvironmentScript.ps1  # Environment setup script
│   │   └── TagConfiguration.json         # Tag definitions
│   ├── Utils/
│   │   ├── locator_cache.json            # Cached element locators
│   │   └── TestTagsMapping.json          # Test-to-tag mappings
│   └── Raw/                            
│       ├── Debug/                        # Investigation & debug files
│       └── Report/                       # Test execution reports
│
├── .eslintrc.json                        # ESLint configuration
├── .prettierrc.json                      # Prettier configuration
├── .prettierignore                       # Prettier ignore rules
├── .gitignore                            # Git ignore rules
├── .gitmodules                           # Git submodules configuration
├── .gitlab-ci.yml                        # GitLab CI/CD pipeline configuration
├── package.json                          # Node.js dependencies
├── playwright.config.ts                  # Playwright configuration
├── tsconfig.json                         # TypeScript configuration
├── global-setup.js                       # Playwright global setup
├── run-playwright.js                     # Test runner script
├── start_tests.sh                        # Shell script for CI test execution
└── README.md                             # This file
```

---

## 🎯 Framework Features

### Feature 1: Layered Architecture
- **Test Scenario**: High-level test flow orchestration
- **Business Workflow**: Domain logic and multi-page workflows
- **Page Objects**: UI interaction definitions
- **AIElement**: Smart element location with cache-first approach


## 🧪 Test Generation Workflow

**To Generate Tests**: Use the command `Generate test scenario based on description provided @TestDesign.md` where `@TestDesign.md` contains your test steps description.

The framework includes AI-powered test generation through Cursor rules:

### Phase 1: Reusability Analysis
- Analyze test description
- Identify existing reusable components
- Define investigation scope

### Phase 2: Locator Research
- Capture page state with Playwright
- Collect element HTML
- Generate optimal locators

### Phase 3: Pre-Generation Verification
- Verify 100% research completion
- Gate before code generation

### Phase 4: Implementation Standards
- Define base class usage
- Establish logging integration
- Apply verification patterns

### Phase 5: Test Generation
- Generate Page Objects
- Generate Business Workflows
- Generate Test Scenarios with tagging

### Phase 6: Validation
- Execute regression tests
- Verify 100% pass rate
- Check project structure compliance

---

## 🏃 Running Tests

### Basic Execution (Terminal output)
```bash
# Run all tests 
npx playwright test

# Run specific test file
npx playwright test tests/TestScenario/LoginTest.test.ts

# Run with specific browser
npx playwright test --project=chromium
npx playwright test --project=firefox
npx playwright test --project=webkit
```
### UI Mode
```bash
# Run UI Mode for execution and debugging
npx playwright test --ui
```

### Headed Mode (Visible Browser)
```bash
# Run with visible browser
npx playwright test --headed
```

### Tag-Based Running
```bash
# Run smoke tests
npx playwright test --grep "@smoke"

# Run critical priority
npx playwright test --grep "@critical"

# Run specific feature
npx playwright test --grep "@feature:login"
```

### Reports
```bash
# Show HTML report
npx playwright show-report

# Generate Allure report
npm run allure:generate
npm run allure:open
```

**Happy Testing! 🚀**
