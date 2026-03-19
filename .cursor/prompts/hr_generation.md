# Test Automation Generation - Requirements

## ⚠️ CRITICAL: MANDATORY REQUIREMENTS ⚠️

**ABSOLUTE REQUIREMENT: Every single instruction in this document is MANDATORY and MUST be implemented without exception.**

- **ALL** requirements listed below are **MANDATORY** - NO exceptions allowed
- **EVERY** instruction MUST be followed exactly as specified
- **EACH** requirement in this file is a hard constraint that CANNOT be bypassed
- When verifying against `@GlobalTestGenerationRule.mdc`, check EVERY instruction ONE BY ONE:
  1. Go through each section in this file sequentially
  2. Verify each bullet point/instruction is covered in the global rule
  3. Confirm 100% alignment - no approximations or partial implementations
  4. Ensure mandatory nature is preserved in the global rule
  5. All parameter values, class names, method names, paths MUST match EXACTLY (100% match required)
- **Verification Requirement**: Before considering the global rule complete, explicitly verify that ALL instructions from this file are implemented as MANDATORY requirements in `@GlobalTestGenerationRule.mdc`

## Core Framework

- AI-driven Playwright test automation framework
- AI-enhanced Page Object Model pattern
- Intelligent locator caching system
- Random data generation for unique test data
- Base classes: `Engine/Shared/AIPage.ts` and `Engine/Shared/AIElement.ts`

## Code Reusability

- **Page Object Models**: Before creating a new Page Object Model, check if it already exists in `tests/Functional/`. Reuse existing page models instead of duplicating.
- **Business Workflows**: Before creating a new business workflow orchestration class, check if it already exists in `tests/Business/`. Reuse existing workflow classes instead of duplicating.

## Page Investigation (MANDATORY)

- **MANDATORY**: Use Playwright for ALL page investigation and analysis
- **MANDATORY**: Perform detailed application page analysis via Playwright BEFORE any code generation
- **PROHIBITION**: Code generation WITHOUT detailed Playwright page analysis is NOT ALLOWED
- **MANDATORY**: ALL Playwright interactions MUST be in headed mode - user MUST see all clicks and interactions in browser
- Investigate page structure, elements, forms, and interactions through live browser observation
- Document findings from actual page state before generating any code

## Mandatory Generation Process

1. **MANDATORY**: Take Playwright snapshots before generating any locators
2. **MANDATORY**: Analyze page structure through Playwright in headed mode
3. Generate locators ONLY from actual page state observed via Playwright
4. Use long, highly specific locators with form context and hierarchy
5. Execute generated script and achieve 100% pass rate (regenerate until success)

## Locator Management

- Priority: Cache first → AI fallback → Error handling
- Cache location: `tests/Utils/locator_cache.json`
- Structure: `{ page { name, url, description, locators { key, description, locator } } }` where:
  - Each page has: `name` (page name), `url` (related URL), `description` (page purpose)
  - Each page contains `locators` object with locator entries having: `key`, `description`, `locator`
- Generate LONG, SPECIFIC selectors (include form context, attributes, hierarchy)
- Auto-detect page changes and revalidate locators

## Test Data

- Generate random, unique data per run
- Prevent duplicates and conflicts
- Use timestamps for uniqueness
- Support varied data types from predefined arrays

## Test Scenarios

- One test per scenario file (single test rule)
- 100% alignment with test description (implement all steps)
- Target: 100% success rate

## Playwright Execution

- **MANDATORY**: Run with `--workers=1 --headed --project=chromium`
- **MANDATORY**: ALL Playwright interactions MUST be in headed mode ONLY (no headless mode allowed)
- **MANDATORY**: User MUST see all clicks and interactions in the browser window
- Use headed mode for research, verification, and ALL test execution
- Monitor browser interactions visually
- Zero failures, zero skipped tests

## Reporting

- **MANDATORY**: Generate file-based reports only (no hosted reports)
- **MANDATORY**: Analyze reports from stored files ONLY (not from hosted report pages)
- Location: `tests/Raw/Report/`
- Format: `{reportName}_yyyyMMdd-HHmmss`
- **PROHIBITION**: Never start processes to host report pages
- Read and analyze report content directly from generated files

## AIElement Methods

- click(), fill(), hover(), select()
- getText(), getSelectedValue(), isVisible()
- waitFor(), check(), uncheck()
- Cache-first with AI fallback
- Natural language descriptions

## AI Integration

- Fallback only (when cache fails)
- Framework works without OpenAI API key
- Smart prompts for long, specific selectors
- Graceful error handling

## Success Criteria

- 100% test success rate (mandatory)
- Single test per scenario file
- File-based reports with datetime postfix
- Smart caching with AI fallback working

---

## 🔒 MANDATORY COMPLIANCE CHECKLIST 🔒

**Before finalizing `@GlobalTestGenerationRule.mdc`, verify EACH requirement below is implemented as MANDATORY:**

### Verification Steps (Check Each One):

- [ ] Core Framework - ALL items are mandatory in global rule
- [ ] Code Reusability - ALL items are mandatory in global rule
- [ ] Page Investigation (MANDATORY) - ALL requirements are mandatory in global rule
- [ ] Mandatory Generation Process - ALL steps are mandatory and sequenced correctly in global rule
- [ ] Locator Management - ALL requirements are mandatory in global rule
- [ ] Test Data - ALL requirements are mandatory in global rule
- [ ] Test Scenarios - ALL requirements are mandatory in global rule
- [ ] Playwright Execution - ALL requirements are mandatory in global rule
- [ ] Reporting - ALL requirements are mandatory in global rule
- [ ] AIElement Methods - ALL requirements are mandatory in global rule
- [ ] AI Integration - ALL requirements are mandatory in global rule
- [ ] Success Criteria - ALL requirements are mandatory in global rule

**FINAL VERIFICATION**: Every instruction marked with `-` or numbered in this document MUST appear as a MANDATORY requirement in `@GlobalTestGenerationRule.mdc`. No exceptions. No approximations. 100% coverage required.
