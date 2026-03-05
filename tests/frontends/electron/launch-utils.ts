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

  const mainPath = path.join(process.cwd(), 'dist-electron/main.js')
  // Build args with CI sandbox handling
  const args = [mainPath]
  if (process.env.CI || process.env.GITHUB_ACTIONS) {
    args.unshift('--no-sandbox')
  }
  console.log('Electron launch args:', args)

  // 1. Clone the environment variables
  const env: Record<string, string | undefined> = {
    ...process.env,
    NODE_ENV: 'test',
    ...options?.additionalEnv,
  }

  if (options?.fixtureEnvVar && options?.fixturePath) {
    env[options.fixtureEnvVar] = path.join(process.cwd(), options.fixturePath)
  }

  // DEBUG: Let's catch the injected variable red-handed in your CI/terminal output
  console.log('--- DEBUG ENV ---');
  console.log('ELECTRON_RUN_AS_NODE is:', env.ELECTRON_RUN_AS_NODE);

  // 2. THE FIX: Mercilessly delete it from the payload before handing it to Playwright
  delete env.ELECTRON_RUN_AS_NODE;

  const filteredEnv: Record<string, string> = Object.fromEntries(Object.entries(env).filter(([_, v]) => v !== undefined)) as Record<string, string>;

  // Add fixture path if specified
  if (options?.fixtureEnvVar && options?.fixturePath) {
    filteredEnv[options.fixtureEnvVar] = path.join(process.cwd(), options.fixturePath)
  }

  return await electron.launch({
    args,
    env: filteredEnv,
  })
}
