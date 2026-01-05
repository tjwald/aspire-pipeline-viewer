import { IRunService, ParsedEvent } from '@aspire-pipeline-viewer/core';
import { spawn, ChildProcess } from 'child_process';
import { parseLogLine } from '@aspire-pipeline-viewer/core';

export class RunServiceCLI implements IRunService {
  private listeners: Array<(payload: { runId: string; event: ParsedEvent }) => void> = [];
  private currentProc: ChildProcess | null = null;
  private runId: string = '';
  private cwd: string;

  // Buffers for partial lines
  private stdoutBuffer = '';
  private stderrBuffer = '';

  constructor(cwd: string) {
    this.cwd = cwd;
  }

  on(event: 'event', listener: (payload: { runId: string; event: ParsedEvent }) => void): void {
    if (event === 'event') {
      this.listeners.push(listener);
    }
  }

  off(event: 'event', listener: (payload: { runId: string; event: ParsedEvent }) => void): void {
    if (event === 'event') {
      this.listeners = this.listeners.filter(l => l !== listener);
    }
  }

  emit(event: 'event', payload: { runId: string; event: ParsedEvent }): void {
    if (event === 'event') {
      for (const listener of this.listeners) {
        listener(payload);
      }
    }
  }

  async startRun(stepName: string): Promise<string> {
    this.runId = `${stepName}-${Date.now()}`;
    const aspireCmd = process.platform === 'win32' ? 'aspire.exe' : 'aspire';

    this.currentProc = spawn(aspireCmd, ['do', stepName], {
      cwd: this.cwd,
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    // --- STDOUT ---
    this.currentProc.stdout?.on('data', (data) => {
      this.stdoutBuffer += data.toString();

      let newlineIndex;
      while ((newlineIndex = this.stdoutBuffer.indexOf('\n')) >= 0) {
        const line = this.stdoutBuffer.slice(0, newlineIndex);
        this.stdoutBuffer = this.stdoutBuffer.slice(newlineIndex + 1);

        const event = parseLogLine(line);
        if (event) {
          this.emit('event', { runId: this.runId, event });
        }
      }
    });

    // --- STDERR ---
    this.currentProc.stderr?.on('data', (data) => {
      this.stderrBuffer += data.toString();

      let newlineIndex;
      while ((newlineIndex = this.stderrBuffer.indexOf('\n')) >= 0) {
        const line = this.stderrBuffer.slice(0, newlineIndex);
        this.stderrBuffer = this.stderrBuffer.slice(newlineIndex + 1);

        const event = parseLogLine(line);
        if (event) {
          this.emit('event', { runId: this.runId, event });
        }
      }
    });

    // Flush remaining partial lines on exit
    const flushBuffers = () => {
      if (this.stdoutBuffer.length > 0) {
        const event = parseLogLine(this.stdoutBuffer);
        if (event) this.emit('event', { runId: this.runId, event });
        this.stdoutBuffer = '';
      }
      if (this.stderrBuffer.length > 0) {
        const event = parseLogLine(this.stderrBuffer);
        if (event) this.emit('event', { runId: this.runId, event });
        this.stderrBuffer = '';
      }
    };

    this.currentProc.on('close', flushBuffers);
    this.currentProc.on('exit', flushBuffers);

    return this.runId;
  }

  async stopRun(runId: string): Promise<void> {
    if (this.currentProc && this.runId === runId) {
      this.currentProc.kill();
      this.currentProc = null;
    }
  }

  async renameRun(_runId: string, _name: string): Promise<void> {
    // No-op for CLI
  }

  async getRunHistory(): Promise<Array<{ runId: string; name?: string; startedAt: number }>> {
    return [];
  }
}