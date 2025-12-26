import { _electron as electron } from '@playwright/test'
import path from 'path'
import type { ElectronApplication } from 'playwright'

/**
 * Launch Electron app for testing with proper CI sandbox configuration
 * 
 * @param options Optional configuration
 * @returns Launched ElectronApplication instance
 */
export async function launchElectronApp(options?: {
  fixtureEnvVar?: string
  fixturePath?: string
  additionalEnv?: Record<string, string>
}): Promise<ElectronApplication> {

  const mainPath = path.join(process.cwd(), 'dist-electron/main.cjs')
  // Build args with CI sandbox handling
  const args = [mainPath]
  if (process.env.CI || process.env.GITHUB_ACTIONS) {
    args.unshift('--no-sandbox')
  }
  console.log('Electron launch args:', args)

  // Build environment
  const env: Record<string, string> = {
    ...process.env,
    NODE_ENV: 'test',
    ...options?.additionalEnv,
  }

  // Add fixture path if specified
  if (options?.fixtureEnvVar && options?.fixturePath) {
    env[options.fixtureEnvVar] = path.join(process.cwd(), options.fixturePath)
  }

  return await electron.launch({
    args,
    env,
  })
}
