/**
 * API Helper - OAuth and GraphQL Request Utilities
 * 
 * Provides methods for:
 * - OAuth 2.0 client credentials authentication
 * - GraphQL API requests with Bearer token
 * - Response parsing and validation
 * 
 * Uses Playwright's request context for HTTP requests
 */

import { request, type APIRequestContext } from '@playwright/test';
import { TestLogger } from './TestLogger';

/**
 * OAuth token response structure
 */
export interface OAuthTokenResponse {
    access_token: string;
    expires_in: number;
    refresh_expires_in: number;
    token_type: string;
    scope: string;
}

/**
 * GraphQL request payload structure
 */
export interface GraphQLRequest {
    query: string;
    variables?: Record<string, unknown>;
    operationName?: string;
}

/**
 * GraphQL error structure
 */
export interface GraphQLError {
    message: string;
    locations?: Array<{ line: number; column: number }>;
    path?: string[];
}

/**
 * GraphQL response structure
 */
export interface GraphQLResponse<T = unknown> {
    data?: T;
    errors?: GraphQLError[];
}

/**
 * API Helper for OAuth and GraphQL operations
 */
export class APIHelper {
    private requestContext: APIRequestContext | null = null;
    private accessToken: string | null = null;

    /**
     * Initialize request context
     */
    async initialize(): Promise<void> {
        await TestLogger.baseStep('Initialize API request context', async () => {
            this.requestContext = await request.newContext({
                ignoreHTTPSErrors: true, // For self-signed certificates
            });
            TestLogger.info('✓ API request context initialized');
        });
    }

    /**
     * Dispose request context
     */
    async dispose(): Promise<void> {
        await TestLogger.baseStep('Dispose API request context', async () => {
            if (this.requestContext) {
                await this.requestContext.dispose();
                this.requestContext = null;
                this.accessToken = null;
                TestLogger.info('✓ API request context disposed');
            }
        });
    }

    /**
     * Get OAuth access token using client credentials flow
     * 
     * @param tokenEndpoint - OAuth token endpoint URL
     * @param clientId - OAuth client ID
     * @param clientSecret - OAuth client secret
     * @param scope - OAuth scope
     * @param grantType - OAuth grant type (default: client_credentials)
     * @returns Access token string
     */
    async getOAuthToken(
        tokenEndpoint: string,
        clientId: string,
        clientSecret: string,
        scope: string,
        grantType: string = 'client_credentials'
    ): Promise<string> {
        return await TestLogger.baseStep(`Get OAuth token from ${tokenEndpoint}`, async () => {
            if (!this.requestContext) {
                throw new Error('Request context not initialized. Call initialize() first.');
            }

            TestLogger.info(`Requesting OAuth token with client_id: ${clientId}`);

            // Prepare form data
            const formData = new URLSearchParams();
            formData.append('scope', scope);
            formData.append('grant_type', grantType);
            formData.append('client_id', clientId);
            formData.append('client_secret', clientSecret);

            // Make POST request
            const response = await this.requestContext.post(tokenEndpoint, {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                data: formData.toString(),
            });

            // Check response status
            if (!response.ok()) {
                const errorBody = await response.text();
                TestLogger.error(`OAuth request failed with status ${response.status()}`);
                TestLogger.error(`Response: ${errorBody}`);
                throw new Error(`OAuth token request failed: ${response.status()} ${response.statusText()}`);
            }

            // Parse response
            const tokenResponse: OAuthTokenResponse = await response.json();
            this.accessToken = tokenResponse.access_token;

            TestLogger.info(`✓ OAuth token retrieved successfully`);
            TestLogger.info(`Token type: ${tokenResponse.token_type}`);
            TestLogger.info(`Expires in: ${tokenResponse.expires_in} seconds`);
            TestLogger.info(`Scope: ${tokenResponse.scope}`);

            return this.accessToken;
        });
    }

    /**
     * Execute GraphQL query with Bearer token
     * 
     * @param endpoint - GraphQL endpoint URL
     * @param query - GraphQL query string
     * @param variables - GraphQL query variables (optional)
     * @param operationName - GraphQL operation name (optional)
     * @param bearerToken - Bearer token for authorization (optional, uses stored token if not provided)
     * @returns GraphQL response data
     */
    async executeGraphQLQuery<T = unknown>(
        endpoint: string,
        query: string,
        variables?: Record<string, unknown>,
        operationName?: string,
        bearerToken?: string
    ): Promise<GraphQLResponse<T>> {
        return await TestLogger.baseStep(`Execute GraphQL query to ${endpoint}`, async () => {
            if (!this.requestContext) {
                throw new Error('Request context not initialized. Call initialize() first.');
            }

            // Use provided token or stored token
            const token = bearerToken ?? this.accessToken;
            if (!token || token.trim() === '') {
                throw new Error('No bearer token available. Call getOAuthToken() first or provide bearerToken parameter.');
            }

            TestLogger.info(`Executing GraphQL query: ${operationName || 'unnamed'}`);
            TestLogger.info(`Query: ${query.substring(0, 100)}${query.length > 100 ? '...' : ''}`);

            // Prepare GraphQL request payload
            const payload: GraphQLRequest = {
                query,
                ...(variables ? { variables } : {}),
                ...(operationName ? { operationName } : {}),
            };

            // Make POST request
            const response = await this.requestContext.post(endpoint, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                data: payload,
            });

            // Check response status
            if (!response.ok()) {
                const errorBody = await response.text();
                TestLogger.error(`GraphQL request failed with status ${response.status()}`);
                TestLogger.error(`Response: ${errorBody}`);
                throw new Error(`GraphQL request failed: ${response.status()} ${response.statusText()}`);
            }

            // Parse response
            const graphqlResponse = await response.json() as GraphQLResponse<T>;

            // Check for GraphQL errors
            if (graphqlResponse.errors && Array.isArray(graphqlResponse.errors) && graphqlResponse.errors.length > 0) {
                TestLogger.warn(`GraphQL query returned errors:`);
                graphqlResponse.errors.forEach((error, index) => {
                    TestLogger.warn(`Error ${index + 1}: ${error.message}`);
                });
            }

            // Log success
            if (graphqlResponse.data) {
                TestLogger.info(`✓ GraphQL query executed successfully`);
                TestLogger.info(`Response data keys: ${Object.keys(graphqlResponse.data).join(', ')}`);
            }

            return graphqlResponse;
        });
    }

    /**
     * Get stored access token
     * @returns Stored access token or null
     */
    getStoredToken(): string | null {
        return this.accessToken;
    }

    /**
     * Set access token manually
     * @param token - Access token to store
     */
    setAccessToken(token: string): void {
        this.accessToken = token;
        TestLogger.info(`Access token set manually`);
    }

    /**
     * Clear stored access token
     */
    clearToken(): void {
        this.accessToken = null;
        TestLogger.info(`Access token cleared`);
    }

    /**
     * Execute GET request
     * 
     * @param endpoint - API endpoint URL
     * @param headers - Optional custom headers
     * @param useAuth - Whether to use Bearer token (default: true)
     * @returns Response data
     */
    async get<T = unknown>(
        endpoint: string,
        headers?: Record<string, string>,
        useAuth = true
    ): Promise<T> {
        return await TestLogger.baseStep(`GET ${endpoint}`, async () => {
            if (!this.requestContext) {
                throw new Error('Request context not initialized. Call initialize() first.');
            }

            const requestHeaders: Record<string, string> = {
                'Content-Type': 'application/json',
                ...headers,
            };

            if (useAuth) {
                if (!this.accessToken || this.accessToken.trim() === '') {
                    throw new Error('No access token available. Call getOAuthToken() first or set useAuth=false.');
                }
                requestHeaders['Authorization'] = `Bearer ${this.accessToken}`;
            }

            TestLogger.info(`Executing GET request to: ${endpoint}`);

            const response = await this.requestContext.get(endpoint, {
                headers: requestHeaders,
            });

            if (!response.ok()) {
                const errorBody = await response.text();
                TestLogger.error(`GET request failed with status ${response.status()}`);
                TestLogger.error(`Response: ${errorBody}`);
                throw new Error(`GET request failed: ${response.status()} ${response.statusText()}`);
            }

            const data = await response.json() as T;
            TestLogger.info(`✓ GET request successful`);
            TestLogger.info(`Response data keys: ${typeof data === 'object' && data !== null ? Object.keys(data as Record<string, unknown>).join(', ') : 'N/A'}`);

            return data;
        });
    }

    /**
     * Execute POST request
     * 
     * @param endpoint - API endpoint URL
     * @param data - Request body data
     * @param headers - Optional custom headers
     * @param useAuth - Whether to use Bearer token (default: true)
     * @returns Response data
     */
    async post<T = unknown>(
        endpoint: string,
        data: unknown,
        headers?: Record<string, string>,
        useAuth = true
    ): Promise<T> {
        return await TestLogger.baseStep(`POST ${endpoint}`, async () => {
            if (!this.requestContext) {
                throw new Error('Request context not initialized. Call initialize() first.');
            }

            const requestHeaders: Record<string, string> = {
                'Content-Type': 'application/json',
                ...headers,
            };

            if (useAuth) {
                if (!this.accessToken || this.accessToken.trim() === '') {
                    throw new Error('No access token available. Call getOAuthToken() first or set useAuth=false.');
                }
                requestHeaders['Authorization'] = `Bearer ${this.accessToken}`;
            }

            TestLogger.info(`Executing POST request to: ${endpoint}`);
            TestLogger.info(`Request body: ${JSON.stringify(data).substring(0, 200)}${JSON.stringify(data).length > 200 ? '...' : ''}`);

            const response = await this.requestContext.post(endpoint, {
                headers: requestHeaders,
                data,
            });

            if (!response.ok()) {
                const errorBody = await response.text();
                TestLogger.error(`POST request failed with status ${response.status()}`);
                TestLogger.error(`Response: ${errorBody}`);
                throw new Error(`POST request failed: ${response.status()} ${response.statusText()}`);
            }

            const responseData = await response.json() as T;
            TestLogger.info(`✓ POST request successful`);
            TestLogger.info(`Response data keys: ${typeof responseData === 'object' && responseData !== null ? Object.keys(responseData as Record<string, unknown>).join(', ') : 'N/A'}`);

            return responseData;
        });
    }

    /**
     * Execute PUT request
     * 
     * @param endpoint - API endpoint URL
     * @param data - Request body data
     * @param headers - Optional custom headers
     * @param useAuth - Whether to use Bearer token (default: true)
     * @returns Response data
     */
    async put<T = unknown>(
        endpoint: string,
        data: unknown,
        headers?: Record<string, string>,
        useAuth = true
    ): Promise<T> {
        return await TestLogger.baseStep(`PUT ${endpoint}`, async () => {
            if (!this.requestContext) {
                throw new Error('Request context not initialized. Call initialize() first.');
            }

            const requestHeaders: Record<string, string> = {
                'Content-Type': 'application/json',
                ...headers,
            };

            if (useAuth) {
                if (!this.accessToken || this.accessToken.trim() === '') {
                    throw new Error('No access token available. Call getOAuthToken() first or set useAuth=false.');
                }
                requestHeaders['Authorization'] = `Bearer ${this.accessToken}`;
            }

            TestLogger.info(`Executing PUT request to: ${endpoint}`);
            TestLogger.info(`Request body: ${JSON.stringify(data).substring(0, 200)}${JSON.stringify(data).length > 200 ? '...' : ''}`);

            const response = await this.requestContext.put(endpoint, {
                headers: requestHeaders,
                data,
            });

            if (!response.ok()) {
                const errorBody = await response.text();
                TestLogger.error(`PUT request failed with status ${response.status()}`);
                TestLogger.error(`Response: ${errorBody}`);
                throw new Error(`PUT request failed: ${response.status()} ${response.statusText()}`);
            }

            const responseData = await response.json() as T;
            TestLogger.info(`✓ PUT request successful`);
            TestLogger.info(`Response data keys: ${typeof responseData === 'object' && responseData !== null ? Object.keys(responseData as Record<string, unknown>).join(', ') : 'N/A'}`);

            return responseData;
        });
    }

    /**
     * Execute PATCH request
     * 
     * @param endpoint - API endpoint URL
     * @param data - Request body data
     * @param headers - Optional custom headers
     * @param useAuth - Whether to use Bearer token (default: true)
     * @returns Response data
     */
    async patch<T = unknown>(
        endpoint: string,
        data: unknown,
        headers?: Record<string, string>,
        useAuth = true
    ): Promise<T> {
        return await TestLogger.baseStep(`PATCH ${endpoint}`, async () => {
            if (!this.requestContext) {
                throw new Error('Request context not initialized. Call initialize() first.');
            }

            const requestHeaders: Record<string, string> = {
                'Content-Type': 'application/json',
                ...headers,
            };

            if (useAuth) {
                if (!this.accessToken || this.accessToken.trim() === '') {
                    throw new Error('No access token available. Call getOAuthToken() first or set useAuth=false.');
                }
                requestHeaders['Authorization'] = `Bearer ${this.accessToken}`;
            }

            TestLogger.info(`Executing PATCH request to: ${endpoint}`);
            TestLogger.info(`Request body: ${JSON.stringify(data).substring(0, 200)}${JSON.stringify(data).length > 200 ? '...' : ''}`);

            const response = await this.requestContext.patch(endpoint, {
                headers: requestHeaders,
                data,
            });

            if (!response.ok()) {
                const errorBody = await response.text();
                TestLogger.error(`PATCH request failed with status ${response.status()}`);
                TestLogger.error(`Response: ${errorBody}`);
                throw new Error(`PATCH request failed: ${response.status()} ${response.statusText()}`);
            }

            const responseData = await response.json() as T;
            TestLogger.info(`✓ PATCH request successful`);
            TestLogger.info(`Response data keys: ${typeof responseData === 'object' && responseData !== null ? Object.keys(responseData as Record<string, unknown>).join(', ') : 'N/A'}`);

            return responseData;
        });
    }

    /**
     * Execute DELETE request
     * 
     * @param endpoint - API endpoint URL
     * @param headers - Optional custom headers
     * @param useAuth - Whether to use Bearer token (default: true)
     * @returns Response data (if any)
     */
    async delete<T = unknown>(
        endpoint: string,
        headers?: Record<string, string>,
        useAuth = true
    ): Promise<T | null> {
        return await TestLogger.baseStep(`DELETE ${endpoint}`, async () => {
            if (!this.requestContext) {
                throw new Error('Request context not initialized. Call initialize() first.');
            }

            const requestHeaders: Record<string, string> = {
                'Content-Type': 'application/json',
                ...headers,
            };

            if (useAuth) {
                if (!this.accessToken || this.accessToken.trim() === '') {
                    throw new Error('No access token available. Call getOAuthToken() first or set useAuth=false.');
                }
                requestHeaders['Authorization'] = `Bearer ${this.accessToken}`;
            }

            TestLogger.info(`Executing DELETE request to: ${endpoint}`);

            const response = await this.requestContext.delete(endpoint, {
                headers: requestHeaders,
            });

            if (!response.ok()) {
                const errorBody = await response.text();
                TestLogger.error(`DELETE request failed with status ${response.status()}`);
                TestLogger.error(`Response: ${errorBody}`);
                throw new Error(`DELETE request failed: ${response.status()} ${response.statusText()}`);
            }

            TestLogger.info(`✓ DELETE request successful`);

            // Some DELETE endpoints return empty response
            const contentType = response.headers()['content-type'];
            if (contentType && contentType.trim() !== '' && contentType.includes('application/json')) {
                const responseData = await response.json() as T;
                TestLogger.info(`Response data keys: ${typeof responseData === 'object' && responseData !== null ? Object.keys(responseData as Record<string, unknown>).join(', ') : 'N/A'}`);
                return responseData;
            }

            return null;
        });
    }

    /**
     * Execute GraphQL mutation
     * 
     * @param endpoint - GraphQL endpoint URL
     * @param mutation - GraphQL mutation string
     * @param variables - GraphQL mutation variables (optional)
     * @param operationName - GraphQL operation name (optional)
     * @param bearerToken - Bearer token for authorization (optional, uses stored token if not provided)
     * @returns GraphQL response data
     */
    async executeGraphQLMutation<T = unknown>(
        endpoint: string,
        mutation: string,
        variables?: Record<string, unknown>,
        operationName?: string,
        bearerToken?: string
    ): Promise<GraphQLResponse<T>> {
        return await TestLogger.baseStep(`Execute GraphQL mutation to ${endpoint}`, async () => {
            // GraphQL mutations use the same executeGraphQLQuery method
            // The distinction is semantic for logging purposes
            return await this.executeGraphQLQuery<T>(endpoint, mutation, variables, operationName, bearerToken);
        });
    }

    /**
     * Get OAuth access token using password grant flow
     * 
     * @param tokenEndpoint - OAuth token endpoint URL
     * @param username - User's username
     * @param password - User's password
     * @param clientId - OAuth client ID (optional)
     * @param clientSecret - OAuth client secret (optional)
     * @param scope - OAuth scope (optional)
     * @returns Access token string
     */
    async getOAuthTokenPasswordGrant(
        tokenEndpoint: string,
        username: string,
        password: string,
        clientId?: string,
        clientSecret?: string,
        scope?: string
    ): Promise<string> {
        return await TestLogger.baseStep(`Get OAuth token (password grant) from ${tokenEndpoint}`, async () => {
            if (!this.requestContext) {
                throw new Error('Request context not initialized. Call initialize() first.');
            }

            TestLogger.info(`Requesting OAuth token with username: ${username}`);

            // Prepare form data
            const formData = new URLSearchParams();
            formData.append('grant_type', 'password');
            formData.append('username', username);
            formData.append('password', password);
            if (clientId) formData.append('client_id', clientId);
            if (clientSecret) formData.append('client_secret', clientSecret);
            if (scope) formData.append('scope', scope);

            // Make POST request
            const response = await this.requestContext.post(tokenEndpoint, {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                data: formData.toString(),
            });

            // Check response status
            if (!response.ok()) {
                const errorBody = await response.text();
                TestLogger.error(`OAuth password grant request failed with status ${response.status()}`);
                TestLogger.error(`Response: ${errorBody}`);
                throw new Error(`OAuth token request failed: ${response.status()} ${response.statusText()}`);
            }

            // Parse response
            const tokenResponse = await response.json() as OAuthTokenResponse;
            this.accessToken = tokenResponse.access_token;

            TestLogger.info(`✓ OAuth token retrieved successfully (password grant)`);
            TestLogger.info(`Token type: ${tokenResponse.token_type}`);
            TestLogger.info(`Expires in: ${tokenResponse.expires_in} seconds`);
            TestLogger.info(`Scope: ${tokenResponse.scope}`);

            return this.accessToken;
        });
    }
}

export default APIHelper;




