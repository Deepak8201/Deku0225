# Custom Authorization Patterns

OAuth is ONE authorization pattern. Many APIs use custom headers, API keys, or session-based auth.

## When NOT to Use OAuth

Test description indicators that OAuth should NOT be used:

1. **Custom Authorization Format**: "Authorization: Trusted application=...", "Authorization: ApiKey ...", etc.
2. **API Key Headers**: "X-API-Key: ...", "x-api-token: ...", etc.
3. **Session Cookies**: "Cookie: session=...", "Set-Cookie: ..." in responses
4. **No Auth Mentioned**: No authorization headers → unauthenticated endpoints
5. **Explicit Statement**: "Do not use OAuth", "Use custom headers", etc.

## Pattern Catalog

### 1. Trusted Application Header

Used in internal APIs where trust is established via application identifier:

```typescript
export class MyAPIWorkflow extends AIPage {
  private apiHelper: APIHelper;

  constructor(page: Page) {
    super(page);
    this.apiHelper = new APIHelper();
  }

  async initialize() {
    // ALWAYS call this - even if not using OAuth
    await this.apiHelper.initialize();
  }

  async callAPI() {
    const baseUrl = SettingsHelper.getBaseUrl('MY_API');
    const appName = SettingsHelper.getEnvParam('MY_API', 'HTTP', 'applicationName');
    
    const headers = {
      'Authorization': `Trusted application=${appName}`,
      'Content-Type': 'application/json'
    };

    const response = await this.apiHelper.post(
      `${baseUrl}/api/endpoint`,
      payload,
      headers,
      { useAuth: false } // Disable OAuth
    );

    return response;
  }
}
```

**Common variations**:

- `Authorization: Trusted application=telecom-business-api`
- `Authorization: Application telecom-business-api`
- `X-Application-ID: telecom-business-api`

### 2. API Key Header

Used in public or semi-public APIs:

```typescript
async callProtectedAPI() {
  const baseUrl = SettingsHelper.getBaseUrl('PUBLIC_API');
  const apiKey = SettingsHelper.getEnvParam('PUBLIC_API', 'HTTP', 'apiKey');
  
  const headers = {
    'X-API-Key': apiKey,
    'Content-Type': 'application/json'
  };

  const response = await this.apiHelper.get(
    `${baseUrl}/api/data`,
    headers,
    { useAuth: false }
  );

  return response;
}
```

**Common header names**:

- `X-API-Key`
- `x-api-token`
- `API-Token`
- `Authorization: ApiKey {key}`

### 3. Session-Based Auth

Used when login returns session cookie:

```typescript
export class SessionAuthWorkflow extends AIPage {
  private apiHelper: APIHelper;

  constructor(page: Page) {
    super(page);
    this.apiHelper = new APIHelper();
  }

  async initialize() {
    await this.apiHelper.initialize();
  }

  async login(username: string, password: string) {
    const baseUrl = SettingsHelper.getBaseUrl('APP');
    
    // Step 1: Login to get session cookie (set automatically by Playwright)
    const loginResponse = await this.apiHelper.post(
      `${baseUrl}/api/auth/login`,
      { username, password },
      {},
      { useAuth: false }
    );
    
    TestLogger.businessStep(`Logged in as ${username}`, async () => {
      // Session cookie stored automatically in request context
    });
  }

  async callProtectedEndpoint() {
    const baseUrl = SettingsHelper.getBaseUrl('APP');
    
    // Step 2: Subsequent requests use stored session cookie
    const response = await this.apiHelper.get(
      `${baseUrl}/api/protected-resource`,
      {},
      { useAuth: false } // No Bearer token, using session cookie
    );
    
    return response;
  }
}
```

### 4. Mixed Auth (Some endpoints OAuth, others custom)

When different endpoints in the same test use different auth:

```typescript
export class MixedAuthWorkflow extends AIPage {
  private apiHelper: APIHelper;

  constructor(page: Page) {
    super(page);
    this.apiHelper = new APIHelper();
  }

  async initialize() {
    await this.apiHelper.initialize();
    
    // Get OAuth token for endpoints that require it
    const oauth = SettingsHelper.getOAuthConfig('gateway');
    await this.apiHelper.getOAuthToken(
      oauth.tokenEndpoint,
      oauth.clientId!,
      oauth.clientSecret!,
      oauth.scope ?? '',
      oauth.grantType
    );
  }

  async callOAuthEndpoint() {
    const baseUrl = SettingsHelper.getBaseUrl('PUBLIC_API');
    
    // Uses OAuth Bearer token
    const response = await this.apiHelper.get(
      `${baseUrl}/api/oauth-protected`,
      {},
      { useAuth: true } // Default - uses stored OAuth token
    );
    
    return response;
  }

  async callInternalEndpoint() {
    const baseUrl = SettingsHelper.getBaseUrl('INTERNAL_API');
    const appName = SettingsHelper.getEnvParam('INTERNAL_API', 'HTTP', 'applicationName');
    
    // Uses custom header
    const headers = {
      'Authorization': `Trusted application=${appName}`
    };
    
    const response = await this.apiHelper.post(
      `${baseUrl}/api/internal-operation`,
      payload,
      headers,
      { useAuth: false } // Disable OAuth, use custom header
    );
    
    return response;
  }
}
```

### 5. No Authentication (Public Endpoints)

When endpoints are truly public:

```typescript
async callPublicEndpoint() {
  const baseUrl = SettingsHelper.getBaseUrl('PUBLIC_API');
  
  // No authorization needed
  const response = await this.apiHelper.get(
    `${baseUrl}/api/public/health`,
    {},
    { useAuth: false }
  );
  
  return response;
}
```

## APIHelper.initialize() is ALWAYS Required

**Common mistake**: Removing `initialize()` when removing OAuth logic.

**Why it's needed**: `initialize()` sets up the Playwright request context (for cookies, headers, storage). It is SEPARATE from authentication.

```typescript
export class MyAPIWorkflow extends AIPage {
  private apiHelper: APIHelper;

  constructor(page: Page) {
    super(page);
    this.apiHelper = new APIHelper();
  }

  async initialize() {
    // ALWAYS call this - even if not using OAuth
    // Sets up Playwright request context
    await this.apiHelper.initialize();
  }

  async callAPI() {
    // This will throw "Request context not initialized" if initialize() was not called
    await this.apiHelper.get(url, {}, { useAuth: false });
  }
}
```

**initialize() does**:

- Creates Playwright request context
- Sets up cookie storage
- Prepares header management
- Enables request/response interception

**initialize() does NOT**:

- Acquire OAuth tokens (that's `getOAuthToken()`)
- Set custom headers (that's passed per-call)
- Validate credentials (that's per-request)

## Configuration Examples

### Custom Header from Environment

```json
{
  "systems": [{
    "MY_API": {
      "connections": [{
        "HTTP": {
          "url": "https://api.example.com",
          "applicationName": "my-app-name",
          "customAuthHeader": "Trusted application"
        }
      }]
    }
  }]
}
```

```typescript
const appName = SettingsHelper.getEnvParam('MY_API', 'HTTP', 'applicationName');
const authType = SettingsHelper.getEnvParam('MY_API', 'HTTP', 'customAuthHeader');
const headers = {
  'Authorization': `${authType}=${appName}`
};
```

### API Key from Environment

```json
{
  "systems": [{
    "PUBLIC_API": {
      "connections": [{
        "HTTP": {
          "url": "https://api.example.com",
          "apiKey": "secret-key-123"
        }
      }]
    }
  }]
}
```

```typescript
const apiKey = SettingsHelper.getEnvParam('PUBLIC_API', 'HTTP', 'apiKey');
const headers = { 'X-API-Key': apiKey };
```

## Detection Checklist

When generating API code, check test description for:

- [ ] Explicit "Authorization:" header format → Match it exactly
- [ ] "X-API-Key" or similar → API key pattern
- [ ] Login/session workflow → Session-based auth
- [ ] "OAuth", "Bearer", "client_credentials" → OAuth flow
- [ ] No auth headers → Public endpoint

**Default behavior**: If test description shows custom headers, DO NOT generate OAuth code.

## Security Notes

- **Never hardcode** auth values in code
- **Always use** SettingsHelper for dynamic values
- **Never log** API keys, tokens, or passwords
- **Always use** environment configuration for secrets

## Related Skills

- [test-api-integration/SKILL.md](../SKILL.md) - Main API integration patterns
- [test-api-integration/references/credential-management.md](credential-management.md) - OAuth configuration
- [test-api-integration/references/api-workflow-patterns.md](api-workflow-patterns.md) - Workflow structure
