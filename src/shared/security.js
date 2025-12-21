"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateDirectory = validateDirectory;
exports.validateStepName = validateStepName;
exports.validateFilePath = validateFilePath;
/**
 * Security utilities for input validation and sanitization.
 */
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
/**
 * Validates that a directory path is safe and exists.
 * Prevents directory traversal and ensures the path is absolute.
 */
function validateDirectory(dirPath) {
    if (!dirPath || typeof dirPath !== 'string') {
        return { valid: false, error: 'Directory path must be a non-empty string' };
    }
    // Normalize and resolve the path to prevent traversal attacks
    const normalized = path_1.default.resolve(dirPath);
    // Check if path exists and is a directory
    try {
        const stats = fs_1.default.statSync(normalized);
        if (!stats.isDirectory()) {
            return { valid: false, error: 'Path is not a directory' };
        }
    }
    catch (err) {
        return { valid: false, error: 'Directory does not exist or is not accessible' };
    }
    return { valid: true, normalized };
}
/**
 * Validates an Aspire step name to prevent command injection.
 * Step names should only contain alphanumeric characters, hyphens, and underscores.
 */
function validateStepName(stepName) {
    if (!stepName || typeof stepName !== 'string') {
        return { valid: false, error: 'Step name must be a non-empty string' };
    }
    // Allow only alphanumeric, hyphens, underscores, and dots
    const validPattern = /^[a-zA-Z0-9._-]+$/;
    if (!validPattern.test(stepName)) {
        return { valid: false, error: 'Step name contains invalid characters. Only alphanumeric, dots, hyphens, and underscores are allowed' };
    }
    // Prevent excessively long names
    if (stepName.length > 100) {
        return { valid: false, error: 'Step name is too long (max 100 characters)' };
    }
    return { valid: true };
}
/**
 * Validates a file path to prevent path traversal attacks.
 */
function validateFilePath(filePath, baseDir) {
    if (!filePath || typeof filePath !== 'string') {
        return { valid: false, error: 'File path must be a non-empty string' };
    }
    // Normalize the path
    const normalized = path_1.default.resolve(baseDir || process.cwd(), filePath);
    // If baseDir is provided, ensure the normalized path is within it
    if (baseDir) {
        const normalizedBase = path_1.default.resolve(baseDir);
        if (!normalized.startsWith(normalizedBase)) {
            return { valid: false, error: 'File path attempts to traverse outside base directory' };
        }
    }
    return { valid: true, normalized };
}
