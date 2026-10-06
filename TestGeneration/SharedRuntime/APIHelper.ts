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

import { request, type APIRequestContext, type APIResponse } from '@playwright/test';
import { TestLogger } from './TestLogger';

/**
 * OAuth token response structure
 */
export interface OAuthTokenResponse {
    access_token: string;
    token_type: string;
    expires_in: number;
    scope?: string;
}

interface BasicAuthOAuthOptions {
    scope?: string;
    grantType?: string;
    extraHeaders?: Record<string, string>;

    /**
     * Optional custom request body for non-standard IdPs.
     * If provided, default OAuth form body will not be generated.
     */
    body?: string;

    /**
     * Append grant_type to token endpoint query params instead of body.
     * Useful for some non-standard OAuth providers (e.g. MitID).
     */
    sendGrantTypeInQuery?: boolean;
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
 * Response body format options
 */
export enum ResponseBodyFormat {
    /** Parse response as JSON (default) */
    JSON = 'json',
    /** Return response as plain text string */
    TEXT = 'text',
    /** No body expected, returns undefined */
    NONE = 'none'
}

/**
 * Optional success semantics for REST helpers (GET/POST/PUT/PATCH/DELETE).
 * When omitted, behavior is unchanged (response.ok() + JSON body).
 */
export interface APIHttpSuccessOptions {
    expectedStatus?: number;
    allowedStatuses?: number[];
    /** 
     * @deprecated Use responseFormat instead. Will be removed in future version.
     * Default true. Set false for empty-body success (e.g. 204). 
     */
    parseJsonBody?: boolean;
    /** 
     * Response body format to parse.
     * - ResponseBodyFormat.JSON: Parse as JSON (default)
     * - ResponseBodyFormat.TEXT: Return as plain text string
     * - ResponseBodyFormat.NONE: No body expected (returns undefined)
     */
    responseFormat?: ResponseBodyFormat;
}

interface HttpExchangeContext {
    method: string;
    url: string;
    requestHeaders: Record<string, string>;
    requestBody?: unknown;
}

const SENSITIVE_HEADER_KEYS = new Set(['authorization', 'cookie', 'x-api-key']);
const SENSITIVE_BODY_KEYS = new Set([
    'client_secret',
    'password',
    'access_token',
    'refresh_token',
    'id_token',
    'clientSecret',
]);

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
        return await TestLogger.baseStep(
            `Get OAuth token from ${tokenEndpoint}`,
            async () => {
                this.ensureRequestContext();

                TestLogger.info(
                    `Requesting OAuth token with client_id: ${clientId}`
                );

                const formData = new URLSearchParams({
                    scope,
                    grant_type: grantType,
                    client_id: clientId,
                    client_secret: clientSecret,
                });

                const requestHeaders = {
                    'Content-Type': 'application/x-www-form-urlencoded',
                };
                const requestBody = formData.toString();

                const response = await this.sendRequest(
                    () =>
                        this.requestContext!.post(tokenEndpoint, {
                            headers: requestHeaders,
                            data: requestBody,
                        }),
                    {
                        method: 'POST',
                        url: tokenEndpoint,
                        requestHeaders,
                        requestBody,
                    }
                );

                return await this.handleOAuthTokenResponse(response, {
                    method: 'POST',
                    url: tokenEndpoint,
                    requestHeaders,
                    requestBody,
                });
            }
        );
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

            const requestHeaders: Record<string, string> = {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            };

            // Make POST request
            const response = await this.sendRequest(
                () =>
                    this.requestContext!.post(endpoint, {
                        headers: requestHeaders,
                        data: payload,
                    }),
                {
                    method: 'POST',
                    url: endpoint,
                    requestHeaders,
                    requestBody: payload,
                }
            );

            const responseBodyText = await response.text();
            await this.recordHttpExchange(
                {
                    method: 'POST',
                    url: endpoint,
                    requestHeaders,
                    requestBody: payload,
                },
                response,
                responseBodyText
            );

            // Check response status
            if (!response.ok()) {
                TestLogger.error(`GraphQL request failed with status ${response.status()}`);
                TestLogger.error(`Response: ${responseBodyText}`);
                throw new Error(`GraphQL request failed: ${response.status()} ${response.statusText()}`);
            }

            // Parse response
            const graphqlResponse = JSON.parse(responseBodyText) as GraphQLResponse<T>;

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
     * Log response data based on format and type
     * @param responseData - Response data to log
     * @param format - Response body format
     */
    private logResponseData<T>(responseData: T, format: ResponseBodyFormat): void {
        if (format === ResponseBodyFormat.NONE) {
            return; // No body to log
        }

        const dataType = typeof responseData;
        if (dataType === 'object' && responseData !== null) {
            TestLogger.info(`Response data keys: ${Object.keys(responseData as Record<string, unknown>).join(', ')}`);
        } else if (dataType === 'string') {
            const textLength = (responseData as string).length;
            const preview = textLength <= 100 ? responseData as string : `${(responseData as string).substring(0, 100)}...`;
            TestLogger.info(`Response text (${textLength} chars): ${preview}`);
        }
    }

    private getMaxExchangeBodySize(): number {
        const configured = parseInt(process.env.ALLURE_API_EXCHANGE_MAX_BODY || '50000', 10);
        return Number.isFinite(configured) && configured > 0 ? configured : 50000;
    }

    private truncateBody(text: string): string {
        const maxSize = this.getMaxExchangeBodySize();
        if (text.length <= maxSize) {
            return text;
        }
        return `${text.substring(0, maxSize)}\n... [truncated, ${text.length - maxSize} more chars]`;
    }

    private redactHeaders(headers: Record<string, string>): Record<string, string> {
        const redacted: Record<string, string> = {};
        for (const [key, value] of Object.entries(headers)) {
            redacted[key] = SENSITIVE_HEADER_KEYS.has(key.toLowerCase()) ? '***REDACTED***' : value;
        }
        return redacted;
    }

    private redactRequestBody(body: unknown): unknown {
        if (body == null) {
            return body;
        }

        if (typeof body === 'string') {
            return body.replace(
                /(client_secret|password|access_token|refresh_token|id_token)=[^&]*/gi,
                '$1=***REDACTED***'
            );
        }

        if (typeof body === 'object') {
            const copy = { ...(body as Record<string, unknown>) };
            for (const key of Object.keys(copy)) {
                if (SENSITIVE_BODY_KEYS.has(key)) {
                    copy[key] = '***REDACTED***';
                }
            }
            return copy;
        }

        return body;
    }

    private redactResponseBody(text: string): string {
        if (!text) {
            return text;
        }

        try {
            const parsed = JSON.parse(text) as Record<string, unknown>;
            for (const key of Object.keys(parsed)) {
                if (SENSITIVE_BODY_KEYS.has(key)) {
                    parsed[key] = '***REDACTED***';
                }
            }
            return JSON.stringify(parsed, null, 2);
        } catch {
            return text;
        }
    }

    private async recordHttpExchange(
        exchange: HttpExchangeContext,
        response: APIResponse,
        responseBodyText: string
    ): Promise<void> {
        await TestLogger.attachHttpExchange({
            method: exchange.method,
            url: exchange.url,
            requestHeaders: this.redactHeaders(exchange.requestHeaders),
            requestBody: this.redactRequestBody(exchange.requestBody),
            responseStatus: response.status(),
            responseStatusText: response.statusText(),
            responseHeaders: this.redactHeaders(response.headers()),
            responseBody: this.truncateBody(this.redactResponseBody(responseBodyText)),
        });
    }

    private async recordFailedHttpExchange(
        exchange: HttpExchangeContext,
        error: unknown
    ): Promise<void> {
        const message = error instanceof Error ? error.message : String(error);
        await TestLogger.attachHttpExchange({
            method: exchange.method,
            url: exchange.url,
            requestHeaders: this.redactHeaders(exchange.requestHeaders),
            requestBody: this.redactRequestBody(exchange.requestBody),
            transportError: message,
        });
    }

    private async sendRequest(
        send: () => Promise<APIResponse>,
        exchange: HttpExchangeContext
    ): Promise<APIResponse> {
        try {
            return await send();
        } catch (error) {
            await this.recordFailedHttpExchange(exchange, error);
            throw error;
        }
    }

    private ensureRequestContext(): void {
        if (!this.requestContext) {
            throw new Error(
                'Request context not initialized. Call initialize() first.'
            );
        }
    }
    
    private async handleOAuthTokenResponse(
        response: APIResponse,
        exchange: HttpExchangeContext
    ): Promise<string> {
        const responseBodyText = await response.text();
        await this.recordHttpExchange(exchange, response, responseBodyText);

        if (!response.ok()) {
            TestLogger.error(
                `OAuth request failed with status ${response.status()}`
            );

            TestLogger.error(`Response: ${responseBodyText}`);

            throw new Error(
                `OAuth token request failed: ${response.status()} ${response.statusText()}`
            );
        }

        const tokenResponse: OAuthTokenResponse = JSON.parse(responseBodyText);

        this.accessToken = tokenResponse.access_token;

        TestLogger.info('✓ OAuth token retrieved successfully');
        TestLogger.info(`Token type: ${tokenResponse.token_type}`);
        TestLogger.info(
            `Expires in: ${tokenResponse.expires_in} seconds`
        );

        if (tokenResponse.scope) {
            TestLogger.info(`Scope: ${tokenResponse.scope}`);
        }

        return this.accessToken;
    }

    private async finalizeHttpResponse<T>(
        response: APIResponse,
        verb: string,
        httpOptions: APIHttpSuccessOptions | undefined,
        exchange: HttpExchangeContext
    ): Promise<T> {
        const responseBodyText = await response.text();
        await this.recordHttpExchange(exchange, response, responseBodyText);

        const status = response.status();
        let success: boolean;
        if (httpOptions?.allowedStatuses != null && httpOptions.allowedStatuses.length > 0) {
            success = httpOptions.allowedStatuses.includes(status);
        } else if (httpOptions?.expectedStatus !== undefined) {
            success = status === httpOptions.expectedStatus;
        } else {
            success = response.ok();
        }

        if (!success) {
            TestLogger.error(`${verb} request failed with status ${status}`);
            TestLogger.error(`Response: ${responseBodyText}`);
            if (httpOptions?.allowedStatuses != null && httpOptions.allowedStatuses.length > 0) {
                throw new Error(
                    `${verb} expected one of HTTP ${httpOptions.allowedStatuses.join(', ')}, got ${status}: ${responseBodyText}`
                );
            }
            if (httpOptions?.expectedStatus !== undefined) {
                throw new Error(`${verb} expected HTTP ${httpOptions.expectedStatus}, got ${status}: ${responseBodyText}`);
            }
            throw new Error(`${verb} request failed: ${status} ${response.statusText()}`);
        }

        // Determine response format - default to JSON
        let format = httpOptions?.responseFormat ?? ResponseBodyFormat.JSON;

        // Backward compatibility: handle deprecated parseJsonBody option
        // Only check if responseFormat is not explicitly set to avoid redundant checks
        if (format === ResponseBodyFormat.JSON && httpOptions?.parseJsonBody === false) {
            format = ResponseBodyFormat.NONE;
        }

        // Parse response body based on format
        let responseData: T;
        switch (format) {
            case ResponseBodyFormat.JSON:
                responseData = responseBodyText
                    ? (JSON.parse(responseBodyText) as T)
                    : (undefined as T);
                break;
            
            case ResponseBodyFormat.TEXT:
                responseData = responseBodyText as T;
                break;
            
            case ResponseBodyFormat.NONE:
                responseData = undefined as T;
                break;
            
            default:
                throw new Error(`Unsupported response format: ${format}`);
        }

        // Log response data
        this.logResponseData(responseData, format);

        return responseData;
    }

    /**
     * Execute GET request
     * 
     * @param endpoint - API endpoint URL
     * @param headers - Optional custom headers
     * @param useAuth - Whether to use Bearer token (default: true)
     * @param httpOptions - Optional status / body parsing (default: ok() + JSON)
     * @returns Response data
     */
    async get<T = unknown>(
        endpoint: string,
        headers?: Record<string, string>,
        useAuth = true,
        httpOptions?: APIHttpSuccessOptions
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

            const response = await this.sendRequest(
                () =>
                    this.requestContext!.get(endpoint, {
                        headers: requestHeaders,
                    }),
                {
                    method: 'GET',
                    url: endpoint,
                    requestHeaders,
                }
            );

            const data = await this.finalizeHttpResponse<T>(response, 'GET', httpOptions, {
                method: 'GET',
                url: endpoint,
                requestHeaders,
            });
            TestLogger.info(`✓ GET request successful`);

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
     * @param httpOptions - Optional status / body parsing (default: ok() + JSON)
     * @returns Response data
     */
    async post<T = unknown>(
        endpoint: string,
        data: unknown,
        headers?: Record<string, string>,
        useAuth = true,
        httpOptions?: APIHttpSuccessOptions
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

            const response = await this.sendRequest(
                () =>
                    this.requestContext!.post(endpoint, {
                        headers: requestHeaders,
                        data,
                    }),
                {
                    method: 'POST',
                    url: endpoint,
                    requestHeaders,
                    requestBody: data,
                }
            );

            const responseData = await this.finalizeHttpResponse<T>(response, 'POST', httpOptions, {
                method: 'POST',
                url: endpoint,
                requestHeaders,
                requestBody: data,
            });
            TestLogger.info(`✓ POST request successful`);

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
     * @param httpOptions - Optional status / body parsing (default: ok() + JSON)
     * @returns Response data
     */
    async put<T = unknown>(
        endpoint: string,
        data: unknown,
        headers?: Record<string, string>,
        useAuth = true,
        httpOptions?: APIHttpSuccessOptions
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

            const response = await this.sendRequest(
                () =>
                    this.requestContext!.put(endpoint, {
                        headers: requestHeaders,
                        data,
                    }),
                {
                    method: 'PUT',
                    url: endpoint,
                    requestHeaders,
                    requestBody: data,
                }
            );

            const responseData = await this.finalizeHttpResponse<T>(response, 'PUT', httpOptions, {
                method: 'PUT',
                url: endpoint,
                requestHeaders,
                requestBody: data,
            });
            TestLogger.info(`✓ PUT request successful`);

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
     * @param httpOptions - Optional status / body parsing (default: ok() + JSON)
     * @returns Response data
     */
    async patch<T = unknown>(
        endpoint: string,
        data: unknown,
        headers?: Record<string, string>,
        useAuth = true,
        httpOptions?: APIHttpSuccessOptions
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

            const response = await this.sendRequest(
                () =>
                    this.requestContext!.patch(endpoint, {
                        headers: requestHeaders,
                        data,
                    }),
                {
                    method: 'PATCH',
                    url: endpoint,
                    requestHeaders,
                    requestBody: data,
                }
            );

            const responseData = await this.finalizeHttpResponse<T>(response, 'PATCH', httpOptions, {
                method: 'PATCH',
                url: endpoint,
                requestHeaders,
                requestBody: data,
            });
            TestLogger.info(`✓ PATCH request successful`);

            return responseData;
        });
    }

    /**
     * Execute DELETE request
     * 
     * @param endpoint - API endpoint URL
     * @param headers - Optional custom headers
     * @param useAuth - Whether to use Bearer token (default: true)
     * @param httpOptions - Optional status / body parsing (default: ok() + JSON)
     * @returns Response data (if any)
     */
    async delete<T = unknown>(
        endpoint: string,
        headers?: Record<string, string>,
        useAuth = true,
        httpOptions?: APIHttpSuccessOptions
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

            const response = await this.sendRequest(
                () =>
                    this.requestContext!.delete(endpoint, {
                        headers: requestHeaders,
                    }),
                {
                    method: 'DELETE',
                    url: endpoint,
                    requestHeaders,
                }
            );

            const responseData = await this.finalizeHttpResponse<T>(response, 'DELETE', httpOptions, {
                method: 'DELETE',
                url: endpoint,
                requestHeaders,
            });
            TestLogger.info(`✓ DELETE request successful`);

            return responseData;
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
     * OAuth2 Client Credentials flow using Authorization: Basic header
     */
    async getOAuthTokenBasicAuth(
        tokenEndpoint: string,
        clientId: string,
        clientSecret: string,
        options?: BasicAuthOAuthOptions
    ): Promise<string> {
        return await TestLogger.baseStep(
            `Get OAuth token from ${tokenEndpoint}`,
            async () => {
                this.ensureRequestContext();

                TestLogger.info(
                    'Requesting OAuth token using Authorization: Basic header'
                );

                const grantType =
                    options?.grantType ?? 'client_credentials';

                const endpointUrl = new URL(tokenEndpoint);

                if (options?.sendGrantTypeInQuery) {
                    endpointUrl.searchParams.set(
                        'grant_type',
                        grantType
                    );
                }

                const authorization = `Basic ${Buffer
                    .from(`${clientId}:${clientSecret}`)
                    .toString('base64')}`;

                let requestBody = options?.body;

                // Generate standard OAuth body if caller did not provide custom body
                if (requestBody === undefined) {
                    const formData = new URLSearchParams();

                    if (!options?.sendGrantTypeInQuery) {
                        formData.append('grant_type', grantType);
                    }

                    if (options?.scope) {
                        formData.append('scope', options.scope);
                    }

                    requestBody = formData.toString();
                }

                const requestHeaders = {
                    Authorization: authorization,
                    'Content-Type': 'application/x-www-form-urlencoded',
                    ...options?.extraHeaders,
                };

                const response = await this.sendRequest(
                    () =>
                        this.requestContext!.post(endpointUrl.toString(), {
                            headers: requestHeaders,
                            data: requestBody,
                        }),
                    {
                        method: 'POST',
                        url: endpointUrl.toString(),
                        requestHeaders,
                        requestBody,
                    }
                );

                return await this.handleOAuthTokenResponse(response, {
                    method: 'POST',
                    url: endpointUrl.toString(),
                    requestHeaders,
                    requestBody,
                });
            }
        );
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

            const requestHeaders = {
                'Content-Type': 'application/x-www-form-urlencoded',
            };
            const requestBody = formData.toString();

            // Make POST request
            const response = await this.sendRequest(
                () =>
                    this.requestContext!.post(tokenEndpoint, {
                        headers: requestHeaders,
                        data: requestBody,
                    }),
                {
                    method: 'POST',
                    url: tokenEndpoint,
                    requestHeaders,
                    requestBody,
                }
            );

            return await this.handleOAuthTokenResponse(response, {
                method: 'POST',
                url: tokenEndpoint,
                requestHeaders,
                requestBody,
            });
        });
    }
}

export default APIHelper;




