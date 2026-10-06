/**
 * ApiSession — reusable bootstrap for API test scenarios.
 *
 * Owns the invariant APIHelper lifecycle so test scenarios stay clean and never
 * import APIHelper or hand-roll OAuth:
 *   - `new APIHelper()` → `initialize()` → resolve base URL → authenticate → expose { api, baseUrl }
 *   - `dispose()` tears down the Playwright request context.
 *
 * The variable part (auth) is pluggable via {@link AuthMode}:
 *   - `passwordGrant`      — Keycloak resource-owner password grant (default; creds from SettingsHelper).
 *   - `clientCredentials`  — OAuth client-credentials (config from SettingsHelper.getOAuthConfig).
 *   - `custom`             — escape hatch: caller supplies an authenticate callback.
 *   - `none`              — no authentication (public API).
 *
 * Business workflows receive `session.api` and `session.baseUrl` by constructor injection;
 * they never create, initialize, authenticate, or dispose the helper.
 */

import { APIHelper } from './APIHelper';
import { SettingsHelper } from './SettingsHelper';

/** Default Keycloak realm token path appended to the system base URL when no explicit endpoint is given. */
const DEFAULT_TOKEN_PATH = '/auth/realms/default/protocol/openid-connect/token';
/** Default public client id used by the resource-owner password grant. */
const DEFAULT_PASSWORD_CLIENT_ID = 'frontend';

export type AuthMode =
  | {
      kind: 'passwordGrant';
      /** Full token endpoint URL. Default: `${baseUrl}${DEFAULT_TOKEN_PATH}`. */
      tokenEndpoint?: string;
      /** OAuth client id. Default: `frontend`. */
      clientId?: string;
      /** Optional client secret / scope for confidential clients. */
      clientSecret?: string;
      scope?: string;
    }
  | {
      kind: 'clientCredentials';
      /** Full token endpoint URL. Default: taken from `SettingsHelper.getOAuthConfig(system)`. */
      tokenEndpoint?: string;
      scope?: string;
    }
  | {
      kind: 'custom';
      /** Perform any custom authentication against the ready-initialized helper. */
      authenticate: (api: APIHelper, baseUrl: string) => Promise<void>;
    }
  | { kind: 'none' };

export interface ApiSessionCreateOptions {
  /** Connection type in the environment configuration (default: 'HTTP'). */
  connectionType?: string;
}

/**
 * A ready-to-use, authenticated API session: an initialized {@link APIHelper} plus the resolved base URL.
 */
export class ApiSession {
  private constructor(
    public readonly api: APIHelper,
    public readonly baseUrl: string,
  ) {}

  /**
   * Create and authenticate a session for the given system.
   *
   * @param systemName - System key in the environment configuration (e.g. 'public-gateway').
   * @param auth - Authentication mode (default: resource-owner password grant).
   * @param options - Optional connection type override.
   */
  static async create(
    systemName: string,
    auth: AuthMode = { kind: 'passwordGrant' },
    options: ApiSessionCreateOptions = {},
  ): Promise<ApiSession> {
    const connectionType = options.connectionType ?? 'HTTP';
    const api = new APIHelper();
    await api.initialize();

    const { url } = SettingsHelper.getAPIConfiguration(systemName, connectionType);
    const baseUrl = url.replace(/\/$/, '');

    await ApiSession.authenticate(api, baseUrl, systemName, connectionType, auth);

    return new ApiSession(api, baseUrl);
  }

  private static async authenticate(
    api: APIHelper,
    baseUrl: string,
    systemName: string,
    connectionType: string,
    auth: AuthMode,
  ): Promise<void> {
    switch (auth.kind) {
      case 'none':
        return;

      case 'custom':
        await auth.authenticate(api, baseUrl);
        return;

      case 'passwordGrant': {
        const creds = SettingsHelper.getDefaultCredentials(systemName, connectionType);
        const tokenEndpoint = auth.tokenEndpoint ?? `${baseUrl}${DEFAULT_TOKEN_PATH}`;
        await api.getOAuthTokenPasswordGrant(
          tokenEndpoint,
          creds.username,
          creds.password,
          auth.clientId ?? DEFAULT_PASSWORD_CLIENT_ID,
          auth.clientSecret,
          auth.scope,
        );
        return;
      }

      case 'clientCredentials': {
        const oauth = SettingsHelper.getOAuthConfig(systemName, connectionType);
        const tokenEndpoint = auth.tokenEndpoint ?? oauth.tokenEndpoint;
        await api.getOAuthToken(
          tokenEndpoint,
          oauth.clientId ?? '',
          oauth.clientSecret ?? '',
          auth.scope ?? oauth.scope ?? '',
        );
        return;
      }
    }
  }

  /** Dispose the underlying Playwright request context. Call in a `finally` block. */
  async dispose(): Promise<void> {
    await this.api.dispose();
  }
}
