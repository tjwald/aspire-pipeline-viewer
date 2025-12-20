# Aspire Pipeline Viewer

A desktop application for visualizing and managing Azure Aspire application pipelines as interactive directed acyclic graphs (DAGs).

## What It Can Do

Aspire Pipeline Viewer provides a visual interface to understand and interact with your Aspire application's pipeline:

- **Visualize Pipeline Structure**: See your entire pipeline as an interactive DAG with nodes representing steps and edges representing dependencies
- **Load Any AppHost**: Select any Aspire AppHost directory to load and visualize its pipeline configuration
- **Inspect Step Details**: Click on any pipeline step to view its description, dependencies, resource requirements, and tags
- **Execute Steps**: Run individual pipeline steps directly from the application interface with real-time output streaming
- **Dependency Tracking**: Automatically understand which steps depend on which other steps
- **Status Visualization**: See the execution status of each step (Pending, Running, Success, Failed, Skipped) with color-coded nodes
- **Cross-platform Support**: Works on Windows, macOS, and Linux

## Installation

```bash
# Clone the repository
git clone <repo-url>
cd AspirePipelineViewer

# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Run tests
npm run test

# Lint and format
npm run lint
npm run format
```

## Project Structure

```
.
├── electron/                      # Electron main process
│   ├── main.ts                   # App initialization, IPC handlers
│   ├── preload.ts                # Secure IPC bridge
│   └── tsconfig.json             # Electron TypeScript config
├── src/
│   ├── components/               # React components
│   │   ├── AppHostSelector.tsx   # Directory selection UI
│   │   ├── PipelineViewer.tsx    # DAG visualization
│   │   └── NodeDetailsPanel.tsx  # Step details and execution
│   ├── utils/
│   │   ├── ipc.ts                # IPC utilities
│   │   └── diagnosticsParser.ts  # Parse aspire do diagnostic output
│   ├── types/
│   │   └── pipeline.ts           # TypeScript domain types
│   ├── App.tsx                   # Main application component
│   ├── styles.css                # Global styles
│   └── renderer/main.tsx         # React DOM mount point
├── test/                         # Unit tests
│   ├── sample.test.ts
│   ├── diagnosticsParser.test.ts
│   └── pipelineViewer.test.ts
├── .github/workflows/
│   └── ci.yml                    # GitHub Actions CI/CD
├── package.json                  # Dependencies and scripts
├── tsconfig.json                 # TypeScript configuration
├── vite.config.ts                # Vite build configuration
├── .eslintrc.cjs                 # ESLint rules
└── .prettierrc                   # Prettier formatting
```

## Technology Stack

| Component | Technology | Version |
|-----------|-----------|---------|
| **Desktop Framework** | Electron | 33.0.0 |
| **UI Library** | React | 18.3.1 |
| **Graph Visualization** | React Flow | 11.11.4 |
| **Language** | TypeScript | 5.7.2 |
| **Build Tool** | Vite | 5.4.0 |
| **Testing** | Vitest | 1.6.1 |
| **Linting** | ESLint + Prettier | 8.57.1 / 3.7.1 |

---

## Developer Guide

### Getting Started

This section is for developers working on Aspire Pipeline Viewer.

### Available Scripts

- `npm run dev` - Start dev server with Electron
- `npm run build` - Build Vite app and package with Electron
- `npm run lint` - Run ESLint with --max-warnings=0
- `npm run format` - Format code with Prettier
- `npm run test` - Run tests in watch mode
- `npm run test -- --run` - Run tests once (CI mode)

### Architecture Overview

#### Electron Main Process (`electron/main.ts`)

Handles:
- Electron window creation and lifecycle
- Directory selection dialog
- IPC handler registration for:
  - `select-apphost-directory`: Shows file picker
  - `get-apphost-diagnostics`: Runs `aspire do diagnostic`
  - `run-aspire-do`: Executes `aspire do <step>`

#### Preload Bridge (`electron/preload.ts`)

Securely exposes IPC API to renderer:
- `selectApphostDirectory()` → Promise<string|null>
- `getApphostDiagnostics(directory)` → Promise<RunResult>
- `runAspireDo(directory, step)` → Promise<RunResult>
- Event listeners: `onAspireOutput()`, `onAspireError()`

#### React Components

1. **AppHostSelector** - Renders directory picker button
2. **PipelineViewer** - Main DAG visualization using React Flow
   - Automatic topological layout based on dependencies
   - Color-coded nodes by execution status
   - Click to select and view details
3. **NodeDetailsPanel** - Right-side information panel
   - Step metadata (name, description, resource, tags)
   - Dependency visualization
   - Execute button with streaming output

#### Diagnostics Parser (`src/utils/diagnosticsParser.ts`)

Parses `aspire do diagnostic` output:
- Extracts "DETAILED STEP ANALYSIS" section
- Identifies step names, descriptions, dependencies
- Builds dependency edges
- Deduplicates dependency entries
- Returns structured `PipelineGraph` object

### Data Flow

```
User selects AppHost directory
        ↓
AppHostSelector → IPC: selectApphostDirectory()
        ↓
Directory path received → Trigger useEffect
        ↓
IPC: getApphostDiagnostics(directory)
        ↓
Electron main spawns: aspire do diagnostic
        ↓
Output captured and returned to renderer
        ↓
parseDiagnostics() → PipelineGraph
        ↓
setState(pipelineGraph)
        ↓
PipelineViewer renders DAG with React Flow
        ↓
User clicks node → setState(selectedNodeId)
        ↓
NodeDetailsPanel shows step info + Execute button
        ↓
User clicks Execute → IPC: runAspireDo(directory, stepId)
        ↓
Electron main spawns: aspire do <stepId>
        ↓
Output streamed via IPC events to renderer
```

### Type System

Core domain types are defined in `src/types/pipeline.ts`:

- **ExecutionStatus**: Enum for step states (Pending, Running, Success, Failed, Skipped)
- **PipelineStep**: Represents a single pipeline step with metadata
- **PipelineEdge**: Represents a dependency relationship between steps
- **PipelineGraph**: Complete pipeline structure with steps and edges

### IPC Contract

Main process handlers expose these operations:

- `select-apphost-directory` → Returns selected directory path
- `get-apphost-diagnostics` → Returns diagnostic output from aspire do diagnostic
- `run-aspire-do` → Executes a step and streams output via IPC events

### Testing

Project includes unit tests for:
- Diagnostics parser (parses sample diagnostic output correctly)
- Pipeline viewer layout algorithm (topological ordering)
- Sample sanity test

Tests use Vitest with jsdom environment and pass with 0 warnings via ESLint.

Run tests: `npm run test -- --run`

### CI/CD

GitHub Actions workflow (`.github/workflows/ci.yml`) runs on every push/PR:
1. Setup Node.js 24
2. Run `npm run lint` (--max-warnings=0)
3. Run `npm run test -- --run`

### Code Quality

- **Linting**: ESLint with TypeScript plugin ensures code consistency
- **Formatting**: Prettier auto-formats code on save (optional config)
- **No warnings policy**: ESLint runs with `--max-warnings=0` to catch issues early

### Styling & UI

- **Tailwind-inspired utilities**: Uses inline styles and CSS classes for layout
- **React Flow theme**: Built-in Dark/Light mode support
- **Responsive design**: Full-height flex layout for responsive UI

### Troubleshooting

#### "aspire do" commands not found
Ensure .NET Aspire is installed and in your PATH. The app runs commands relative to the selected directory.

#### Linting errors
Run `npm run format` to auto-fix formatting, then `npm run lint` to verify.

#### Tests failing
Run `npm run test` in watch mode to debug test failures interactively.

### Contributing

1. Create a feature branch
2. Make changes and ensure tests pass: `npm run test -- --run`
3. Ensure linting passes: `npm run lint`
4. Commit with descriptive message
5. Submit pull request

### Future Enhancements

- [ ] Built-in terminal with xterm.js (currently uses external terminal)
- [ ] DAG export (PNG, SVG, JSON)
- [ ] Pipeline history and timeline view
- [ ] Custom layout algorithms (hierarchical, force-directed)
- [ ] Dark mode toggle
- [ ] Step filtering and search
- [ ] Performance metrics and analytics

### References

- [Electron Documentation](https://www.electronjs.org/docs)
- [React Flow Documentation](https://reactflow.dev/)
- [Azure Aspire Documentation](https://learn.microsoft.com/en-us/dotnet/aspire/)

## License

MIT
