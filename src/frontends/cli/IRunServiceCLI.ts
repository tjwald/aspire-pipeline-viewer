import { IRunService, ParsedEvent, ParsedEventType } from '@aspire-pipeline-viewer/core';
import { spawn, ChildProcess } from 'child_process';
import { parseLogLine } from '@aspire-pipeline-viewer/core';

export class RunServiceCLI implements IRunService {
  private listeners: Array<(payload: { runId: string; event: ParsedEvent }) => void> = [];
  private currentProc: ChildProcess | null = null;
  private runId: string = '';
  private cwd: string;

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

    this.currentProc.stdout?.on('data', (data) => {
      const lines = data.toString().split(/\r?\n/);
      for (const line of lines) {
        const events = parseLogLine(line);
        for (const event of events) {
          this.emit('event', { runId: this.runId, event });
        }
      }
    });

    this.currentProc.stderr?.on('data', (data) => {
      const lines = data.toString().split(/\r?\n/);
      for (const line of lines) {
        const events = parseLogLine(line);
        for (const event of events) {
          this.emit('event', { runId: this.runId, event });
        }
      }
    });

    return this.runId;
  }

  async stopRun(runId: string): Promise<void> {
    if (this.currentProc && this.runId === runId) {
      this.currentProc.kill();
      this.currentProc = null;
    }
  }

  async renameRun(runId: string, name: string): Promise<void> {
    // No-op for CLI
  }

  async getRunHistory(): Promise<Array<{ runId: string; name?: string; startedAt: number }>> {
    // No-op for CLI
    return [];
  }
}

