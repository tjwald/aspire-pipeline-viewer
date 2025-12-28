import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { EventEmitter } from 'events'
import type { BrowserWindow } from 'electron'

// Mock RunService - minimal subset
class DummyRunService extends EventEmitter {
  startRun = vi.fn(async (stepName: string) => `run-${stepName}`)
  stopRun = vi.fn(async (runId: string) => {})
  renameRun = vi.fn(async (runId: string, name: string) => {})
}

// create a fake ipcMain-like handler registry to test setupRunIpcHandlers
const fakeIpc = {
  handlers: new Map<string, Function>(),
  handle(name: string, fn: Function) {
    this.handlers.set(name, fn)
  },
}

function makeFakeWindow() {
  const webContents = { send: vi.fn() }
  const win = { webContents } as unknown as BrowserWindow
  return win
}

describe('main IPC handlers and event forwarding', () => {
  let svc: DummyRunService
  let win: BrowserWindow
  let setupModule: any

  beforeEach(async () => {
    svc = new DummyRunService()
    win = makeFakeWindow()
    // import the module under test freshly
    vi.resetModules()
    setupModule = await import('../../../src/frontends/electron/main')
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('registers handlers that call RunService methods', async () => {
    // call setupRunIpcHandlers directly with our fake ipc and svc
    const { setupRunIpcHandlers } = setupModule
    setupRunIpcHandlers(fakeIpc, svc, () => win)

    // invoke run-step handler
    const runStepHandler = fakeIpc.handlers.get('run-step')
    expect(runStepHandler).toBeDefined()
    const runId = await runStepHandler!(null, 'install-uv-app')
    expect(svc.startRun).toHaveBeenCalledWith('install-uv-app')
    expect(runId).toBe('run-install-uv-app')

    // invoke kill-run handler
    const killHandler = fakeIpc.handlers.get('kill-run')
    expect(killHandler).toBeDefined()
    await killHandler!(null, 'run-install-uv-app')
    expect(svc.stopRun).toHaveBeenCalledWith('run-install-uv-app')

    // invoke rename-run handler
    const renameHandler = fakeIpc.handlers.get('rename-run')
    expect(renameHandler).toBeDefined()
    await renameHandler!(null, 'run-install-uv-app', 'My Run')
    expect(svc.renameRun).toHaveBeenCalledWith('run-install-uv-app', 'My Run')
  })

  it('forwards run events to renderer via webContents.send', async () => {
    const { setupRunIpcHandlers } = setupModule
    setupRunIpcHandlers(fakeIpc, svc, () => win)

    // emit event from svc
    svc.emit('event', { runId: 'run-1', event: { type: 'progress', text: '50%' } })
    // small tick
    await new Promise((r) => setTimeout(r, 0))
    expect((win.webContents.send as any).mock.calls.length).toBeGreaterThanOrEqual(1)
    expect((win.webContents.send as any).mock.calls[0][0]).toBe('run-output')

    // emit terminal event
    svc.emit('event', { runId: 'run-2', event: { type: 'success', text: 'done' } })
    await new Promise((r) => setTimeout(r, 0))
    const calls = (win.webContents.send as any).mock.calls
    // last call should be run-status-change
    expect(calls[calls.length - 1][0]).toBe('run-status-change')
  })
})
