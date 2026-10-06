# cloud-jpg-tests

NetCracker ATP3 E2E test automation project using the **AI-Enhanced Test Automation Framework** (Playwright 1.58.2 / TypeScript 6.0.3).

## Overview

- **Test runtime:** Playwright 1.58.2, Chromium only, TypeScript 6.0.3 strict mode
- **Architecture:** Layered page-object model — `TestScenario → Business → Functional → SharedRuntime`
- **Reporting:** Allure, HTML, JSON (output: `TestGeneration/tests/Raw/Report/`)
- **CI/CD:** GitLab NextGenCI pipeline (disabled until placeholders filled)
- **Registry:** NetCracker Artifactory (`artifactorycn.netcracker.com`)

## Getting Started

See [`docs/GETTING_STARTED.md`](docs/GETTING_STARTED.md) for prerequisites, environment setup, and test execution.

## Project Structure

```
TestGeneration/                  Playwright/TypeScript test runtime
├── SharedRuntime/               Framework core (AIPage, AIElement, helpers)
├── tests/
│   ├── TestScenario/            Playwright testDir — test files land here
│   ├── Functional/              Page objects (generated)
│   ├── Business/                Business workflows (generated)
│   ├── TestData/                Data modules (generated)
│   └── TestDesign/              Test descriptors (input for /generate-test)
└── environment-configuration/   Environment template + local setup guide
app-chart/                       Helm chart for Kubernetes deployment
.gitlab-ci.yml                   GitLab CI pipeline (NextGenCI components)
Dockerfile.multistage            4-stage Docker build
```

## Key Commands

| Command | Description |
|---|---|
| `cd TestGeneration && npm install` | Install dependencies |
| `cd TestGeneration && npx playwright test <file>` | Run a single test file |
| `cd TestGeneration && npm test` | Run full test suite |
| `cd TestGeneration && npx playwright test --grep @smoke` | Run by tag |
| `cd TestGeneration && npm run validate` | Type-check + lint + format-check |
| `cd TestGeneration && npm run allure:generate && npm run allure:open` | View Allure report |

## Generating Tests

Use the `/generate-test` command with a test descriptor from `TestGeneration/tests/TestDesign/`.  
See [`TestGeneration/README.md`](TestGeneration/README.md) for the full workflow.

## Agent Instructions

See [`AGENTS.md`](AGENTS.md) for project conventions and agent guidance.

## Documentation Index

See [`docs/INDEX.md`](docs/INDEX.md) for the full documentation index.
