# Coding Standards

> **Component Rule:** This file contains language-specific coding standards for `TypeScript 6.0.3` / `Playwright 1.58.2 E2E Test Automation`.
>
> **Related:** See [development.md](../../../rules/development.md) for high-level architecture overview.
> See [Code Quality Standards Skill](../../code-quality-standards/SKILL.md) for mandatory code reuse checks.

---

## Core Principles

1. **NEW code:** Follow best practices for TypeScript 6.0.3 / Playwright 1.58.2 E2E test automation
2. **EXISTING code:** Match the existing patterns (injection, documentation, style)
3. **Documentation:** Follow TSDoc for TypeScript test code; TSDoc for SharedRuntime public interfaces
4. **Code style:** Maintain consistency within the same package or module

---

## Language & Framework

- **Language:** TypeScript 6.0.3 (strict mode; ES2022 target; CommonJS modules)
- **Framework:** Playwright 1.58.2 — AI-Enhanced E2E Test Automation
- **Version:** Playwright 1.58.2 / TypeScript 6.0.3 / Node ≥ 18
- **Reporters:** allure-playwright, CleanStackReporter (custom), html, json, list

---

## Dependency Management Patterns

### Preferred Pattern for New Code

- **Application code:** Not configured — select a package manager and dependency strategy once the stack is chosen.
- **Test runtime (`TestGeneration/`):** Uses npm; pin versions in `TestGeneration/package.json` and keep lockfile in sync.

### When Updating Existing Code

**Rule:** Match the existing pattern in the file — both dependency management AND documentation style.

1. Read the entire file before making changes
2. Identify the current dependency management approach
3. Add new dependencies following the same pattern
4. Do NOT mix patterns within a single file

---

## Documentation & Comment Patterns

### Per-Layer Documentation Rules

- **SharedRuntime/** — all public interfaces, classes, and methods require TSDoc (they are the framework API)
- **Functional/** (page objects) — document the page-level intent and non-obvious locator strategies
- **Business/** (workflows) — document workflow preconditions, parameters, and side effects
- **TestScenario/** (test files) — test description in the `test()` call; inline comments only for complex assertions or data setup

### When to Document

| Element | Documentation Required | Notes |
|---------|----------------------|-------|
| **Public interfaces / exported types** | Always | All public members |
| **Public classes / modules** | Always | Purpose and usage |
| **Public methods / functions** | Always | Unless trivially named getter/setter |
| **Protected / internal methods** | Always | For subclass or module implementers |
| **Private methods** | Optional | Only if complex logic |
| **Override / inherited methods** | Conditional | Only if behavior differs from parent |
| **Constants / configuration** | Sometimes | If not self-explanatory |

### Documentation Best Practices

- **Document WHY, not WHAT** — explain reasoning, not mechanics
- **Use structured format** — consistent doc comments across the project
- **Reference related code** — link to related classes, interfaces, or modules
- **Keep descriptions actionable** — state what the method does, not how it is called

---

## Naming Conventions

### General Patterns

- Variables and functions: `camelCase`
- Classes and interfaces: `PascalCase`
- Test IDs: `TC_XXX_vYYY_Name` format (from `TestTagEntry.testId` in `SharedRuntime/types.ts`)
- Tag strings: lowercase kebab-case (e.g., `@smoke`, `@feature:login`)

### Layer-Specific Naming

- **Page objects** (`Functional/`): `<PageName>Page.ts` — e.g., `LoginPage.ts`
- **Business workflows** (`Business/`): `<WorkflowName>Workflow.ts` or descriptive PascalCase class
- **Test scenarios** (`TestScenario/`): `TC_XXX_<descriptive_name>.spec.ts`
- **Data modules** (`TestData/`): `<Entity>Data.ts` — e.g., `UserData.ts`
- **SharedRuntime helpers**: `<Purpose>Helper.ts` — e.g., `DatabaseHelper.ts`

---

## Code Style Consistency

### Declaration Order

- Prefer consistency with existing code over personal preference
- Keep functions and modules focused on a single responsibility
- Use clear, descriptive names; avoid abbreviations unless they are domain-standard

### Annotation / Decorator Order

- Prefer consistency with existing code over personal preference
- Keep functions and modules focused on a single responsibility
- Use clear, descriptive names; avoid abbreviations unless they are domain-standard

---

## Error Handling

- Use typed error classes from `SharedRuntime/types.ts` for framework-level errors
- Playwright action errors propagate naturally — do not swallow them; let Playwright's retry logic handle transient flakiness
- Database/SSH helpers should throw typed errors on connection failures (do not return null silently)
- In test files, use `expect()` assertions rather than try/catch for verifications

---

## Test-Driven Development (TDD) Policy

> **Universal trigger logic, RED-GREEN-REFACTOR discipline, and best practices live in the [Code Quality Standards skill](../../code-quality-standards/SKILL.md) → "Test-Driven Development (TDD)" section. This section captures *project-specific* TDD policy that overrides or specializes the universal defaults.**

### Policy Level

- **TDD policy:** recommended  <!-- one of: mandatory | recommended | optional | not-used -->
- **Categories where TDD is mandatory (if policy = recommended/optional):** - domain logic
- regression bug fixes
  <!-- e.g., "domain logic", "API endpoints", "regression bug fixes" — agent MUST treat these as STRONG triggers regardless of user preference -->

### Tooling

- **Primary test framework:** Playwright 1.58.2
- **E2E framework (if any):** Playwright 1.58.2 (Chromium / Desktop Chrome only)
- **Coverage tool:** Not configured
- **Run command (single file):** `cd TestGeneration && npx playwright test <path/to/file.spec.ts>`
- **Run command (full suite):** `cd TestGeneration && npm test`
- **Run command (by tag):** `cd TestGeneration && npx playwright test --grep @<tag>`
- **Watch command:** Not configured

### Conventions

- **Test file naming:** `*.spec.ts` (convention: `TC_XXX_<descriptive_name>.spec.ts`)
- **Test file location:** `TestGeneration/tests/TestScenario/` (Playwright `testDir`)
- **Test name style:** TC_XXX_vYYY_Name testId format; behavior-oriented descriptions
- **Mocking strategy:** Prefer explicit stubs/fakes for boundaries; use framework mocks when idiomatic

### Coverage Thresholds

- **Statements:** 80%  <!-- e.g., 80% -->
- **Branches:** 75%  <!-- e.g., 75% -->
- **Functions:** 80%  <!-- e.g., 80% -->
- **Lines:** 80%  <!-- e.g., 80% -->
- **Enforcement:** _Not configured_  <!-- e.g., CI fails if below threshold; PR blocked -->

### Test Output

- **Reports directory:** `TestGeneration/tests/Raw/Report/` (gitignored; allure-results, html-reports, test-results.json)
- **CI integration:** GitLab CI skeleton present in `.gitlab-ci.yml`; uses `TEST_PARAMS` JSON env var for execution list via `run-playwright.js`

### TaskMaster Integration

- **Use TaskMaster for TDD subtasks:** complex-only  <!-- e.g., yes for features ≥ Complex, no for simple fixes -->

### Project-Specific TDD Notes

TDD policy set to recommended. Playwright 1.58.2 test runtime is active under `TestGeneration/`. Mandatory tags per test: `suite`, `priority`, `type`, `dataImpact` (validated against `TagConfiguration.json`). Every new test must follow the `TC_XXX_vYYY_Name` testId convention and land in `tests/TestScenario/`.

> When this section is rendered (during initialization Phase 6), the agent MUST apply the universal TDD discipline from the Code Quality Standards skill, but use the values above as the project's source of truth for framework, commands, naming, coverage, and policy strength.

---

## AI Agent Behavior

### Before Creating a New Class / Module

1. **Search for similar classes** in the same package or directory (see [Code Quality Standards Skill](../../code-quality-standards/SKILL.md))
2. **Read 2-3 similar files** to understand existing patterns:
   - Dependency management style
   - Documentation level and format
   - Method naming conventions
   - Comment density and style
3. **Match the dominant pattern** OR use best practices for greenfield code

### Before Adding a Method to an Existing File

1. **Read the entire file** to understand:
   - Current dependency management pattern
   - Documentation style used
   - Existing method signatures and naming
2. **Check neighboring methods:**
   - Do they have doc comments?
   - What is the format?
   - How detailed are the descriptions?
3. **Match the existing style** — the new method should be indistinguishable from existing ones

### Documentation Decision Tree

```
Is this an interface or exported type?
├─ Yes → Full documentation required
│   ├─ Class/module-level doc with purpose
│   └─ Every public member documented
│
└─ No → Is this an implementation?
    ├─ Service / business logic → Class doc + selective method docs
    ├─ Controller / handler → Framework-specific annotations (e.g., Swagger/OpenAPI)
    ├─ Task / workflow → Brief class doc + minimal method docs
    └─ Data access / repository → Minimal (focus on non-trivial queries)
```

---

## Examples

See `TestGeneration/SharedRuntime/` for canonical framework code patterns:
- `AIPage.ts` — base page-object class wrapping Playwright `Page`
- `AIElement.ts` — cache-first locator resolver returning `BoundElement`
- `DatabaseHelper.ts` — multi-DB query runner pattern
- `APIHelper.ts` — OAuth 2.0 / REST / GraphQL via Playwright request context
- `TestLogger.ts` — hierarchical logger with Allure attachment

See `TestGeneration/tests/TestDesign/tc_initial_test.md` for the minimal test descriptor format used as input to `/generate-test`.

---

## Maintaining This Document

> **Update Policy:** This document MUST be updated when any of the following occur:

1. 📝 New naming convention established or existing one changed → update Naming Conventions
2. 📝 Dependency injection or module pattern changed → update Dependency Management Patterns
3. 📝 Documentation convention updated (e.g., switching from JSDoc to TSDoc) → update Documentation & Comment Patterns
4. 📝 Declaration or annotation order rules changed → update Code Style Consistency
5. 📝 New error handling pattern introduced → update Error Handling section
6. 📝 New language, framework, or version adopted → update Language & Framework
7. 📝 New representative code examples available → update Examples section
8. 📝 Ask user to confirm documentation updates before finalizing

### When User Asks About Coding Standards

1. 🔍 **FIRST** check this document for the answer
2. 🔍 If not found here, check existing code for the dominant pattern — then propose adding it to this document
3. ❌ **DO NOT** introduce inconsistent patterns — always resolve ambiguity by aligning with what's already established

---

## Related Rules

- [development.md](../../../rules/development.md) - Architecture overview
- [Code Quality Standards Skill](../../code-quality-standards/SKILL.md) - Code reuse checks **and universal TDD discipline (RED-GREEN-REFACTOR, triggers, framework detection, troubleshooting)**
- Domain context skills (deployed by APM only when the matching package is installed):
  - `.agents/skills/backend-context/SKILL.md` - Backend architecture patterns (from the `backend-developer` package)
  - `.agents/skills/frontend-context/SKILL.md` - Frontend component patterns (from the `frontend-developer` package)
  - `.agents/skills/api-context/SKILL.md` - API design patterns (from the `api` package)
  - `.agents/skills/testing-context/SKILL.md` - Testing patterns (from the `qa` package)

---

## Notes

AI-Enhanced Test Automation Framework using Playwright 1.58.2 and TypeScript 6.0.3. The `SharedRuntime/` layer is the framework core and should not be modified without intent. Application under test (AUT) stack not yet configured; run `/initialize` after AUT selection to add AUT-specific guidelines.
