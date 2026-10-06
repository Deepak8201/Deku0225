/**
 * TDMRestApi - low-level client for TDM REST endpoints.
 *
 * Endpoints:
 * - POST   /api/tdm/rest/create-env     — create environment
 * - PUT    /api/tdm/rest/create-env     — update environment
 * - DELETE /api/tdm/rest/create-env     — delete environment or system
 * - POST   /api/tdm/rest/insert-records — insert records
 */

import { request, type APIRequestContext } from '@playwright/test';
import { TestLogger } from './TestLogger';
import {
  type TDMCreateEnvRequest,
  type TDMUpdateEnvRequest,
  type TDMDeleteEnvRequest,
  type TDMInsertRequest,
  type TDMResponse,
} from './types';

export class TDMRestApi {
  private requestContext: APIRequestContext | null = null;

  constructor(private readonly baseUrl: string) {}

  async initialize(): Promise<void> {
    await TestLogger.baseStep('Initialize TDM REST API context', async () => {
      this.requestContext = await request.newContext({ ignoreHTTPSErrors: true });
      TestLogger.info('✓ TDM REST API context initialized');
    });
  }

  async dispose(): Promise<void> {
    await TestLogger.baseStep('Dispose TDM REST API context', async () => {
      if (this.requestContext) {
        await this.requestContext.dispose();
        this.requestContext = null;
        TestLogger.info('✓ TDM REST API context disposed');
      }
    });
  }

  /** POST /api/tdm/rest/create-env */
  async createEnvironment(body: TDMCreateEnvRequest): Promise<TDMResponse> {
    return this.request('POST', `${this.baseUrl}/api/tdm/rest/create-env`, body, 'create-env');
  }

  /** PUT /api/tdm/rest/create-env */
  async updateEnvironment(body: TDMUpdateEnvRequest): Promise<TDMResponse> {
    return this.request('PUT', `${this.baseUrl}/api/tdm/rest/create-env`, body, 'update-env');
  }

  /** DELETE /api/tdm/rest/create-env — removes the whole environment. */
  async deleteEnvironment(projectName: string, envName: string): Promise<TDMResponse> {
    const body: TDMDeleteEnvRequest = { environment: { projectName, envName } };
    return this.request('DELETE', `${this.baseUrl}/api/tdm/rest/create-env`, body, 'delete-env');
  }

  /** DELETE /api/tdm/rest/create-env — removes a single system from the environment. */
  async deleteSystem(
    projectName: string,
    envName: string,
    systemDeleteName: string,
  ): Promise<TDMResponse> {
    const body: TDMDeleteEnvRequest = {
      environment: { projectName, envName, systemDeleteName },
    };
    return this.request('DELETE', `${this.baseUrl}/api/tdm/rest/create-env`, body, 'delete-system');
  }

  /** POST /api/tdm/rest/insert-records — returns TDM record id from response link. */
  async insertRecords(body: TDMInsertRequest): Promise<string> {
    const result = await this.request(
      'POST',
      `${this.baseUrl}/api/tdm/rest/insert-records`,
      body,
      'insert-records',
    );
    return this.extractTdmId(result.link);
  }

  private async request(
    method: 'POST' | 'PUT' | 'DELETE',
    endpoint: string,
    body: unknown,
    label: string,
  ): Promise<TDMResponse> {
    return await TestLogger.baseStep(`TDM ${label}`, async () => {
      this.assertInitialized();
      TestLogger.info(`${method} ${endpoint}`);

      const options = {
        headers: { 'Content-Type': 'application/json' },
        data: JSON.stringify(body),
      };

      const response =
        method === 'POST'
          ? await this.requestContext!.post(endpoint, options)
          : method === 'PUT'
            ? await this.requestContext!.put(endpoint, options)
            : await this.requestContext!.delete(endpoint, options);

      if (!response.ok()) {
        const errorBody = await response.text();
        TestLogger.error(`TDM ${label} failed with status ${response.status()}`);
        TestLogger.error(`Response: ${errorBody}`);
        throw new Error(`TDM ${label} failed: ${response.status()} ${response.statusText()}`);
      }

      const result: TDMResponse = await response.json();
      if (result.type !== 'SUCCESS') {
        throw new Error(`TDM ${label} returned non-SUCCESS: "${result.type}" — ${result.content}`);
      }

      TestLogger.info(`✓ TDM ${label} succeeded`);
      return result;
    });
  }

  private assertInitialized(): void {
    if (!this.requestContext) {
      throw new Error('TDM REST API not initialized. Call initialize() first.');
    }
  }

  private extractTdmId(link: string): string {
    const segment = link.split('/').pop();
    if (!segment) {
      throw new Error(`Cannot extract TDM ID from link: "${link}"`);
    }
    TestLogger.info(`✓ TDM record created: ${segment}`);
    return segment;
  }
}

export default TDMRestApi;
