import { app, BrowserWindow, ipcMain, dialog } from 'electron'
import path from 'path'
import { spawn } from 'child_process'

let mainWindow: BrowserWindow | null = null

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  const isDev = !app.isPackaged

  if (isDev) {
    mainWindow.loadURL('http://localhost:5174')
    mainWindow.webContents.openDevTools()
  } else {
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
      const cmd = process.platform === 'win32' ? 'cmd' : 'sh'
      const cmdArgs =
        process.platform === 'win32'
          ? ['/c', 'aspire', ...args]
          : ['-lc', `aspire ${args.join(' ')}`]

      const child = spawn(cmd, cmdArgs, { cwd: directory, stdio: 'pipe' })
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
  const result = await dialog.showOpenDialog(mainWindow!, {
    properties: ['openDirectory'],
    title: 'Select AppHost Directory',
  })
  if (result.canceled || result.filePaths.length === 0) return null
  return result.filePaths[0]
})

ipcMain.handle('run-aspire-do', async (_evt, directory: string, step: string) => {
  return runAspireCommand(directory, ['do', step])
})

ipcMain.handle('get-apphost-diagnostics', async (_evt, directory: string) => {
  return runAspireCommand(directory, ['do', 'diagnostics'])
})
