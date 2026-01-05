#!/usr/bin/env node
import fs from 'fs'
import path from 'path'
import readline from 'readline'
import { DiagnosticsService, validateDirectory, validateFilePath, validateStepName } from '@aspire-pipeline-viewer/core'

type CliOptions = {
  diagnosticsPath?: string
  directory?: string
  outputFormat: 'json' | 'text'
  nonInteractive: boolean
  showHelp: boolean
  step?: string
}

const HELP_TEXT = `
Aspire Pipeline Viewer CLI

Usage:
  aspire-pipeline-cli [options]
  aspire-pipeline-cli run-step --directory <path> --step <name>

Options:
  --diagnostics, -d <path>    Path to diagnostics file (relative to cwd)
  --directory, -C <path>      Path to AppHost directory
  --step <name>               Step name to execute (requires --directory)
  --json                      Output as JSON (default)
  --text                      Output as human-readable text
  --no-interactive            Non-interactive mode (fail if inputs missing)
  --help, -h                  Show this help message

Commands:
  run-step                    Execute a step and stream parsed output in real time

Examples:
  # Parse from file
  aspire-pipeline-cli --diagnostics ./diagnostics.txt

  # Interactive mode (prompts for missing inputs)
  aspire-pipeline-cli

  # Run a step (filtered output)
  aspire-pipeline-cli --directory . --step build --no-interactive

  # Execute and stream a step
  aspire-pipeline-cli run-step --directory . --step build
`

function parseArgs(argv: string[]): CliOptions {
  const opts: CliOptions = {
    outputFormat: 'json',
    nonInteractive: false,
    showHelp: false,
  }

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]
    if (arg === '--diagnostics' || arg === '-d') {
      opts.diagnosticsPath = argv[++i]
    } else if (arg === '--directory' || arg === '-C') {
      opts.directory = argv[++i]
    } else if (arg === '--step') {
      opts.step = argv[++i]
    } else if (arg === '--json') {
      opts.outputFormat = 'json'
    } else if (arg === '--text') {
      opts.outputFormat = 'text'
    } else if (arg === '--no-interactive') {
      opts.nonInteractive = true
    } else if (arg === '--help' || arg === '-h') {
      opts.showHelp = true
    }
  }

  return opts
}

function createReadlineInterface(): readline.Interface {
  return readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  })
}

async function promptForInput(rl: readline.Interface, question: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer)
    })
  })
}

async function interactiveMode(rl: readline.Interface): Promise<{ diagnosticsPath?: string; directory?: string }> {
  console.log('\n📋 Aspire Pipeline Viewer - Interactive Mode')
  console.log('─'.repeat(50))

  const hasDiagnosticsPath = process.env.DIAGNOSTICS_PATH || false
  const hasDirectory = process.env.APPHOST_DIR || false

  if (!hasDiagnosticsPath && !hasDirectory) {
    const choice = await promptForInput(rl, '\nParse from file (f) or directory (d)? [f/d]: ')
    if (choice.toLowerCase() === 'd') {
      const directory = await promptForInput(rl, 'AppHost directory path: ')
      return { directory }
    }
  }

  const diagnosticsPath = await promptForInput(rl, 'Path to diagnostics file: ')
  return { diagnosticsPath }
}

import { RunServiceCLI } from './IRunServiceCLI';

async function runStepCommand(directory: string, stepName: string) {
  const { validateDirectory, validateStepName } = await import('@aspire-pipeline-viewer/core');
  const path = await import('path');

  // Validate directory
  const dirValidation = validateDirectory(path.resolve(process.cwd(), directory));
  if (!dirValidation.valid) {
    console.error(`❌ Invalid directory: ${dirValidation.error}`);
    process.exit(1);
  }
  const resolvedDir = dirValidation.normalized!;

  // Validate step name
  const stepValidation = validateStepName(stepName);
  if (!stepValidation.valid) {
    console.error(`❌ Invalid step name: ${stepValidation.error}`);
    process.exit(1);
  }

  // Use CLI-side IRunService
  const runService = new RunServiceCLI(resolvedDir);
  runService.on('event', ({ runId: _runId, event }) => {
    // Output all events as JSON
    console.log(JSON.stringify(event));
  });

  try {
    const _runId = await runService.startRun(stepName);
    // Wait for process to finish (handled by RunServiceCLI)
    // Optionally, add graceful shutdown or error handling here
  } catch (err) {
    console.error(`❌ Failed to run step: ${err instanceof Error ? err.message : String(err)}`);
    process.exit(1);
  }
}

async function main() {
  const argv = process.argv.slice(2);

  // Check for run-step command
  if (argv[0] === 'run-step') {
    let directory = '';
    let stepName = '';
    for (let i = 1; i < argv.length; i++) {
      if (argv[i] === '--directory' || argv[i] === '-C') {
        directory = argv[++i];
      } else if (argv[i] === '--step') {
        stepName = argv[++i];
      }
    }
    if (!directory || !stepName) {
      console.error('❌ run-step requires --directory and --step');
      process.exit(1);
    }
    await runStepCommand(directory, stepName);
    return;
  }

  const opts = parseArgs(argv);

  if (opts.showHelp) {
    console.log(HELP_TEXT);
    process.exit(0);
  }

  let diagnosticsPath = opts.diagnosticsPath;
  let directory = opts.directory;

  // Interactive mode if needed
  if (!diagnosticsPath && !directory && !opts.nonInteractive) {
    const rl = createReadlineInterface();
    const inputs = await interactiveMode(rl);
    diagnosticsPath = inputs.diagnosticsPath;
    directory = inputs.directory;
    rl.close();
  }

  // Resolve diagnostics
  if (!diagnosticsPath && !directory) {
    console.error('❌ Error: No diagnostics path or directory provided');
    console.error('Use --help for usage information');
    process.exit(1);
  }

  try {
    let diagnosticsText: string;

    if (diagnosticsPath) {
      // Validate diagnostics file path to prevent path traversal
      const pathValidation = validateFilePath(diagnosticsPath, process.cwd());
      if (!pathValidation.valid) {
        throw new Error(`Invalid diagnostics path: ${pathValidation.error}`);
      }

      const resolvedPath = pathValidation.normalized!;
      if (!fs.existsSync(resolvedPath)) {
        throw new Error(`Diagnostics file not found: ${resolvedPath}`);
      }
      diagnosticsText = fs.readFileSync(resolvedPath, 'utf-8');
    } else if (directory) {
      // Validate directory to prevent path traversal
      const dirValidation = validateDirectory(path.resolve(process.cwd(), directory));
      if (!dirValidation.valid) {
        throw new Error(`Invalid directory: ${dirValidation.error}`);
      }

      const resolvedDir = dirValidation.normalized!;

      const { spawn } = await import('child_process');
      const result = await new Promise<string>((resolve, reject) => {
        const aspireCmd = process.platform === 'win32' ? 'aspire.exe' : 'aspire';
        const proc = spawn(aspireCmd, ['do', 'diagnostics'], {
          cwd: resolvedDir,
          stdio: ['pipe', 'pipe', 'pipe'],
        });

        let output = '';
        let errorOutput = '';

        proc.stdout?.on('data', (data) => {
          output += data.toString();
        });

        proc.stderr?.on('data', (data) => {
          errorOutput += data.toString();
        });

        proc.on('close', (code) => {
          if (code !== 0 && !output && !errorOutput) {
            reject(new Error(`aspire do diagnostics failed with code ${code}`));
          } else {
            // aspire outputs to both stdout and stderr, so we use whichever has content
            resolve(output || errorOutput);
          }
        });

        proc.on('error', (err) => {
          reject(new Error(`Failed to run aspire: ${err.message}`));
        });
      });

      diagnosticsText = result;
    } else {
      throw new Error('No input source');
    }

    // Validate step name if provided
    if (opts.step) {
      const stepValidation = validateStepName(opts.step);
      if (!stepValidation.valid) {
        throw new Error(`Invalid step name: ${stepValidation.error}`);
      }
    }

    // Use the core service to analyze diagnostics
    const output = DiagnosticsService.analyze(diagnosticsText, opts.outputFormat, opts.step);
    console.log(output);

    // Exit with success
    process.exit(0);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`❌ Error: ${message}`);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('❌ Fatal error:', err);
  process.exit(1);
});
