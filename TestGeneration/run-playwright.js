import { execSync } from "child_process";

const testParamsEnv = process.env.TEST_PARAMS;

if (!testParamsEnv) {
  console.error("Error: TEST_PARAMS environment variable is not set.");
  process.exit(1);
}

let params;
try {
  params = JSON.parse(testParamsEnv);
} catch (error) {
  console.error("Error: TEST_PARAMS does not contain valid JSON.", error);
  process.exit(1);
}

if (!params.execution_list || params.execution_list.length === 0) {
  console.error("Error: execution_list is missing or empty in TEST_PARAMS.");
  process.exit(1);
}

// Determine execution type from the first item
const executionItem = params.execution_list[0];
const executionType = executionItem.type;

let command = "";

if (executionType === "scope") {
  const scopeName = executionItem.name;
  // Ensure the name starts with '@' for grep tagging
  const tagName = scopeName.startsWith("@") ? scopeName : `@${scopeName}`;
  console.log(`Running tests with scope (tag): ${tagName}`);
  command = `npx playwright test -g "${tagName}"`;
} else if (executionType === "test") {
  console.log("Running individual tests:");
  // Build command to run all tests listed
  const testFiles = params.execution_list
    .map((item) => `"${item.name}"`)
    .join(" ");
  console.log(`Executing tests: ${testFiles}`);
  command = `npx playwright test ${testFiles}`;
  // Note: Playwright runs all specified files. If you need sequential execution
  // with stop-on-failure, you'd need a loop here executing them one by one.
} else {
  console.error(
    `Error: Unknown execution type '${executionType}' in execution_list.`
  );
  process.exit(1);
}

try {
  console.log(`Executing command: ${command}`);
  execSync(command, { stdio: "inherit" }); // Execute and inherit stdio
  console.log("\n---\nTest execution finished.");
  process.exit(0); // Success
} catch (error) {
  console.error("\n---\nTest execution failed.");
  process.exit(1); // Indicate failure
}
