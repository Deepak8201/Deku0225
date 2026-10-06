import * as fs from 'fs';
import {
  UserCredentials,
  DatabaseSettings,
  APIConfiguration,
  OAuthConfig,
  SSHSettings
} from './types';

/**
 * SettingsHelper - Shared utility for accessing environment settings
 *
 * @description
 * Provides centralized access to environment settings. Reads the generated environment-configuration.json
 * first (pipeline path, then local), and falls back to the ATP_ENVGENE_CONFIGURATION environment variable.
 * Structure: systems[].{systemName}.connections[].{connectionType}.{paramName}
 *
 * @usage
 * ```typescript
 * import { SettingsHelper } from 'SharedRuntime/SettingsHelper';
 *
 * const baseUrl = SettingsHelper.getBaseUrl('systemName');
 * const credentials = SettingsHelper.getDefaultCredentials('systemName');
 * const apiConfig = SettingsHelper.getAPIConfiguration('systemName');
 * const ssh = SettingsHelper.getSSHSettings('TOMS');
 * ```
 */

export class SettingsHelper {

  // ============================================================================
  // ENV CONFIGURATION
  // Structure: { systems: [{ systemName: { connections: [{ connectionType: { param: value } }] } }] }
  // ============================================================================

  private static envConfig: Record<string, unknown> | null = null;
  private static envConfigLoaded = false;
  private static envConfigError: string | null = null;
  private static envConfigSource: string | null = null;
  private static readonly ENV_VAR_NAME = 'ATP_ENVGENE_CONFIGURATION';
  private static readonly CONFIG_PATH_PIPELINE = '/tmp/clone/environment-configuration.json';
  private static readonly CONFIG_PATH_LOCAL =
    'environment-configuration/local-environment-configuration/environment-configuration.json';

  /** The config is generated, so a missing parameter is fixed in the template + yaml, not in the config file. */
  private static readonly REGENERATE_HINT =
    'Locally: add it to the template in environment-configuration/ plus your ' +
    'local-environment-configuration/env-<name>.yaml, then re-run setEnvironmentScript.ps1.';

  /**
   * Get the parsed environment configuration.
   * Resolved in priority order: pipeline file, local file, then the deprecated
   * ATP_ENVGENE_CONFIGURATION variable. The first available source wins.
   * @returns Parsed JSON object or null if no source is available/valid
   */
  static getEnvConfig(): Record<string, unknown> | null {
    if (this.envConfigLoaded) {
      return this.envConfig;
    }

    // Priority 1 & 2: file-based configs (pipeline, then local)
    for (const filePath of [this.CONFIG_PATH_PIPELINE, this.CONFIG_PATH_LOCAL]) {
      if (fs.existsSync(filePath)) {
        try {
          const content = fs.readFileSync(filePath, 'utf-8').replace(/^\uFEFF/, '');
          return this.parseConfigFrom(filePath, content);
        } catch (e) {
          this.envConfigError = `Failed to read ${filePath}: ${(e as Error).message}`;
          return null;
        }
      }
    }

    // Priority 3: ATP_ENVGENE_CONFIGURATION (backward compatibility)
    const envValue = process.env[this.ENV_VAR_NAME];
    if (!envValue || envValue.trim() === '') {
      this.envConfigLoaded = true;
      return null;
    }
    return this.parseConfigFrom(this.ENV_VAR_NAME, envValue);
  }

  private static parseConfigFrom(source: string, jsonString: string): Record<string, unknown> | null {
    try {
      this.envConfig = JSON.parse(jsonString) as Record<string, unknown>;
      this.envConfigLoaded = true;
      this.envConfigError = null;
      this.envConfigSource = source;
      console.log(`[SettingsHelper] Environment configuration parsed from ${source}`);
      return this.envConfig;
    } catch (e) {
      this.envConfigError = `Failed to parse config from ${source}: ${(e as Error).message}`;
      return null;
    }
  }

  /**
   * Get parameter from the resolved environment configuration
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
   * Get parameter for a system from the environment configuration.
   * Structure: systems[].{systemName}.connections[].{connectionType}.{paramName}
   * 
   * @param systemName - Name of the system (e.g., 'CSRD', 'public-gateway', 'private-gateway')
   * @param connectionType - Connection type (e.g., 'HTTP', 'DB', 'SSH')
   * @param paramName - Parameter name (e.g., 'url', 'username', 'password')
   * @returns Parameter value
   * @throws Error if parameter not found in the environment configuration
   * 
   * @example
   * const url = SettingsHelper.getEnvParam('CSRD', 'HTTP', 'url');
   * const host = SettingsHelper.getEnvParam('CSRD', 'DB', 'host');
   * const grantType = SettingsHelper.getEnvParam('public-gateway', 'HTTP', 'grant_type');
   */
  static getEnvParam(systemName: string, connectionType: string, paramName: string): string {
    const envConfig = this.getEnvConfig();
    if (this.envConfigError) {
      throw new Error(`[SettingsHelper] ${this.envConfigError}`);
    }
    if (!envConfig) {
      throw new Error(
        `[SettingsHelper] No environment configuration found. ` +
        `Checked: ${this.CONFIG_PATH_PIPELINE}, ${this.CONFIG_PATH_LOCAL}, ${this.ENV_VAR_NAME}.`
      );
    }

    const value = this.getEnvParamFromConfig(systemName, connectionType, paramName);
    if (value !== undefined) {
      return value;
    }

    throw new Error(
      `Parameter "${paramName}" not found for system "${systemName}" connection "${connectionType}".\n` +
      `Active environment configuration: ${this.envConfigSource}.\n` +
      `Add the parameter there:\n` +
      `{"systems": [{"${systemName}": {"connections": [{"${connectionType}": {"${paramName}": "value"}}]}}]}\n` +
      this.REGENERATE_HINT
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
    const username = 
      this.getEnvParamOrNull(systemName, connectionType, 'username') ??
      this.getEnvParamOrNull(systemName, connectionType, 'login');
    
    if (!username) {
      throw new Error(
        `Username not found for system "${systemName}" connection "${connectionType}".\n` +
        `Active environment configuration: ${this.envConfigSource}.\n` +
        `It must provide one of: "username", "login".\n` +
        this.REGENERATE_HINT
      );
    }

    const password = this.getEnvParam(systemName, connectionType, 'password');

    return {
      username,
      password
    };
  }

  /**
   * Get specific user credentials by system name
   * @param systemName - Name of the system (e.g., 'CSRD', 'public-gateway')
   * @param connectionType - Connection type (e.g., 'HTTP', 'DB', 'SSH')
   * @returns UserCredentials object or null if not found
   */
  static getCredentials(systemName: string, connectionType: string): UserCredentials | null {
    const username = 
    this.getEnvParamOrNull(systemName, connectionType, 'username') ??
    this.getEnvParamOrNull(systemName, connectionType, 'login');
    
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
   * Get database settings. Supports `host` / `db_host`, `type` / `db_type`,
   * `port` / `db_port`, `database` / `db_name`, `username` / `db_login`,
   * `password` / `db_password`.
   * @param systemName - Name of the database system (e.g., 'CSRD', 'public-gateway')
   * @param connectionType - Connection type (default: 'DB')
   * @returns DatabaseSettings object or null if not configured
   */
  static getDatabaseSettings(systemName: string, connectionType: string = 'DB'): DatabaseSettings | null {
    const pick = (a: string, b: string): string | null =>
      this.getEnvParamOrNull(systemName, connectionType, a) ??
      this.getEnvParamOrNull(systemName, connectionType, b);

    const host = pick('host', 'db_host');
    if (!host) {
      return null;
    }

    const type = pick('type', 'db_type') || '';
    const port = parseInt(pick('port', 'db_port') || '', 10);
    const database = pick('database', 'db_name') || '';
    const username = pick('username', 'db_login') || '';
    const password = pick('password', 'db_password') || '';

    return {
      type: type as DatabaseSettings['type'],
      host,
      port,
      database,
      username,
      password,
      connectionTimeout: parseInt(this.getEnvParamOrNull(systemName, connectionType, 'connectionTimeout') || '10000', 10),
      queryTimeout: parseInt(this.getEnvParamOrNull(systemName, connectionType, 'queryTimeout') || '30000', 10),
      ssl: this.getEnvParamOrNull(systemName, connectionType, 'ssl') === 'true',
    };
  }

  // ============================================================================
  // SSH SETTINGS
  // systems[].{systemName}.connections[].SSH.{ ssh_host|host, ssh_login|username, ... }
  // ============================================================================

  /**
   * Resolve SSH settings. Supports `ssh_host` / `host`, `ssh_login` / `username`,
   * `ssh_password` / `password`, `ssh_working_dir` / `workingDirectory`, `ssh_key` / `identityFilePath`, `ssh_port` / `port`, `sshBinary` / `clientBinary`, `sshpassBinary` / `passwordAuthBinary`.
   */
  static getSSHSettings(systemName: string, connectionType: string = 'SSH'): SSHSettings | null {
    const pick = (a: string, b: string): string | null =>
      this.getEnvParamOrNull(systemName, connectionType, a) ??
      this.getEnvParamOrNull(systemName, connectionType, b);

    const host = pick('ssh_host', 'host');
    const username = pick('ssh_login', 'username');
    if (!host || !username) {
      return null;
    }

    const portRaw = pick('ssh_port', 'port');
    const portParsed = portRaw ? parseInt(portRaw, 10) : 22;
    const port = Number.isFinite(portParsed) && portParsed > 0 ? portParsed : 22;

    const password =
      this.getEnvParamOrNull(systemName, connectionType, 'ssh_password') ??
      this.getEnvParamOrNull(systemName, connectionType, 'password');

    const workingDirectory =
      this.getEnvParamOrNull(systemName, connectionType, 'workingDirectory') ??
      this.getEnvParamOrNull(systemName, connectionType, 'ssh_working_dir') ??
      undefined;

    const identityRaw =
      this.getEnvParamOrNull(systemName, connectionType, 'identityFilePath') ??
      this.getEnvParamOrNull(systemName, connectionType, 'ssh_key');
    const identityFilePath =
      identityRaw !== null && identityRaw.trim() !== '' ? identityRaw : undefined;

    const passphraseRaw = this.getEnvParamOrNull(systemName, connectionType, 'passphrase');
    const passphrase =
      passphraseRaw !== null && passphraseRaw.trim() !== '' ? passphraseRaw : undefined;

    const connectRaw = this.getEnvParamOrNull(systemName, connectionType, 'connectTimeoutSeconds');
    const connectParsed = connectRaw ? parseInt(connectRaw, 10) : undefined;
    const connectTimeoutSeconds =
      connectParsed !== undefined && Number.isFinite(connectParsed) ? connectParsed : undefined;

    const cmdTimeoutRaw = this.getEnvParamOrNull(systemName, connectionType, 'commandTimeoutMs');
    const cmdParsed = cmdTimeoutRaw ? parseInt(cmdTimeoutRaw, 10) : undefined;
    const commandTimeoutMs =
      cmdParsed !== undefined && Number.isFinite(cmdParsed) ? cmdParsed : undefined;

    const strictRaw = this.getEnvParamOrNull(systemName, connectionType, 'strictHostKeyChecking');
    let strictHostKeyChecking: boolean | undefined;
    if (strictRaw === 'false' || strictRaw === '0') {
      strictHostKeyChecking = false;
    } else if (strictRaw === 'true' || strictRaw === '1') {
      strictHostKeyChecking = true;
    }

    const sshBinary =
      this.getEnvParamOrNull(systemName, connectionType, 'clientBinary');
    
      const sshpassBinary =
      this.getEnvParamOrNull(systemName, connectionType, 'passwordAuthBinary');

    const settings: SSHSettings = {
      host,
      port,
      username,
    };

    if (password !== null && password !== '') {
      settings.password = password;
    }
    if (workingDirectory !== undefined) {
      settings.workingDirectory = workingDirectory;
    }
    if (identityFilePath !== undefined) {
      settings.identityFilePath = identityFilePath;
    }
    if (passphrase !== undefined) {
      settings.passphrase = passphrase;
    }
    if (connectTimeoutSeconds !== undefined) {
      settings.connectTimeoutSeconds = connectTimeoutSeconds;
    }
    if (commandTimeoutMs !== undefined) {
      settings.commandTimeoutMs = commandTimeoutMs;
    }
    if (strictHostKeyChecking !== undefined) {
      settings.strictHostKeyChecking = strictHostKeyChecking;
    }
    if (sshBinary) {
      settings.sshBinary = sshBinary;
    }
    if (sshpassBinary) {
      settings.sshpassBinary = sshpassBinary;
    }

    return settings;
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
    this.envConfigError = null;
    this.envConfigSource = null;
  }
}

export default SettingsHelper;
