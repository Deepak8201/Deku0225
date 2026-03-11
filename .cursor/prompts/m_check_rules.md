# 🔍 Rule Compliance Verification and Correction

## 📋 Purpose

Systematically verify all project rules and automatically correct any violations found in generated code.

## 🎯 Workflow

### Step 1: Read All Rules

- Read all rule files from `.cursor/rules/` directory
- Understand each rule's requirements and constraints
- Extract all validation criteria from the rules

### Step 2: Verify Each Rule Instruction One by One

- Go through each rule systematically
- Check compliance for each instruction defined in the rules
- Identify any violations or non-compliance

### Step 3: Correct Violations Immediately

When violations are found:

1. **Fix immediately** - Don't create reports, just correct
2. **Apply rule standards** - Use patterns defined in the rules
3. **Verify fix** - Ensure correction resolves the violation
4. **Continue** - Move to next validation

## 🎯 Focus

- **Interested in**: Corrections to generated code
- **Not interested in**: Compliance reports or documentation of issues
- **Action**: Fix violations as they are discovered

## ✅ Success Criteria

- All rules verified one by one
- All violations corrected automatically
- Code fully compliant with all rules
- Ready for execution without issues
