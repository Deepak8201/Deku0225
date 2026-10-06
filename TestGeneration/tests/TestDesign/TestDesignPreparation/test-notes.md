# Test Notes: Create Residential Customer with Billing Account and Payment Instrument

## Test Name and Objective
- **Name**: Create and Verify Residential Customer Account
- **Objective**: Verify that a new residential customer can be created with complete personal details, billing account, and payment instrument through the system workflow

## Pages (in order of appearance)
1. Login Page — main system login ({{CSRDESKTOP}})
2. Security Warning Page — browser certificate warning (may appear before Login Page)
3. Main Dashboard — after login
4. Security Warning Page — appears again before O2UK Identity login
5. O2UK Identity Login — email-based identity login
6. New Residential Customer Account Popup — form to create customer (opens after O2UK login)
7. Customer Summary Page — displayed after customer creation
8. Customer Summary Page - Billing Accounts Tab — same page, different tab
9. Billing Account Creation Dialog — form that appears after clicking 'New Pay Monthly Billing Account'
10. Billing Account Summary Page — displayed after billing account creation
11. New Payment Instrument Popup — form that appears after clicking 'New Payment Instrument'
12. Customers Page — global customer search page

## Test Data
- **Email**: random (format: `{random}@test.com`)
- **Title**: random selection from dropdown
- **First Name**: random text, 6 characters
- **Last Name**: random text, 6 characters
- **Postcode**: fixed `B33 8TH`
- **Building Number**: fixed `2`
- **Date of Birth**: 25 years back from current date (calculate dynamically)
- **Phone Number**: format `07` + 9 random digits
- **Sort Code**: 6 random digits
- **Bank Account Number**: 8 random digits
- **Bank Account Holder**: 8 random characters

## Notes
- Security Warning page may or may not appear at steps 2 and 6 — click 'Advanced' then 'Proceed' only if it appears
- After login to main system, a success alert may appear — close it if present
- After customer creation, capture the Customer Account Number from Customer Summary Page and reuse it in the search step
- In the address lookup, 'Address Lookup' button is clicked twice: first to open the form, second to execute the search after filling postcode and building number

## Verifications
- Customer Account Number generated and visible on Customer Summary Page
- Personal details correct on Customer Summary Page (name, title, DOB, address, phone)
- Billing account created and linked to customer; type is Pay Monthly
- Payment instrument details correct; mandate checkbox checked
- Customer findable by account number in search; customer board loads with all entered details
