#!/usr/bin/env node
import fs from 'fs'
import path from 'path'
import readline from 'readline'
import { parseDiagnostics } from '@aspire/core'

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

function formatGraph(graph: any, format: 'json' | 'text', stepFilter?: string): string {
  let filteredGraph = graph
  
  // If a step is specified, filter to show that step and its dependency chain
  if (stepFilter) {
    const requestedStep = graph.steps.find((s: any) => s.id === stepFilter)
    if (!requestedStep) {
      throw new Error(`Step not found: ${stepFilter}`)
    }
    
    // Build dependency chain
    const includedSteps = new Set<string>()
    const toVisit = [stepFilter]
    
    while (toVisit.length > 0) {
      const current = toVisit.shift()!
      if (includedSteps.has(current)) continue
      includedSteps.add(current)
      
      const step = graph.steps.find((s: any) => s.id === current)
      if (step?.dependencies) {
        toVisit.push(...step.dependencies)
      }
    }
    
    // Filter steps and edges
    const filteredSteps = graph.steps.filter((s: any) => includedSteps.has(s.id))
    const filteredEdges = graph.edges.filter((e: any) => includedSteps.has(e.source) && includedSteps.has(e.target))
    
    filteredGraph = {
      ...graph,
      steps: filteredSteps,
      edges: filteredEdges,
    }
  }

  if (format === 'json') {
    return JSON.stringify(filteredGraph, null, 2)
  }

  // Text format
  let output = `\n📊 Pipeline: ${filteredGraph.name}\n`
  output += `ID: ${filteredGraph.id}\n`
  output += `Steps: ${filteredGraph.steps.length}\n`
  output += `Edges: ${filteredGraph.edges.length}\n\n`

  output += 'Steps:\n'
  for (const step of filteredGraph.steps) {
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
    if (step.tags && step.tags.length > 0) {
      output += `    Tags: ${step.tags.join(', ')}\n`
    }
    if (step.status !== undefined) {
      output += `    Status: ${step.status}\n`
    }
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
      // Run aspire do diagnostics on the directory to get diagnostics
      const resolvedDir = path.resolve(process.cwd(), directory)
      if (!fs.existsSync(resolvedDir)) {
        throw new Error(`Directory not found: ${resolvedDir}`)
      }

      const { spawn } = await import('child_process')
      const result = await new Promise<string>((resolve, reject) => {
        const aspireCmd = process.platform === 'win32' ? 'aspire.exe' : 'aspire'
        const proc = spawn(aspireCmd, ['do', 'diagnostics'], {
          cwd: resolvedDir,
          stdio: ['pipe', 'pipe', 'pipe'],
        })

        let output = ''
        let errorOutput = ''

        proc.stdout?.on('data', (data) => {
          output += data.toString()
        })

        proc.stderr?.on('data', (data) => {
          errorOutput += data.toString()
        })

        proc.on('close', (code) => {
          if (code !== 0 && !output && !errorOutput) {
            reject(new Error(`aspire do diagnostics failed with code ${code}`))
          } else {
            // aspire outputs to both stdout and stderr, so we use whichever has content
            resolve(output || errorOutput)
          }
        })

        proc.on('error', (err) => {
          reject(new Error(`Failed to run aspire: ${err.message}`))
        })
      })

      diagnosticsText = result
    } else {
      throw new Error('No input source')
    }

    const graph = parseDiagnostics(diagnosticsText)

    const output = formatGraph(graph, opts.outputFormat, opts.step)
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

