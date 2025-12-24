import { describe, it, expect, beforeAll } from 'vitest'
import { spawn } from 'child_process'
import path from 'path'
import fs from 'fs'

// Calculate paths from this test file location
const TEST_DIR = path.dirname(__filename)
const ROOT_DIR = path.resolve(TEST_DIR, '../../../..')
const CLI_PATH = path.join(ROOT_DIR, 'src/frontends/cli/dist/index.js')
const SAMPLE_DIAGNOSTICS = path.join(TEST_DIR, '../sample-diagnostics.txt')
const WORKING_DIR = path.dirname(SAMPLE_DIAGNOSTICS)

function runCli(args: string[]): Promise<{ code: number; stdout: string; stderr: string }> {
  return new Promise((resolve) => {
    const proc = spawn('node', [CLI_PATH, ...args], {
      cwd: WORKING_DIR,
      stdio: 'pipe',
    })

    let stdout = ''
    let stderr = ''

    proc.stdout?.on('data', (data) => {
      stdout += data.toString()
    })

    proc.stderr?.on('data', (data) => {
      stderr += data.toString()
    })

    proc.on('close', (code) => {
      resolve({ code: code || 0, stdout, stderr })
    })
  })
}

describe('CLI E2E Tests (requires prebuilt CLI)', () => {
  beforeAll(() => {
    expect(fs.existsSync(CLI_PATH)).toBe(true)
    expect(fs.existsSync(SAMPLE_DIAGNOSTICS)).toBe(true)
  })

  it('shows help with --help flag', async () => {
    const { code, stdout } = await runCli(['--help'])
    expect(code).toBe(0)
    expect(stdout).toContain('Aspire Pipeline Viewer CLI')
    expect(stdout).toContain('Usage:')
    expect(stdout).toContain('--diagnostics')
    expect(stdout).toContain('--help')
  })

  it('shows help with -h flag', async () => {
    const { code, stdout } = await runCli(['-h'])
    expect(code).toBe(0)
    expect(stdout).toContain('Aspire Pipeline Viewer CLI')
  })

  it('parses diagnostics file with long flag', async () => {
    const { code, stdout } = await runCli(['--diagnostics', 'sample-diagnostics.txt', '--json'])
    expect(code).toBe(0)
    const json = JSON.parse(stdout)
    expect(json.id).toBe('aspire-pipeline')
    expect(json.steps.length).toBeGreaterThan(0)
    expect(json.edges.length).toBeGreaterThan(0)
  })

  it('parses diagnostics file with short flag -d', async () => {
    const { code, stdout } = await runCli(['-d', 'sample-diagnostics.txt', '--json'])
    expect(code).toBe(0)
    const json = JSON.parse(stdout)
    expect(json.steps.length).toBe(5)
  })

  it('outputs JSON format by default', async () => {
    const { code, stdout } = await runCli(['-d', 'sample-diagnostics.txt'])
    expect(code).toBe(0)
    // Should be valid JSON
    const json = JSON.parse(stdout)
    expect(json.id).toBe('aspire-pipeline')
  })

  it('outputs text format with --text flag', async () => {
    const { code, stdout } = await runCli(['-d', 'sample-diagnostics.txt', '--text'])
    expect(code).toBe(0)
    expect(stdout).toContain('📊 Pipeline:')
    expect(stdout).toContain('Steps:')
    expect(stdout).not.toContain('{') // Should not be JSON
  })

  it('fails with non-existent diagnostics file', async () => {
    const { code, stderr } = await runCli(['--diagnostics', 'nonexistent.txt'])
    expect(code).toBe(1)
    expect(stderr).toContain('Error')
    expect(stderr).toContain('not found')
  })

  it('fails with --no-interactive and no inputs', async () => {
    const { code, stderr } = await runCli(['--no-interactive'])
    expect(code).toBe(1)
    expect(stderr).toContain('Error')
  })

  it('displays step details in text output', async () => {
    const { code, stdout } = await runCli(['-d', 'sample-diagnostics.txt', '--text'])
    expect(code).toBe(0)
    expect(stdout).toContain('build-app')
    expect(stdout).toContain('build-prereq')
    expect(stdout).toContain('Dependencies:')
  })

  it('includes step descriptions in output', async () => {
    const { code, stdout } = await runCli(['-d', 'sample-diagnostics.txt', '--json'])
    expect(code).toBe(0)
    const json = JSON.parse(stdout)
    const buildApp = json.steps.find((s: any) => s.id === 'build-app')
    expect(buildApp?.description).toContain('Build the main application')
  })

  it('includes step resources in JSON output', async () => {
    const { code, stdout } = await runCli(['-d', 'sample-diagnostics.txt', '--json'])
    expect(code).toBe(0)
    const json = JSON.parse(stdout)
    const buildApp = json.steps.find((s: any) => s.id === 'build-app')
    expect(buildApp?.resource).toContain('ExecutableContainerResource')
  })

  it('includes edges in JSON output', async () => {
    const { code, stdout } = await runCli(['-d', 'sample-diagnostics.txt', '--json'])
    expect(code).toBe(0)
    const json = JSON.parse(stdout)
    expect(json.edges.length).toBeGreaterThan(0)
    expect(json.edges[0]).toHaveProperty('id')
    expect(json.edges[0]).toHaveProperty('source')
    expect(json.edges[0]).toHaveProperty('target')
  })

  it('handles relative file paths', async () => {
    const { code, stdout } = await runCli(['-d', './sample-diagnostics.txt', '--json'])
    expect(code).toBe(0)
    const json = JSON.parse(stdout)
    expect(json.steps.length).toBe(5)
  })

  it('filters to single step with --step flag', async () => {
    const { code, stdout } = await runCli(['-d', './sample-diagnostics.txt', '--step', 'build-app', '--json'])
    expect(code).toBe(0)
    const json = JSON.parse(stdout)
    expect(json.steps.length).toBe(2) // build-app + its dependency
    expect(json.steps.some((s: any) => s.id === 'build-app')).toBe(true)
    expect(json.steps.some((s: any) => s.id === 'build-prereq')).toBe(true)
  })

  it('includes step dependencies when using --step filter', async () => {
    const { code, stdout } = await runCli(['-d', './sample-diagnostics.txt', '--step', 'build-app', '--json'])
    expect(code).toBe(0)
    const json = JSON.parse(stdout)
    const buildApp = json.steps.find((s: any) => s.id === 'build-app')
    expect(buildApp).toBeDefined()
    expect(buildApp.dependencies).toContain('build-prereq')
  })

  it('handles non-existent step with --step flag', async () => {
    const { code, stderr } = await runCli(['-d', './sample-diagnostics.txt', '--step', 'nonexistent', '--json'])
    expect(code).toBe(1)
    expect(stderr).toContain('Step not found')
  })

  it('filters with --step in text format', async () => {
    const { code, stdout } = await runCli(['-d', './sample-diagnostics.txt', '--step', 'build-app', '--text'])
    expect(code).toBe(0)
    expect(stdout).toContain('build-app')
    expect(stdout).toContain('build-prereq')
    expect(stdout).toContain('Steps: 2')
  })
})
