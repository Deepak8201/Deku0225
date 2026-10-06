# Getting Started

This project uses the NC AI Workplace template with the `test-generation` APM package installed.  
Test runtime: **Playwright 1.58.2 / TypeScript 6.0.3** under `TestGeneration/`.

> **Two AI-agent harnesses are configured:** OpenCode (`.opencode/`) and Cursor (`.cursor/`). `apm.yml` targets both, so slash commands and agents from `test-generation` are available in either assistant — use whichever you have open. See [`docs/INDEX.md`](INDEX.md) → "Cursor-Line Configuration" for the full per-harness file map.

## Prerequisites

- Node.js ≥ 18
- npm (bundled with Node)
- Access to the target NetCracker cloud environment

## 1. Install Dependencies

```sh
cd TestGeneration
npm install
npx playwright install
```

## 2. Configure the Environment

The test runtime reads connection details from a generated `environment-configuration.json` file.

1. Copy the example values file:
   ```sh
   cp TestGeneration/environment-configuration/local-environment-configuration/env-example.yaml \
      TestGeneration/environment-configuration/local-environment-configuration/env-local.yaml
   ```
2. Fill in real values in `env-local.yaml` (file is gitignored).
3. Generate `environment-configuration.json`:
   ```powershell
   cd TestGeneration/environment-configuration
   .\setEnvironmentScript.ps1 `
     -TemplateFile environment-configuration-template.json `
     -EnvFile local-environment-configuration/env-local.yaml
   ```

See [`TestGeneration/environment-configuration/local-environment-configuration/LOCAL-SETUP.md`](../TestGeneration/environment-configuration/local-environment-configuration/LOCAL-SETUP.md) for a detailed walkthrough.

## 3. Run Tests

```sh
# Single test file
cd TestGeneration && npx playwright test tests/TestScenario/<file>.spec.ts

# Full suite
cd TestGeneration && npm test

# By tag
cd TestGeneration && npx playwright test --grep @smoke
```

## 4. View Reports

```sh
# HTML report (opens in browser)
cd TestGeneration && npx playwright show-report tests/Raw/Report/html-reports

# Allure report
cd TestGeneration && npm run allure:generate && npm run allure:open
```

## 5. Generate a New Test

1. Create a test descriptor in `TestGeneration/tests/TestDesign/` (see `tc_initial_test.md` for an example).
2. Run `/generate-test` in your AI assistant — OpenCode or Cursor (the command is deployed to both).

See [`TestGeneration/README.md`](../TestGeneration/README.md) for the full `/generate-test` workflow, all slash commands, and the layered architecture guide.

## Key References

- [AGENTS.md](../AGENTS.md) — project conventions and agent guidance
- [docs/INDEX.md](INDEX.md) — full documentation index
- [TestGeneration/README.md](../TestGeneration/README.md) — framework architecture and workflow
- [.opencode/commands/](../.opencode/commands/) — available slash commands (OpenCode)
- [.cursor/commands/](../.cursor/commands/) — available slash commands (Cursor)
