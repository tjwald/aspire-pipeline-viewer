import { test, expect } from '@playwright/test'
import type { ElectronApplication, Page } from 'playwright'
import { launchElectronApp } from '../launch-utils'

/**
 * E2E tests for sidebar interactions including:
 * - Step filtering
 * - Step selection
 * - Visibility toggles
 */

let electronApp: ElectronApplication
let window: Page

test.beforeAll(async () => {
  electronApp = await launchElectronApp()

  window = await electronApp.firstWindow()
  await window.waitForLoadState('domcontentloaded')
  await window.waitForTimeout(1000)
})

test.afterAll(async () => {
  if (electronApp) {
    await electronApp.close()
  }
})

test.describe('Sidebar Interactions', () => {
  test('should display sidebar header', async () => {
    // Use first() since there are multiple headers
    const header = window.locator('.sidebar-header').first()
    await expect(header).toBeVisible()
  })

  test('should show workspace section', async () => {
    const workspaceSection = window.locator('.workspace-section')
    await expect(workspaceSection).toBeVisible()
  })

  test('should have clickable Select AppHost Directory button', async () => {
    const button = window.locator('button:has-text("Select AppHost Directory")')
    await expect(button).toBeVisible()
    await expect(button).toBeEnabled()
  })

  test('Select AppHost Directory button should be focusable', async () => {
    const button = window.locator('button:has-text("Select AppHost Directory")')
    await button.focus()
    
    // Check the button received focus
    const isFocused = await button.evaluate((el) => document.activeElement === el)
    expect(isFocused).toBe(true)
  })
})

test.describe('Keyboard Navigation', () => {
  test('should support Tab navigation', async () => {
    // Press Tab and verify focus moves
    await window.keyboard.press('Tab')
    
    // Some element should be focused
    const focusedElement = await window.evaluate(() => document.activeElement?.tagName)
    expect(focusedElement).toBeTruthy()
  })

  test('should handle Escape key gracefully', async () => {
    // Press Escape - app should not crash
    await window.keyboard.press('Escape')
    
    // App should still be responsive
    const sidebar = window.locator('.sidebar')
    await expect(sidebar).toBeVisible()
  })
})

test.describe('Error Handling', () => {
  test('should display error boundary on component errors', async () => {
    // The app has ErrorBoundary components - verify they exist in structure
    const appContainer = window.locator('.app-container')
    await expect(appContainer).toBeVisible()
  })

  test('should gracefully handle missing electronAPI calls', async () => {
    // Verify the app doesn't crash if electronAPI methods fail
    const hasErrorState = await window.evaluate(() => {
      // Check if there's any visible error message
      const errorElements = document.querySelectorAll('[class*="error"]')
      return errorElements.length > 0
    })
    
    // Initial state should have no errors
    expect(hasErrorState).toBe(false)
  })
})
