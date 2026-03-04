import { app, BrowserWindow, ipcMain, dialog, type IpcMainInvokeEvent } from 'electron'
import path from 'path'
import fs from 'fs'
import { spawn } from 'child_process'
import { validateDirectory, validateStepName, type ParsedEvent } from '@aspire-pipeline-viewer/core'
import { RunService } from './services/runService'

let mainWindow: BrowserWindow | null = null

// create a shared RunService instance for the app
const runService = new RunService()

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      // Additional security: disable web security features that could be exploited
      webSecurity: true,
      allowRunningInsecureContent: false,
    },
  })

  // Set Content Security Policy for additional protection
  mainWindow.webContents.session.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [
          "default-src 'self'; " +
          "script-src 'self' 'unsafe-inline'; " +
          "style-src 'self' 'unsafe-inline'; " +
          "img-src 'self' data:; " +
          "connect-src 'self' http://localhost:* ws://localhost:*; " +
          "font-src 'self'; " +
          "object-src 'none'; " +
          "base-uri 'self'; " +
          "form-action 'self'"
        ]
      }
    })
  })

  const isDev = !app.isPackaged && process.env.NODE_ENV !== 'test'

  if (isDev) {
    mainWindow.loadURL('http://localhost:5174')
    mainWindow.webContents.openDevTools()
  } else {
    // Load the built renderer (for production and test)
    mainWindow.loadFile(path.join(__dirname, 'renderer/index.html'))
  }

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

if (app && typeof app.on === 'function') {
  app.on('ready', createWindow)

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit()
  })

  app.on('activate', () => {
    if (mainWindow === null) createWindow()
  })
}

// Shared command runner for aspire CLI commands
function runAspireCommand(
  directory: string,
  args: string[]
): Promise<{ code: number | null; output: string }> {
  return new Promise((resolve, reject) => {
    try {
      // Validate directory to prevent path traversal
      const dirValidation = validateDirectory(directory)
      if (!dirValidation.valid) {
        reject(new Error(`Invalid directory: ${dirValidation.error}`))
        return
      }

      // Use validated normalized path
      const safeDirectory = dirValidation.normalized!

      const cmd = process.platform === 'win32' ? 'cmd' : 'sh'
      const cmdArgs =
        process.platform === 'win32'
          ? ['/c', 'aspire', ...args]
          : ['-lc', `aspire ${args.join(' ')}`]

      const child = spawn(cmd, cmdArgs, { cwd: safeDirectory, stdio: 'pipe' })
      let output = ''

      child.stdout.on('data', (data) => {
        output += data.toString()
        mainWindow?.webContents.send('aspire-output', data.toString())
      })

      child.stderr.on('data', (data) => {
        output += data.toString()
        mainWindow?.webContents.send('aspire-error', data.toString())
      })

      child.on('close', (code) => {
        resolve({ code, output })
      })

      child.on('error', (err) => {
        reject(err)
      })
    } catch (err) {
      reject(err)
    }
  })
}

// Type for IPC handle function
type IpcHandleFunction = (
  channel: string,
  listener: (event: IpcMainInvokeEvent, ...args: unknown[]) => unknown
) => void

// Type for run event payload
interface RunEventPayload {
  runId: string
  event: ParsedEvent
}

// Exported setup function for run-related IPC handlers and event forwarding.
function setupRunIpcHandlers(
  ipc: { handle?: IpcHandleFunction },
  svc: RunService,
  getWindow: () => BrowserWindow | null
) {
  // register ipc handlers if available
  if (ipc && typeof ipc.handle === 'function') {
    ipc.handle('run-step', async (_evt: IpcMainInvokeEvent, stepName: unknown, graph: unknown) => {
      return svc.startRun(
        String(stepName),
        graph as import('@aspire-pipeline-viewer/core').PipelineGraph | undefined
      )
    })

    ipc.handle('kill-run', async (_evt: IpcMainInvokeEvent, runId: unknown) => {
      return svc.stopRun(String(runId))
    })

    ipc.handle('rename-run', async (_evt: IpcMainInvokeEvent, runId: unknown, name: unknown) => {
      return svc.renameRun(String(runId), String(name))
    })

    ipc.handle('get-run-details', async (_evt: IpcMainInvokeEvent, runId: unknown) => {
      return svc.getRunDetails(String(runId))
    })
  }

  // forward events emitted by RunService
  svc.on('event', (payload: RunEventPayload) => {
    const win = getWindow()
    if (!win) return
    const { runId, event } = payload
    // forward general output events - send ParsedEvent directly
    win.webContents.send('run-output', {
      runId,
      event
    })
    // forward status-change for terminal statuses
    if (event && (event.type === 'success' || event.type === 'failure')) {
      win.webContents.send('run-status-change', { runId, status: event.type, nodeStatuses: undefined })
    }
  })
}

// Register non-run IPC handlers only if ipcMain is functional
if (ipcMain && typeof ipcMain.handle === 'function') {
  ipcMain.handle('select-apphost-directory', async () => {
    // In test mode with fixture, return the fixture directory
    const testFixture = process.env.ASPIRE_TEST_FIXTURE
    if (testFixture) {
      const dir = path.dirname(testFixture)
      runService.setWorkspaceDirectory(dir)
      return dir
    }

    const result = await dialog.showOpenDialog(mainWindow!, {
      properties: ['openDirectory'],
      title: 'Select AppHost Directory',
    })
    if (result.canceled || result.filePaths.length === 0) return null
    
    // Set workspace directory in RunService
    runService.setWorkspaceDirectory(result.filePaths[0])
    return result.filePaths[0]
  })

  ipcMain.handle('run-aspire-do', async (_evt, directory: string, step: string) => {
    // Validate step name to prevent command injection
    const stepValidation = validateStepName(step)
    if (!stepValidation.valid) {
      throw new Error(`Invalid step name: ${stepValidation.error}`)
    }
    return runAspireCommand(directory, ['do', step])
  })

  ipcMain.handle('get-apphost-diagnostics', async (_evt, directory: string) => {
    // In test mode with fixture, return fixture content instead of running aspire
    const testFixture = process.env.ASPIRE_TEST_FIXTURE
    if (testFixture && fs.existsSync(testFixture)) {
      const output = fs.readFileSync(testFixture, 'utf-8')
      return { code: 0, output }
    }

    return runAspireCommand(directory, ['do', 'diagnostics'])
  })

  // wire up run handlers for the real app
  setupRunIpcHandlers(ipcMain, runService, () => mainWindow)
}

// Export for testing
export { setupRunIpcHandlers }
