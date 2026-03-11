import {
  UserCredentials,
  DatabaseSettings,
  APIConfiguration,
  OAuthConfig
} from './types';

/**
 * SettingsHelper - Shared utility for accessing environment settings
 *
 * @description
 * Provides centralized access to environment settings from ATP_ENVGENE_CONFIGURATION environment variable.
 * Structure: systems[].{systemName}.connections[].{connectionType}.{paramName}
 *
 * @usage
 * ```typescript
 * import { SettingsHelper } from 'Engine/Shared/SettingsHelper';
 *
 * const baseUrl = SettingsHelper.getBaseUrl('systemName');
 * const credentials = SettingsHelper.getDefaultCredentials('systemName');
 * const apiConfig = SettingsHelper.getAPIConfiguration('systemName');
 * ```
 */

export class SettingsHelper {

  // ============================================================================
  // ENV CONFIGURATION (ATP_ENVGENE_CONFIGURATION)
  // Structure: { systems: [{ systemName: { connections: [{ connectionType: { param: value } }] } }] }
  // ============================================================================

  private static envConfig: Record<string, unknown> | null = null;
  private static envConfigLoaded = false;
  private static readonly ENV_VAR_NAME = 'ATP_ENVGENE_CONFIGURATION';

  /**
   * Get parsed JSON from ATP_ENVGENE_CONFIGURATION environment variable
   * @returns Parsed JSON object or null if not set/invalid
   */
  static getEnvConfig(): Record<string, unknown> | null {
    if (this.envConfigLoaded) {
      return this.envConfig;
    }

    this.envConfigLoaded = true;
    const envValue = process.env[this.ENV_VAR_NAME];

    if (!envValue || envValue.trim() === '') {
      return null;
    }

    try {
      this.envConfig = JSON.parse(envValue) as Record<string, unknown>;
      return this.envConfig;
    } catch {
      return null;
    }
  }

  /**
   * Get parameter from ATP_ENVGENE_CONFIGURATION env variable
   * Structure: systems[].{systemName}.connections[].{connectionType}.{paramName}
   * @private
   */
  private static getEnvParamFromConfig(
    systemName: string, 
    connectionType: string, 
    paramName: string
  ): string | undefined {
    const config = this.getEnvConfig();
    if (!config) return undefined;

    const systems = config.systems as Array<Record<string, unknown>> | undefined;
    if (!Array.isArray(systems)) return undefined;

    for (const entry of systems) {
      const systemConfig = entry[systemName] as Record<string, unknown> | undefined;
      if (!systemConfig) continue;

      const connections = systemConfig.connections as Array<Record<string, unknown>> | undefined;
      if (!Array.isArray(connections)) continue;

      for (const conn of connections) {
        const connType = conn[connectionType] as Record<string, unknown> | undefined;
        if (connType && paramName in connType) {
          const value = connType[paramName];
          return typeof value === 'string' ? value : String(value);
        }
      }
    }

    return undefined;
  }

  // ============================================================================
  // GENERIC PARAM ACCESS
  // ============================================================================

  /**
   * Get parameter for a system from ATP_ENVGENE_CONFIGURATION.
   * Structure: systems[].{systemName}.connections[].{connectionType}.{paramName}
   * 
   * @param systemName - Name of the system (e.g., 'CSRD', 'public-gateway', 'private-gateway')
   * @param connectionType - Connection type (e.g., 'HTTP', 'DB', 'SSH')
   * @param paramName - Parameter name (e.g., 'url', 'username', 'password')
   * @returns Parameter value
   * @throws Error if parameter not found in ATP_ENVGENE_CONFIGURATION
   * 
   * @example
   * const url = SettingsHelper.getEnvParam('CSRD', 'HTTP', 'url');
   * const host = SettingsHelper.getEnvParam('CSRD', 'DB', 'host');
   * const grantType = SettingsHelper.getEnvParam('public-gateway', 'HTTP', 'grant_type');
   */
  static getEnvParam(systemName: string, connectionType: string, paramName: string): string {
    const value = this.getEnvParamFromConfig(systemName, connectionType, paramName);
    if (value !== undefined) {
      return value;
    }

    throw new Error(
      `Parameter "${paramName}" not found for system "${systemName}" connection "${connectionType}".\n` +
      `Set ATP_ENVGENE_CONFIGURATION environment variable with:\n` +
      `{"systems": [{"${systemName}": {"connections": [{"${connectionType}": {"${paramName}": "value"}}]}}]}`
    );
  }

  /**
   * Get optional parameter (returns null if not found instead of throwing)
   * @param systemName - Name of the system
   * @param connectionType - Connection type
   * @param paramName - Parameter name
   * @returns Parameter value or null if not found
   */
  static getEnvParamOrNull(systemName: string, connectionType: string, paramName: string): string | null {
    try {
      return this.getEnvParam(systemName, connectionType, paramName);
    } catch {
      return null;
    }
  }

  // ============================================================================
  // APP SETTINGS
  // Structure: systems[].{systemName}.connections[].HTTP.{url|startPage}
  // ============================================================================

  /**
   * Get base URL for the application
   * @param systemName - Name of the system (e.g., 'CSRD')
   * @param connectionType - Connection type (default: 'HTTP')
   * @returns Full base URL
   */
  static getBaseUrl(systemName: string, connectionType: string = 'HTTP'): string {
    return this.getEnvParam(systemName, connectionType, 'url');
  }

  /**
   * Get full application URL including start page
   * @param systemName - Name of the system (e.g., 'CSRD')
   * @param connectionType - Connection type (default: 'HTTP')
   * @returns Complete URL with start page
   */
  static getFullUrl(systemName: string, connectionType: string = 'HTTP'): string {
    const url = this.getEnvParam(systemName, connectionType, 'url');
    const startPage = this.getEnvParamOrNull(systemName, connectionType, 'startPage') || '';
    
    if (startPage) {
      return url.endsWith('/') ? `${url}${startPage.substring(1)}` : `${url}${startPage}`;
    }
    return url;
  }


  // ============================================================================
  // CREDENTIALS
  // Structure: systems[].{systemName}.connections[].HTTP.{login|password}
  // Note: Configuration uses 'login', returned as 'username' in UserCredentials interface
  // ============================================================================

  /**
   * Get default user credentials
   * @param systemName - Name of the system (e.g., 'CSRD')
   * @param connectionType - Connection type (default: 'HTTP')
   * @returns UserCredentials object with username and password
   */
  static getDefaultCredentials(systemName: string, connectionType: string = 'HTTP'): UserCredentials {
    return {
      username: this.getEnvParam(systemName, connectionType, 'username'),
      password: this.getEnvParam(systemName, connectionType, 'password'),
    };
  }

  /**
   * Get specific user credentials by system name
   * @param systemName - Name of the system (e.g., 'CSRD', 'public-gateway')
   * @param connectionType - Connection type (e.g., 'HTTP', 'DB', 'SSH')
   * @returns UserCredentials object or null if not found
   */
  static getCredentials(systemName: string, connectionType: string): UserCredentials | null {
    const username = this.getEnvParamOrNull(systemName, connectionType, 'username');
    const password = this.getEnvParamOrNull(systemName, connectionType, 'password');

    if (!username || !password) {
      return null;
    }

    return { username, password };
  }

  // ============================================================================
  // DATABASE SETTINGS
  // Structure: systems[].{systemName}.connections[].DB.{type|host|port|database|username|password|...}
  // ============================================================================

  /**
   * Get database settings
   * @param systemName - Name of the database system (e.g., 'CSRD', 'public-gateway')
   * @param connectionType - Connection type (default: 'DB')
   * @returns DatabaseSettings object or null if not configured
   */
  static getDatabaseSettings(systemName: string, connectionType: string = 'DB'): DatabaseSettings | null {
    const host = this.getEnvParamOrNull(systemName, connectionType, 'host');
    if (!host) {
      return null;
    }

    return {
      type: (this.getEnvParamOrNull(systemName, connectionType, 'type') || '') as DatabaseSettings['type'],
      host,
      port: parseInt(this.getEnvParamOrNull(systemName, connectionType, 'port') || '', 10),
      database: this.getEnvParamOrNull(systemName, connectionType, 'database') || '',
      username: this.getEnvParamOrNull(systemName, connectionType, 'username') || '',
      password: this.getEnvParamOrNull(systemName, connectionType, 'password') || '',
      connectionTimeout: parseInt(this.getEnvParamOrNull(systemName, connectionType, 'connectionTimeout') || '10000', 10),
      queryTimeout: parseInt(this.getEnvParamOrNull(systemName, connectionType, 'queryTimeout') || '30000', 10),
      ssl: this.getEnvParamOrNull(systemName, connectionType, 'ssl') === 'true',
    };
  }

  // ============================================================================
  // API CONFIGURATION
  // Structure: systems[].{systemName}.connections[].HTTP.{url|clientId|clientSecret|scope|...}
  // Note: APIConfiguration contains base URL only - endpoints passed as parameters to APIHelper methods
  // ============================================================================

  /**
   * Get API configuration
   * @param systemName - Name of the API system (e.g., 'CSRD', 'public-gateway')
   * @param connectionType - Connection type (default: 'HTTP')
   * @returns APIConfiguration object
   */
  static getAPIConfiguration(systemName: string, connectionType: string = 'HTTP'): APIConfiguration {
    const url = this.getEnvParam(systemName, connectionType, 'url');
    
    const config: APIConfiguration = {
      url,
      ignoreHTTPSErrors: this.shouldIgnoreHTTPSErrors(systemName, connectionType),
      defaultHeaders: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
    };

    return config;
  }

  /**
   * Get OAuth configuration
   * @param systemName - Name of the system (e.g., 'CSRD', 'public-gateway')
   * @param connectionType - Connection type (default: 'HTTP')
   * @returns OAuthConfig object
   */
  static getOAuthConfig(systemName: string, connectionType: string = 'HTTP'): OAuthConfig {
    const url = this.getEnvParam(systemName, connectionType, 'url');
    const endpoint = this.getEnvParam(systemName, connectionType, 'tokenEndpoint');
    const grantType = this.getEnvParam(systemName, connectionType, 'grantType');


    const tokenEndpoint = `${url}${endpoint}`;
    const config: OAuthConfig = {
      tokenEndpoint,
      grantType,
    };

    // Add parameters only if they exist
    const clientId = this.getEnvParamOrNull(systemName, connectionType, 'clientId');
    if (clientId) config.clientId = clientId;

    const clientSecret = this.getEnvParamOrNull(systemName, connectionType, 'clientSecret');
    if (clientSecret) config.clientSecret = clientSecret;
    
    const scope = this.getEnvParamOrNull(systemName, connectionType, 'scope');
    if (scope) config.scope = scope;

    const username = this.getEnvParamOrNull(systemName, connectionType, 'username');
    if (username) config.username = username;

    const password = this.getEnvParamOrNull(systemName, connectionType, 'password');
    if (password) config.password = password;

    return config;
  }

  /**
   * Check if HTTPS errors should be ignored for API calls
   * @param systemName - Name of the system
   * @param connectionType - Connection type (default: 'HTTP')
   * @returns Boolean indicating whether to ignore HTTPS errors (default: false)
   */
  static shouldIgnoreHTTPSErrors(systemName: string, connectionType: string = 'HTTP'): boolean {
    const value = this.getEnvParamOrNull(systemName, connectionType, 'ignoreHTTPSErrors');
    if (value === null) return false;
    return value === 'true' || value === '1' || value === true.toString();
  }

  // ============================================================================
  // RELOAD METHODS
  // ============================================================================

  /**
   * Reload env configuration
   */
  static reloadEnvConfig(): void {
    this.envConfig = null;
    this.envConfigLoaded = false;
  }
}

export default SettingsHelper;
