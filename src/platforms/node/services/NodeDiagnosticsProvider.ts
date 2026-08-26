import fs from 'fs'
import { spawn } from 'child_process'
import type { DiagnosticsProvider } from '@aspire-pipeline-viewer/core'
import { validateDirectory, validateFilePath } from '../security'

export class NodeDiagnosticsProvider implements DiagnosticsProvider {
  private explicitDiagnosticsPath?: string

  constructor(explicitDiagnosticsPath?: string) {
    this.explicitDiagnosticsPath = explicitDiagnosticsPath
  }

  async getDiagnostics(directory: string): Promise<string> {
    if (this.explicitDiagnosticsPath) {
      const validation = validateFilePath(this.explicitDiagnosticsPath)
      if (!validation.valid) {
        throw new Error(`Invalid diagnostics path: ${validation.error}`)
      }
      const safePath = validation.normalized!
      if (!fs.existsSync(safePath)) {
        throw new Error(`Diagnostics file not found: ${safePath}`)
      }
      return fs.readFileSync(safePath, 'utf-8')
    }

    const dirValidation = validateDirectory(directory)
    if (!dirValidation.valid) {
      throw new Error(`Invalid directory: ${dirValidation.error}`)
    }

    const safeDirectory = dirValidation.normalized!

    return new Promise((resolve, reject) => {
      const cmd = process.platform === 'win32' ? 'cmd' : 'sh'
      const cmdArgs =
        process.platform === 'win32'
          ? ['/c', 'aspire', 'do', 'diagnostics']
          : ['-lc', 'aspire do diagnostics']

      const child = spawn(cmd, cmdArgs, { cwd: safeDirectory, stdio: 'pipe' })
      let output = ''

      child.stdout?.on('data', (data) => {
        output += data.toString()
      })

      child.stderr?.on('data', (data) => {
        output += data.toString()
      })

      child.on('close', (code) => {
        if (code !== 0 && !output) {
          reject(new Error(`aspire do diagnostics failed with code ${code}`))
        } else {
          resolve(output)
        }
      })

      child.on('error', (err) => {
        reject(err)
      })
    })
  }
}
