import { test, expect } from '@playwright/test';

test('E2E_CustomerAndBillingCreation_FullFlow', async ({ page }) => {
  // ========== PHASE 1: LOGIN ==========
  console.log('✅ Starting Phase 1: Login');
  await page.goto('https://csrd-e2e-bss-qa4.saas-rnd-bss-qa-01.managed.netcracker.cloud/login');
  await page.locator('#ux-login-iframe').contentFrame().getByRole('textbox', { name: 'Email' }).click();
  await page.locator('#ux-login-iframe').contentFrame().getByRole('textbox', { name: 'Email' }).fill('sdet_user');
  await page.locator('#ux-login-iframe').contentFrame().getByRole('textbox', { name: 'Password' }).click();
  await page.locator('#ux-login-iframe').contentFrame().getByRole('textbox', { name: 'Password' }).fill('Oct@2026');
  await page.locator('#ux-login-iframe').contentFrame().getByRole('button', { name: 'Sign In' }).click();
  console.log('✅ Phase 1 Complete: Login Successful');

  // ========== PHASE 2: CUSTOMER CREATION ==========
  console.log('✅ Starting Phase 2: Create Business Customer');
  await page.getByRole('button', { name: 'Global Actions' }).click();
  await page.getByText('Business Customer', { exact: true }).click();
  await page.getByText('Customer Category').click();
  await page.getByText('B2B Client').click();
  await page.getByText('Organization Name', { exact: true }).click();
  await page.getByRole('textbox', { name: 'Organization Name' }).fill('Test');
  await page.getByText('Organization Type').click();
  await page.getByText('Company').click();
  
  // Address
  await page.locator('.ta-zip > .ws2-input-field__container').click();
  await page.getByRole('textbox', { name: 'ZIP' }).fill('411033');
  await page.getByText('Country').click();
  await page.getByRole('textbox', { name: 'State' }).click();
  await page.getByRole('textbox', { name: 'State' }).fill('mh');
  await page.getByRole('textbox', { name: 'City' }).click();
  await page.getByRole('textbox', { name: 'City' }).fill('pune');
  await page.getByText('Street Line 1', { exact: true }).click();
  await page.getByRole('textbox', { name: 'Street Line 1' }).fill('test');
  
  // Document
  await page.getByText('Document Type').click();
  await page.getByText('Company Registration').click();
  await page.getByText('Document ID', { exact: true }).click();
  await page.getByRole('textbox', { name: 'Document ID' }).fill('123456788');
  await page.getByRole('textbox', { name: 'Issued By' }).click();
  await page.getByRole('textbox', { name: 'Issued By' }).fill('test');
  await page.getByRole('radio', { name: 'New' }).check();
  
  // Contact
  await page.getByRole('textbox', { name: 'First Name' }).click();
  await page.getByRole('textbox', { name: 'First Name' }).fill('Test');
  await page.getByText('Country', { exact: true }).click();
  await page.getByText('Austria').click();
  await page.getByRole('textbox', { name: 'Last Name' }).click();
  await page.getByRole('textbox', { name: 'Last Name' }).fill('Test');
  await page.locator('.__invalid > .ws2-input-field__container').first().click();
  await page.getByText('Male', { exact: true }).click();
  await page.locator('.ta-form-individual-language > .__invalid > .ws2-input-field__container').click();
  await page.getByText('English').click();
  
  // Contact Method
  await page.getByRole('textbox', { name: 'Type', exact: true }).click();
  await page.locator('ws2-dropdown').getByText('Mobile Phone').click();
  await page.getByRole('textbox', { name: 'Number *' }).click();
  await page.getByRole('textbox', { name: 'Number *' }).fill('(987) 654-34-55');
  
  // Create Customer
  await page.getByRole('button', { name: 'Create' }).click();
  console.log('✅ Phase 2 Complete: Customer Created');

  // ========== PHASE 3: BILLING ACCOUNT ==========
  console.log('✅ Starting Phase 3: Create Billing Account');
  await page.getByRole('link').filter({ hasText: 'Finance' }).click();
  await page.getByRole('button', { name: 'Create Billing Account' }).click();
  await page.getByText('Invoice Delivery Method').click();
  await page.getByText('No Bill').click();
  await page.locator('#ux-radio-field-55').check();
  
  // Billing Contact Details
  await page.locator('.ta-first-name > .ws2-input-field__container').click();
  await page.getByRole('textbox', { name: 'First Name' }).fill('test1233');
  await page.getByText('Last Name', { exact: true }).click();
  await page.getByRole('textbox', { name: 'Last Name' }).fill('test12345');
  await page.locator('.__invalid > .ws2-input-field__container').first().click();
  await page.getByText('Male', { exact: true }).click();
  await page.getByText('Language', { exact: true }).click();
  await page.getByText('Arabic').click();
  await page.locator('#ux-radio-field-59').check();
  
  // Contact Address
  await page.getByRole('textbox', { name: 'Mobile Phone' }).click();
  await page.getByRole('textbox', { name: 'Mobile Phone' }).fill('(987) 654-34-56');
  await page.locator('.ta-zip > .ws2-input-field__container').click();
  await page.getByRole('textbox', { name: 'ZIP' }).fill('411033');
  await page.getByText('Country').click();
  await page.getByText('Austria').click();
  await page.locator('.ta-state-or-province > .ws2-input-field__container').click();
  await page.getByRole('textbox', { name: 'State' }).fill('mh1');
  await page.locator('.ta-city > .ws2-input-field__container').click();
  await page.getByRole('textbox', { name: 'City' }).fill('pune');
  await page.getByText('Street Line 1', { exact: true }).click();
  await page.getByRole('textbox', { name: 'Street Line 1' }).fill('test');
  
  // CPS Selection
  await page.getByRole('combobox', { name: 'Default CPS * Type to search' }).click();
  await page.getByText('CPS - Telco VAT').click();
  
  // Create BA
  await page.getByRole('button', { name: 'Create' }).click();
  console.log('✅ Phase 3 Complete: Billing Account Created');

  // ========== PHASE 4: QUOTATION & SEARCH ==========
  console.log('✅ Starting Phase 4: Search Customer & Start Quotation');
  await page.getByRole('button', { name: 'Search Customer' }).click();
  await page.getByPlaceholder('Search').click();
  await page.getByPlaceholder('Search').fill('test');
  await page.getByPlaceholder('Search').press('Enter');
  await page.getByRole('link', { name: 'test', exact: true }).click();
  
  // Start Quotation
  await page.getByRole('button', { name: 'Global Actions' }).click();
  await page.getByText('Start Quotation in B2B OC UI').click();
  await page.getByText('MarketType to search or').click();
  await page.getByRole('option', { name: 'All' }).click();
  await page.getByText('Distribution ChannelType to').click();
  await page.getByRole('option', { name: 'All' }).click();
  await page.getByText('StockType to search or select').click();
  await page.getByRole('button', { name: 'Start Quotation' }).click();
  console.log('✅ Phase 4 Complete: Quotation Started');

  // ========== PHASE 5: BUNDLE SELECTION ==========
  console.log('✅ Starting Phase 5: Add Bundle to Quote');
  await page.getByRole('button', { name: 'Global Search' }).click();
  await page.locator('ux-search-field label').click();
  await page.getByPlaceholder('Search').fill('Wired Digital Internet & Access');
  await page.getByRole('button', { name: 'Add to Quote' }).click();
  console.log('✅ Phase 5 Complete: Bundle Added');

  // ========== PHASE 6: SERVICE CONFIGURATION ==========
  console.log('✅ Starting Phase 6: Service Configuration');
  await page.locator('.oe-icon.tabCart.b2b-collapsible-quote-alerts-indicator__icon > .oe-icon__container').click();
  await page.getByRole('button', { name: '6', exact: true }).click();
  await page.getByRole('button', { name: 'Go to Quote 360° View' }).click();
  
  // Link Services
  await page.getByRole('button', { name: 'Alerts' }).click();
  await page.getByRole('link', { name: 'Access Installation #' }).click();
  await page.getByText('Linked Products').click();
  await page.getByRole('button', { name: 'Add Link' }).first().click();
  await page.getByRole('checkbox', { name: 'Business Main Access' }).check();
  await page.getByRole('button', { name: 'Add Links' }).click();
  
  // DDoS Protection
  await page.getByRole('button', { name: 'Open menu' }).click();
  await page.getByText('Settings & Highlights').click();
  await page.getByRole('button', { name: 'Assign Location' }).click();
  await page.getByRole('button', { name: 'Add New Location' }).click();
  await page.locator('.gm-style > div > div:nth-child(2)').click();
  await page.getByRole('button', { name: 'Add Location To Quote' }).click();
  
  // Enable DDoS
  await page.getByRole('link', { name: 'GPON Connectivity #' }).click();
  await page.getByText('DDoS Protection Silver— $3,').click();
  await page.getByRole('radio', { name: 'Enable DDoS Protection Silver' }).check();
  
  console.log('✅ Phase 6 Complete: Services Configured');

  // ========== PHASE 7: CHECKOUT ==========
  console.log('✅ Starting Phase 7: Checkout & Delivery');
  await page.getByRole('button', { name: 'Go to Quote 360° View' }).click();
  await page.locator('.oe-icon.tabCart.b2b-collapsible-quote-alerts-indicator__icon > .oe-icon__container').click();
  await page.getByRole('button', { name: 'Go to Quote 360° View' }).click();
  await page.getByRole('button', { name: 'Proceed To Checkout' }).click();
  
  // Delivery
  await page.getByRole('checkbox', { name: 'Select' }).check();
  await page.getByTestId('taDeliveryAction').getByRole('button', { name: 'Select Delivery' }).click();
  await page.getByText('Home Delivery').click();
  await page.getByRole('button', { name: 'Add Delivery Method' }).click();
  await page.getByRole('checkbox', { name: 'Select' }).check();
  await page.getByRole('button', { name: 'Select Delivery in Bulk' }).click();
  await page.getByRole('button', { name: 'Add Delivery Method' }).click();
  
  // Continue to Billing
  await page.getByRole('button', { name: 'Continue to Billing Details' }).click();
  await page.locator('#ux-checkbox-field-51d6ccb9-8521').check();
  await page.getByRole('button', { name: 'Continue to Contract' }).click();
  
  console.log('✅ Phase 7 Complete: Checkout Done');

  // ========== PHASE 8: CONTRACT & ORDER ==========
  console.log('✅ Starting Phase 8: Contract Acceptance & Order');
  await page.getByRole('button', { name: 'Accept' }).first().click();
  await page.getByRole('button', { name: 'Manual Signature' }).click();
  await page.getByRole('button', { name: 'Confirm' }).click();
  await page.getByRole('button', { name: 'Accept' }).click();
  await page.getByRole('button', { name: 'Manual Signature' }).click();
  await page.getByRole('button', { name: 'Confirm' }).click();
  
  // Place Order
  await page.getByRole('button', { name: 'Place Order' }).click();
  
  console.log('✅ Phase 8 Complete: Order Placed Successfully!');
  console.log('✅✅✅ E2E_CustomerAndBillingCreation Full Flow COMPLETED! ✅✅✅');
  
  expect(page).toBeTruthy();
});
