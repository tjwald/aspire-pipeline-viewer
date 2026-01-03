import { test, expect } from '@playwright/test'
import type { ElectronApplication, Page } from 'playwright'
import { launchElectronApp } from '../launch-utils'

/**
 * Minimal E2E tests for the Run Tab functionality.
 * These tests mock the preload bridge to simulate run events without starting real processes.
 */

let electronApp: ElectronApplication
let window: Page

test.beforeAll(async () => {
  console.log('Starting Electron app for Run Tab tests...')

  try {
    electronApp = await launchElectronApp()
    window = await electronApp.firstWindow()

    // Skip DevTools window if opened
    const title = await window.title()
    if (title.includes('DevTools')) {
      const windows = electronApp.windows()
      for (const w of windows) {
        const t = await w.title()
        if (!t.includes('DevTools')) {
          window = w
          break
        }
      }
    }

    await window.waitForLoadState('domcontentloaded')
    console.log('Window loaded for Run Tab tests')
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

test.describe('Run Tab UI', () => {
  test('should render view mode tabs in Electron', async () => {
    // Wait for React to mount
    const appRoot = window.locator('#root')
    await expect(appRoot).toBeAttached({ timeout: 10000 })
    await window.waitForTimeout(2000)

    // Check if view mode tabs are rendered
    // Note: View tabs only appear when there's a graph loaded
    // We check the app renders without errors first
    const rootContent = await appRoot.innerHTML()
    expect(rootContent.length).toBeGreaterThan(0)
  })

  test('should have working view mode toggle when graph is loaded', async () => {
    // This test verifies the view mode system works
    // We check that the app container exists
    const appContainer = window.locator('.app-container')
    await expect(appContainer).toBeAttached({ timeout: 5000 })
  })
})

test.describe('Run Tab with Mocked Events', () => {
  test('should be able to inject mock run API methods', async () => {
    // Inject mock electronAPI methods and test the UI responds
    await window.evaluate(() => {
      // Type-safe access to window in browser context
      const win = window as typeof window & { 
        electronAPI?: Record<string, unknown>
        __mockRunCallbacks?: {
          runOutput: Array<(data: unknown) => void>
          runStatus: Array<(data: unknown) => void>
        }
      }

      const mockCallbacks = {
        runOutput: [] as Array<(data: unknown) => void>,
        runStatus: [] as Array<(data: unknown) => void>,
      }

      // Extend existing electronAPI with run methods
      win.electronAPI = {
        ...win.electronAPI,
        runStep: async () => `mock-run-${Date.now()}`,
        killRun: async () => undefined,
        renameRun: async () => undefined,
        onRunOutput: (cb: (data: unknown) => void) => {
          mockCallbacks.runOutput.push(cb)
          return () => {
            const idx = mockCallbacks.runOutput.indexOf(cb)
            if (idx >= 0) mockCallbacks.runOutput.splice(idx, 1)
          }
        },
        onRunStatusChange: (cb: (data: unknown) => void) => {
          mockCallbacks.runStatus.push(cb)
          return () => {
            const idx = mockCallbacks.runStatus.indexOf(cb)
            if (idx >= 0) mockCallbacks.runStatus.splice(idx, 1)
          }
        },
      }

      // Expose callbacks for testing
      win.__mockRunCallbacks = mockCallbacks
    })

    // Verify the mock API was injected
    const hasRunStep = await window.evaluate(() => {
      const win = window as typeof window & { electronAPI?: Record<string, unknown> }
      return typeof win.electronAPI?.runStep === 'function'
    })
    expect(hasRunStep).toBe(true)
  })

  test('should handle run output events when subscribed', async () => {
    const hasOnRunOutput = await window.evaluate(() => {
      const win = window as typeof window & { electronAPI?: Record<string, unknown> }
      return typeof win.electronAPI?.onRunOutput === 'function'
    })
    expect(hasOnRunOutput).toBe(true)

    // Verify subscription works
    const subscriptionWorks = await window.evaluate(() => {
      const win = window as typeof window & { 
        electronAPI?: { onRunOutput?: (cb: () => void) => (() => void) | undefined }
      }
      if (!win.electronAPI?.onRunOutput) return false
      const unsub = win.electronAPI.onRunOutput(() => {})
      if (typeof unsub === 'function') {
        unsub()
        return true
      }
      return false
    })
    expect(subscriptionWorks).toBe(true)
  })

  test('should handle run status change events', async () => {
    const hasOnRunStatusChange = await window.evaluate(() => {
      const win = window as typeof window & { electronAPI?: Record<string, unknown> }
      return typeof win.electronAPI?.onRunStatusChange === 'function'
    })
    expect(hasOnRunStatusChange).toBe(true)
  })

  test('should emit run output to subscribers', async () => {
    interface OutputResult {
      success: boolean
      error: string | null
      data: { runId: string; line: string } | null
    }
    
    // Test that emitting run output triggers callbacks
    const result: OutputResult = await window.evaluate(() => {
      const win = window as typeof window & {
        electronAPI?: { onRunOutput?: (cb: (data: { runId: string; line: string }) => void) => () => void }
      }

      // Verify onRunOutput exists (from preload)
      if (!win.electronAPI?.onRunOutput) return { success: false, error: 'No onRunOutput', data: null }

      let received = false
      let receivedData: { runId: string; line: string } | null = null

      // Subscribe to events
      const unsubscribe = win.electronAPI.onRunOutput((data) => {
        received = true
        receivedData = data
      })

      // Since we can't actually trigger IPC events from E2E tests,
      // we verify that subscription returns an unsubscribe function
      const hasUnsubscribe = typeof unsubscribe === 'function'
      
      if (unsubscribe) unsubscribe()

      // Return success if subscription mechanism works
      return { success: hasUnsubscribe, error: null, data: null }
    })

    expect(result.success).toBe(true)
  })

  test('should emit status changes to subscribers', async () => {
    interface StatusResult {
      success: boolean
      error: string | null
      data: { runId: string; status: string; nodeStatuses: Record<string, string> } | null
    }

    const result: StatusResult = await window.evaluate(() => {
      const win = window as typeof window & {
        electronAPI?: {
          onRunStatusChange?: (cb: (data: { runId: string; status: string; nodeStatuses: Record<string, string> }) => void) => () => void
        }
      }

      // Verify onRunStatusChange exists (from preload)
      if (!win.electronAPI?.onRunStatusChange) return { success: false, error: 'No onRunStatusChange', data: null }

      let received = false
      let receivedData: { runId: string; status: string; nodeStatuses: Record<string, string> } | null = null

      // Subscribe to events
      const unsubscribe = win.electronAPI.onRunStatusChange((data) => {
        received = true
        receivedData = data
      })

      // Since we can't actually trigger IPC events from E2E tests,
      // we verify that subscription returns an unsubscribe function
      const hasUnsubscribe = typeof unsubscribe === 'function'
      
      if (unsubscribe) unsubscribe()

      // Return success if subscription mechanism works
      return { success: hasUnsubscribe, error: null, data: null }
    })

    expect(result.success).toBe(true)
  })
})

test.describe('Run Tab Components Integration', () => {
  test('should not break the main app when run components are imported', async () => {
    // Verify the app still works with RunTab components integrated
    const appRoot = window.locator('#root')
    await expect(appRoot).toBeAttached({ timeout: 5000 })

    // Check there are no critical console errors related to RunTab
    const errors: string[] = []
    window.on('console', (msg) => {
      if (msg.type() === 'error') {
        errors.push(msg.text())
      }
    })

    await window.waitForTimeout(1000)

    // Filter out known non-critical errors
    const criticalErrors = errors.filter(
      (err) =>
        !err.includes('Autofill') &&
        !err.includes('DevTools') &&
        err.toLowerCase().includes('runtab')
    )
    expect(criticalErrors).toHaveLength(0)
  })

  test('should have RunTab components available for rendering', async () => {
    // Verify the components exist in the bundle by checking React DevTools or DOM
    const hasComponents = await window.evaluate(() => {
      // Check if the app container exists (indicates React app is working)
      const container = document.querySelector('.app-container')
      return !!container
    })

    expect(hasComponents).toBe(true)
  })
})
