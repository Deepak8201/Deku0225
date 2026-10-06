/**
 * TDMHelper - convenience wrapper around TDMRestApi with SettingsHelper integration.
 *
 * Environment lifecycle (create / update / delete) uses /api/tdm/rest/create-env.
 * Record insertion uses /api/tdm/rest/insert-records (environment must exist first).
 */

import { TestLogger } from './TestLogger';
import { SettingsHelper } from './SettingsHelper';
import { TDMRestApi } from './TDMRestApi';
import {
  type TDMConnection,
  type TDMEnvConnection,
  type TDMInsertRequest,
  type TDMResponse,
  type TDMUpdateEnvRequest,
} from './types';

export class TDMHelper {
  private api: TDMRestApi | null = null;

  async initialize(tdmSystemName = 'TDM'): Promise<void> {
    const baseUrl = SettingsHelper.getBaseUrl(tdmSystemName);
    this.api = new TDMRestApi(baseUrl);
    await this.api.initialize();
  }

  /** Initialize with an explicit TDM base URL (bypasses SettingsHelper). */
  async initializeWithBaseUrl(tdmBaseUrl: string): Promise<void> {
    this.api = new TDMRestApi(tdmBaseUrl);
    await this.api.initialize();
  }

  async dispose(): Promise<void> {
    if (this.api) {
      await this.api.dispose();
      this.api = null;
    }
  }

  /**
   * Create a TDM environment. DB settings resolved from the environment configuration.
   * @param dbSystemName - system name for DB connection in the environment configuration
   */
  async createEnvironment(
    envName: string,
    systemName: string,
    dbSystemName: string,
    projectName = 'MyProject',
  ): Promise<TDMResponse> {
    return await TestLogger.baseStep(
      `TDM create environment "${envName}" (system: ${systemName})`,
      async () => {
        const db = SettingsHelper.getDatabaseSettings(dbSystemName);
        if (!db) {
          throw new Error(`Database settings for "${dbSystemName}" not found in the environment configuration`);
        }
        return this.getApi().createEnvironment({
          environment: {
            projectName,
            envName,
            systemName,
            connection: TDMHelper.toConnection(dbSystemName, 'DB', {
              db_host: db.host,
              db_name: db.database,
              db_port: String(db.port),
              db_type: db.type,
              db_login: db.username,
              db_password: db.password,
            }),
          },
        });
      },
    );
  }

  /** Create a TDM environment with an explicit connection block. */
  async createEnvironmentWithConnection(
    envName: string,
    systemName: string,
    envConnection: TDMEnvConnection,
    projectName = 'MyProject',
  ): Promise<TDMResponse> {
    return await TestLogger.baseStep(
      `TDM create environment "${envName}" (explicit connection)`,
      async () =>
        this.getApi().createEnvironment({
          environment: {
            projectName,
            envName,
            systemName,
            connection: TDMHelper.toConnection(
              envConnection.name ?? 'DB',
              envConnection.type ?? 'DB',
              envConnection.parameters,
            ),
          },
        }),
    );
  }

  /** Update a TDM environment. `newEnvName` and `newSystemName` are optional. */
  async updateEnvironment(
    envName: string,
    systemName: string,
    connection: TDMEnvConnection,
    projectName = 'MyProject',
    newEnvName?: string,
    newSystemName?: string,
  ): Promise<TDMResponse> {
    const body: TDMUpdateEnvRequest = {
      environment: {
        projectName,
        envName,
        systemName,
        connection: TDMHelper.toConnection(
          connection.name ?? 'DB',
          connection.type ?? 'DB',
          connection.parameters,
        ),
        ...(newEnvName !== undefined && { newEnvName }),
        ...(newSystemName !== undefined && { newSystemName }),
      },
    };
    return this.getApi().updateEnvironment(body);
  }

  async deleteEnvironment(projectName: string, envName: string): Promise<TDMResponse> {
    return this.getApi().deleteEnvironment(projectName, envName);
  }

  async deleteSystem(
    projectName: string,
    envName: string,
    systemDeleteName: string,
  ): Promise<TDMResponse> {
    return this.getApi().deleteSystem(projectName, envName, systemDeleteName);
  }

  /**
   * Insert records into an existing TDM environment.
   * Environment must be created first via createEnvironment().
   */
  async insertRecords(
    envName: string,
    systemName: string,
    titleTable: string,
    records: Record<string, string>[],
    projectName = 'MyProject',
  ): Promise<string> {
    const body: TDMInsertRequest = {
      environment: { projectName, envName, systemName },
      'title-table': titleTable,
      'insert-records': records,
    };
    return await TestLogger.baseStep(
      `TDM insert records into "${titleTable}" (env: ${envName}, system: ${systemName})`,
      async () => this.getApi().insertRecords(body),
    );
  }

  static toConnection(
    name: string,
    type: string,
    parameters: Record<string, string>,
  ): TDMConnection {
    const required = ['db_host', 'db_port', 'db_type', 'db_name', 'db_login', 'db_password'];
    const missing = required.filter((k) => !parameters[k]);
    if (missing.length) {
      throw new Error(`Connection parameters missing required keys: ${missing.join(', ')}`);
    }

    const jdbcUrl =
      parameters['jdbc_url'] ??
      `jdbc:${parameters['db_type']}://${parameters['db_host']}:${parameters['db_port']}/${parameters['db_name']}`;

    return {
      name,
      type,
      parameters: {
        db_host: parameters['db_host']!,
        db_name: parameters['db_name']!,
        db_port: parameters['db_port']!,
        db_type: parameters['db_type']!,
        db_login: parameters['db_login']!,
        db_password: parameters['db_password']!,
        jdbc_url: jdbcUrl,
      },
    };
  }

  private getApi(): TDMRestApi {
    if (!this.api) {
      throw new Error('TDM not initialized. Call initialize() or initializeWithBaseUrl() first.');
    }
    return this.api;
  }
}

export default TDMHelper;
