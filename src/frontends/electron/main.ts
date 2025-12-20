import { app, BrowserWindow, ipcMain, dialog } from 'electron'
import path from 'path'
import { spawn } from 'child_process'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

let mainWindow: BrowserWindow | null = null

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  const isDev = !app.isPackaged

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173')
    mainWindow.webContents.openDevTools()
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'))
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
  return new Promise((resolve, reject) => {
    try {
      const cmd = process.platform === 'win32' ? 'cmd' : 'sh'
      const args = process.platform === 'win32' ? ['/c', 'aspire', 'do', step] : ['-lc', `aspire do ${step}`]
      const child = spawn(cmd, args, { cwd: directory, stdio: 'pipe' })
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
    } catch (err) {
      reject(err)
    }
  })
})

ipcMain.handle('get-apphost-diagnostics', async (_evt, directory: string) => {
  return new Promise((resolve, reject) => {
    try {
      const cmd = process.platform === 'win32' ? 'cmd' : 'sh'
      const args = process.platform === 'win32' ? ['/c', 'aspire', 'do', 'diagnostic'] : ['-lc', `aspire do diagnostic`]
      const child = spawn(cmd, args, { cwd: directory, stdio: 'pipe' })
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
    } catch (err) {
      reject(err)
    }
  })
})
