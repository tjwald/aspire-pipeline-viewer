import type { PipelineGraph, PipelineStep, PipelineEdge } from './types/pipeline'

export function parseDiagnostics(text: string): PipelineGraph {
  // Strip log prefixes like "HH:MM:SS (context) i "
  const cleanedText = text
    .split(/\r?\n/)
    .map((line) => {
      // Match pattern like "02:02:49 (diagnostics) i " at the start
      const match = line.match(/^\d{2}:\d{2}:\d{2}\s+\([^)]+\)\s+[a-z]\s+(.*)$/)
      return match ? match[1] : line
    })
    .join('\n')

  const steps: PipelineStep[] = []

  // Split by "Step: " to get each step block (with or without log prefix)
  // Accept log-prefixed and indented "Step:" lines
  const stepBlocks = cleanedText.split(/^\s*Step:\s+/m).slice(1)

  for (const block of stepBlocks) {
    const lines = block.split('\n')
    const stepName = lines[0].trim()

    const step: PipelineStep = {
      id: stepName,
      name: stepName,
      status: undefined,
    }

    // Parse metadata from remaining lines
    const blockText = lines.slice(1).join('\n')

    // Extract description (may span multiple lines)
    const descMatch = blockText.match(/^\s*Description:\s*(.+?)(?=\n\s*(?:Dependencies|Resource|Tags|$))/ms)
    if (descMatch) {
      step.description = descMatch[1]
        .split('\n')
        .map((l) => l.trim())
        .filter(Boolean)
        .join(' ')
    }

    // Extract dependencies - capture until Resource, Tags, or end of block
    // Accept dependencies that may be split across multiple lines, ending at next field or blank line
    const depsMatch = blockText.match(/^\s*Dependencies:\s*([\s\S]*?)(?=\n\s*(?:Resource:|Tags:|Description:|$))/m)
    if (depsMatch) {
      const depsPart = depsMatch[1].trim()
      if (depsPart.toLowerCase() !== 'none') {
        // Dependencies may be listed as ✓ dep1, ✓ dep2 or just dep1, dep2
        const depNames = depsPart
          .split(/[,\n]+/)
          .map((d) => d.replace(/[✓?]/g, '').trim())
          .filter((d) => d.length > 0 && d !== 'i')
        step.dependencies = Array.from(new Set(depNames))
      } else {
        step.dependencies = []
      }
    }

    // Extract resource
    const resourceMatch = blockText.match(/^\s*Resource:\s*(.+?)$/m)
    if (resourceMatch) {
      step.resource = resourceMatch[1].trim()
    }

    // Extract tags
    const tagsMatch = blockText.match(/^\s*Tags:\s*(.+?)$/m)
    if (tagsMatch) {
      const tags = tagsMatch[1]
        .split(/[,\s]+/)
        .map((t) => t.trim())
        .filter(Boolean)
      step.tags = tags
    }

    steps.push(step)
  }

  // Build edges: for each step, for each dependency D, edge D -> step
  const edges: PipelineEdge[] = []
  for (const s of steps) {
    const deps = s.dependencies ?? []
    for (const d of deps) {
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
