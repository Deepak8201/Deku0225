/**
 * AIElement Refactoring Examples
 * 
 * This file demonstrates the new AIElement API with BoundElement separation.
 * These are code examples only - not executable tests.
 * 
 * ⚠️ BREAKING CHANGES: All backward compatibility methods have been REMOVED.
 * Old methods like clickWithParam(), fillChildWithinDynamicParent(), etc. NO LONGER EXIST.
 * 
 * NEW API OVERVIEW:
 * ================
 * 
 * 1. Static Locators (no change):
 *    await element.click();
 * 
 * 2. Dynamic Locators (replaced *WithParam methods):
 *    OLD: await element.clickWithParam('Router');  // ❌ REMOVED
 *    NEW: await element.click({ type: 'dynamic', param: 'Router' });  // ✅ USE THIS
 * 
 * 3. Child Within Dynamic Parent (replaced *ChildWithinDynamicParent methods):
 *    OLD: await element.clickChildWithinDynamicParent('Router', 'ipInput');  // ❌ REMOVED
 *    NEW: await element.click({ type: 'withinDynamicParent', parentParam: 'Router', childKey: 'ipInput' });  // ✅ USE THIS
 * 
 * 4. Performance Optimization with locate():
 *    const bound = element.locate({ type: 'dynamic', param: 'Router' });
 *    await bound.click();
 *    await bound.fill('value');
 *    const value = await bound.getInputValue();
 * 
 * See .cursor/prompts/MIG/MIG_AIELEMENT_CONVERSION_PROMPT.md for complete migration guide.
 */

import { Page } from '@playwright/test';
import { AIPage } from '../../../../Engine/Shared/AIPage';
import { AIElement } from '../../../../Engine/Shared/AIElement';
import { TestLogger } from '../../../../Engine/Shared/TestLogger';

// ============================================================================
// EXAMPLE 1: Basic Usage - Static Locator
// ============================================================================

class LoginPage extends AIPage {
  private usernameInput: AIElement;
  private passwordInput: AIElement;
  private loginButton: AIElement;

  constructor(page: Page) {
    super(page, 'LoginPage');
    this.usernameInput = new AIElement(this, 'usernameInput', 'Username input');
    this.passwordInput = new AIElement(this, 'passwordInput', 'Password input');
    this.loginButton = new AIElement(this, 'loginButton', 'Login button');
  }

  // Static locators - no change needed
  async loginStatic(username: string, password: string): Promise<void> {
    await this.usernameInput.fill(username);
    await this.passwordInput.fill(password);
    await this.loginButton.click();
  }

  // Explicit locate() for more control
  async loginExplicit(username: string, password: string): Promise<void> {
    const usernameField = this.usernameInput.locate();
    await usernameField.fill(username);
    
    const passwordField = this.passwordInput.locate();
    await passwordField.fill(password);
    
    const button = this.loginButton.locate();
    await button.click();
  }

  // Locate once, interact multiple times (performance optimization)
  async loginAndVerify(username: string, password: string): Promise<void> {
    const usernameField = this.usernameInput.locate();
    await usernameField.fill(username);
    const value = await usernameField.getInputValue();
    TestLogger.info(`Username set to: ${value}`);
    
    await this.passwordInput.fill(password);
    await this.loginButton.click();
  }
}

// ============================================================================
// EXAMPLE 2: Dynamic Locator (Parameterized)
// ============================================================================

class DeviceConfigPage extends AIPage {
  private deviceTypeOption: AIElement;
  private configPanel: AIElement;

  constructor(page: Page) {
    super(page, 'DeviceConfigPage');
    // Cache: '[role="option"]:has-text("{param}")'
    this.deviceTypeOption = new AIElement(this, 'deviceTypeOption', 'Device type option');
    // Cache: 'div.config-panel:has-text("{param}")'
    this.configPanel = new AIElement(this, 'configPanel', 'Configuration panel');
  }

  // ❌ OLD METHOD REMOVED - No longer works!
  // async selectDeviceTypeOldWay(deviceType: string): Promise<void> {
  //   await this.deviceTypeOption.clickWithParam(deviceType); // ❌ clickWithParam() removed
  // }

  // ✅ NEW API - Unified method with context
  async selectDeviceType(deviceType: string): Promise<void> {
    await this.deviceTypeOption.click({ type: 'dynamic', param: deviceType });
  }

  // ✅ NEW API - Explicit locate for more control
  async selectDeviceTypeExplicit(deviceType: string): Promise<void> {
    const option = this.deviceTypeOption.locate({ type: 'dynamic', param: deviceType });
    await option.click();
  }

  // ✅ NEW API - Verify visibility before clicking
  async selectDeviceTypeWithCheck(deviceType: string): Promise<void> {
    const option = this.deviceTypeOption.locate({ type: 'dynamic', param: deviceType });
    const isVisible = await option.isVisible();
    
    if (isVisible) {
      await option.click();
      TestLogger.info(`Selected device type: ${deviceType}`);
    } else {
      throw new Error(`Device type option not visible: ${deviceType}`);
    }
  }

  // ✅ NEW API - Check visibility using convenience method
  async isConfigPanelVisible(deviceType: string): Promise<boolean> {
    return await this.configPanel.isVisible({ type: 'dynamic', param: deviceType });
  }
}

// ============================================================================
// EXAMPLE 3: Child Within Dynamic Parent
// ============================================================================

class OfferingConfigPage extends AIPage {
  private offeringAccordion: AIElement;

  constructor(page: Page) {
    super(page, 'OfferingConfigPage');
    // Parent cache: 'cpq-accordion-item:has(.product-title__name:has-text("{param}"))'
    // Child cache keys: 'locationsTab', 'ipAddressInput', 'statusLabel'
    this.offeringAccordion = new AIElement(this, 'offeringAccordion', 'Offering accordion');
  }

  // ❌ OLD METHOD REMOVED - No longer works!
  // async clickLocationsTabOldWay(offeringName: string): Promise<void> {
  //   await this.offeringAccordion.clickChildWithinDynamicParent(offeringName, 'locationsTab'); 
  //   // ❌ clickChildWithinDynamicParent() removed
  // }

  // ✅ NEW API - Unified method with context
  async clickLocationsTab(offeringName: string): Promise<void> {
    await this.offeringAccordion.click({
      type: 'withinDynamicParent',
      parentParam: offeringName,
      childKey: 'locationsTab'
    });
  }

  // ✅ NEW API - Explicit locate for more control
  async clickLocationsTabExplicit(offeringName: string): Promise<void> {
    const locationsTab = this.offeringAccordion.locate({
      type: 'withinDynamicParent',
      parentParam: offeringName,
      childKey: 'locationsTab'
    });
    await locationsTab.click();
  }

  // ✅ NEW API - Multiple interactions on same child (performance optimization)
  async fillIPAddressAndVerify(offeringName: string, ipAddress: string): Promise<void> {
    // Resolve once, interact multiple times
    const ipInput = this.offeringAccordion.locate({
      type: 'withinDynamicParent',
      parentParam: offeringName,
      childKey: 'ipAddressInput'
    });

    await ipInput.fill(ipAddress);
    const value = await ipInput.getInputValue();
    TestLogger.info(`IP address set to: ${value}`);
    
    if (value !== ipAddress) {
      throw new Error(`IP address mismatch: expected ${ipAddress}, got ${value}`);
    }
  }

  // ✅ NEW API - Check child visibility using explicit locate
  async isStatusLabelVisible(offeringName: string): Promise<boolean> {
    const statusLabel = this.offeringAccordion.locate({
      type: 'withinDynamicParent',
      parentParam: offeringName,
      childKey: 'statusLabel'
    });
    return await statusLabel.isVisible();
  }

  // ✅ NEW API - Get child text using convenience method
  async getStatusText(offeringName: string): Promise<string | null> {
    return await this.offeringAccordion.getText({
      type: 'withinDynamicParent',
      parentParam: offeringName,
      childKey: 'statusLabel'
    });
  }
}

// ============================================================================
// EXAMPLE 4: Mixed Usage - All Three Locator Types
// ============================================================================

class ComplexPage extends AIPage {
  private staticButton: AIElement;
  private dynamicOption: AIElement;
  private complexParent: AIElement;

  constructor(page: Page) {
    super(page, 'ComplexPage');
    this.staticButton = new AIElement(this, 'submitButton', 'Submit button');
    this.dynamicOption = new AIElement(this, 'deviceOption', 'Device option');
    this.complexParent = new AIElement(this, 'configSection', 'Configuration section');
  }

  async performComplexWorkflow(deviceType: string, ipAddress: string): Promise<void> {
    // Static locator - simple click
    await this.staticButton.click();

    // Dynamic locator - select device type
    await this.dynamicOption.click({ type: 'dynamic', param: deviceType });

    // Child within dynamic parent - fill IP address
    const ipInput = this.complexParent.locate({
      type: 'withinDynamicParent',
      parentParam: deviceType,
      childKey: 'ipAddressInput'
    });
    await ipInput.fill(ipAddress);

    // Verify
    const value = await ipInput.getInputValue();
    TestLogger.info(`Configuration complete: ${deviceType} - ${value}`);
  }
}

// ============================================================================
// EXAMPLE 5: Type-Safe Context Usage
// ============================================================================

class TypeSafePage extends AIPage {
  private element: AIElement;

  constructor(page: Page) {
    super(page, 'TypeSafePage');
    this.element = new AIElement(this, 'myElement', 'My element');
  }

  async demonstrateTypeSafety(): Promise<void> {
    // TypeScript ensures correct context structure
    
    // ✅ Valid - static context
    await this.element.click({ type: 'static' });
    
    // ✅ Valid - dynamic context with param
    await this.element.click({ type: 'dynamic', param: 'Router' });
    
    // ✅ Valid - withinDynamicParent with both params
    await this.element.click({
      type: 'withinDynamicParent',
      parentParam: 'Router',
      childKey: 'ipInput'
    });
    
    // ❌ Compile error - missing param for dynamic
    // await this.element.click({ type: 'dynamic' });
    
    // ❌ Compile error - missing childKey for withinDynamicParent
    // await this.element.click({ type: 'withinDynamicParent', parentParam: 'Router' });
  }
}

// ============================================================================
// EXAMPLE 6: Performance Optimization
// ============================================================================

class PerformancePage extends AIPage {
  private formField: AIElement;

  constructor(page: Page) {
    super(page, 'PerformancePage');
    this.formField = new AIElement(this, 'formField', 'Form field');
  }

  // Less efficient - resolves locator multiple times
  async fillAndVerifyInefficient(value: string): Promise<void> {
    await this.formField.fill(value);
    const actualValue = await this.formField.getInputValue();
    const isVisible = await this.formField.isVisible();
    // Each call resolves the locator again
  }

  // More efficient - resolve once, interact multiple times
  async fillAndVerifyEfficient(value: string): Promise<void> {
    const field = this.formField.locate(); // Resolve once
    await field.fill(value);
    const actualValue = await field.getInputValue();
    const isVisible = await field.isVisible();
    // All interactions use the same resolved locator
  }
}

export {
  LoginPage,
  DeviceConfigPage,
  OfferingConfigPage,
  ComplexPage,
  TypeSafePage,
  PerformancePage
};

