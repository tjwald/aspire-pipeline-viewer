/**
 * Security utilities for input validation and sanitization.
 */
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

  // Normalize and resolve the path to prevent traversal attacks
  const normalized = path.resolve(dirPath)

  // Check if path exists and is a directory
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
 * Validates an Aspire step name to prevent command injection.
 * Step names should only contain alphanumeric characters, hyphens, and underscores.
 */
export function validateStepName(stepName: string): { valid: boolean; error?: string } {
  if (!stepName || typeof stepName !== 'string') {
    return { valid: false, error: 'Step name must be a non-empty string' }
  }

  // Allow only alphanumeric, hyphens, underscores, and dots
  const validPattern = /^[a-zA-Z0-9._-]+$/
  if (!validPattern.test(stepName)) {
    return { valid: false, error: 'Step name contains invalid characters. Only alphanumeric, dots, hyphens, and underscores are allowed' }
  }

  // Prevent excessively long names
  if (stepName.length > 100) {
    return { valid: false, error: 'Step name is too long (max 100 characters)' }
  }

  return { valid: true }
}

/**
 * Validates a file path to prevent path traversal attacks.
 */
export function validateFilePath(filePath: string, baseDir?: string): { valid: boolean; error?: string; normalized?: string } {
  if (!filePath || typeof filePath !== 'string') {
    return { valid: false, error: 'File path must be a non-empty string' }
  }

  // Normalize the path
  const normalized = path.resolve(baseDir || process.cwd(), filePath)

  // If baseDir is provided, ensure the normalized path is within it
  if (baseDir) {
    const normalizedBase = path.resolve(baseDir)
    if (!normalized.startsWith(normalizedBase)) {
      return { valid: false, error: 'File path attempts to traverse outside base directory' }
    }
  }

  return { valid: true, normalized }
}
