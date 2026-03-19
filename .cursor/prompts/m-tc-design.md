<!--
How to collect input files:
1. Record test actions using Playwright Codegen: npx playwright codegen <URL>
2. Save recorded test to test/TestDesign/TestDesignPreparation/test-track.md
3. Create manual notes file at test/TestDesign/TestDesignPreparation/test-notes.md with validation points and special requirements

Usage: Attach prompt to Cursor conversation chat and trigger to start.
Purpose: Converts raw Playwright recordings into structured test scenario documentation for AI test generation.
Output: Comprehensive markdown document with all details needed for automated test generation.
-->

# Test Scenario Design Request

## Input Files
- **Playwright Recording**: `test/TestDesign/TestDesignPreparation/test-track.md`
- **Manual Notes**: `test/TestDesign/TestDesignPreparation/test-notes.md`

## Task
Analyze the Playwright-recorded actions and manual notes to create a comprehensive, structured test scenario description.

## Output Requirements

### 1. File Location
- Create output file: `test/TestDesign/TestDesignPreparation/test-steps.md`

### 2. Document Structure

The output document should include:

#### **Test Scenario Overview**
- Test Name
- Test Objective
- Preconditions
- Test Data Requirements

#### **Detailed Test Steps**
For each step, provide:
- **Step Number**: Sequential numbering (1, 2, 3, etc.)
- **Page/Section**: Which page or section the action occurs on
- **Action**: Clear description of what to do
  - Include specific element identifiers (button names, field labels, etc.)
  - Specify data to enter (or data generation requirements)
  - Note any selections from dropdowns or lists
- **Expected Result**: What should happen after the action
  - UI changes (navigation, element appearance/disappearance)
  - Data validation
  - Success messages or confirmations

#### **Verification Points**
- List all data verification requirements
- Specify what data should match between pages
- Include any business rule validations

#### **Test Data Specifications**
- Define data format requirements (e.g., "School Name: text + number")
- Specify randomization needs
- List all required fields and their constraints

### 3. Content Guidelines

**DO:**
- ✅ Use clear, unambiguous language
- ✅ Include all UI element identifiers from the recording
- ✅ Specify exact field names, button texts, link texts
- ✅ Describe expected results for every action
- ✅ Include navigation flow between pages
- ✅ Specify data verification requirements
- ✅ Use numbered steps for easy reference
- ✅ Group related actions logically
- ✅ Include wait conditions (e.g., "wait for page to load")

**DON'T:**
- ❌ Generate any code (TypeScript, JavaScript, etc.)
- ❌ Include technical implementation details
- ❌ Reference test generation rules or framework specifics
- ❌ Use technical jargon (locators, selectors, XPath)
- ❌ Skip verification points
- ❌ Assume implicit actions

### 4. Example Structure

```markdown
# Test Scenario: [Scenario Name]

## Overview
- **Test Name**: [Name]
- **Objective**: [What this test validates]
- **Preconditions**: [What must be true before test starts]

## Test Data Requirements
- [Field 1]: [Format/Requirements]
- [Field 2]: [Format/Requirements]

## Test Steps

### Step 1: [Action Summary]
**Page**: [Page Name]
**Action**: 
- [Detailed action description]
- [Include element identifier: "Click button 'Submit'"]
- [Include data: "Enter 'Test Value' in 'Name' field"]

**Expected Result**:
- [What should happen]
- [UI changes]
- [Navigation]

### Step 2: [Action Summary]
...

## Verification Points
1. [Verification 1]
2. [Verification 2]

## Expected Final State
- [What should be true at test completion]
```

## Processing Instructions

1. **Analyze** the Playwright recording to extract:
   - Page navigation sequence
   - All UI interactions (clicks, fills, selections)
   - Element identifiers (role, name, label)
   - Data entered

2. **Incorporate** manual notes to add:
   - Validation requirements
   - Data generation rules
   - Business logic verification
   - Special considerations

3. **Structure** the information into:
   - Logical step sequence
   - Clear action-result pairs
   - Comprehensive verification points

4. **Ensure completeness**:
   - Every action from recording is documented
   - Every note requirement is included
   - All verifications are specified
   - Data requirements are clear

## Deliverable
A single, comprehensive markdown file that contains all information needed for AI-driven test generation, written in natural language without any code or technical implementation details.

