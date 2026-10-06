# ATP2 Descriptor Example

A worked descriptor illustrating [atp2-descriptor-format.md](atp2-descriptor-format.md). That spec is the authority: where the two disagree, the spec wins and this file is the one to correct. Extend this file when a new case becomes common enough to be worth showing.

The case is a slice of `ts1_ph2_2 CSRD Sanity`, old steps 1–30: of 30 manifest rows, 11 are absorbed (4 waits, 4 separators, 3 store constants/captures), leaving 19 blocks. The sections below follow document order, and of the 19 step blocks only one per characteristic case is reproduced.

Every `{{X.y}}` below resolves in `environment-configuration-template-jci01-ci03.json`. The UI alias is `umbrella-ui` although every screen is titled "CSR Desktop": the alias is the `system` value of the manifest row, never the screen title.

> The `<!-- … -->` annotations exist only in this example, to point at what was absorbed. A real descriptor carries none of them.

## Header sections

````markdown
# Test Scenario: Create a new Business Customer with CVR and add a party role

## Overview
- **Test Name**: [ND2.2] Creating new "Business Customer" for association with CVR, adding party role
- **Test Type**: UI + API + DB
- **Objective**: Verify that a business customer account for an association with a CVR can be created in CSR Desktop, and that a party role can then be attached to it.
- **Systems**: umbrella-ui (UI), public-gateway (API), cloud-data-migration-nifi (DB)
- **Preconditions**:
  - CSR Desktop is accessible at {{umbrella-ui.url}}
  - CVR `10255236` exists in the CVR registry and has no customer account yet
- **Origin**: migrated from ATP2, case `[ND2.2] Creating new "Business Customer"…`, run of 2026-08-11

## Systems Referenced

| System Name | Purpose | Configuration Source |
|---|---|---|
| umbrella-ui | CSR Desktop UI — the customer creation wizard | `environment-configuration.json → systems.umbrella-ui.connections.HTTP` |
| public-gateway | REST gateway for the master and party-role chains | `environment-configuration.json → systems.public-gateway.connections.HTTP` |
| cloud-data-migration-nifi | Database read for the expiry date | UNKNOWN (absent from the env template) — Step 1 writes its host as a marked value |

## Authorization

OAuth 2.0 client credentials against `{{public-gateway.url}}/api/v1/auth/token`. Acquired once per test and reused by every contract below as `Authorization: Bearer {token}`.

## Test Data Requirements

**Fixed inputs (this scenario)**

| Variable | Value |
|---|---|
| orgName2_original | `Blomster Hex v1 0236` |   <!-- absorbed store constant, node 5 -->
| address_for_create_org | `Fordresgårdvej 37` |  <!-- absorbed store constant, node 7 -->
| CVR | `10255236` |
| envName | `saas-gf-jci-01_ci03` (mark: no-slot) |

**Generated / random values**
- **partyRoleName** — random text, 8 characters; example `qKm7ZpLt`. Generated once in Step 20, then read by every step that uses it.

**Stored / extracted variables**

| Variable | Source |
|---|---|
| Expiry_date | computed in Step 1, consumed by the party-role call |
| mainPage | the CSRD desktop URL captured in Step 7 |
| tennantToken | returned by C1, consumed by C2 |
````

## Test Steps

````markdown
## Test Steps

### Step 1: Compute the document expiry date

- **Surface**: DB · `cloud-data-migration-nifi`
- **Stores**: Expiry_date

**Actions**:
1. Run on `jdbc:postgresql://nifi-db.gfi-ndo-2.managed.netcracker.cloud:5432/nifi` (mark: unmapped):
   ```sql
   SELECT to_char(current_date + 1, 'DD-MM-YYYY')
   ```
2. Store the returned string in `Expiry_date`.

**Expected Result**: `Expiry_date` holds a string in `DD-MM-YYYY` form.
**Validation**: `Expiry_date` matches `^\d{2}-\d{2}-\d{4}$`.

### Step 3: Update the CVR status via the master chain

- **Surface**: API · `public-gateway`
- **Contract**: C1 — [Master] Update CVR status
- **Stores**: tennantToken

**Actions**:
1. Run contract **C1 — [Master] Update CVR status** — Args: `(callchain defaults)`

**Expected Result**: the CVR status is updated by the master chain.
**Validation**: the chain completed successfully; `tennantToken` is non-empty.

### Step 6: Open the CSRD application

- **Surface**: UI · `umbrella-ui`
- **Page**: CSRD Sign In

**Actions**:
1. Navigate to `{{umbrella-ui.url}}` and wait for the page to finish loading  (ATP2 source: log name="Page loading is completed")

**Expected Result**: the Sign In screen is shown — an empty Email field holding focus, a Password field with a visibility toggle, an enabled Sign In button; the CSRD workplace shell has not loaded yet.
**Validation**: the Sign In button is visible and enabled.

### Step 7: Sign in to CSRD and pick a workplace

- **Surface**: UI · `umbrella-ui`
- **Page**: CSRD Sign In → Vælg arbejdsplads → CSRD desktop
- **Stores**: mainPage   <!-- absorbed node 11 "Store current URL" -->

**Actions**:
1. Wait for the Sign In button to become ready, up to 7 s  (ATP2 source: ButtonName="Sign In", wait timeout="7")
2. Type `{{umbrella-ui.login}}` into the Email field  (ATP2 source: TextInput number=1)
3. Type `{{umbrella-ui.password}}` into the Password field  (ATP2 source: TextInput number=2)
4. Click the Sign In button  (ATP2 source: ButtonName="Sign In")
5. Switch to the application's default page  (ATP2 source: action "Switch to the default page")
6. Wait for the workplace selection popup to appear, up to 30 s
7. Click Vælg on the workplace selection popup  (ATP2 source: ButtonName="Vælg" on popup "Vælg arbejdsplads")
8. Select `7858 • Hillerød` in the workplace dropdown  (ATP2 source: regexp:Vælg arbejdsplads|Select Workplace='7858 • Hillerød')
9. Confirm the selection with the Select/Vælg button  (ATP2 source: Button regexp:Select|Vælg)
10. Open the language settings  (ATP2 source: xpath=.//div[@title='Sprogindstillinger'])
11. Choose English in the language menu  (ATP2 source: xpath=.//div[@role='menuitem' and descendant::*[text()='English']])
12. Wait for the interface to re-render in English, up to 60 s
13. Store the current URL in `mainPage`.

**Expected Result**: the user is signed in and the CSRD desktop is open in English.
**Validation**: `mainPage` is non-empty; the CSRD desktop is displayed.

### Step 8: Open the CSRD welcome dashboard in a new tab

- **Surface**: UI · `umbrella-ui`
- **Page**: CSR Dashboard → Welcome

**Actions**:
1. Wait for the application to settle after sign-in, up to 40 s   <!-- absorbed node 10 -->
2. Open the welcome dashboard resource (`/csr/dashboard/welcome`) in a new browser tab  (ATP2 source: action name `Open resource "…/csr/dashboard/welcome" in new tab`)
3. Switch the active tab to the newly opened one (the session's second tab)  (ATP2 source: log message `Switch to window number=2`)

**Expected Result**: UNKNOWN (the screenshot does not show the resulting state) — the log confirms the tab was opened.
**Validation**: the second tab is active.

### Step 13: Verify the Create Customer Account wizard is open

- **Surface**: UI · `umbrella-ui`
- **Page**: Create Customer Account wizard → step 1 Customer

**Actions**:
1. Wait for the wizard to render, up to 15 s   <!-- absorbed node 21 -->
2. Verify the **Create Customer Account** widget popup exists and is displayed  (ATP2 source: Uxng2:WidgetPopup{name=Create Customer Account})

**Expected Result**: the Create Customer Account popup is visible, the Customer step is active, the Customer Category field reads "Association Without CVR", and Cancel and Next are available.
**Validation**: the "Create Customer Account" popup object exists on the page.

### Step 15: Verify the Association With CVR option is present

- **Surface**: UI · `umbrella-ui`
- **Page**: Create Customer Account wizard → step 1 Customer

**Actions**:
1. Verify the text **Association With CVR** is present on the page  (ATP2 source: xpath=//*[text()[contains(.,'Association With CVR')]])

**Expected Result**: no observable change — the check does not alter the screen state.
**Validation**: the text **Association With CVR** is the first option of the open list.

### Step 20: Name the party role

- **Surface**: UI · `umbrella-ui`
- **Page**: Create Customer Account wizard → step 3 Party roles
- **Stores**: partyRoleName

**Actions**:
1. Type the generated `partyRoleName` into the "Role name" input inside the *Add party role* dialog, not the search box of the page behind it  (ATP2 source: xpath=//input[@id='role-name'])
2. Click the "Add" button in the footer of the *Add party role* dialog  (ATP2 source: ButtonName="Add")

**Expected Result**: the dialog closes and a party role row named `partyRoleName` is listed on the Party roles step.
**Validation**: a row whose name equals `partyRoleName` is present in the party roles table.
````

## A `Repeat` block

From an API case: one block covering 20 manifest rows of an ONT provisioning loop, calling three contracts per iteration.

````markdown
### Step 25: Provision the ONTs — loop ×5

- **Surface**: API · `public-gateway`
- **Contract**: C16 — Pre-requistes for UCs; C17 — UC03 + UC04; C18 — Update TDM Table
- **Repeat**: `ontNum` = 1..5
- **Consumes**: servicePlanSet, slaProfileSet
- **Stores**: onboardingId, serviceInstanceId

**Actions**:
1. Run contract **C16 — [SP][ITF Lite] Pre-requistes for UCs** — Args: `ontNum={ontNum}`
2. Run contract **C17 — [SP][ITF Lite] UC03 + UC04** — Args: `servicePlanSet=RESI_1G, slaProfileSet=Premium SMB, ontNum={ontNum}`
3. Run contract **C18 — [PONLOSS] Update TDM Table** — Args: `tableName=[PONLOSS] TD CREATION 23.07.2026, ontNum={ontNum}`

**Expected Result**: for each of the five ONTs the prerequisites are satisfied, UC03+UC04 complete, and a row is added to the TDM table.
**Validation**: on every iteration all three compounds finish SUCCESS; `serviceInstanceId` is non-empty; the TDM insert succeeds.
````

## Verification Points

````markdown
## Verification Points

1. **Customer account created** — the wizard closes and the account is listed with Customer Category `Association With CVR`.
2. **CVR persisted** — the created account carries CVR `10255236`.
3. **Party role attached** — the party role named `partyRoleName` appears on the customer's Party Roles tab.
4. **Master chain succeeded** — C1 returned `action-report.status == SUCCESS`.
````

## Call Contracts

From another case — a contract with a captured response, a JSONPath store, and a conditional call.

````markdown
## Call Contracts

Definitions of reusable calls. A step references one by `Ref`; one definition serves every step that calls it.

### C1 — createCity(cityName, stateName)

> Source: callchainId=8461120033114501121 | name=[BS] Create City | run=<testRunId> | collected=<YYYY-MM-DD>
> System(s): {{public-gateway}}
> Signature: createCity(cityName, stateName)

#### Call 1 — Get country id
- Method/Endpoint: `GET {{public-gateway.url}}/location-manager/v1/restconf/data/country?depth=1&offset=0&limit=10&page=1&sort=[{"property":"name","direction":"ASC"}]&total=true`
- Headers: Authorization: Bearer {token}
- Status: 200
- Response Schema (trimmed): `{ "country": [ { "mkey": "US", "name": "US", "basetype": "country", "id": "39876882-38d0-4891-aaef-e0bcec597cc1" } ], "total": 1 }`
- → Store: countryId = `$.country[?(@.name=='US')].id`

#### Call 2 — Get states of country
- Method/Endpoint: `GET {{public-gateway.url}}/location-manager/v1/restconf/data/country={countryId}?depth=2&by-id=true`
- Headers: Authorization: Bearer {token}
- Status: 200
- Response Schema (trimmed): `{ "country": { "mkey": "US", "name": "US", "id": "39876882-38d0-4891-aaef-e0bcec597cc1", "children": [ { "basetype": "state", "id": "91ba6b96-e614-4632-bafb-16e37fbde5e6", "mkey": "US__Vermont", "name": "Vermont" } ] } }`
- → Store: stateId / stateMkey = child where `name == {stateName}`

#### Call 3 — Create city
- Method/Endpoint: `POST {{public-gateway.url}}/business-operation-manager/v1/operation-request?key=nc_op_lm_city_creation&ignore-warnings=false`
- Headers: Authorization: Bearer {token}; Content-Type: application/json
- Body (request) (numbers unquoted): `{ "data": { "city": [ { "parentBasetype": "state", "parentMkey": "{stateMkey}", "name": "{cityName}", "description": "TA-test-city", "id": "{generated-uuid}", "name-overwritten": true } ] }, "parent-path": [ { "basetype": "state", "id": "geo-hierarchy" } ] }`
- Status: UNKNOWN (idempotent skip)
- Response Schema (trimmed): `UNKNOWN (idempotent skip — Montpelier pre-existed in the source run)`. The shared create envelope: `{ "validation-report": {…}, "action-report": { "status": "SUCCESS", "status-code": 200 }, "operation-definition-key": "nc_op_lm_city_creation" }`
- Condition: runs only when `cityId` was not found in Call 2 | Observed: skipped

#### Notes
Called by steps 2 and 14 — one Business Workflow method, two calls with different arguments.
````
