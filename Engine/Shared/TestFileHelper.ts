import * as fs from 'fs';
import * as path from 'path';

/**
 * TestFileHelper - Utility for managing test files with two-directory architecture
 *
 * @description
 * Provides utilities for managing test files with separation between:
 * - **Stable files** (tests/TestData/Files/) - prepared test data, NOT cleaned up
 * - **Temp files** (tests/Raw/Files/) - downloads, generated files, cleaned up after tests
 *
 * File search priority: Stable files → Temp files
 *
 * @features
 * - Two-directory architecture (stable vs temp)
 * - Create files of specified size (for upload limit testing)
 * - Stream support for large files (auto-enabled for files > 10MB)
 * - Create typed files with valid signatures (PDF, PNG, JPG, etc.)
 * - Create files from streams (save downloads directly)
 * - Get file streams for upload (memory-efficient)
 * - Support for Download → Upload scenarios
 *
 * @usage
 * ```typescript
 * import { TestFileHelper } from 'Engine/Shared/TestFileHelper';
 *
 * // Create file of specific size (e.g., for testing upload limits)
 * const largeFile = await TestFileHelper.createFileOfSize('test.bin', TestFileHelper.SIZE.mb(50));
 *
 * // Create typed file with valid signature
 * const pdfFile = await TestFileHelper.createTypedFile('doc.pdf', 'pdf', TestFileHelper.SIZE.mb(5));
 *
 * // Create from stream (e.g., save download)
 * const saved = await TestFileHelper.createFileFromStream('downloaded.pdf', responseStream);
 *
 * // Get stream for upload (memory-efficient)
 * const stream = TestFileHelper.getFileStream('large-file.bin');
 *
 * // Find file for upload (searches stable first, then temp)
 * const uploadPath = TestFileHelper.getFileForUpload('prepared-data.csv');
 *
 * // Cleanup temp files only (stable files preserved)
 * await TestFileHelper.cleanupAllTestFiles();
 * ```
 *
 * @directories
 * - tests/TestData/Files/ - stable, prepared test files (manual management)
 * - tests/Raw/Files/ - temporary, runtime files (auto-cleanup)
 *
 * @author AI Test Automation Framework
 * @version 1.2.0
 * @since 2025
 */

export class TestFileHelper {
  /** Directory for stable, prepared test data files (manual preparation, not modified by tests) */
  private static readonly STABLE_FILES_DIR = 'tests/TestData/Files';
  
  /** Directory for temporary/runtime files (downloads, generated files, cleaned up after tests) */
  private static readonly TEMP_FILES_DIR = 'tests/Raw/Files';

  /**
   * Ensure directory exists
   * @param dirPath - Directory path to ensure
   * @private
   */
  private static ensureDirectoryExists(dirPath: string): void {
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
  }

  /**
   * Get full path for a temporary/runtime file (downloads, generated files)
   * Files created here will be cleaned up by cleanupAllTestFiles()
   * @param fileName - Name of the file
   * @returns Full path to the file in temp directory
   */
  private static getTempFilePath(fileName: string): string {
    this.ensureDirectoryExists(this.TEMP_FILES_DIR);
    return path.join(this.TEMP_FILES_DIR, fileName);
  }

  /**
   * Find file in available directories
   * Search order: 1) Stable files (TestData/Files), 2) Temp files (Raw/Files)
   * @param fileName - Name of the file to find
   * @returns Full path to the file or null if not found
   */
  static findFile(fileName: string): string | null {
    // First, check in stable test data files
    const stablePath = path.join(this.STABLE_FILES_DIR, fileName);
    if (fs.existsSync(stablePath)) {
      return stablePath;
    }

    // Then, check in temporary/runtime files
    const tempPath = path.join(this.TEMP_FILES_DIR, fileName);
    if (fs.existsSync(tempPath)) {
      return tempPath;
    }

    return null;
  }

  /**
   * Get file path for upload operations
   * Searches in stable files first, then temp files
   * @param fileName - Name of the file
   * @returns Full path to the file
   * @throws Error if file not found in any location
   */
  static getFileForUpload(fileName: string): string {
    const filePath = this.findFile(fileName);
    if (!filePath) {
      throw new Error(
        `File "${fileName}" not found. Searched in:\n` +
        `  - ${this.STABLE_FILES_DIR}\n` +
        `  - ${this.TEMP_FILES_DIR}`
      );
    }
    return filePath;
  }

  /**
   * Copy file from stable directory to temp directory
   * Useful for scenarios where you need to modify a stable file
   * @param fileName - Name of the file to copy
   * @returns Full path to the copied file in temp directory
   * @throws Error if source file not found
   */
  static copyToTemp(fileName: string): string {
    const sourcePath = path.join(this.STABLE_FILES_DIR, fileName);
    if (!fs.existsSync(sourcePath)) {
      throw new Error(`Source file not found: ${sourcePath}`);
    }

    this.ensureDirectoryExists(this.TEMP_FILES_DIR);
    const destPath = path.join(this.TEMP_FILES_DIR, fileName);
    fs.copyFileSync(sourcePath, destPath);
    return destPath;
  }

  /**
   * Create a text file with specified content (in temp directory)
   * @param fileName - Name of the file (e.g., 'test.txt')
   * @param content - Text content to write to the file
   * @returns Promise<string> Full path to the created file
   */
  static async createTextFile(fileName: string, content: string): Promise<string> {
    const filePath = this.getTempFilePath(fileName);
    fs.writeFileSync(filePath, content, 'utf-8');
    return filePath;
  }

  /**
   * Create a JSON file with specified data (in temp directory)
   * @param fileName - Name of the file (e.g., 'data.json')
   * @param data - Object to serialize as JSON
   * @returns Promise<string> Full path to the created file
   */
  static async createJsonFile(fileName: string, data: object): Promise<string> {
    const filePath = this.getTempFilePath(fileName);
    const content = JSON.stringify(data, null, 2);
    fs.writeFileSync(filePath, content, 'utf-8');
    return filePath;
  }

  /**
   * Create a binary file (empty or with buffer) (in temp directory)
   * @param fileName - Name of the file (e.g., 'document.pdf')
   * @param buffer - Optional buffer content. If not provided, creates empty file
   * @returns Promise<string> Full path to the created file
   */
  static async createBinaryFile(fileName: string, buffer?: Buffer): Promise<string> {
    const filePath = this.getTempFilePath(fileName);
    if (buffer) {
      fs.writeFileSync(filePath, buffer);
    } else {
      // Create empty file
      fs.writeFileSync(filePath, Buffer.alloc(0));
    }
    return filePath;
  }

  /**
   * Create a CSV file with specified data (in temp directory)
   * @param fileName - Name of the file (e.g., 'data.csv')
   * @param rows - Array of row data (array of string arrays)
   * @param headers - Optional header row
   * @returns Promise<string> Full path to the created file
   *
   * @example
   * const filePath = await TestFileHelper.createCsvFile('data.csv', [
   *   ['John', 'Doe', '30'],
   *   ['Jane', 'Smith', '25']
   * ], ['First Name', 'Last Name', 'Age']);
   */
  static async createCsvFile(
    fileName: string,
    rows: string[][],
    headers?: string[]
  ): Promise<string> {
    const filePath = this.getTempFilePath(fileName);
    let content = '';

    if (headers) {
      content += headers.join(',') + '\n';
    }

    rows.forEach((row) => {
      content += row.join(',') + '\n';
    });

    fs.writeFileSync(filePath, content, 'utf-8');
    return filePath;
  }

  /**
   * Create a file with custom content and encoding (in temp directory)
   * @param fileName - Name of the file
   * @param content - File content (string or Buffer)
   * @param encoding - File encoding (default: 'utf-8')
   * @returns Promise<string> Full path to the created file
   */
  static async createFile(
    fileName: string,
    content: string | Buffer,
    encoding: BufferEncoding = 'utf-8'
  ): Promise<string> {
    const filePath = this.getTempFilePath(fileName);
    if (Buffer.isBuffer(content)) {
      fs.writeFileSync(filePath, content);
    } else {
      fs.writeFileSync(filePath, content, encoding);
    }
    return filePath;
  }

  /**
   * Create a file of specified size with random or pattern content
   * Useful for testing file upload limits and large file handling
   * @param fileName - Name of the file (e.g., 'large-file.bin')
   * @param sizeInBytes - Desired file size in bytes
   * @param options - Optional configuration
   * @param options.pattern - Fill pattern: 'random' | 'zeros' | 'ones' | custom string (default: 'random')
   * @param options.useStream - Use stream for large files (default: true for files > 10MB)
   * @returns Promise<string> Full path to the created file
   *
   * @example
   * // Create 5MB random file
   * const file = await TestFileHelper.createFileOfSize('test.bin', 5 * 1024 * 1024);
   *
   * // Create 100MB file filled with zeros
   * const zeroFile = await TestFileHelper.createFileOfSize('zeros.bin', 100 * 1024 * 1024, { pattern: 'zeros' });
   *
   * // Create 1KB file with repeating pattern
   * const patternFile = await TestFileHelper.createFileOfSize('pattern.txt', 1024, { pattern: 'ABCD' });
   */
  static async createFileOfSize(
    fileName: string,
    sizeInBytes: number,
    options?: {
      pattern?: 'random' | 'zeros' | 'ones' | string;
      useStream?: boolean;
    }
  ): Promise<string> {
    const filePath = this.getTempFilePath(fileName);
    const pattern = options?.pattern ?? 'random';
    const STREAM_THRESHOLD = 10 * 1024 * 1024; // 10MB
    const useStream = options?.useStream ?? (sizeInBytes > STREAM_THRESHOLD);

    if (useStream) {
      return this.createLargeFileWithStream(filePath, sizeInBytes, pattern);
    }

    const buffer = this.generateBuffer(sizeInBytes, pattern);
    fs.writeFileSync(filePath, buffer);
    return filePath;
  }

  /**
   * Create file using stream (for large files)
   * @private
   */
  private static createLargeFileWithStream(
    filePath: string,
    sizeInBytes: number,
    pattern: 'random' | 'zeros' | 'ones' | string
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      const writeStream = fs.createWriteStream(filePath);
      const CHUNK_SIZE = 1024 * 1024; // 1MB chunks
      let bytesWritten = 0;

      writeStream.on('error', reject);
      writeStream.on('finish', () => resolve(filePath));

      const writeNextChunk = (): void => {
        while (bytesWritten < sizeInBytes) {
          const remainingBytes = sizeInBytes - bytesWritten;
          const chunkSize = Math.min(CHUNK_SIZE, remainingBytes);
          const chunk = this.generateBuffer(chunkSize, pattern);
          
          bytesWritten += chunkSize;
          
          // If write returns false, wait for drain event
          if (!writeStream.write(chunk)) {
            writeStream.once('drain', writeNextChunk);
            return;
          }
        }
        writeStream.end();
      };

      writeNextChunk();
    });
  }

  /**
   * Generate buffer with specified pattern
   * @private
   */
  private static generateBuffer(size: number, pattern: 'random' | 'zeros' | 'ones' | string): Buffer {
    if (pattern === 'zeros') {
      return Buffer.alloc(size, 0);
    }
    
    if (pattern === 'ones') {
      return Buffer.alloc(size, 0xFF);
    }
    
    if (pattern === 'random') {
      const buffer = Buffer.alloc(size);
      for (let i = 0; i < size; i++) {
        buffer[i] = Math.floor(Math.random() * 256);
      }
      return buffer;
    }

    // Custom string pattern - repeat to fill buffer
    const patternBuffer = Buffer.from(pattern, 'utf-8');
    const buffer = Buffer.alloc(size);
    for (let i = 0; i < size; i++) {
      const patternIndex = i % patternBuffer.length;
      buffer[i] = patternBuffer[patternIndex] ?? 0;
    }
    return buffer;
  }

  /**
   * Create file from readable stream
   * Useful for saving downloaded content directly to file
   * @param fileName - Name of the file
   * @param readableStream - Node.js Readable stream
   * @returns Promise<string> Full path to the created file
   *
   * @example
   * // Save HTTP response stream to file
   * const response = await fetch('https://example.com/file.pdf');
   * const filePath = await TestFileHelper.createFileFromStream('downloaded.pdf', response.body);
   */
  static async createFileFromStream(
    fileName: string,
    readableStream: NodeJS.ReadableStream
  ): Promise<string> {
    const filePath = this.getTempFilePath(fileName);
    
    return new Promise((resolve, reject) => {
      const writeStream = fs.createWriteStream(filePath);
      
      readableStream.pipe(writeStream);
      
      writeStream.on('finish', () => resolve(filePath));
      writeStream.on('error', reject);
      readableStream.on('error', reject);
    });
  }

  /**
   * Get readable stream for a file
   * Useful for uploading large files without loading into memory
   * @param fileName - Name of the file (searches in stable, then temp)
   * @returns fs.ReadStream
   * @throws Error if file not found
   *
   * @example
   * const stream = TestFileHelper.getFileStream('large-file.bin');
   * await uploadWithStream(stream);
   */
  static getFileStream(fileName: string): fs.ReadStream {
    const filePath = this.findFile(fileName);
    if (!filePath) {
      throw new Error(
        `File "${fileName}" not found. Searched in:\n` +
        `  - ${this.STABLE_FILES_DIR}\n` +
        `  - ${this.TEMP_FILES_DIR}`
      );
    }
    return fs.createReadStream(filePath);
  }

  /**
   * Read file as Buffer (for binary files)
   * @param filePath - Full path to the file
   * @returns Promise<Buffer> File content as Buffer
   */
  static async readFileAsBuffer(filePath: string): Promise<Buffer> {
    return fs.readFileSync(filePath);
  }

  /**
   * Create a file with valid file type signature (magic bytes)
   * Useful for testing file type validation on upload
   * @param fileName - Name of the file
   * @param fileType - Type of file to create
   * @param sizeInBytes - Desired file size (minimum size depends on file type)
   * @returns Promise<string> Full path to the created file
   *
   * @example
   * // Create a 1MB file that looks like a PDF
   * const pdfFile = await TestFileHelper.createTypedFile('test.pdf', 'pdf', 1024 * 1024);
   *
   * // Create a 500KB file that looks like a PNG
   * const pngFile = await TestFileHelper.createTypedFile('test.png', 'png', 500 * 1024);
   */
  static async createTypedFile(
    fileName: string,
    fileType: 'pdf' | 'png' | 'jpg' | 'gif' | 'zip' | 'docx' | 'xlsx',
    sizeInBytes: number
  ): Promise<string> {
    const filePath = this.getTempFilePath(fileName);
    
    // File signatures (magic bytes) for different file types
    const signatures: Record<string, Buffer> = {
      pdf: Buffer.from([0x25, 0x50, 0x44, 0x46, 0x2D]), // %PDF-
      png: Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]), // PNG header
      jpg: Buffer.from([0xFF, 0xD8, 0xFF, 0xE0]), // JPEG header
      gif: Buffer.from([0x47, 0x49, 0x46, 0x38, 0x39, 0x61]), // GIF89a
      zip: Buffer.from([0x50, 0x4B, 0x03, 0x04]), // ZIP/DOCX/XLSX header
      docx: Buffer.from([0x50, 0x4B, 0x03, 0x04]), // Same as ZIP (Office Open XML)
      xlsx: Buffer.from([0x50, 0x4B, 0x03, 0x04]), // Same as ZIP (Office Open XML)
    };

    const signature = signatures[fileType];
    if (!signature) {
      throw new Error(`Unsupported file type: ${fileType}`);
    }

    const minSize = signature.length;
    const actualSize = Math.max(sizeInBytes, minSize);
    
    // Create buffer with signature + random padding
    const buffer = Buffer.alloc(actualSize);
    signature.copy(buffer, 0);
    
    // Fill rest with random data
    for (let i = signature.length; i < actualSize; i++) {
      buffer[i] = Math.floor(Math.random() * 256);
    }

    fs.writeFileSync(filePath, buffer);
    return filePath;
  }

  /**
   * Size helper constants for readability
   */
  static readonly SIZE = {
    KB: 1024,
    MB: 1024 * 1024,
    GB: 1024 * 1024 * 1024,
    /** Helper to calculate size: SIZE.kb(5) = 5KB */
    kb: (n: number): number => n * 1024,
    /** Helper to calculate size: SIZE.mb(5) = 5MB */
    mb: (n: number): number => n * 1024 * 1024,
    /** Helper to calculate size: SIZE.gb(1) = 1GB */
    gb: (n: number): number => n * 1024 * 1024 * 1024,
  } as const;

  /**
   * Delete a test file
   * @param filePath - Full path to the file to delete
   * @returns Promise<boolean> True if file was deleted, false if it didn't exist
   */
  static async deleteFile(filePath: string): Promise<boolean> {
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        return true;
      }
      return false;
    } catch (error) {
      console.warn(`Failed to delete file ${filePath}:`, error);
      return false;
    }
  }

  /**
   * Check if a file exists
   * @param filePath - Full path to the file
   * @returns boolean True if file exists
   */
  static fileExists(filePath: string): boolean {
    return fs.existsSync(filePath);
  }

  /**
   * Get file size in bytes
   * @param filePath - Full path to the file
   * @returns number File size in bytes, or 0 if file doesn't exist
   */
  static getFileSize(filePath: string): number {
    try {
      if (fs.existsSync(filePath)) {
        const stats = fs.statSync(filePath);
        return stats.size;
      }
      return 0;
    } catch (error) {
      console.warn(`Failed to get file size for ${filePath}:`, error);
      return 0;
    }
  }

  /**
   * Read file content
   * @param filePath - Full path to the file
   * @param encoding - File encoding (default: 'utf-8')
   * @returns Promise<string> File content
   */
  static async readFile(filePath: string, encoding: BufferEncoding = 'utf-8'): Promise<string> {
    return fs.readFileSync(filePath, encoding);
  }

  /**
   * Clean up all temporary/runtime files (tests/Raw/Files only)
   * Stable files in tests/TestData/Files are NOT affected
   * @returns Promise<number> Number of files deleted
   */
  static async cleanupAllTestFiles(): Promise<number> {
    let deletedCount = 0;
    try {
      if (fs.existsSync(this.TEMP_FILES_DIR)) {
        const files = fs.readdirSync(this.TEMP_FILES_DIR);
        for (const file of files) {
          const filePath = path.join(this.TEMP_FILES_DIR, file);
          if (fs.statSync(filePath).isFile()) {
            fs.unlinkSync(filePath);
            deletedCount++;
          }
        }
      }
    } catch (error) {
      console.warn(`Failed to cleanup temp files:`, error);
    }
    return deletedCount;
  }

  /**
   * Get the temporary files directory path (for downloads, generated files)
   * @returns string Path to temp files directory
   */
  static getTempFilesDirectory(): string {
    this.ensureDirectoryExists(this.TEMP_FILES_DIR);
    return this.TEMP_FILES_DIR;
  }

  /**
   * Get the stable test data files directory path (for prepared test files)
   * @returns string Path to stable files directory
   */
  static getStableFilesDirectory(): string {
    this.ensureDirectoryExists(this.STABLE_FILES_DIR);
    return this.STABLE_FILES_DIR;
  }

  /**
   * List all files in stable directory
   * @returns string[] Array of file names
   */
  static listStableFiles(): string[] {
    if (!fs.existsSync(this.STABLE_FILES_DIR)) {
      return [];
    }
    return fs.readdirSync(this.STABLE_FILES_DIR).filter(file => {
      const filePath = path.join(this.STABLE_FILES_DIR, file);
      return fs.statSync(filePath).isFile();
    });
  }

  /**
   * List all files in temp directory
   * @returns string[] Array of file names
   */
  static listTempFiles(): string[] {
    if (!fs.existsSync(this.TEMP_FILES_DIR)) {
      return [];
    }
    return fs.readdirSync(this.TEMP_FILES_DIR).filter(file => {
      const filePath = path.join(this.TEMP_FILES_DIR, file);
      return fs.statSync(filePath).isFile();
    });
  }
}

export default TestFileHelper;


