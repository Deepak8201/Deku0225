import { test, expect } from '@playwright/test';
import { TagHelper } from 'SharedRuntime/TagHelper';
import { APIHelper } from 'SharedRuntime/APIHelper';

// Unique test identifier – must match an entry in TestTagsMapping.json
const TEST_ID = 'TC_001_v001_APICustomerCreation';

TagHelper.taggedTest(TEST_ID, async () => {
  // Initialize API helper
  const apiHelper = new APIHelper();
  await apiHelper.initialize();

  // TODO: Replace with real OAuth credentials and token endpoint
  const tokenEndpoint = 'https://example.com/oauth/token';
  const clientId = process.env.CLIENT_ID || 'my-client-id';
  const clientSecret = process.env.CLIENT_SECRET || 'my-client-secret';
  const scope = 'read write';

  // Retrieve access token (placeholder flow)
  const accessToken = await apiHelper.getOAuthToken(
    tokenEndpoint,
    clientId,
    clientSecret,
    scope
  );

  // Example API request – replace with real endpoint and payload
  const response = await apiHelper.requestContext!.get('https://example.com/api/customer', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  // Basic validation – adjust according to API contract
  expect(response.ok()).toBeTruthy();
  const body = await response.json();
  expect(body).toHaveProperty('id');
  expect(body).toHaveProperty('name');

  // Clean up
  await apiHelper.dispose();
});
