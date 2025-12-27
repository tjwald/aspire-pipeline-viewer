# Aspire Pipeline Viewer - Developer Guide

Technical documentation for developers contributing to Aspire Pipeline Viewer.

## Architecture Overview

```mermaid
flowchart LR
  Main["Electron Main"] --> Preload["Preload Bridge"]
  Preload --> Renderer["Renderer (React + Vite)"]
  Renderer --> Core[@aspire-pipeline-viewer/core]
  Core --> CLI["CLI"]
  Core --> Web["Web Frontend"]
  Core --> ElectronFrontend["Electron Frontend"]
```

## Project Structure

The repository is organized at a high level into a small set of top-level packages and a centralized `tests/` folder. Avoid file-level structure in documentation as it will drift with refactors.

- `src/core/` — Shared parsing and formatting logic (published as `@aspire-pipeline-viewer/core` within the mono-repo).
- `src/frontends/` — Frontend packages (Electron renderer, CLI, web).
- `tests/` — End-to-end and unit tests organized by feature (mirrors `src/` hierarchy at a feature level).
- `docs/`, `.github/`, `package.json` — Docs and CI configuration.

## Technology Stack

| Layer | Technology | Purpose |
|-------|------------|---------|
| Desktop | Electron 39.2.7 | Cross-platform desktop app |
| UI | React 19.2.3 | Component-based UI |
| Build | Vite 7.3.0 | Fast bundling and HMR |
| Language | TypeScript 5.9.3 | Type safety |
| Testing | Vitest | Unit and integration tests |
| Linting | ESLint + Prettier | Code quality |
| Package Manager | pnpm | Fast, disk-efficient |

## Development Setup

### Prerequisites

- Node.js 20+
- pnpm 9+
- Git

### Installation

```bash
# Clone repository
git clone https://github.com/tjwald/AspirePipelineViewer.git
cd AspirePipelineViewer

# Install dependencies
pnpm install

# Start development server
pnpm dev:app
```

### Available Scripts

| Script | Description |
|--------|-------------|
| `pnpm dev:app` | Start Electron app in development mode |
| `pnpm dev:web` | Start web-only development server |
| `pnpm build:all` | Build all packages |
| `pnpm test` | Run all tests |
| `pnpm test:coverage` | Run tests with coverage report |
| `pnpm lint` | Run ESLint |
| `pnpm format` | Format code with Prettier |

## Code Guidelines

### TypeScript

- Use strict mode (`"strict": true`)
- Prefer interfaces over type aliases for objects
- Use explicit return types on public functions
- Avoid `any` - use `unknown` with type guards

```typescript
// Good
interface PipelineStep {
  id: string
  name: string
  dependencies: string[]
}

function parseStep(raw: unknown): PipelineStep {
  if (!isValidStep(raw)) throw new Error('Invalid step')
  return raw as PipelineStep
}

// Avoid
function parseStep(raw: any): any {
  return raw
}
```

### React Components

- Use functional components with hooks
- Extract reusable logic into custom hooks
- Keep components focused (Single Responsibility)
- Use CSS modules or component-level styles

```tsx
// Good - focused component with custom hook
function StepNode({ step, onClick }: StepNodeProps) {
  const { isHovered, handlers } = useHover()
  
  return (
    <div {...handlers} onClick={() => onClick(step)}>
      {step.name}
    </div>
  )
}

// Avoid - component doing too much
function StepNode({ step }) {
  const [hover, setHover] = useState(false)
  const [selected, setSelected] = useState(false)
  const [editing, setEditing] = useState(false)
  // ... 100 more lines
}
```

### File Organization

- One component per file
- Co-locate tests with source (`*.test.ts` next to `*.ts`)
- Group by feature, not by type
- Use barrel exports (`index.ts`) for public APIs

### SOLID Principles

1. **Single Responsibility**: Each module does one thing
2. **Open/Closed**: Extend via composition, not modification
3. **Liskov Substitution**: Subtypes must be substitutable
4. **Interface Segregation**: Small, focused interfaces
5. **Dependency Inversion**: Depend on abstractions

## Testing

### Test Structure

```typescript
import { describe, it, expect } from 'vitest'

describe('ModuleName', () => {
  describe('functionName', () => {
    it('should handle normal case', () => {
      // Arrange
      const input = createTestInput()
      
      // Act
      const result = functionName(input)
      
      // Assert
      expect(result).toEqual(expectedOutput)
    })

    it('should throw on invalid input', () => {
      expect(() => functionName(null)).toThrow()
    })
  })
})
```

### Running Tests

```bash
# Run all tests
pnpm test

# Run specific test file
pnpm test tests/core/diagnosticsParser.test.ts

# Watch mode
pnpm test -- --watch

# With coverage
pnpm test -- --coverage
```

### Test Categories

| Directory | Type | Description |
|-----------|------|-------------|
| `tests/core/` | Unit | Core logic (parser, formatter) |
| `tests/shared/` | Unit | Shared utilities and hooks |
| `tests/frontends/` | Integration | Frontend-specific behavior |

## Component Reference

### GraphView

Renders the pipeline as an interactive DAG.

**Props:**
- `graph: PipelineGraph` - The pipeline data
- `selectedStep?: string` - Currently selected step ID
- `onStepSelect: (id: string) => void` - Selection handler
- `visibleSteps?: Set<string>` - Steps to display

**Features:**
- SVG-based rendering with zoom/pan
- Resource columns with color coding
- Hexagon aggregator nodes
- Edge highlighting on selection

### Sidebar

Step list with filtering controls.

**Props:**
- `graph: PipelineGraph` - Pipeline data
- `selectedStep?: string` - Selected step
- `onStepSelect: (id: string) => void` - Selection handler
- `onVisibleStepsChange: (visible: Set<string>) => void` - Filter handler

**Features:**
- Hierarchical grouping by resource
- Checkbox-based visibility
- Tag filtering
- Collapse/expand groups

### DetailsPanel

Shows selected step information.

**Props:**
- `step: PipelineStep | null` - Selected step
- `onExecute?: () => void` - Execute handler

## Core API

### DiagnosticsService

High-level API for parsing and formatting.

```typescript
import { DiagnosticsService } from '@aspire-pipeline-viewer/core'

// Parse text to graph
const graph = DiagnosticsService.parse(text)

// Format graph to output
const json = DiagnosticsService.format(graph, 'json')
const text = DiagnosticsService.format(graph, 'text', 'stepId')

// All-in-one
const output = DiagnosticsService.analyze(text, 'json', 'stepId')
```

### DiagnosticsParser

Low-level parsing functions.

```typescript
import { DiagnosticsParser } from '@aspire-pipeline-viewer/core'

const graph = DiagnosticsParser.parse(text)
```

### Type Definitions

```typescript
interface PipelineGraph {
  id: string
  name: string
  steps: PipelineStep[]
  edges: PipelineEdge[]
}

interface PipelineStep {
  id: string
  name: string
  description?: string
  dependencies: string[]
  resource?: string
  tags?: string[]
  status?: ExecutionStatus
}

interface PipelineEdge {
  id: string
  source: string
  target: string
}

enum ExecutionStatus {
  Pending = 'pending',
  Running = 'running',
  Success = 'success',
  Failed = 'failed',
  Skipped = 'skipped'
}
```

## Contributing

### Pull Request Process

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Write tests for your changes
4. Ensure all tests pass (`pnpm test`)
5. Run linting (`pnpm lint`)
6. Commit with conventional commits
7. Push and open a PR

### Commit Messages

Commit message guidance is intentionally minimal in this project. Keep messages clear and focused on intent. Detailed commit conventions are not enforced here.


## Troubleshooting

### Build Errors

If you encounter build errors, try clearing generated artifacts and reinstalling dependencies:

```powershell
pnpm clean && pnpm i
pnpm build:all
```

### Electron Not Starting

```powershell
# Rebuild native modules
pnpm rebuild
```

### Test Failures

```powershell
# Run specific test with verbose output
pnpm test tests/core/parser.test.ts -- --reporter=verbose
```

## See Also

- [User Guide](./USER_GUIDE.md) - End-user documentation
- [CLI Documentation](./CLI_DOCS.md) - Command-line reference
