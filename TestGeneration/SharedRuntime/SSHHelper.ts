/**
 * SSHHelper — non-interactive remote shell.
 * Password + no identity file: `ssh2` (works on Windows and Linux without `sshpass`).
 * Key-based or explicit override: OpenSSH (`ssh`), with optional `sshpass` when password-only (see {@link CompositeSSHTransport}).
 */

import { spawn } from 'child_process';
import { Client, type ConnectConfig } from 'ssh2';
import { SSHSettings } from './types';
import { SettingsHelper } from './SettingsHelper';
import { TestLogger } from './TestLogger';

export interface SSHExecResult {
  stdout: string;
  stderr: string;
  exitCode: number | null;
}

export interface SSHExecOptions {
  /** Defaults to `settings.commandTimeoutMs` or 120000. */
  timeoutMs?: number;
  /** When true, remote command text is omitted from logs. */
  redactCommand?: boolean;
}

export interface SSHTransport {
  execute(
    settings: SSHSettings,
    remoteCommand: string,
    options?: SSHExecOptions
  ): Promise<SSHExecResult>;
}

const DEFAULT_COMMAND_TIMEOUT_MS = 120_000;
const SAFE_PROPERTY_SEGMENT = /^[a-zA-Z0-9._/-]+$/;

function shellSingleQuote(value: string): string {
  return `'${value.replace(/'/g, `'\\''`)}'`;
}

function joinRemotePath(base: string, relative: string): string {
  const b = base.replace(/\/+$/, '');
  const r = relative.replace(/^\/+/, '');
  return `${b}/${r}`;
}

function assertSafePropertySegment(value: string, label: string): void {
  if (!SAFE_PROPERTY_SEGMENT.test(value)) {
    throw new Error(
      `SSHHelper: invalid ${label} (allowed: letters, digits, . _ - /). Got: ${JSON.stringify(value)}`
    );
  }
}

/**
 * Runs `ssh` locally; with password and no key, prefixes `sshpass -e` and sets `SSHPASS`.
 */
export class OpenSSHTransport implements SSHTransport {
  async execute(
    settings: SSHSettings,
    remoteCommand: string,
    options?: SSHExecOptions
  ): Promise<SSHExecResult> {
    const sshBinary = settings.sshBinary ?? 'ssh';
    const connectTimeout = settings.connectTimeoutSeconds ?? 30;
    const timeoutMs = options?.timeoutMs ?? settings.commandTimeoutMs ?? DEFAULT_COMMAND_TIMEOUT_MS;

    const sshArgs: string[] = [];
    if (settings.port !== 22) {
      sshArgs.push('-p', String(settings.port));
    }
    sshArgs.push('-o', `ConnectTimeout=${connectTimeout}`);

    if (settings.strictHostKeyChecking === false) {
      sshArgs.push('-o', 'StrictHostKeyChecking=no', '-o', 'UserKnownHostsFile=/dev/null');
    }

    if (settings.identityFilePath) {
      sshArgs.push('-i', settings.identityFilePath, '-o', 'BatchMode=yes');
    }

    sshArgs.push(`${settings.username}@${settings.host}`, remoteCommand);

    const usePassword = Boolean(settings.password) && !settings.identityFilePath;

    const command = usePassword ? settings.sshpassBinary ?? 'sshpass' : sshBinary;
    const args = usePassword ? ['-e', sshBinary, ...sshArgs] : sshArgs;

    const env: NodeJS.ProcessEnv = { ...process.env };
    if (usePassword && settings.password) {
      env.SSHPASS = settings.password;
    }

    return await new Promise<SSHExecResult>((resolve, reject) => {
      const child = spawn(command, args, {
        env,
        windowsHide: true,
      });

      let stdout = '';
      let stderr = '';
      const timer = setTimeout(() => {
        child.kill('SIGTERM');
        reject(
          new Error(
            `SSH command timed out after ${timeoutMs}ms (host=${settings.host}, user=${settings.username})`
          )
        );
      }, timeoutMs);

      child.stdout?.on('data', (chunk: Buffer) => {
        stdout += chunk.toString();
      });
      child.stderr?.on('data', (chunk: Buffer) => {
        stderr += chunk.toString();
      });

      child.on('error', (err) => {
        clearTimeout(timer);
        const code = (err as NodeJS.ErrnoException).code;
        if (usePassword && code === 'ENOENT') {
          reject(
            new Error(
              `"${command}" not found on PATH. Install sshpass for password auth, or use ssh_key (identity file) with BatchMode.`
            )
          );
        } else {
          reject(err);
        }
      });

      child.on('close', (code) => {
        clearTimeout(timer);
        resolve({ stdout, stderr, exitCode: code });
      });
    });
  }
}

/**
 * Password authentication via pure-JS `ssh2` (no `sshpass` / no TTY). Used internally by {@link CompositeSSHTransport}.
 */
class Ssh2PasswordTransport implements SSHTransport {
  async execute(
    settings: SSHSettings,
    remoteCommand: string,
    options?: SSHExecOptions
  ): Promise<SSHExecResult> {
    const password = settings.password;
    if (!password) {
      throw new Error('Ssh2PasswordTransport: password is required');
    }

    const timeoutMs = options?.timeoutMs ?? settings.commandTimeoutMs ?? DEFAULT_COMMAND_TIMEOUT_MS;
    const client = new Client();

    return await new Promise<SSHExecResult>((resolve, reject) => {
      let settled = false;

      const clearAndEnd = (): void => {
        try {
          client.end();
        } catch {
          /* ignore */
        }
      };

      const timer = setTimeout(() => {
        if (settled) {
          return;
        }
        settled = true;
        clearAndEnd();
        reject(
          new Error(
            `SSH command timed out after ${timeoutMs}ms (host=${settings.host}, user=${settings.username})`
          )
        );
      }, timeoutMs);

      const finish = (result: SSHExecResult): void => {
        if (settled) {
          return;
        }
        settled = true;
        clearTimeout(timer);
        clearAndEnd();
        resolve(result);
      };

      const fail = (err: Error): void => {
        if (settled) {
          return;
        }
        settled = true;
        clearTimeout(timer);
        clearAndEnd();
        reject(err);
      };

      client.on('error', (err: Error) => {
        fail(err);
      });

      client.on('ready', () => {
        client.exec(remoteCommand, (err, stream) => {
          if (err) {
            fail(err);
            return;
          }

          let stdout = '';
          let stderr = '';

          stream.on('data', (chunk: Buffer | string) => {
            stdout += chunk.toString();
          });

          stream.stderr.on('data', (chunk: Buffer | string) => {
            stderr += chunk.toString();
          });

          stream.on('close', (code: number | null | undefined, signal?: string) => {
            const exitCode =
              code === null || code === undefined ? (signal !== undefined && signal !== '' ? 1 : 0) : code;
            finish({ stdout, stderr, exitCode });
          });
        });
      });

      const connectOpts: ConnectConfig = {
        host: settings.host,
        port: settings.port,
        username: settings.username,
        password,
        readyTimeout: (settings.connectTimeoutSeconds ?? 30) * 1000,
      };

      if (settings.strictHostKeyChecking === false) {
        connectOpts.hostVerifier = (): boolean => true;
      }

      client.connect(connectOpts);
    });
  }
}

/**
 * Uses `ssh2` when authenticating with password and no identity file; otherwise OpenSSH (key / BatchMode).
 */
export class CompositeSSHTransport implements SSHTransport {
  private readonly ssh2 = new Ssh2PasswordTransport();
  private readonly openssh = new OpenSSHTransport();

  async execute(
    settings: SSHSettings,
    remoteCommand: string,
    options?: SSHExecOptions
  ): Promise<SSHExecResult> {
    const usePasswordWithoutKey = Boolean(settings.password) && !settings.identityFilePath;
    if (usePasswordWithoutKey) {
      return this.ssh2.execute(settings, remoteCommand, options);
    }
    return this.openssh.execute(settings, remoteCommand, options);
  }
}

export class SSHHelper {
  private static readonly transport: SSHTransport = new CompositeSSHTransport();

  static getSSHSettings(systemName: string, connectionType: string = 'SSH'): SSHSettings {
    const s = SettingsHelper.getSSHSettings(systemName, connectionType);
    if (!s) {
      throw new Error(
        `SSH settings for "${systemName}" not found. Configure the SSH connection in the ` +
          `environment configuration with ssh_host (or host) and ssh_login (or username).`
      );
    }
    return s;
  }

  /**
   * Single-quote a value for safe interpolation into a remote POSIX shell command.
   */
  static quoteRemoteShellArg(value: string): string {
    return shellSingleQuote(value);
  }

  /**
   * Throws if the segment is not safe to embed in a constructed remote command (allowlist: letters, digits, . _ - /).
   */
  static assertSafeRemoteCommandSegment(value: string, label: string): void {
    assertSafePropertySegment(value, label);
  }

  /** Join `workingDirectory` base with a relative path segment (no leading slash on relative). */
  static joinRemoteWorkingDirPath(base: string, relative: string): string {
    return joinRemotePath(base, relative);
  }

  /**
   * Run a remote shell command on the configured SSH system (sole public entry; analogous to DatabaseHelper.executeQuery).
   */
  static async executeRemoteCommand(
    systemName: string,
    remoteCommand: string,
    options?: SSHExecOptions,
    connectionType: string = 'SSH'
  ): Promise<string> {
    const settings = this.getSSHSettings(systemName, connectionType);
    return this.executeCommand(settings, remoteCommand, options);
  }

  private static async executeCommand(
    settings: SSHSettings,
    remoteCommand: string,
    options?: SSHExecOptions
  ): Promise<string> {
    const target = `${settings.username}@${settings.host}`;
    const stepDescription = options?.redactCommand
      ? 'Executing remote command (redacted)...'
      : `Executing remote command: ${remoteCommand.substring(0, 50)}${remoteCommand.length > 50 ? '...' : ''}`;

    return await TestLogger.pageStep(stepDescription, async () => {
      if (options?.redactCommand) {
        TestLogger.info(`ssh ${target} (command redacted)`);
      } else {
        TestLogger.info(`ssh ${target}: ${remoteCommand}`);
      }
      return await this.executeRemoteCore(settings, remoteCommand, options);
    });
  }

  private static async executeRemoteCore(
    settings: SSHSettings,
    remoteCommand: string,
    options?: SSHExecOptions
  ): Promise<string> {
    const result = await this.transport.execute(settings, remoteCommand, options);
    const target = `${settings.username}@${settings.host}`;
    if (result.exitCode !== 0) {
      const detail = result.stderr.trim() || result.stdout.trim() || '(no output)';
      throw new Error(`SSH failed (exit ${result.exitCode}) ${target}: ${detail}`);
    }
    return result.stdout.trimEnd();
  }
}

export default SSHHelper;
