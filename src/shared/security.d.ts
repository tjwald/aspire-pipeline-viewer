/**
 * Validates that a directory path is safe and exists.
 * Prevents directory traversal and ensures the path is absolute.
 */
export declare function validateDirectory(dirPath: string): {
    valid: boolean;
    error?: string;
    normalized?: string;
};
/**
 * Validates an Aspire step name to prevent command injection.
 * Step names should only contain alphanumeric characters, hyphens, and underscores.
 */
export declare function validateStepName(stepName: string): {
    valid: boolean;
    error?: string;
};
/**
 * Validates a file path to prevent path traversal attacks.
 */
export declare function validateFilePath(filePath: string, baseDir?: string): {
    valid: boolean;
    error?: string;
    normalized?: string;
};
