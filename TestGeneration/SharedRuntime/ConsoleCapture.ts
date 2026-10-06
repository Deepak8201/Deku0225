import os from 'node:os';
import { test as playwrightTest, ConsoleMessage, Request, Response } from '@playwright/test';
import { label as allureLabel } from 'allure-js-commons';
import { TestLogger } from './TestLogger';

// Use otel-playwright-fixture when available, fall back to @playwright/test
// eslint-disable-next-line @typescript-eslint/no-require-imports
let base: typeof playwrightTest;
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  base = require('otel-playwright-fixture').test;
} catch {
  base = playwrightTest;
}

function getTriggerAuthor(): string {
  if (process.env.TRIGGER_AUTHOR) {
    return process.env.TRIGGER_AUTHOR;
  }

  try {
    return os.userInfo().username || 'Unknown User';
  } catch {
    return 'Unknown User';
  }
}

interface CaptureConfig {
  captureNetwork: boolean;
  captureConsole: boolean;
  networkLogLevel: 'all' | 'api' | 'errors';
  maxBodySize: number;
  excludeUrls: RegExp[];
  includeUrls: RegExp[];
  showTimestamps: boolean;
  timestampFormat: 'time' | 'full' | 'ms';
}

interface RequestTiming {
  startTime: number;
  url: string;
  method: string;
}

const requestTimings = new Map<string, RequestTiming>();

function getConfig(): CaptureConfig {
  return {
    captureNetwork: process.env.CAPTURE_NETWORK !== 'false',
    captureConsole: process.env.CAPTURE_CONSOLE !== 'false',
    networkLogLevel: (process.env.NETWORK_LOG_LEVEL as any) || 'api',
    maxBodySize: parseInt(process.env.NETWORK_MAX_BODY_SIZE || '1000'),
    showTimestamps: process.env.SHOW_TIMESTAMPS !== 'false',
    timestampFormat: (process.env.TIMESTAMP_FORMAT as any) || 'time',
    excludeUrls: [
      /\.(png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|eot|css|map)(\?.*)?$/i,
      /\/static\//i,
      /\/assets\//i,
      /cdn-edge-service.*\.(js|css)/i,
      /remoteEntry.*\.js/i
    ],
    includeUrls: [
      /\/api\//i,
      /\/rest\//i,
      /\/graphql/i,
      /public-gateway.*\/auth/i
    ]
  };
}


function formatTimestamp(date: Date = new Date()): string {
  if (!config.showTimestamps) {
    return '';
  }

  switch (config.timestampFormat) {
    case 'full':
      // Full ISO format: 2024-12-01T15:30:45.123Z
      return `[${date.toISOString()}] `;
    
    case 'ms':
      // Milliseconds since epoch: 1733072445123
      return `[${date.getTime()}] `;
    
    case 'time':
    default:
      // Time only: 15:30:45.123
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');
      const seconds = String(date.getSeconds()).padStart(2, '0');
      const ms = String(date.getMilliseconds()).padStart(3, '0');
      return `[${hours}:${minutes}:${seconds}.${ms}] `;
  }
}

/**
 * Format duration in human-readable format
 */
function formatDuration(ms: number): string {
  if (ms < 1000) {
    return `${Math.round(ms)}ms`;
  } else if (ms < 60000) {
    return `${(ms / 1000).toFixed(2)}s`;
  } else {
    const minutes = Math.floor(ms / 60000);
    const seconds = ((ms % 60000) / 1000).toFixed(2);
    return `${minutes}m ${seconds}s`;
  }
}

const config = getConfig();

/**
 * Check if URL should be logged based on configuration
 */
function shouldLogUrl(url: string): boolean {
  // If network logging is disabled, don't log anything
  if (!config.captureNetwork) {
    return false;
  }

  // Check exclude patterns first
  if (config.excludeUrls.some(pattern => pattern.test(url))) {
    return false;
  }

  // For 'all' level, log everything not excluded
  if (config.networkLogLevel === 'all') {
    return true;
  }

  // For 'api' level, check include patterns
  if (config.networkLogLevel === 'api') {
    return config.includeUrls.some(pattern => pattern.test(url));
  }

  // For 'errors' level, will be checked in response handler
  return false;
}

/**
 * Format request information
 */
function formatRequest(request: Request): string {
  const method = request.method();
  const url = request.url();
  const shortUrl = url.length > 100 ? url.substring(0, 100) + '...' : url;
  
  return `${method} ${shortUrl}`;
}

/**
 * Format response information
 */
async function formatResponse(response: Response): Promise<string> {
  const status = response.status();
  const statusText = response.statusText();
  const url = response.url();
  const shortUrl = url.length > 80 ? url.substring(0, 80) + '...' : url;
  
  let result = `${status} ${statusText} - ${shortUrl}`;
  
  // For error responses, try to get response body
  if (status >= 400) {
    try {
      const contentType = response.headers()['content-type'] || '';
      if (contentType.includes('application/json') || contentType.includes('text/')) {
        const body = await response.text();
        if (body && body.length > 0) {
          const truncatedBody = body.length > config.maxBodySize 
            ? body.substring(0, config.maxBodySize) + '...' 
            : body;
          result += `\n    Response Body: ${truncatedBody}`;
        }
      }
    } catch (error) {
      // Ignore errors when reading response body
    }
  }
  
  return result;
}

/**
 * Log network request
 */
function logRequest(request: Request): void {
  if (!shouldLogUrl(request.url())) {
    return;
  }

  const now = new Date();
  const timestamp = formatTimestamp(now);
  const formatted = formatRequest(request);
  
  // Track request timing for duration calculation
  const timingKey = `${request.method()}_${request.url()}`;
  requestTimings.set(timingKey, {
    startTime: now.getTime(),
    url: request.url(),
    method: request.method()
  });
  
  TestLogger.info(`${timestamp}🌐 Request: ${formatted}`);
}

/**
 * Log network response
 */
async function logResponse(response: Response): Promise<void> {
  const url = response.url();
  const now = new Date();
  const timestamp = formatTimestamp(now);
  
  // Calculate request duration if we have timing info
  const timingKey = `${response.request().method()}_${url}`;
  const timing = requestTimings.get(timingKey);
  let durationStr = '';
  
  if (timing) {
    const duration = now.getTime() - timing.startTime;
    durationStr = ` (${formatDuration(duration)})`;
    requestTimings.delete(timingKey); // Clean up timing data
  }
  
  // For 'errors' level, only log error responses
  if (config.networkLogLevel === 'errors') {
    if (response.status() >= 400) {
      const formatted = await formatResponse(response);
      TestLogger.error(`${timestamp}❌ Response Error: ${formatted}${durationStr}`);
    }
    return;
  }

  // For other levels, check URL filtering
  if (!shouldLogUrl(url)) {
    return;
  }

  const status = response.status();
  const formatted = await formatResponse(response);
  
  // Use appropriate log level based on status code
  if (status >= 500) {
    TestLogger.error(`${timestamp}❌ Response: ${formatted}${durationStr}`);
  } else if (status >= 400) {
    TestLogger.warn(`${timestamp}⚠️ Response: ${formatted}${durationStr}`);
  } else {
    TestLogger.info(`${timestamp}✓ Response: ${formatted}${durationStr}`);
  }
}

/**
 * Map console message types to TestLogger methods
 */
function logConsoleMessage(msg: ConsoleMessage): void {
  if (!config.captureConsole) {
    return;
  }

  const timestamp = formatTimestamp();
  const type = msg.type();
  const text = msg.text();
  const location = msg.location();
  
  // Format message with location info if available
  const formattedText = location.url 
    ? `${timestamp}[Browser Console] ${text} (${location.url}:${location.lineNumber})`
    : `${timestamp}[Browser Console] ${text}`;
  
  // Route to appropriate TestLogger method based on console type
  switch (type) {
    case 'error':
      TestLogger.error(formattedText);
      break;
    case 'warning':
      TestLogger.warn(formattedText);
      break;
    case 'info':
    case 'log':
    case 'debug':
      TestLogger.info(formattedText);
      break;
    default:
      // For other types (dir, dirxml, table, trace, etc.)
      TestLogger.info(`${timestamp}[Browser Console - ${type}] ${text}`);
  }
}

/**
 * Extended test fixture with automatic console and network capture
 */
export const test = base.extend<{ _allureTriggerAuthor: void }>({
  _allureTriggerAuthor: [
    async ({}, use) => {
      const author = getTriggerAuthor();
      await allureLabel('user', author);
      await use();
    },
    { auto: true },
  ],
  page: async ({ page }, use) => {
    // Set up console message listener before test runs
    if (config.captureConsole) {
      page.on('console', (msg: ConsoleMessage) => {
        logConsoleMessage(msg);
      });
    }
    
    // Capture page errors (uncaught exceptions)
    page.on('pageerror', (error: Error) => {
      const timestamp = formatTimestamp();
      TestLogger.error(`${timestamp}[Browser Page Error] ${error.message}`);
      if (error.stack) {
        TestLogger.error(`${timestamp}Stack trace: ${error.stack}`);
      }
    });
    
    // Set up network request/response listeners
    if (config.captureNetwork) {
      page.on('request', (request: Request) => {
        logRequest(request);
      });
      
      page.on('response', async (response: Response) => {
        await logResponse(response);
      });
      
      // Log request failures
      page.on('requestfailed', (request: Request) => {
        if (shouldLogUrl(request.url())) {
          const timestamp = formatTimestamp();
          const failure = request.failure();
          const errorText = failure ? failure.errorText : 'Unknown error';
          
          // Calculate duration if we have timing info
          const timingKey = `${request.method()}_${request.url()}`;
          const timing = requestTimings.get(timingKey);
          let durationStr = '';
          
          if (timing) {
            const duration = Date.now() - timing.startTime;
            durationStr = ` (${formatDuration(duration)})`;
            requestTimings.delete(timingKey);
          }
          
          TestLogger.error(`${timestamp}❌ Request Failed: ${request.method()} ${request.url()} - ${errorText}${durationStr}`);
        }
      });
    }
    
    // Run the test with the page
    await use(page);
    
    // Cleanup: Remove listeners (Playwright handles this automatically, but explicit is good)
    page.removeAllListeners('console');
    page.removeAllListeners('pageerror');
    page.removeAllListeners('request');
    page.removeAllListeners('response');
    page.removeAllListeners('requestfailed');
  },
});

export { expect } from '@playwright/test';