import { DatabaseSettings } from './types';
import { SettingsHelper } from './SettingsHelper';
import { TestLogger } from './TestLogger';
import { DatabaseAdapterRegistry, QueryResult } from './DatabaseAdapters';

// Re-export for backward compatibility
export { QueryResult } from './DatabaseAdapters';

/**
 * DatabaseHelper - Utility for executing SQL queries during test runs
 *
 * @description
 * Provides utilities for connecting to databases and executing SQL queries
 * during test execution. Uses extensible adapter pattern for database support.
 * 
 * **Supported database types:** mysql, postgresql, mssql, mongodb, oracle
 * 
 * **Adding new database support:**
 * ```typescript
 * import { DatabaseAdapter, DatabaseAdapterRegistry } from 'Engine/Shared/DatabaseAdapters';
 * 
 * class MyCustomAdapter implements DatabaseAdapter {
 *   readonly type = 'customdb';
 *   // ... implement interface methods
 * }
 * 
 * DatabaseAdapterRegistry.register('customdb', new MyCustomAdapter());
 * ```
 *
 * @usage
 * ```typescript
 * import { DatabaseHelper } from 'Engine/Shared/DatabaseHelper';
 *
 * // Execute a SELECT query
 * const results = await DatabaseHelper.executeQuery(
 *   'SELECT * FROM customers WHERE id = ?',
 *   [customerId]
 * );
 *
 * // Execute an INSERT query
 * const insertId = await DatabaseHelper.executeInsert(
 *   'INSERT INTO customers (name, email) VALUES (?, ?)',
 *   ['John Doe', 'john@example.com']
 * );
 *
 * // Close connection when done
 * await DatabaseHelper.closeConnection();
 * ```
 *
 * @author AI Test Automation Framework
 * @version 2.0.0
 * @since 2025
 */

interface ConnectionInfo {
  connection: unknown;
  type: string;
}

export class DatabaseHelper {
  private static connections: Map<string, ConnectionInfo> = new Map();

  /**
   * Get database settings from configuration
   * @param systemName - Name of the database system
   * @returns DatabaseSettings object
   * @throws Error if database settings are not configured
   */
  static getDatabaseSettings(systemName: string): DatabaseSettings {
    const dbSettings = SettingsHelper.getDatabaseSettings(systemName);
    if (!dbSettings) {
      throw new Error(
        `Database settings for "${systemName}" not found. ` +
        `Configure ATP_ENVGENE_CONFIGURATION with system "${systemName}" and connection type "DB"`
      );
    }
    return dbSettings;
  }

  /**
   * Create database connection using adapter pattern
   * @param dbSettings - Database settings
   * @returns Database connection object
   * @private
   */
  private static async createConnection(dbSettings: DatabaseSettings): Promise<unknown> {
    const connectionKey = `${dbSettings.type}_${dbSettings.host}_${dbSettings.database}`;

    // Return existing connection if available
    const existing = this.connections.get(connectionKey);
    if (existing) {
      return existing.connection;
    }

    TestLogger.info(`Creating database connection: ${dbSettings.type}://${dbSettings.host}:${dbSettings.port}/${dbSettings.database}`);

    try {
      const adapter = DatabaseAdapterRegistry.get(dbSettings.type);
      const connection = await adapter.connect(dbSettings);

      this.connections.set(connectionKey, {
        connection,
        type: dbSettings.type,
      });

      TestLogger.info(`Database connection established successfully`);
      return connection;
    } catch (error) {
      TestLogger.warn(`Error creating database connection: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  /**
   * Execute SQL query
   * @param query - SQL query string (supports parameterized queries with ? or $1 placeholders)
   * @param params - Query parameters (optional)
   * @param systemName - Name of the database system
   * @returns QueryResult with rows and metadata
   */
  static async executeQuery(
    query: string,
    params: unknown[] = [],
    systemName: string 
  ): Promise<QueryResult> {
    return await TestLogger.pageStep(`Executing SQL query: ${query.substring(0, 50)}...`, async () => {
      const dbSettings = this.getDatabaseSettings(systemName);
      const connection = await this.createConnection(dbSettings);
      const adapter = DatabaseAdapterRegistry.get(dbSettings.type);

      try {
        TestLogger.info(`Executing query: ${query}`);
        if (params.length > 0) {
          TestLogger.info(`Parameters: ${JSON.stringify(params)}`);
        }

        const result = await adapter.executeQuery(connection, query, params);

        TestLogger.info(`Query executed successfully. Rows found: ${result.rows.length}`);
        return result;
      } catch (error) {
        TestLogger.warn(`Error executing query: ${error instanceof Error ? error.message : String(error)}`);
        throw new Error(
          `Database query failed: ${error instanceof Error ? error.message : String(error)}\nQuery: ${query}`
        );
      }
    });
  }

  /**
   * Execute INSERT query and return inserted ID
   * @param query - INSERT SQL query
   * @param params - Query parameters
   * @param systemName - Name of the database system
   * @returns Inserted ID or null
   */
  static async executeInsert(
    query: string,
    params: unknown[] = [],
    systemName: string 
  ): Promise<number | string | null> {
    const dbSettings = this.getDatabaseSettings(systemName);
    const adapter = DatabaseAdapterRegistry.get(dbSettings.type);
    const result = await this.executeQuery(query, params, systemName);

    return adapter.getInsertedId(result);
  }

  /**
   * Extract customer ID from API response
   * @param response - Response object from API call (can be Response, JSON object, or string)
   * @param fieldName - Field name containing customer ID (default: 'customerId' or 'id')
   * @returns Customer ID or null
   */
  static async getCustomerIdFromResponse(
    response: Response | Record<string, unknown> | string,
    fieldName: string = 'customerId'
  ): Promise<string | number | null> {
    return await TestLogger.pageStep(`Extracting customer ID from response`, async () => {
      let data: Record<string, unknown>;

      if (response instanceof Response) {
        data = await response.json();
      } else if (typeof response === 'string') {
        data = JSON.parse(response);
      } else {
        data = response;
      }

      // Try different field names
      const possibleFields = [fieldName, 'customerId', 'customer_id', 'id', 'customer.id'];
      
      for (const field of possibleFields) {
        if (field.includes('.')) {
          const parts = field.split('.');
          let value: unknown = data;
          for (const part of parts) {
            if (value && typeof value === 'object' && part in value) {
              value = (value as Record<string, unknown>)[part];
            } else {
              value = null;
              break;
            }
          }
          if (value !== null && value !== undefined) {
            TestLogger.info(`Found customer ID: ${value} (field: ${field})`);
            return value as string | number;
          }
        } else {
          if (field in data && data[field] !== null && data[field] !== undefined) {
            TestLogger.info(`Found customer ID: ${data[field]} (field: ${field})`);
            return data[field] as string | number;
          }
        }
      }

      TestLogger.warn(`Customer ID not found in response. Available fields: ${Object.keys(data).join(', ')}`);
      return null;
    });
  }

  /**
   * Close database connection
   * @param systemName - Name of the database system
   */
  static async closeConnection(systemName: string): Promise<void> {
    const dbSettings = this.getDatabaseSettings(systemName);
    const connectionKey = `${dbSettings.type}_${dbSettings.host}_${dbSettings.database}`;
    const connectionInfo = this.connections.get(connectionKey);

    if (!connectionInfo) {
      return;
    }

    try {
      TestLogger.info(`Closing database connection: ${connectionKey}`);

      const adapter = DatabaseAdapterRegistry.get(connectionInfo.type);
      await adapter.close(connectionInfo.connection);

      this.connections.delete(connectionKey);
      TestLogger.info(`Database connection closed`);
    } catch (error) {
      TestLogger.warn(`Error closing connection: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Close all database connections
   */
  static async closeAllConnections(): Promise<void> {
    const connectionKeys = Array.from(this.connections.keys());
    TestLogger.info(`Closing all database connections (${connectionKeys.length} connections)`);
    
    for (const key of connectionKeys) {
      const connectionInfo = this.connections.get(key);
      if (!connectionInfo) continue;

      try {
        const adapter = DatabaseAdapterRegistry.get(connectionInfo.type);
        await adapter.close(connectionInfo.connection);
        
        this.connections.delete(key);
        TestLogger.info(`Connection ${key} closed`);
      } catch (error) {
        TestLogger.warn(`Error closing connection ${key}: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
    
    TestLogger.info('All database connections closed');
  }

  /**
   * Get list of supported database types
   * @returns Array of supported database type names
   */
  static getSupportedTypes(): string[] {
    return DatabaseAdapterRegistry.getRegisteredTypes();
  }
}

export default DatabaseHelper;
