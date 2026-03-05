import { spawn, ChildProcess } from 'child_process';
import { EventEmitter } from 'events';
import fs from 'fs';
import path from 'path';
import { parseLogLine, ParsedEvent, type IRunService, type PipelineGraph } from '@aspire-pipeline-viewer/core';

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
  targetStepId?: string;
  status: 'running' | 'success' | 'failed';
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

  async startRun(stepName: string, graph?: PipelineGraph): Promise<string> {
    const runId = `run-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const startedAt = Date.now();
    const logPath = path.join(this.baseDir, `${runId}.log`);

    const meta: RunMeta = {
      runId,
      name: `Run ${stepName} ${new Date(startedAt).toISOString()}`,
      startedAt,
      logPath,
      targetStepId: stepName,
      status: 'running',
    };

    fs.mkdirSync(path.dirname(logPath), { recursive: true });

    // Save initial graph state if provided
    if (graph) {
      await fs.promises.writeFile(
        path.join(this.baseDir, `${runId}.graph.json`),
        JSON.stringify(graph, null, 2),
        'utf-8'
      );
    }

    // Persist initial metadata IMMEDIATELY so the run can be rehydrated mid-flight
    await fs.promises.writeFile(
      path.join(this.baseDir, `${runId}.meta.json`),
      JSON.stringify(meta, null, 2),
      'utf-8'
    );

    const proc = spawn('aspire', ['do', stepName], {
      // Use 'pipe' for all 3 streams to avoid 'The handle is invalid' with .NET process
      stdio: 'pipe',
      cwd: this.workspaceDir || process.cwd(),
      // Add shell: true to avoid dealing with wrapping in cmd/sh manually
      shell: true,
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
      
      const finalStatus = code === 0 ? 'success' : 'failed';
      
      // Explicitly emit a status change so the UI knows the overall run is done
      this.emit('run-status-change', {
        runId,
        status: finalStatus
      });
      
      // Update meta to indicate completion on disk
      const metaPath = path.join(this.baseDir, `${runId}.meta.json`);
      try {
        const currentMeta = JSON.parse(fs.readFileSync(metaPath, 'utf-8')) as RunMeta;
        currentMeta.status = finalStatus;
        fs.writeFileSync(metaPath, JSON.stringify(currentMeta, null, 2), 'utf-8');
      } catch { /* ignore */ }
    });

    return runId;
  }

  async stopRun(runId: string): Promise<void> {
    const rec = this.runs.get(runId);
    if (!rec) return;

    try {
      rec.proc?.kill('SIGTERM');
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
      const meta = { runId, name, startedAt: Date.now() }; // Note this fallback rarely hits unless missing but doesn't usually happen mid-rename
      await fs.promises.writeFile(metaPath, JSON.stringify(meta, null, 2), 'utf-8');
    }
  }

  async getRunHistory(): Promise<Array<{ runId: string; name?: string; startedAt: number; targetStepId?: string }>> {
    try {
      const files = await fs.promises.readdir(this.baseDir);
      const metas: Array<{ runId: string; name?: string; startedAt: number; targetStepId?: string }> = [];

      for (const f of files) {
        if (!f.endsWith('.meta.json')) continue;

        try {
          const raw = await fs.promises.readFile(path.join(this.baseDir, f), 'utf-8');
          const meta = JSON.parse(raw) as RunMeta;
          metas.push({
            runId: meta.runId,
            name: meta.name,
            startedAt: meta.startedAt,
            targetStepId: meta.targetStepId,
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

  async getRunDetails(runId: string): Promise<{ meta: RunMeta; graph?: PipelineGraph; logs: ParsedEvent[] } | null> {
    try {
      const metaPath = path.join(this.baseDir, `${runId}.meta.json`);
      const metaRaw = await fs.promises.readFile(metaPath, 'utf-8');
      const meta = JSON.parse(metaRaw) as RunMeta;

      let graph: PipelineGraph | undefined;
      try {
        const graphRaw = await fs.promises.readFile(path.join(this.baseDir, `${runId}.graph.json`), 'utf-8');
        graph = JSON.parse(graphRaw) as PipelineGraph;
      } catch {
        // ignore missing graph
      }

      const logs: ParsedEvent[] = [];
      try {
        const logContent = await fs.promises.readFile(meta.logPath, 'utf-8');
        const lines = logContent.split('\n');
        for (const line of lines) {
          if (!line) continue;
          const ev = parseLogLine(line + '\n');
          if (ev) logs.push(ev);
        }
      } catch {
        // ignore missing logs
      }

      return { meta, graph, logs };
    } catch {
      return null;
    }
  }

  async getRunsDirectory(): Promise<string> {
    return this.baseDir;
  }
}