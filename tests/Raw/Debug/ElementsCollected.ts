/**
 * Collected HTML elements from browser investigation
 * This file serves as the source for generating locator_cache.json
 */

export interface CollectedElement {
  description: string;
  action: string;
  html: string;
  locatorSuggestion: string;
}

export const collectedElements: CollectedElement[] = [
  {
      description: "Create button in Create Delegate dialog",
      action: "click",
      html: '<button type="button" class="ant-btn css-t2kvhy ant-btn-primary">Create</button>',
      locatorSuggestion: 'button:has-text("Create")'
  }
];

export default collectedElements;