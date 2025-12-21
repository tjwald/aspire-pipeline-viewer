import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { validateDirectory, validateStepName, validateFilePath } from '../../src/core/security'
import fs from 'fs'
import path from 'path'
import os from 'os'

describe('Security validation utilities', () => {
  let tempDir: string

  beforeEach(() => {
    // Create a temporary directory for testing
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'security-test-'))
  })

  afterEach(() => {
    // Clean up temporary directory
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true })
    }
  })

  describe('validateDirectory', () => {
    it('should validate existing directory', () => {
      const result = validateDirectory(tempDir)
      expect(result.valid).toBe(true)
      expect(result.normalized).toBeDefined()
      expect(path.isAbsolute(result.normalized!)).toBe(true)
    })

    it('should reject non-existent directory', () => {
      const result = validateDirectory(path.join(tempDir, 'nonexistent'))
      expect(result.valid).toBe(false)
      expect(result.error).toContain('not exist')
    })

    it('should reject file path as directory', () => {
      const filePath = path.join(tempDir, 'testfile.txt')
      fs.writeFileSync(filePath, 'test')

      const result = validateDirectory(filePath)
      expect(result.valid).toBe(false)
      expect(result.error).toContain('not a directory')
    })

    it('should reject empty string', () => {
      const result = validateDirectory('')
      expect(result.valid).toBe(false)
      expect(result.error).toContain('non-empty string')
    })

    it('should reject null/undefined', () => {
      const result1 = validateDirectory(null as any)
      expect(result1.valid).toBe(false)

      const result2 = validateDirectory(undefined as any)
      expect(result2.valid).toBe(false)
    })

    it('should normalize relative paths', () => {
      const result = validateDirectory('.')
      expect(result.valid).toBe(true)
      expect(path.isAbsolute(result.normalized!)).toBe(true)
    })
  })

  describe('validateStepName', () => {
    it('should accept valid step names', () => {
      const validNames = ['build', 'test', 'deploy', 'build-app', 'run_tests', 'step.1', 'step-2_test']
      validNames.forEach(name => {
        const result = validateStepName(name)
        expect(result.valid).toBe(true)
      })
    })

    it('should reject names with special characters', () => {
      const invalidNames = ['build&test', 'run;ls', 'test|cat', 'deploy$(whoami)', 'test`ls`', 'test\\nls']
      invalidNames.forEach(name => {
        const result = validateStepName(name)
        expect(result.valid).toBe(false)
        expect(result.error).toContain('invalid characters')
      })
    })

    it('should reject names with spaces', () => {
      const result = validateStepName('build app')
      expect(result.valid).toBe(false)
      expect(result.error).toContain('invalid characters')
    })

    it('should reject empty string', () => {
      const result = validateStepName('')
      expect(result.valid).toBe(false)
      expect(result.error).toContain('non-empty string')
    })

    it('should reject null/undefined', () => {
      const result1 = validateStepName(null as any)
      expect(result1.valid).toBe(false)

      const result2 = validateStepName(undefined as any)
      expect(result2.valid).toBe(false)
    })

    it('should reject excessively long names', () => {
      const longName = 'a'.repeat(101)
      const result = validateStepName(longName)
      expect(result.valid).toBe(false)
      expect(result.error).toContain('too long')
    })

    it('should accept name with exactly 100 characters', () => {
      const name = 'a'.repeat(100)
      const result = validateStepName(name)
      expect(result.valid).toBe(true)
    })
  })

  describe('validateFilePath', () => {
    it('should validate file path without base directory', () => {
      const filePath = path.join(tempDir, 'test.txt')
      fs.writeFileSync(filePath, 'test')

      const result = validateFilePath(filePath)
      expect(result.valid).toBe(true)
      expect(result.normalized).toBeDefined()
      expect(path.isAbsolute(result.normalized!)).toBe(true)
    })

    it('should validate file path with base directory', () => {
      const filePath = 'test.txt'
      const result = validateFilePath(filePath, tempDir)
      expect(result.valid).toBe(true)
      expect(result.normalized).toContain(tempDir)
    })

    it('should reject path traversal attempts', () => {
      const maliciousPath = '../../../etc/passwd'
      const result = validateFilePath(maliciousPath, tempDir)
      expect(result.valid).toBe(false)
      expect(result.error).toContain('traverse outside')
    })

    it('should reject path traversal with absolute path', () => {
      const outsidePath = path.join(os.tmpdir(), 'outside.txt')
      const result = validateFilePath(outsidePath, tempDir)
      expect(result.valid).toBe(false)
      expect(result.error).toContain('traverse outside')
    })

    it('should accept relative path within base directory', () => {
      const subdir = path.join(tempDir, 'subdir')
      fs.mkdirSync(subdir)

      const result = validateFilePath('./subdir/file.txt', tempDir)
      expect(result.valid).toBe(true)
      expect(result.normalized).toContain(path.join(tempDir, 'subdir'))
    })

    it('should reject empty string', () => {
      const result = validateFilePath('')
      expect(result.valid).toBe(false)
      expect(result.error).toContain('non-empty string')
    })

    it('should reject null/undefined', () => {
      const result1 = validateFilePath(null as any)
      expect(result1.valid).toBe(false)

      const result2 = validateFilePath(undefined as any)
      expect(result2.valid).toBe(false)
    })
  })
})
