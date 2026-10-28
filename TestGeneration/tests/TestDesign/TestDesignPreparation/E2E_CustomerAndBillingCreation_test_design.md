# Test Scenario: E2E_CustomerAndBillingCreation

## Overview

- **Test Name**: E2E_CustomerAndBillingCreation
- **Objective**: Imported from Postman collection: E2E_CustomerAndBillingCreation.json
- **Preconditions**:
  - Target environment is reachable (public-gateway-e2e-bss-qa3_url configured).
  - Valid credentials are available for authentication steps.

## Environment and Integration Systems

Configuration is loaded from environment variables:

| Variable | Role | Notes |
|----------|------|-------|
| `{{public-gateway-e2e-bss-qa3_url}}` | Base URL / host for this system | Required |
| `{{tenant-id}}` | Tenant identifier | Required |
| `{{token}}` | Authentication credential | Required |
| `{{engagedPartyId}}` | Configuration value | Required |

## Test Steps

### Chain: authorization

### Step 1: Get cloud admin token Copy

**System**: `public-gateway-e2e-bss-qa3`

**Action**:

- **Method**: `POST`
- **URL**: `{{public-gateway-e2e-bss-qa3_url}}/auth/realms/cloud-common/protocol/openid-connect/token`
- **Headers**:
  - `Content-Type: application/x-www-form-urlencoded`
- **Request Body**:

  Form fields (`application/x-www-form-urlencoded`):
  - `password=MARket1234!`
  - `username=cloud-admin`
  - `grant_type=password`
  - `client_id=frontend`

<details>
<summary>Full curl command</summary>

```bash
curl --location --globoff --request POST '{{public-gateway-e2e-bss-qa3_url}}/auth/realms/cloud-common/protocol/openid-connect/token' \
--header 'Content-Type: application/x-www-form-urlencoded' \
--data-urlencode 'password=MARket1234!' \
--data-urlencode 'username=cloud-admin' \
--data-urlencode 'grant_type=password' \
--data-urlencode 'client_id=frontend'
```
</details>

**Expected Result**:

- Response status is 2xx (verify exact code: 200 or 201)
- Parse response body as JSON into 'data'
- Set environment variable 'token' = data.access_token

**Produces**: `token`

---

### Step 2: Get cpq admin token

**System**: `public-gateway-e2e-bss-qa3`

**Action**:

- **Method**: `POST`
- **URL**: `{{public-gateway-e2e-bss-qa3_url}}/auth/realms/{{tenant-id}}/protocol/openid-connect/token`
- **Headers**:
  - `Content-Type: application/x-www-form-urlencoded`
- **Request Body**:

  Form fields (`application/x-www-form-urlencoded`):
  - `password=MARket1234!`
  - `username=cpq-admin@netcracker.com`
  - `grant_type=password`
  - `client_id=frontend`

<details>
<summary>Full curl command</summary>

```bash
curl --location --globoff --request POST '{{public-gateway-e2e-bss-qa3_url}}/auth/realms/{{tenant-id}}/protocol/openid-connect/token' \
--header 'Content-Type: application/x-www-form-urlencoded' \
--data-urlencode 'password=MARket1234!' \
--data-urlencode 'username=cpq-admin@netcracker.com' \
--data-urlencode 'grant_type=password' \
--data-urlencode 'client_id=frontend'
```
</details>

**Expected Result**:

- Response status is 2xx (verify exact code: 200 or 201)
- Parse response body as JSON into 'data'
- Set environment variable 'token' = data.access_token

**Produces**: `token`
**Consumes**: `tenant-id`

---

### Chain: create customer and billing account for B2B customer

### Step 3: 2.1 Create individuals

**System**: `public-gateway-e2e-bss-qa3`

**Action**:

- **Method**: `POST`
- **URL**: `{{public-gateway-e2e-bss-qa3_url}}/cim-tmf-service/partyManagement/v1/individual`
- **Headers**:
  - `Content-Type: application/json`
  - `Authorization: Bearer {{token}}`
- **Request Body**:

```json
{
  "contactMedium": [
    {
      "preferred": false,
      "type": "Telephone number"
    }
  ],
  "nationality": "US",
  "familyName": "test",
  "gender": "Male",
  "givenName": "eca"
}
```

<details>
<summary>Full curl command</summary>

```bash
curl --location --globoff --request POST '{{public-gateway-e2e-bss-qa3_url}}/cim-tmf-service/partyManagement/v1/individual' \
--header 'Content-Type: application/json' \
--header 'Authorization: Bearer {{token}}' \
--data-raw '{     "contactMedium": [{"preferred": false, "type": "Telephone number"}],     "nationality": "US",     "familyName": "test",     "gender": "Male",     "givenName": "eca" }'
```
</details>

**Expected Result**:

- Response status is 2xx (verify exact code: 200 or 201)
- Successful POST request

**Produces**: `engagedPartyId`
**Consumes**: `token`

---

### Step 4: 2.2 Create customer_B2B

**System**: `public-gateway-e2e-bss-qa3`

**Action**:

- **Method**: `POST`
- **URL**: `{{public-gateway-e2e-bss-qa3_url}}/cim-tmf-service/customerManagement/v1/customer`
- **Headers**:
  - `Content-Type: application/json`
  - `Authorization: Bearer {{token}}`
- **Request Body**:

```json
{     "name": "cbcc_b2b",     "engagedParty": {"id": "{{engagedPartyId}}
```

<details>
<summary>Full curl command</summary>

```bash
curl --location --globoff --request POST '{{public-gateway-e2e-bss-qa3_url}}/cim-tmf-service/customerManagement/v1/customer' \
--header 'Content-Type: application/json' \
--header 'Authorization: Bearer {{token}}' \
--data-raw '{     "name": "cbcc_b2b",     "engagedParty": {"id": "{{engagedPartyId}}", "@referredType": "Individual"},     "customerCategoryId": "18513638-6143-4fef-823b-7df2cc2f64c2" }'
```
</details>

**Expected Result**:

- Response status is 2xx (verify exact code: 200 or 201)
- Successful POST request

**Produces**: `customerId`
**Consumes**: `token, engagedPartyId`

---

### Step 5: 2.7 Create account

**System**: `public-gateway-e2e-bss-qa3`

**Action**:

- **Method**: `POST`
- **URL**: `{{public-gateway-e2e-bss-qa3_url}}/account-mgmt-tmf/accountManagement/v2/billingAccount`
- **Headers**:
  - `Content-Type: application/json`
  - `Authorization: Bearer {{token}}`
- **Request Body**:

```json
{
  "name": "Postpaid",
  "state": "ACTIVE",
  "type": "Postpaid"
}
```

<details>
<summary>Full curl command</summary>

```bash
curl --location --globoff --request POST '{{public-gateway-e2e-bss-qa3_url}}/account-mgmt-tmf/accountManagement/v2/billingAccount' \
--header 'Content-Type: application/json' \
--header 'Authorization: Bearer {{token}}' \
--data-raw '{     "name": "Postpaid",     "state": "ACTIVE",     "type": "Postpaid" }'
```
</details>

**Expected Result**:

- Response status is 2xx (verify exact code: 200 or 201)
- Successful POST request

**Produces**: `billingAccountId`
**Consumes**: `token`

---

## Verification Points

1. **[Step 1 — Get cloud admin token Copy]** Response status is 2xx (verify exact code: 200 or 201)
2. **[Step 1 — Get cloud admin token Copy]** Parse response body as JSON into 'data'
3. **[Step 1 — Get cloud admin token Copy]** Set environment variable 'token' = data.access_token
4. **[Step 2 — Get cpq admin token]** Response status is 2xx (verify exact code: 200 or 201)
5. **[Step 2 — Get cpq admin token]** Parse response body as JSON into 'data'
6. **[Step 2 — Get cpq admin token]** Set environment variable 'token' = data.access_token
7. **[Step 3 — 2.1 Create individuals]** Response status is 2xx (verify exact code: 200 or 201)
8. **[Step 3 — 2.1 Create individuals]** Successful POST request
9. **[Step 4 — 2.2 Create customer_B2B]** Response status is 2xx (verify exact code: 200 or 201)
10. **[Step 4 — 2.2 Create customer_B2B]** Successful POST request
11. **[Step 5 — 2.7 Create account]** Response status is 2xx (verify exact code: 200 or 201)
12. **[Step 5 — 2.7 Create account]** Successful POST request

## Expected Final State

| Area | Expected Outcome |
|------|-----------------|
| Get cloud admin token Copy (public-gateway-e2e-bss-qa3) | Response status is 2xx (verify exact code: 200 or 201); produces `token` |
| Get cpq admin token (public-gateway-e2e-bss-qa3) | Response status is 2xx (verify exact code: 200 or 201); produces `token` |
| 2.1 Create individuals (public-gateway-e2e-bss-qa3) | Response status is 2xx (verify exact code: 200 or 201); produces `engagedPartyId` |
| 2.2 Create customer_B2B (public-gateway-e2e-bss-qa3) | Response status is 2xx (verify exact code: 200 or 201); produces `customerId` |
| 2.7 Create account (public-gateway-e2e-bss-qa3) | Response status is 2xx (verify exact code: 200 or 201); produces `billingAccountId` |

## Data Flow Summary

The following values are produced and consumed across steps:

| Value | Produced in | Consumed in |
|-------|------------|-------------|
| `token` | Step 2 | Step 3, Step 4, Step 5 |
| `engagedPartyId` | Step 3 | Step 4 |
| `customerId` | Step 4 | *(not referenced)* |
| `billingAccountId` | Step 5 | *(not referenced)* |
| `tenant-id` | *(external)* | Step 2 |
