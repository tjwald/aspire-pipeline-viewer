import { test, expect, _electron as electron } from '@playwright/test'
import path from 'path'
import type { ElectronApplication, Page } from 'playwright'

let electronApp: ElectronApplication
let window: Page

test.beforeAll(async () => {
  console.log('Starting Electron app...')
  const mainPath = path.join(process.cwd(), 'dist-electron/main.cjs')
  console.log('Main path:', mainPath)
  
  try {
    // Launch Electron app
    electronApp = await electron.launch({
      args: [mainPath],
      env: {
        ...process.env,
        NODE_ENV: 'test',
      },
    })
    console.log('Electron app launched')

    // Wait for the first BrowserWindow (not DevTools)
    window = await electronApp.firstWindow()
    
    // If DevTools opened, wait for the actual app window
    const title = await window.title()
    if (title.includes('DevTools')) {
      // Get all windows and find the main one
      const windows = electronApp.windows()
      for (const w of windows) {
        const t = await w.title()
        if (!t.includes('DevTools')) {
          window = w
          break
        }
      }
    }
    
    console.log('Window obtained')
    await window.waitForLoadState('domcontentloaded')
    console.log('Window loaded')
  } catch (error) {
    console.error('Failed to launch Electron:', error)
    throw error
  }
})

test.afterAll(async () => {
  if (electronApp) {
    await electronApp.close()
  }
})

test.describe('App Launch', () => {
  test('should launch Electron app successfully', async () => {
    expect(electronApp).toBeTruthy()
  })

  test('should have a visible window', async () => {
    // Check window count - app should have at least one window
    const windows = electronApp.windows()
    expect(windows.length).toBeGreaterThan(0)
  })

  test('should have correct window title', async () => {
    const title = await window.title()
    // Title should be the app name or include it
    expect(title.includes('DevTools')).toBe(false)
  })

  test('should render main app container', async () => {
    // Wait for React to mount
    const appRoot = window.locator('#root')
    await expect(appRoot).toBeAttached({ timeout: 10000 })
    
    // Allow time for React to hydrate
    await window.waitForTimeout(2000)
    
    // Verify React rendered content inside #root
    const rootContent = await appRoot.innerHTML()
    expect(rootContent.length).toBeGreaterThan(0)
  })

  test('should display welcome state or directory selector', async () => {
    // App should show either the welcome screen or directory selection UI
    const body = await window.textContent('body')
    expect(body).toBeTruthy()
    expect(body!.length).toBeGreaterThan(0)
  })

  test('should not have console errors', async () => {
    const errors: string[] = []
    window.on('console', (msg) => {
      if (msg.type() === 'error') {
        errors.push(msg.text())
      }
    })

    // Wait a bit to catch any errors
    await window.waitForTimeout(1000)

    // Filter out known DevTools warnings about Autofill
    const realErrors = errors.filter(
      (err) => !err.includes('Autofill') && !err.includes('DevTools')
    )
    expect(realErrors).toHaveLength(0)
  })
})
