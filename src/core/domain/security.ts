/**
 * Pure domain security validators (no platform/filesystem dependencies)
 */

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
    return {
      valid: false,
      error: 'Step name contains invalid characters. Only alphanumeric, dots, hyphens, and underscores are allowed',
    }
  }

  // Prevent excessively long names
  if (stepName.length > 100) {
    return { valid: false, error: 'Step name is too long (max 100 characters)' }
  }

  return { valid: true }
}
