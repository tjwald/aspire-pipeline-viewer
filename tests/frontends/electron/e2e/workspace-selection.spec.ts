import { test, expect, _electron as electron } from '@playwright/test'
import path from 'path'
import type { ElectronApplication, Page } from 'playwright'

/**
 * E2E tests for the directory selection and workspace loading flow.
 * These tests verify the user can interact with the workspace selector UI.
 */

let electronApp: ElectronApplication
let window: Page

test.beforeAll(async () => {
  const mainPath = path.join(process.cwd(), 'dist-electron/main.cjs')
  
  electronApp = await electron.launch({
    args: [mainPath],
    env: {
      ...process.env,
      NODE_ENV: 'test',
    },
  })

  window = await electronApp.firstWindow()
  await window.waitForLoadState('domcontentloaded')
  // Wait for React to hydrate
  await window.waitForTimeout(1000)
})

test.afterAll(async () => {
  if (electronApp) {
    await electronApp.close()
  }
})

test.describe('Workspace Selection', () => {
  test('should display sidebar with workspace section', async () => {
    const sidebar = window.locator('.sidebar')
    await expect(sidebar).toBeVisible()
    
    // Use first() since there are multiple sidebar-header elements
    const workspaceSection = window.locator('.sidebar-header').first()
    await expect(workspaceSection).toContainText('Workspace')
  })

  test('should show "Open Workspace" button', async () => {
    const openButton = window.locator('button:has-text("Open Workspace")')
    await expect(openButton).toBeVisible()
  })

  test('should display prompt to select workspace when no workspace loaded', async () => {
    // When no workspace is loaded, the main area should show a prompt
    const promptText = window.locator('text=Select a workspace to load pipeline')
    await expect(promptText).toBeVisible()
  })

  test('should have electronAPI available in renderer', async () => {
    // Verify the preload script exposed electronAPI
    const hasElectronAPI = await window.evaluate(() => {
      return typeof window.electronAPI !== 'undefined'
    })
    expect(hasElectronAPI).toBe(true)
  })

  test('should have required IPC methods exposed', async () => {
    const methods = await window.evaluate(() => {
      const api = window.electronAPI
      if (!api) return []
      return Object.keys(api)
    })
    
    expect(methods).toContain('selectApphostDirectory')
    expect(methods).toContain('getApphostDiagnostics')
  })
})
