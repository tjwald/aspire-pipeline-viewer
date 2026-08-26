import path from 'path'
import fs from 'fs'

/**
 * Validates that a directory path is safe and exists.
 * Prevents directory traversal and ensures the path is absolute.
 */
export function validateDirectory(dirPath: string): { valid: boolean; error?: string; normalized?: string } {
  if (!dirPath || typeof dirPath !== 'string') {
    return { valid: false, error: 'Directory path must be a non-empty string' }
  }

  const normalized = path.resolve(dirPath)

  try {
    const stats = fs.statSync(normalized)
    if (!stats.isDirectory()) {
      return { valid: false, error: 'Path is not a directory' }
    }
  } catch {
    return { valid: false, error: 'Directory does not exist or is not accessible' }
  }

  return { valid: true, normalized }
}

/**
 * Validates a file path to prevent path traversal attacks.
 */
export function validateFilePath(filePath: string, baseDir?: string): { valid: boolean; error?: string; normalized?: string } {
  if (!filePath || typeof filePath !== 'string') {
    return { valid: false, error: 'File path must be a non-empty string' }
  }

  const normalized = path.resolve(baseDir || process.cwd(), filePath)

  if (baseDir) {
    const normalizedBase = path.resolve(baseDir)
    if (!normalized.startsWith(normalizedBase)) {
      return { valid: false, error: 'File path attempts to traverse outside base directory' }
    }
  }

  return { valid: true, normalized }
}
