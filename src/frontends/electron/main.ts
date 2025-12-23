import { app, BrowserWindow, ipcMain, dialog } from 'electron'
import path from 'path'
import fs from 'fs'
import { spawn } from 'child_process'
import { validateDirectory, validateStepName } from '@aspire/core'

let mainWindow: BrowserWindow | null = null

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
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

app.on('ready', createWindow)

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

app.on('activate', () => {
  if (mainWindow === null) createWindow()
})

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

// IPC handlers
ipcMain.handle('select-apphost-directory', async () => {
  // In test mode with fixture, return the fixture directory
  const testFixture = process.env.ASPIRE_TEST_FIXTURE
  if (testFixture) {
    return path.dirname(testFixture)
  }
  
  const result = await dialog.showOpenDialog(mainWindow!, {
    properties: ['openDirectory'],
    title: 'Select AppHost Directory',
  })
  if (result.canceled || result.filePaths.length === 0) return null
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
