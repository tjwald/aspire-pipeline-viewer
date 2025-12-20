import { app, BrowserWindow, ipcMain, dialog } from 'electron'
import path from 'path'
import { spawn } from 'child_process'

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

// IPC handlers (skeleton)
ipcMain.handle('select-apphost-directory', async () => {
  const res = await dialog.showOpenDialog({ properties: ['openDirectory'] })
  if (res.canceled || res.filePaths.length === 0) return null
  return res.filePaths[0]
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
