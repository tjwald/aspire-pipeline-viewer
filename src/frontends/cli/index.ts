#!/usr/bin/env node
import fs from 'fs'
import path from 'path'
import readline from 'readline'
import { parseDiagnostics } from '@/core'

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

Options:
  --diagnostics, -d <path>    Path to diagnostics file (relative to cwd)
  --directory, -C <path>      Path to AppHost directory
  --step <name>               Step name to execute (requires --directory)
  --json                      Output as JSON (default)
  --text                      Output as human-readable text
  --no-interactive            Non-interactive mode (fail if inputs missing)
  --help, -h                  Show this help message

Examples:
  # Parse from file
  aspire-pipeline-cli --diagnostics ./diagnostics.txt

  # Interactive mode (prompts for missing inputs)
  aspire-pipeline-cli

  # Run a step
  aspire-pipeline-cli --directory . --step build --no-interactive
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

function formatGraph(graph: any, format: 'json' | 'text'): string {
  if (format === 'json') {
    return JSON.stringify(graph, null, 2)
  }

  // Text format
  let output = `\n📊 Pipeline: ${graph.name}\n`
  output += `ID: ${graph.id}\n`
  output += `Steps: ${graph.steps.length}\n`
  output += `Edges: ${graph.edges.length}\n\n`

  output += 'Steps:\n'
  for (const step of graph.steps) {
    output += `  • ${step.name} (${step.id})\n`
    if (step.description) {
      output += `    Description: ${step.description}\n`
    }
    if (step.resource) {
      output += `    Resource: ${step.resource}\n`
    }
    if (step.dependencies && step.dependencies.length > 0) {
      output += `    Dependencies: ${step.dependencies.join(', ')}\n`
    }
    output += `    Status: ${step.status}\n`
  }

  return output
}

async function main() {
  const argv = process.argv.slice(2)
  const opts = parseArgs(argv)

  if (opts.showHelp) {
    console.log(HELP_TEXT)
    process.exit(0)
  }

  let diagnosticsPath = opts.diagnosticsPath
  let directory = opts.directory

  // Interactive mode if needed
  if (!diagnosticsPath && !directory && !opts.nonInteractive) {
    const rl = createReadlineInterface()
    const inputs = await interactiveMode(rl)
    diagnosticsPath = inputs.diagnosticsPath
    directory = inputs.directory
    rl.close()
  }

  // Resolve diagnostics
  if (!diagnosticsPath && !directory) {
    console.error('❌ Error: No diagnostics path or directory provided')
    console.error('Use --help for usage information')
    process.exit(1)
  }

  try {
    let diagnosticsText: string

    if (diagnosticsPath) {
      const resolvedPath = path.resolve(process.cwd(), diagnosticsPath)
      if (!fs.existsSync(resolvedPath)) {
        throw new Error(`Diagnostics file not found: ${resolvedPath}`)
      }
      diagnosticsText = fs.readFileSync(resolvedPath, 'utf-8')
    } else if (directory) {
      // For now, read from file in directory if exists, otherwise try running aspire
      const diagPath = path.join(directory, 'diagnostics.txt')
      if (fs.existsSync(diagPath)) {
        diagnosticsText = fs.readFileSync(diagPath, 'utf-8')
      } else {
        throw new Error(`Diagnostics file not found in ${directory}`)
      }
    } else {
      throw new Error('No input source')
    }

    const graph = parseDiagnostics(diagnosticsText)

    const output = formatGraph(graph, opts.outputFormat)
    console.log(output)

    // Exit with success
    process.exit(0)
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error(`❌ Error: ${message}`)
    process.exit(1)
  }
}

main().catch((err) => {
  console.error('❌ Fatal error:', err)
  process.exit(1)
})

