#!/bin/bash

# Execute the Node.js script to parse TEST_PARAMS and run Playwright
node run-playwright.js

# Capture the exit code from the Node script
exit_code=$?

# Exit the shell script with the same exit code
exit $exit_code