import type { PipelineGraph, PipelineStep, PipelineEdge } from './types/pipeline'

export function parseDiagnostics(text: string): PipelineGraph {
  const lines = text.split(/\r?\n/)

  // Find start of DETAILED STEP ANALYSIS
  const startIdx = lines.findIndex((l) => l.includes('DETAILED STEP ANALYSIS'))
  if (startIdx === -1) {
    return { id: 'unknown', steps: [], edges: [] }
  }

  // The step analysis block starts after the header; find where POTENTIAL ISSUES begins
  const blockStart = lines.findIndex((l, i) => i > startIdx && l.includes('Step:'))
  const blockEnd = lines.findIndex((l, i) => i > blockStart && l.includes('POTENTIAL ISSUES:'))
  const endIdx = blockEnd === -1 ? lines.length : blockEnd

  const steps: PipelineStep[] = []

  let i = blockStart
  while (i < endIdx) {
    const line = lines[i].trim()
    if (line.startsWith('Step:')) {
      const name = line.substring('Step:'.length).trim()
      const step: PipelineStep = { id: name, name, status: undefined }
      i++
      // read indented metadata lines
      while (i < endIdx && lines[i].startsWith('    ')) {
        const metaLine = lines[i].trim()
        if (metaLine.startsWith('Description:')) {
          step.description = metaLine.substring('Description:'.length).trim()
        } else if (metaLine.startsWith('Dependencies:')) {
          const depsPart = metaLine.substring('Dependencies:'.length).trim()
          if (depsPart.toLowerCase() !== 'none') {
            // Dependencies may be listed as ✓ dep1, ✓ dep2
            const depNames = depsPart
              .split(',')
              .map((d) => d.replace(/[✓?]/g, '').trim())
              .filter((d) => d.length > 0)
            step.dependencies = Array.from(new Set(depNames))
          } else {
            step.dependencies = []
          }
        } else if (metaLine.startsWith('Resource:')) {
          step.resource = metaLine.substring('Resource:'.length).trim()
        } else if (metaLine.startsWith('Tags:')) {
          const tags = metaLine
            .substring('Tags:'.length)
            .split(/[, ]+/)
            .map((t) => t.trim())
            .filter(Boolean)
          step.tags = tags
        }
        i++
      }

      steps.push(step)
    } else {
      i++
    }
  }

  // Build edges: for each step, for each dependency D, edge D -> step
  const edges: PipelineEdge[] = []
  for (const s of steps) {
    const deps = s.dependencies ?? []
    for (const d of deps) {
      // only add edges for known steps
      if (!d || d.toLowerCase() === 'none') continue
      const edgeId = `e-${d}-${s.id}`
      edges.push({ id: edgeId, source: d, target: s.id })
    }
  }

  const graph: PipelineGraph = {
    id: 'aspire-pipeline',
    name: 'aspire-pipeline',
    steps,
    edges,
  }

  return graph
}

export default parseDiagnostics
