#!/usr/bin/env node
import fs from 'fs'
import path from 'path'
import { parseDiagnostics } from '@aspire/core'

async function main() {
  const args = process.argv.slice(2)
  if (args.length === 0) {
    console.error('Usage: aspire-cli <diagnostics-file-path>')
    process.exit(2)
  }
  const filePath = path.resolve(process.cwd(), args[0])
  if (!fs.existsSync(filePath)) {
    console.error('File not found:', filePath)
    process.exit(3)
  }
  const text = fs.readFileSync(filePath, 'utf8')
  const graph = parseDiagnostics(text)
  console.log(JSON.stringify(graph, null, 2))
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
