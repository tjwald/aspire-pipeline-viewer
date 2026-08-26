import { spawn } from 'child_process'
import type { CommandRunner } from '@aspire-pipeline-viewer/core'
import { validateDirectory } from '../security'

export class NodeCommandRunner implements CommandRunner {
  private defaultCwd?: string

  constructor(defaultCwd?: string) {
    this.defaultCwd = defaultCwd
  }

  async run(directory: string, command: string, args: string[]): Promise<{ code: number; output: string }> {
    const dirValidation = validateDirectory(directory || this.defaultCwd || process.cwd())
    if (!dirValidation.valid) {
      throw new Error(`Invalid directory: ${dirValidation.error}`)
    }

    const safeDirectory = dirValidation.normalized!

    return new Promise((resolve, reject) => {
      const cmd = process.platform === 'win32' ? 'cmd' : 'sh'
      const cmdArgs =
        process.platform === 'win32'
          ? ['/c', command, ...args]
          : ['-lc', `${command} ${args.join(' ')}`]

      const child = spawn(cmd, cmdArgs, { cwd: safeDirectory, stdio: 'pipe' })
      let output = ''

      child.stdout?.on('data', (data) => {
        output += data.toString()
      })

      child.stderr?.on('data', (data) => {
        output += data.toString()
      })

      child.on('close', (code) => {
        resolve({ code: code || 0, output })
      })

      child.on('error', (err) => {
        reject(err)
      })
    })
  }
}
