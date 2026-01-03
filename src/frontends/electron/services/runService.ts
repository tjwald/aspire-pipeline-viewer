import { spawn, ChildProcess } from 'child_process';
import { EventEmitter } from 'events';
import fs from 'fs';
import path from 'path';
import { parseLogLine, ParsedEvent, type IRunService } from '@aspire-pipeline-viewer/core';

function getUserDataPath(): string {
  try {
    // Prefer Electron if available
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const electron = require('electron');
    return electron.app?.getPath?.('userData') || process.cwd();
  } catch {
    return process.cwd();
  }
}

interface RunMeta {
  runId: string;
  name?: string;
  startedAt: number;
  logPath: string;
}

export class RunService extends EventEmitter implements IRunService {
  private runs = new Map<
    string,
    { proc?: ChildProcess; meta: RunMeta; writeStream?: fs.WriteStream }
  >();

  private baseDir: string;
  private workspaceDir?: string;

  // Buffers for partial lines
  private stdoutBuffer = '';
  private stderrBuffer = '';

  constructor(userDataDir?: string) {
    super();
    this.baseDir = userDataDir || path.join(getUserDataPath(), 'runs');

    try {
      fs.mkdirSync(this.baseDir, { recursive: true });
    } catch {
      // ignore
    }
  }

  setWorkspaceDirectory(dir: string): void {
    this.workspaceDir = dir;
  }

  async startRun(stepName: string): Promise<string> {
    const runId = `run-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const startedAt = Date.now();
    const logPath = path.join(this.baseDir, `${runId}.log`);

    const meta: RunMeta = {
      runId,
      name: `Run ${stepName} ${new Date(startedAt).toISOString()}`,
      startedAt,
      logPath,
    };

    fs.mkdirSync(path.dirname(logPath), { recursive: true });

    const proc = spawn('aspire', ['do', stepName], {
      stdio: ['ignore', 'pipe', 'pipe'],
      cwd: this.workspaceDir || process.cwd(),
    });

    const ws = fs.createWriteStream(logPath, { flags: 'a' });

    this.runs.set(runId, { proc, meta, writeStream: ws });

    // --- STDOUT ---
    proc.stdout?.on('data', (chunk: Buffer | string) => {
      const text = chunk.toString();
      ws.write(text);

      this.stdoutBuffer += text;

      let idx;
      while ((idx = this.stdoutBuffer.indexOf('\n')) >= 0) {
        const line = this.stdoutBuffer.slice(0, idx);
        this.stdoutBuffer = this.stdoutBuffer.slice(idx + 1);

        const ev = parseLogLine(line);
        if (ev) this.emit('event', { runId, event: ev });
      }
    });

    // --- STDERR ---
    proc.stderr?.on('data', (chunk: Buffer | string) => {
      const text = chunk.toString();
      ws.write(text);

      this.stderrBuffer += text;

      let idx;
      while ((idx = this.stderrBuffer.indexOf('\n')) >= 0) {
        const line = this.stderrBuffer.slice(0, idx);
        this.stderrBuffer = this.stderrBuffer.slice(idx + 1);

        const ev = parseLogLine(line);
        if (ev) this.emit('event', { runId, event: ev });
      }
    });

    // Flush remaining partial lines on exit
    const flushBuffers = () => {
      if (this.stdoutBuffer.length > 0) {
        const ev = parseLogLine(this.stdoutBuffer);
        if (ev) this.emit('event', { runId, event: ev });
        this.stdoutBuffer = '';
      }

      if (this.stderrBuffer.length > 0) {
        const ev = parseLogLine(this.stderrBuffer);
        if (ev) this.emit('event', { runId, event: ev });
        this.stderrBuffer = '';
      }
    };

    proc.on('exit', (code) => {
      flushBuffers();

      try {
        ws.end();
      } catch {
        /* ignore */
      }

      const finalText = `${new Date().toISOString()} (system) → process-exit code=${code}\n`;
      try {
        fs.appendFileSync(logPath, finalText);
      } catch {
        /* ignore */
      }

      const ev: ParsedEvent = {
        timestamp: Date.now(),
        type: code === 0 ? 'success' : 'failure',
        text: finalText,
      };

      this.emit('event', { runId, event: ev });
    });

    // Persist metadata
    await fs.promises.writeFile(
      path.join(this.baseDir, `${runId}.meta.json`),
      JSON.stringify(meta, null, 2),
      'utf-8'
    );

    return runId;
  }

  async stopRun(runId: string): Promise<void> {
    const rec = this.runs.get(runId);
    if (!rec) return;

    try {
      rec.proc?.kill();
    } catch {
      /* ignore */
    }

    try {
      rec.writeStream?.end();
    } catch {
      /* ignore */
    }

    this.runs.delete(runId);
  }

  async renameRun(runId: string, name: string): Promise<void> {
    const metaPath = path.join(this.baseDir, `${runId}.meta.json`);

    try {
      const raw = await fs.promises.readFile(metaPath, 'utf-8');
      const meta = JSON.parse(raw);
      meta.name = name;

      await fs.promises.writeFile(metaPath, JSON.stringify(meta, null, 2), 'utf-8');
    } catch {
      const meta = { runId, name, startedAt: Date.now() };
      await fs.promises.writeFile(metaPath, JSON.stringify(meta, null, 2), 'utf-8');
    }
  }

  async getRunHistory(): Promise<Array<{ runId: string; name?: string; startedAt: number }>> {
    try {
      const files = await fs.promises.readdir(this.baseDir);
      const metas: Array<{ runId: string; name?: string; startedAt: number }> = [];

      for (const f of files) {
        if (!f.endsWith('.meta.json')) continue;

        try {
          const raw = await fs.promises.readFile(path.join(this.baseDir, f), 'utf-8');
          const meta = JSON.parse(raw);
          metas.push({
            runId: meta.runId,
            name: meta.name,
            startedAt: meta.startedAt,
          });
        } catch {
          /* ignore malformed metadata */
        }
      }

      return metas.sort((a, b) => b.startedAt - a.startedAt);
    } catch {
      return [];
    }
  }
}