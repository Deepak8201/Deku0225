import { DatabaseSettings } from './types';
import { TestLogger } from './TestLogger';

/**
 * Query result interface
 */
export interface QueryResult {
  rows: unknown[];
  rowCount?: number | undefined;
  affectedRows?: number | undefined;
  insertId?: number | string | undefined;
}

/**
 * Database Adapter Interface
 * Implement this interface to add support for new database types
 * 
 * @example
 * // To add a new database type:
 * // 1. Create a class implementing DatabaseAdapter
 * // 2. Register it: DatabaseAdapterRegistry.register('newdb', new NewDbAdapter());
 */
export interface DatabaseAdapter {
  /** Database type identifier */
  readonly type: string;
  
  /** Create connection to database */
  connect(settings: DatabaseSettings): Promise<unknown>;
  
  /** Execute query and return results */
  executeQuery(connection: unknown, query: string, params: unknown[]): Promise<QueryResult>;
  
  /** Get inserted ID from result (for INSERT queries) */
  getInsertedId(result: QueryResult): number | string | null;
  
  /** Close connection */
  close(connection: unknown): Promise<void>;
}

// ============================================================================
// MYSQL ADAPTER
// ============================================================================

export class MySQLAdapter implements DatabaseAdapter {
  readonly type = 'mysql';

  async connect(settings: DatabaseSettings): Promise<unknown> {
    const mysqlModule = await import('mysql2/promise');
    const mysql = mysqlModule.default || mysqlModule;
    return await mysql.createConnection({
      host: settings.host,
      port: settings.port,
      database: settings.database,
      user: settings.username,
      password: settings.password,
      connectTimeout: settings.connectionTimeout || 10000,
      // Return BIGINT columns as strings to preserve precision beyond Number.MAX_SAFE_INTEGER
      supportBigNumbers: true,
      bigNumberStrings: true,
      ...settings.options,
    });
  }

  async executeQuery(connection: unknown, query: string, params: unknown[]): Promise<QueryResult> {
    const mysqlConnection = connection as { execute: (q: string, p: unknown[]) => Promise<[unknown[], unknown]> };
    const [rows] = await mysqlConnection.execute(query, params);
    return {
      rows: Array.isArray(rows) ? rows : [],
      affectedRows: (rows as { affectedRows?: number }).affectedRows,
      insertId: (rows as { insertId?: number }).insertId,
    };
  }

  getInsertedId(result: QueryResult): number | string | null {
    return result.insertId ?? null;
  }

  async close(connection: unknown): Promise<void> {
    await (connection as { end: () => Promise<void> }).end();
  }
}

// ============================================================================
// POSTGRESQL ADAPTER
// ============================================================================

export class PostgreSQLAdapter implements DatabaseAdapter {
  readonly type = 'postgresql';

  async connect(settings: DatabaseSettings): Promise<unknown> {
    const pgModule = await import('pg');
    const pg = pgModule.default || pgModule;
    const Client = pg.Client || pgModule.Client;
    
    const client = new Client({
      host: settings.host,
      port: settings.port,
      database: settings.database,
      user: settings.username,
      password: settings.password,
      connectionTimeoutMillis: settings.connectionTimeout || 10000,
      ...settings.options,
    });
    await client.connect();
    return client;
  }

  async executeQuery(connection: unknown, query: string, params: unknown[]): Promise<QueryResult> {
    const pgClient = connection as { query: (q: string, p: unknown[]) => Promise<{ rows: unknown[]; rowCount: number }> };
    const queryResult = await pgClient.query(query, params);
    return {
      rows: queryResult.rows || [],
      rowCount: queryResult.rowCount,
    };
  }

  getInsertedId(result: QueryResult): number | string | null {
    // PostgreSQL returns inserted row via RETURNING clause
    const insertedRow = result.rows[0] as { id?: number | string } | undefined;
    return insertedRow?.id ?? null;
  }

  async close(connection: unknown): Promise<void> {
    await (connection as { end: () => Promise<void> }).end();
  }
}

// ============================================================================
// MSSQL ADAPTER
// ============================================================================

export class MSSQLAdapter implements DatabaseAdapter {
  readonly type = 'mssql';

  async connect(settings: DatabaseSettings): Promise<unknown> {
    const sqlModule = await import('mssql');
    const sql = sqlModule.default || sqlModule;
    const pool = new sql.ConnectionPool({
      server: settings.host,
      port: settings.port,
      database: settings.database,
      user: settings.username,
      password: settings.password,
      connectionTimeout: settings.connectionTimeout || 10000,
      options: {
        encrypt: settings.ssl || false,
        ...settings.options,
      },
    });
    await pool.connect();
    return pool;
  }

  async executeQuery(connection: unknown, query: string, params: unknown[]): Promise<QueryResult> {
    const sqlPool = connection as { request: () => { input: (name: string, value: unknown) => void; query: (q: string) => Promise<{ recordset: unknown[]; rowsAffected: number[] }> } };
    const request = sqlPool.request();
    
    // Bind parameters
    params.forEach((param, index) => {
      request.input(`param${index}`, param);
    });
    
    // Replace ? with @param0, @param1, etc.
    let mssqlQuery = query;
    params.forEach((_, index) => {
      mssqlQuery = mssqlQuery.replace('?', `@param${index}`);
    });
    
    const queryResult = await request.query(mssqlQuery);
    return {
      rows: queryResult.recordset || [],
      rowCount: queryResult.rowsAffected?.[0] || 0,
    };
  }

  getInsertedId(result: QueryResult): number | string | null {
    // SQL Server uses SCOPE_IDENTITY() or OUTPUT clause
    const insertedRow = result.rows[0] as { id?: number | string } | undefined;
    return insertedRow?.id ?? null;
  }

  async close(connection: unknown): Promise<void> {
    await (connection as { close: () => Promise<void> }).close();
  }
}

// ============================================================================
// MONGODB ADAPTER
// ============================================================================

export class MongoDBAdapter implements DatabaseAdapter {
  readonly type = 'mongodb';
  private database: string = '';

  async connect(settings: DatabaseSettings): Promise<unknown> {
    const mongoModule = await import('mongodb');
    const mongodb = mongoModule.default || mongoModule;
    const MongoClient = mongodb.MongoClient || mongoModule.MongoClient;
    
    const uri = `mongodb://${settings.username}:${encodeURIComponent(settings.password)}@${settings.host}:${settings.port}/${settings.database}`;
    const client = new MongoClient(uri, {
      connectTimeoutMS: settings.connectionTimeout || 10000,
      ...settings.options,
    });
    await client.connect();
    this.database = settings.database;
    return client;
  }

  async executeQuery(connection: unknown, query: string, params: unknown[]): Promise<QueryResult> {
    const mongoClient = connection as { db: (name: string) => { command: (cmd: unknown) => Promise<{ result?: unknown[] }> } };
    const db = mongoClient.db(this.database);
    
    // Parse MongoDB query
    let command: Record<string, unknown>;
    try {
      command = JSON.parse(query);
    } catch {
      command = { find: query, params };
    }
    
    const queryResult = await db.command(command);
    return {
      rows: queryResult.result || [],
    };
  }

  getInsertedId(result: QueryResult): number | string | null {
    return null; // MongoDB uses _id which is typically ObjectId
  }

  async close(connection: unknown): Promise<void> {
    await (connection as { close: () => Promise<void> }).close();
  }
}

// ============================================================================
// ORACLE ADAPTER
// ============================================================================

export class OracleAdapter implements DatabaseAdapter {
  readonly type = 'oracle';

  async connect(settings: DatabaseSettings): Promise<unknown> {
    const oracledbModule = await import('oracledb');
    // Handle both ESM and CommonJS module formats
    const oracledb = oracledbModule.default || oracledbModule;
    
    // Oracle uses connectString format: host:port/service_name or host:port/SID
    const connectString = (settings.options?.connectString as string) || 
      `${settings.host}:${settings.port}/${settings.database}`;
    
    const connectionConfig: Record<string, unknown> = {
      user: settings.username,
      password: settings.password,
      connectString: connectString,
    };
    
    // Add other valid Oracle options if provided
    if (settings.options) {
      const validOracleOptions = ['externalAuth', 'privilege', 'stmtCacheSize', 'tag'];
      for (const [key, value] of Object.entries(settings.options)) {
        if (key !== 'connectString' && validOracleOptions.includes(key)) {
          connectionConfig[key] = value;
        }
      }
    }
    
    return await oracledb.getConnection(connectionConfig);
  }

  async executeQuery(connection: unknown, query: string, params: unknown[]): Promise<QueryResult> {
    const oracledbModule = await import('oracledb');
    // Handle both ESM and CommonJS module formats
    const oracledb = oracledbModule.default || oracledbModule;
    
    const oracleConnection = connection as { execute: (q: string, p: unknown[], opts: unknown) => Promise<{ rows?: unknown[]; rowsAffected?: number }> };

    // fetchTypeHandler (oracledb ≥ 5.1) returns NUMBER columns as strings,
    // preventing precision loss for values exceeding Number.MAX_SAFE_INTEGER.
    const fetchTypeHandler = (oracledb.DB_TYPE_NUMBER !== undefined)
      ? (metaData: { dbType: unknown }) => {
          if (metaData.dbType === oracledb.DB_TYPE_NUMBER) {
            return { type: oracledb.STRING };
          }
          return undefined;
        }
      : undefined;

    const queryResult = await oracleConnection.execute(query, params, {
      outFormat: oracledb.OUT_FORMAT_OBJECT,
      autoCommit: true,
      ...(fetchTypeHandler ? { fetchTypeHandler } : {}),
    });
    
    return {
      rows: queryResult.rows || [],
      rowCount: queryResult.rowsAffected || 0,
    };
  }

  getInsertedId(result: QueryResult): number | string | null {
    return null; // Oracle typically uses RETURNING clause
  }

  async close(connection: unknown): Promise<void> {
    await (connection as { close: () => Promise<void> }).close();
  }
}

// ============================================================================
// ADAPTER REGISTRY
// ============================================================================

/**
 * Database Adapter Registry
 * Use this to register custom database adapters
 * 
 * @example
 * // Register a custom adapter
 * DatabaseAdapterRegistry.register('customdb', new CustomDbAdapter());
 * 
 * // Get adapter by type
 * const adapter = DatabaseAdapterRegistry.get('mysql');
 */
export class DatabaseAdapterRegistry {
  private static adapters: Map<string, DatabaseAdapter> = new Map();
  private static initialized = false;

  /**
   * Initialize default adapters
   */
  private static initDefaults(): void {
    if (this.initialized) return;
    
    this.register('mysql', new MySQLAdapter());
    this.register('postgresql', new PostgreSQLAdapter());
    this.register('mssql', new MSSQLAdapter());
    this.register('mongodb', new MongoDBAdapter());
    this.register('oracle', new OracleAdapter());
    
    this.initialized = true;
  }

  /**
   * Register a database adapter
   * @param type - Database type identifier
   * @param adapter - Adapter instance
   */
  static register(type: string, adapter: DatabaseAdapter): void {
    this.adapters.set(type, adapter);
    TestLogger.info(`Registered database adapter: ${type}`);
  }

  /**
   * Get adapter by database type
   * @param type - Database type
   * @returns DatabaseAdapter or throws error if not found
   */
  static get(type: string): DatabaseAdapter {
    this.initDefaults();
    
    const adapter = this.adapters.get(type);
    if (!adapter) {
      const available = Array.from(this.adapters.keys()).join(', ');
      throw new Error(
        `Unsupported database type: "${type}". ` +
        `Available types: ${available}. ` +
        `To add support for "${type}", implement DatabaseAdapter interface and register it.`
      );
    }
    return adapter;
  }

  /**
   * Check if adapter is registered
   * @param type - Database type
   */
  static has(type: string): boolean {
    this.initDefaults();
    return this.adapters.has(type);
  }

  /**
   * Get all registered adapter types
   */
  static getRegisteredTypes(): string[] {
    this.initDefaults();
    return Array.from(this.adapters.keys());
  }
}

export default DatabaseAdapterRegistry;