import { spawn, type ChildProcess, type SpawnOptions } from 'child_process'
import { LineBuffer } from './LineBuffer'

type ProcessSignal = 'SIGTERM' | 'SIGKILL'
type ProcessEnvironment = Record<string, string | undefined>

export interface SpawnProcessOptions {
  cwd?: string
  timeoutMs?: number
  signal?: AbortSignal
  onStdoutLine?: (line: string) => void
  onStderrLine?: (line: string) => void
  onRawStdout?: (chunk: string) => void
  onRawStderr?: (chunk: string) => void
  env?: ProcessEnvironment
}

export interface ManagedProcess {
  pid?: number
  child: ChildProcess
  kill: (signal?: ProcessSignal) => Promise<void>
  completion: Promise<{ code: number | null; signal: ProcessSignal | null }>
}

export class ProcessManager {
  private activeProcesses = new Map<number, ChildProcess>()

  /**
   * Spawns a supervised process with line framing, cancellation, and timeout management.
   */
  spawn(
    command: string,
    args: string[],
    options: SpawnProcessOptions = {}
  ): ManagedProcess {
    const isWin = process.platform === 'win32'
    
    // Command resolution for cross-platform execution
    let cmd = command
    let cmdArgs = args
    let useShell = false

    if (isWin && !command.endsWith('.exe') && !command.endsWith('.cmd') && !command.endsWith('.bat')) {
      // In Windows, aspire might be a cmd/batch script or on PATH
      useShell = true
    }

    const spawnOpts: SpawnOptions = {
      cwd: options.cwd || process.cwd(),
      stdio: ['pipe', 'pipe', 'pipe'],
      shell: useShell,
      env: options.env || process.env,
    }

    const child = spawn(cmd, cmdArgs, spawnOpts)
    const pid = child.pid

    if (pid) {
      this.activeProcesses.set(pid, child)
    }

    const stdoutBuffer = new LineBuffer()
    const stderrBuffer = new LineBuffer()

    child.stdout?.on('data', (chunk: Buffer | string) => {
      const text = chunk.toString()
      options.onRawStdout?.(text)

      const lines = stdoutBuffer.append(text)
      for (const line of lines) {
        options.onStdoutLine?.(line)
      }
    })

    child.stderr?.on('data', (chunk: Buffer | string) => {
      const text = chunk.toString()
      options.onRawStderr?.(text)

      const lines = stderrBuffer.append(text)
      for (const line of lines) {
        options.onStderrLine?.(line)
      }
    })

    let timeoutTimer: ReturnType<typeof setTimeout> | undefined
    if (options.timeoutMs && options.timeoutMs > 0) {
      timeoutTimer = setTimeout(() => {
        this.killChild(child).catch(() => {})
      }, options.timeoutMs)
    }

    const abortHandler = () => {
      this.killChild(child).catch(() => {})
    }

    if (options.signal) {
      if (options.signal.aborted) {
        abortHandler()
      } else {
        options.signal.addEventListener('abort', abortHandler, { once: true })
      }
    }

    const completion = new Promise<{ code: number | null; signal: ProcessSignal | null }>((resolve) => {
      const cleanup = (code: number | null, signal: ProcessSignal | null) => {
        if (timeoutTimer) clearTimeout(timeoutTimer)
        if (options.signal) {
          options.signal.removeEventListener('abort', abortHandler)
        }
        if (pid) {
          this.activeProcesses.delete(pid)
        }

        // Flush remaining buffered lines
        const remainingStdout = stdoutBuffer.flush()
        if (remainingStdout !== null) {
          options.onStdoutLine?.(remainingStdout)
        }

        const remainingStderr = stderrBuffer.flush()
        if (remainingStderr !== null) {
          options.onStderrLine?.(remainingStderr)
        }

        resolve({ code, signal })
      }

      child.on('close', (code, signal) => cleanup(code, signal as ProcessSignal | null))
      child.on('error', () => cleanup(-1, null))
    })

    return {
      pid,
      child,
      kill: (sig?: ProcessSignal) => this.killChild(child, sig),
      completion,
    }
  }

  /**
   * Terminate a child process safely
   */
  async killChild(child: ChildProcess, signal: ProcessSignal = 'SIGTERM'): Promise<void> {
    if (!child || child.killed || child.exitCode !== null) return

    return new Promise((resolve) => {
      try {
        if (process.platform === 'win32' && child.pid) {
          // Use taskkill to kill process tree on Windows
          const killer = spawn('taskkill', ['/pid', child.pid.toString(), '/T', '/F'])
          killer.on('close', () => resolve())
          killer.on('error', () => {
            try {
              child.kill(signal)
            } catch {
              // ignore
            }
            resolve()
          })
        } else {
          child.kill(signal)
          resolve()
        }
      } catch {
        resolve()
      }
    })
  }

  /**
   * Terminate all active supervised processes
   */
  async killAll(): Promise<void> {
    const promises: Promise<void>[] = []
    for (const child of this.activeProcesses.values()) {
      promises.push(this.killChild(child))
    }
    await Promise.all(promises)
    this.activeProcesses.clear()
  }
}
