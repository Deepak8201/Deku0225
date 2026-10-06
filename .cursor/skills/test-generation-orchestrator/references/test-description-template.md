# Test Description Template

Best practices for writing generation-friendly test descriptions that produce high-quality, first-pass test code.

## Purpose

This template helps you write test descriptions that:
- Generate accurate code on the first pass (target: 80%+ success rate)
- Minimize fix cycles (target: ≤2 cycles)
- Avoid manual interventions
- Support any database technology (Oracle, MySQL, PostgreSQL)
- Work with any authorization pattern (OAuth, custom headers, API keys, sessions)

## Template Structure

### 1. Test Metadata (Required)

```markdown
# Test ID: TC_XXX_v001_TestName

**Test Type**: surface set from {UI, API, DB, SSH} joined with ` + ` (e.g. `UI`, `API`, `UI + API`)
**Priority**: critical | high | medium | low
**Suite**: smoke | regression | full
**Data Impact**: readonly | mutating
**Environment**: dev | staging | production | all
```

**Guidelines**:
- Use PascalCase for test name
- Start version at `v001` for new tests
- Specify all mandatory tags

### 2. Test Objective (Required)

```markdown
## Objective

Clear, single-sentence description of what this test validates.

Example: "Verify that a residential customer can be created via API, assigned a billing account, provisioned with a product, and confirmed in the TOMS UI with correct data persistence."
```

**Guidelines**:
- Focus on the **why**, not the **how**
- Keep to 1-2 sentences maximum
- State the expected outcome

### 3. Prerequisites (Required)

```markdown
## Prerequisites

- System configuration requirements
- Data setup needed before test
- Required access/credentials
- Any pre-existing state assumptions
```

**Example**:
```markdown
## Prerequisites

- TOMS system accessible with valid admin credentials
- TBAPI backend running with database connection
- Currency configuration present in remote config file
- SSH access to TOMS application server
```

### 4. Technology Stack Indicators (Required for Mixed Tests)

```markdown
## Technology Stack

**Database**: Oracle | MySQL | PostgreSQL
**API Authorization**: OAuth | Custom Headers | API Key | Session | None
**Remote Operations**: SSH file operations required: Yes/No
```

**Why this matters**:
- Triggers correct SQL syntax generation (Oracle vs MySQL)
- Prevents OAuth generation when custom headers are needed
- Ensures correct helper selection (SSHHelper vs DatabaseHelper)

### 5. System Names and Configuration (Required)

```markdown
## Systems Referenced

| System Name | Purpose | Configuration Source |
|-------------|---------|---------------------|
| TBAPI | Telecom Business API | environment-configuration.json → systems.TBAPI.connections.HTTP |
| TOMS | TOMS UI Application | environment-configuration.json → systems.TOMS.connections.HTTP |
| TOMS | Database | environment-configuration.json → systems.TOMS.connections.DB |
| TOMS | SSH Server | environment-configuration.json → systems.TOMS.connections.SSH |
```

**Guidelines**:
- List ALL system names used in the test
- Reference configuration source explicitly
- Use consistent names throughout test description

### 6. Test Data Patterns (Required if Data Generation Needed)

```markdown
## Test Data

### Data Generation Patterns

| Field | Pattern | Example | Notes |
|-------|---------|---------|-------|
| indRef | `dd + MM + hh + mm + ss + RRR` | `050415123456789` | dd=day, MM=month, hh=hour, mm=minute, ss=second, RRR=3 random digits |
| indMobile | `7 + dd + MM + hh + mm + ss + RR` | `70504151234567` | Starts with 7, RR=2 random digits |
| indEmail | `AT + indRef + @wr.test` | `AT050415123456789@wr.test` | Prefix AT + indRef value |
| birthday | SQL query (see SQL section) | `1987-06-15` | Random date between 1930-01-01 and 2005-01-01 |
| ref | `ddMMhhmmss + RRR` | `0504151234567` | Same pattern as indRef without separators |

### SQL Queries for Data

**Birthday Generation (Oracle)**:
```sql
SELECT TO_CHAR(DATE '1930-01-01' + TRUNC(DBMS_RANDOM.VALUE(0, DATE '2005-01-01' - DATE '1930-01-01')), 'YYYY-MM-DD') AS BIRTHDAY FROM DUAL
```

**Note**: Specify exact date format, function names, and FROM DUAL for Oracle.
```

**Guidelines**:
- **BE EXPLICIT**: Specify exact format patterns (dd, MM, hh, mm, ss, RRR)
- **SHOW EXAMPLES**: Include concrete example values
- **NAME FIELDS EXACTLY**: Use exact field names that will appear in code
- **USE CONSISTENT CASING**: camelCase or snake_case, not mixed
- **INCLUDE SQL**: Provide complete SQL queries with Oracle/MySQL indicators

### 7. API Specifications (Required for API Tests)

```markdown
## API Specifications

### Endpoint 1: Create Individual

**Method**: POST
**Endpoint**: `/api/v1/partyManagement/individuals`
**Base URL**: `SettingsHelper.getBaseUrl('TBAPI')`

**Authorization**:
```
Authorization: Trusted application=telecom-business-api
Content-Type: application/json
```

**Request Body** (complete structure):
```json
{
  "individualIdentification": {
    "identificationId": "{indIdDocuments}",
    "identificationType": "ID"
  },
  "contactMedium": [
    {
      "mediumType": "mobile",
      "characteristic": {
        "emailAddress": "{indEmail}",
        "phoneNumber": "{indMobile}"
      }
    }
  ],
  "individualName": {
    "firstName": "AT{indRef}",
    "lastName": "AT{indRef}"
  },
  "birthDate": "{birthday}"
}
```

**Response Schema** (Required — trimmed real JSON, structure to match on):
```json
{
  "id": "123456789",
  "status": "active",
  "individualName": {
    "firstName": "AT...",
    "lastName": "AT..."
  }
}
```

**Expected Response**:
- Status Code: 200 OK
- Response contains `id` field
- Response contains nested `individualName.firstName`
```

**CRITICAL Guidelines**:

- **EXACT ENDPOINTS**: Specify full path character-for-character
  - ✅ `/api/v1/partyManagement/individuals`
  - ❌ `/api/individuals` (abbreviated)
  
- **COMPLETE PAYLOADS**: Include ALL fields with nesting
  - Don't say "standard create payload"
  - Show the exact JSON structure
  
- **AUTHORIZATION DETAILS**: Be explicit
  - Show exact header format: `Authorization: Trusted application=...`
  - State if OAuth is NOT used: "Do not use OAuth"
  - If OAuth: specify grant type, scopes
  
- **VARIABLE PLACEHOLDERS**: Use `{variableName}` format consistently

- **MANDATORY RESPONSE SCHEMA (per call)**: EVERY API call MUST carry a **Response Schema** block — a trimmed real JSON response (structure over values). Not prose, not a JSONPath alone. Trim JWTs/tokens (`"eyJ...<trimmed>"`) and long lists (keep 1–2 representative elements), but KEEP the fields that extraction/traversal match on and their exact nesting. This is what the generator transcribes; a lost schema causes wrong TS types and wrong-path reads.
  - If a call's response was not observed (e.g. an idempotent create POST skipped in the source run), mark it `Response: UNKNOWN (reason)` and state the known request contract — do not fabricate a schema.

- **EXACT DATA TYPES (kept literally)**: Preserve types exactly as the API uses them.
  - Numeric fields are **unquoted** (or annotated `<number>` / `<integer>`). NEVER wrap a numeric placeholder in quotes.
    - ✅ `"pop-number": {popNumber}` / `"latitude": <number>`
    - ❌ `"pop-number": "{popNumber}"` (forces wrong `String(...)` → HTTP 500)
  - Booleans/`null` as literals; strings quoted.

- **COMPLEX STRUCTURES AS SCHEMA, NOT PROSE**: For nested objects/trees (e.g. hardware slot hierarchies), show the explicit nesting levels and the fields matched on — do not describe traversal in words (the generator will implement it wrong).

### 8. Database Operations (Required for DB Tests)

```markdown
## Database Operations

### Query 1: Verify Customer Creation

**Database Type**: Oracle
**System Name**: TOMS

**Query**:
```sql
SELECT
  id,
  first_name,
  last_name,
  email,
  mobile_number,
  birth_date
FROM customers
WHERE email = :1
  AND ROWNUM <= 1
ORDER BY created_at DESC
```

**Bind Parameters**: `[testData.indEmail]`

**Expected Result**:
- Exactly 1 row returned
- `.FIRST_NAME` (uppercase) matches `"AT" + testData.indRef`
- `.EMAIL` (uppercase) matches `testData.indEmail`
- `.BIRTH_DATE` (uppercase) matches `testData.birthday`

**Notes**:
- Oracle returns column names in UPPERCASE
- Use `:1`, `:2` for bind parameters (not `?`)
- Use `ROWNUM <= 1` instead of `LIMIT 1`
```

**CRITICAL Guidelines**:

- **STATE DATABASE TYPE**: Oracle | MySQL | PostgreSQL
- **SHOW EXACT SQL**: Complete query with proper syntax
- **COLUMN CASING**: Specify uppercase for Oracle
- **BIND SYNTAX**: `:1` for Oracle, `?` for MySQL, `$1` for PostgreSQL
- **ORACLE SPECIFICS**: FROM DUAL, ROWNUM, DECODE, TO_CHAR
- **RESULT ACCESS**: Document `.COLUMNNAME` format

### 9. SSH Operations (Required for SSH Tests)

```markdown
## SSH Operations

### Operation 1: Read Currency Configuration

**System Name**: TOMS
**Working Directory**: `SettingsHelper.getSSHSettings('TOMS').workingDirectory`
**Remote File**: `{workingDirectory}/telecom-business-api/config/application.properties`

**Command**:
```bash
grep -E "^currency\.name\s*=" '{remoteConfigFilePath}' | cut -d'=' -f2 | xargs
```

**Expected Output**: `"Euro"` or `"Brazilian Real"`

**Notes**:
- Do NOT execute SQL via SSH
- Use SSHHelper for file operations only
- Use DatabaseHelper for all SQL queries
```

**CRITICAL Guidelines**:

- **SEPARATE SSH FROM DATABASE**: 
  - ✅ SSHHelper for `cat`, `grep`, `ls`, `systemctl`
  - ❌ SSHHelper for `mysql -e`, `psql -c` (use DatabaseHelper)
  
- **DYNAMIC PATHS**: Reference `SettingsHelper.getSSHSettings().workingDirectory`
- **NO HARDCODED PATHS**: Don't use `/opt/toms-application` (use config)

### 10. Test Steps (Required)

```markdown
## Test Steps

### Step 1: Resolve currency ID via SSH and database

#### Step 1.1: Description
Connect to remote TOMS server and read currency configuration

#### Step 1.2: SSH - Read currency.name
Execute: `grep -E "^currency\.name\s*=" '{remoteConfigFile}' | cut -d'=' -f2 | xargs`
Store result as: `ssh1` (raw value)

#### Step 1.3: SQL DECODE - Normalize currency.name
Execute Oracle query:
```sql
SELECT DECODE('{ssh1}', 'Euro', 'Euro', 'Brazilian Real', 'Brazilian Real', 'Euro') AS CURRENCYNAME FROM DUAL
```
Store result as: `currencyName` (normalized value)
Note: Use direct value embedding with `replace(/'/g, "''")` for safety

#### Step 1.4: SSH - Read currency.id
Execute: `grep -E "^currency\.id\s*=" '{remoteConfigFile}' | cut -d'=' -f2 | xargs`
Store result as: `ssh2` (raw value)

#### Step 1.5: SQL DECODE - Normalize currency.id (THIS IS THE FINAL CURRENCY ID)
Execute Oracle query:
```sql
SELECT DECODE('{ssh2}', '9134109080113502823', '9134109080113502823', '9140398092413272271', '9140398092413272271', '9134109080113502823') AS CURRENCYID FROM DUAL
```
Store result as: `currencyId` (final normalized ID)
Note: THIS IS THE CURRENCY ID VALUE - do not query database table

#### Step 1.6: SSH - Read currency.code
Execute: `grep -E "^currency\.code\s*=" '{remoteConfigFile}' | cut -d'=' -f2 | xargs`
Store result as: `ssh3` (raw value)

#### Step 1.7: SQL DECODE - Normalize currency.code
Execute Oracle query:
```sql
SELECT DECODE('{ssh3}', 'EUR', 'EUR', 'BRL', 'BRL', 'EUR') AS CURRENCYCODE FROM DUAL
```
Store result as: `currencyCode` (normalized value)

### Step 2: Generate unique test data

#### Step 2.1: Description
Generate test data using specified patterns

#### Step 2.2: Generate individual reference
Pattern: `dd + MM + hh + mm + ss + RRR`
Store as: `testData.indRef`

#### Step 2.3: Generate mobile number
Pattern: `7 + dd + MM + hh + mm + ss + RR`
Store as: `testData.indMobile`

(Continue for all steps...)
```

**CRITICAL Guidelines**:

- **NUMBER ALL STEPS**: Main steps (Step 1, Step 2) and sub-steps (Step 1.1, Step 1.2)
- **PRESERVE SUB-STEPS**: Don't skip or renumber sub-steps
- **BE EXPLICIT**: State exact operations, don't say "standard validation"
- **SHOW DEPENDENCIES**: Indicate when one step uses output from another
- **CLARIFY FINAL VALUES**: State "THIS IS THE FINAL X" when multiple transformations occur

### 11. Expected Results (Required)

```markdown
## Expected Results

### Overall Success Criteria

- [ ] All API calls return 200 OK
- [ ] Individual created with ID returned
- [ ] Customer account created and linked to individual
- [ ] Billing account created with correct currency
- [ ] Product offering retrieved successfully
- [ ] Order created with "completed" status
- [ ] Customer-product relationship established
- [ ] TOMS UI displays customer with correct data
- [ ] Database queries return expected values matching test data
- [ ] "Finish order processing" text appears in TOMS UI

### Specific Assertions

#### API Responses
- `individualId` is a non-empty string matching pattern `^\d+$`
- `customerAccountId` is a non-empty string
- `billingAccountId` is a non-empty string
- Order status is exactly `"completed"`

#### Database Verification
- Customer record exists with matching email
- First name and last name match generated pattern `AT{indRef}`
- Birthday matches generated date

#### UI Verification
- Customer appears in TOMS customer list
- "Finish order processing" text is visible
```

**Guidelines**:
- Provide checkboxes for main criteria
- Be specific about expected values
- Include exact strings to match
- Specify data types and patterns

## Anti-Patterns to Avoid

### ❌ Vague Specifications

**Bad**:
```markdown
Step 1: Create customer via API
```

**Good**:
```markdown
Step 1: Create individual via POST /api/v1/partyManagement/individuals
- Use test data generated in Step 0
- Authorization: Trusted application=telecom-business-api
- Expected response: 200 OK with `id` field
- Store response.id as `individualId`
```

### ❌ Abbreviated Endpoints

**Bad**:
```markdown
POST /api/individuals
```

**Good**:
```markdown
POST /api/v1/partyManagement/individuals
```

### ❌ Generic Payloads

**Bad**:
```markdown
Send standard create request
```

**Good**:
```markdown
Request Body:
{
  "individualIdentification": {
    "identificationId": "{indIdDocuments}",
    "identificationType": "ID"
  },
  "contactMedium": [
    ...complete structure...
  ]
}
```

### ❌ Database Ambiguity

**Bad**:
```markdown
Query the database to verify
```

**Good**:
```markdown
Execute Oracle query (note uppercase column names):
SELECT ID, FIRST_NAME, EMAIL FROM customers WHERE email = :1
Access result: row.ID, row.FIRST_NAME, row.EMAIL
```

### ❌ Mixed Tool Usage

**Bad**:
```markdown
SSH to server and run SQL query: `mysql -e "SELECT * FROM users"`
```

**Good**:
```markdown
SSH: Read config file with `cat /app/config.properties`
Database: Query users with `DatabaseHelper.executeQuery('SELECT * FROM users', [], 'TOMS')`
```

### ❌ Inconsistent Naming

**Bad**:
```markdown
Generate ind_ref, then use indRef in API, then reference IndRef in database
```

**Good**:
```markdown
Generate indRef (camelCase consistently throughout)
API: "firstName": "AT{indRef}"
Database: WHERE first_name LIKE 'AT{indRef}%'
Variable: testData.indRef
```

## Checklist for Test Description Authors

Before submitting a test description for generation:

- [ ] Test ID follows project format (TC_XXX_v001_Name)
- [ ] All mandatory tags specified
- [ ] Test objective is clear and single-purpose
- [ ] Prerequisites listed explicitly
- [ ] Database type specified if using SQL (Oracle vs MySQL)
- [ ] Authorization pattern specified if using API (OAuth vs Custom)
- [ ] SSH operations separated from database operations
- [ ] System names match configuration sources
- [ ] API endpoints are complete, not abbreviated
- [ ] Request payloads show full JSON structure with all fields
- [ ] Every API call has a trimmed real **Response Schema** (structure preserved; JWTs/lists trimmed; UNKNOWN marked, not fabricated)
- [ ] Numeric fields are unquoted (no quoted numeric placeholders); complex structures shown as schema, not prose
- [ ] SQL queries include bind parameter syntax (`:1` vs `?`)
- [ ] Oracle specifics noted (ROWNUM, uppercase columns, DUAL)
- [ ] Test data patterns use exact format strings
- [ ] Field names use consistent casing (camelCase or snake_case)
- [ ] All steps numbered including sub-steps
- [ ] Step dependencies clearly indicated
- [ ] Expected results are specific, not vague
- [ ] No assumptions left implicit

## Example: Complete Test Description

See `test-description-example-complete.md` in this directory for a full working example that follows all guidelines.