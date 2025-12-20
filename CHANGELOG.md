# Changelog

All notable changes to Aspire Pipeline Viewer will be documented in this file.

## [Unreleased]

### Added

- **React Flow DAG Visualization**: Interactive directed acyclic graph visualization of Aspire pipelines with topological layout based on step dependencies
- **Error Handling & User Feedback**: Toast notifications for successful operations, errors, and warnings; loading spinner during diagnostics loading
- **Execution Output Panel**: Streaming output display for `aspire do` command execution with auto-scrolling and clear functionality
- **Node Details Panel**: Right-side panel showing comprehensive step information (name, description, dependencies, resource, tags, status)
- **Directory Selection**: File picker to select AppHost directory with auto-loading of pipeline diagnostics
- **Step Execution**: Execute individual pipeline steps directly from the UI with error handling
- **Build Support**: Complete Vite + Electron build configuration with TypeScript support

### Infrastructure

- **GitHub Actions CI/CD**: Automated linting and testing on every push and pull request
- **Diagnostics Parser**: Parses `aspire do diagnostic` output to extract step information and dependencies
- **IPC Communication**: Secure Electron IPC bridge for main process ↔ renderer communication
- **Comprehensive Testing**: Unit tests for diagnostics parser and DAG layout algorithm with 100% passing rate
- **Code Quality**: ESLint with TypeScript plugin, Prettier formatting, --max-warnings=0 enforcement

### Documentation

- Complete README with overview, features, installation guide, tech stack, and developer guide
- Type definitions for pipeline domain model (ExecutionStatus, PipelineStep, PipelineEdge, PipelineGraph)

## Project Commits

### Initial Scaffold & Parser (54de3f5)
- Project structure with src/, test/, docs/, .github/ directories
- Package configuration with React, Electron, TypeScript, Vite, ESLint, Prettier, Vitest
- Diagnostics parser implementation with unit tests

### IPC Integration & Auto-load (c783bb5)
- Electron main process with three IPC handlers:
  - `select-apphost-directory`: Shows file picker dialog
  - `get-apphost-diagnostics`: Runs `aspire do diagnostic` command
  - `run-aspire-do`: Executes specific step
- Preload bridge for secure IPC exposure
- App component with useEffect hook for auto-loading diagnostics on directory selection

### React Flow DAG Visualization (c882003)
- PipelineViewer component with React Flow integration
- Topological node layout algorithm based on dependency graph
- Color-coded nodes by execution status
- Enhanced NodeDetailsPanel with step metadata display

### Topological Layout Tests (a78629e)
- Unit test verifying DAG layout algorithm correctly calculates topological levels
- Tests for dependency resolution and step grouping

### README Reorganization (7972f62)
- Restructured README: Overview → Features → Installation → File Structure → Tech Stack → Developer Guide
- Moved code samples and architecture details to developer section
- Clear distinction between user-facing features and technical implementation

### Index HTML Entry Point (cd03c68)
- Added index.html for Vite build system
- Verified npm run build succeeds with successful output to dist/

### Execution Output Panel (115a609)
- ExecutionPanel component for streaming `aspire do` command output
- IPC event listeners for real-time output and error display
- Clear button and auto-scrolling functionality

### Error Handling & Notifications (646d250)
- Toast notification component with success/error/warning/info types
- Loading spinner during diagnostics loading
- Error messages for failed diagnostics loading and step execution
- Improved NodeDetailsPanel error handling for missing directory

## Development Timeline

- **Days 1-2**: Planning, tech stack analysis, project scaffolding
- **Day 3**: Dependency installation, ESLint/Prettier/Vitest configuration
- **Day 4**: Diagnostics parser implementation and testing
- **Day 5**: IPC infrastructure and app component state management
- **Day 6**: React Flow integration and DAG visualization
- **Day 7**: Output panel, error handling, and user feedback improvements
- **Day 8**: Documentation and code quality validation

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

## Known Limitations

- External terminal for step execution (built-in terminal planned for Phase 2)
- No DAG export functionality yet (PNG, SVG, JSON planned)
- No pipeline execution timeline/history view yet
- Basic styling (Tailwind-inspired, not full Tailwind)
- No dark mode toggle (can be added)

## Next Steps

1. Configure electron-builder for production packaging
2. Add built-in terminal with xterm.js for streaming output
3. Implement DAG export functionality
4. Add pipeline execution timeline view
5. Performance optimization for large pipelines
6. Enhanced error messages and retry mechanisms
7. Configuration profiles for different AppHost environments
