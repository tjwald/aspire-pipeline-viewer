# Aspire Pipeline Viewer - User Guide

## Table of Contents
1. [Introduction](#introduction)
2. [Installation](#installation)
3. [Getting Started](#getting-started)
4. [Using the Electron App](#using-the-electron-app)
5. [Filtering and Navigation](#filtering-and-navigation)
6. [Viewing Step Details](#viewing-step-details)
7. [Keyboard Shortcuts](#keyboard-shortcuts)
8. [Troubleshooting](#troubleshooting)

## Introduction

Aspire Pipeline Viewer is a powerful tool for visualizing .NET Aspire deployment pipelines. It helps you understand the dependencies, resources, and execution flow of your application deployment steps.

### Key Features

- **Interactive DAG Visualization**: View your pipeline as a directed acyclic graph
- **Resource Grouping**: Steps are organized by resource (e.g., builder, deployer)
- **Hierarchical Layout**: Aggregator steps are displayed in a central lane
- **Advanced Filtering**: Filter by step, resource, or tag
- **Step Details**: View descriptions, dependencies, tags, and execution status
- **Zoom and Pan**: Navigate large pipelines easily

## Installation

### Prerequisites

- Node.js 24 or higher
- pnpm 9 or higher

### Install from Source

```bash
git clone https://github.com/tjwald/AspirePipelineViewer.git
cd AspirePipelineViewer
pnpm install
pnpm build:all
```

## Getting Started

### Running the Electron App

```bash
pnpm dev:app
```

### Opening a Diagnostics File

1. Launch the Electron app
2. Click **File > Open** or press `Ctrl+O`
3. Navigate to your `.diagnostics` file
4. The pipeline will be visualized automatically

### Generating Diagnostics Files

Use the .NET Aspire CLI to generate diagnostics:

```bash
dotnet run --project YourAppHost -- diagnostics > pipeline.diagnostics
```

## Using the Electron App

### Main Interface

The app consists of three main areas:

1. **Sidebar (Left)**: Step list with filtering controls
2. **Graph View (Center)**: Interactive DAG visualization
3. **Details Panel (Right)**: Selected step information

### Graph View Controls

- **Zoom In**: Click `+` or use mouse wheel up
- **Zoom Out**: Click `-` or use mouse wheel down
- **Reset Zoom**: Click `Reset` button
- **Pan**: Click and drag the canvas
- **Select Step**: Click on any step node

### Resource Columns

Steps are organized into vertical columns by resource type:

- **Builder**: Build-related steps
- **Tester**: Test execution steps
- **Deployer**: Deployment steps
- **Pipeline**: Aggregator steps (center lane)

## Filtering and Navigation

### Sidebar Filtering

The sidebar provides multiple filtering options:

#### Show/Hide All

- **Show All**: Make all steps visible
- **Hide All**: Hide all steps (useful for starting fresh)

#### Resource Groups

- Click a resource header (e.g., "BUILDER") to collapse/expand
- Click the checkbox next to a resource to show/hide all steps in that resource
- Click "Show Only" to hide all other resources

#### Individual Steps

- Click the checkbox next to a step name to toggle visibility
- Hidden steps are grayed out

#### Tag Filtering

- Click a tag chip (e.g., `build`, `test`) to filter by tag
- Click again to clear the filter
- Multiple tags can be applied

### Graph Filtering

When you hide steps in the sidebar:

- The graph automatically recalculates layout
- Only visible steps are shown
- Empty resource columns are hidden
- Dependencies are preserved

## Viewing Step Details

Select a step to view details in the right panel:

- **Step Name**: Display name of the step
- **ID**: Unique identifier
- **Description**: What the step does
- **Resource**: Which resource executes this step
- **Dependencies**: Steps that must complete first
- **Tags**: Classification tags (build, test, deploy, etc.)
- **Status**: Current execution status (if available)

### Execution Status

- **Success** (✓): Step completed successfully
- **Failed** (✗): Step encountered an error
- **Pending** (⏳): Step waiting to execute
- **Running** (►): Step currently executing
- **Skipped** (○): Step was skipped

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+O` | Open file |
| `Ctrl+W` | Close file |
| `Ctrl+Q` | Quit application |
| `+` | Zoom in |
| `-` | Zoom out |
| `0` | Reset zoom |
| `Esc` | Deselect step |

## Troubleshooting

### File Won't Open

**Problem**: Diagnostics file fails to load

**Solutions**:
- Verify the file is a valid `.diagnostics` file
- Check that the file contains valid Aspire output
- Try regenerating the diagnostics file
- Check the console for error messages

### Graph Looks Crowded

**Problem**: Too many steps to see clearly

**Solutions**:
- Use filtering to hide irrelevant steps
- Zoom in on specific areas
- Use "Show Only" to focus on one resource
- Filter by tag to see related steps

### Steps Are Overlapping

**Problem**: Layout algorithm places steps too close

**Solutions**:
- This usually happens with complex dependency graphs
- Try zooming in
- Use filtering to simplify the view
- The hierarchical layout should prevent most overlaps

### Performance Issues

**Problem**: App is slow with large pipelines

**Solutions**:
- Filter steps to reduce visible nodes
- Close other applications to free memory
- Consider upgrading hardware for very large pipelines (>100 steps)

### Can't Find a Step

**Problem**: Step is not visible in the graph

**Solutions**:
- Check if the step is filtered out in the sidebar
- Click "Show All" to reset filters
- Use the sidebar search/scroll to find the step
- Verify the step exists in the diagnostics file

## Advanced Tips

### Comparing Pipelines

To compare two different pipeline versions:
1. Take screenshots of each visualization
2. Use different tag filters to highlight changes
3. Export both as JSON for programmatic comparison

### Large Pipelines

For pipelines with >50 steps:
1. Start with "Hide All"
2. Gradually enable resource groups you need
3. Use tag filtering to focus on specific phases
4. Consider viewing different pipeline stages separately

### Understanding Dependencies

- Steps are placed below their dependencies
- Aggregators collect outputs from multiple resources
- Arrows show the dependency direction
- Circular dependencies are not supported by Aspire

## Getting Help

- **GitHub Issues**: https://github.com/yourusername/AspirePipelineViewer/issues
- **Documentation**: https://github.com/yourusername/AspirePipelineViewer/wiki
- **Aspire Docs**: https://learn.microsoft.com/dotnet/aspire/

## Next Steps

- [CLI Documentation](./CLI_DOCS.md) - Learn the command-line interface
- [Developer Guide](./DEVELOPER.md) - Contribute to the project
- [API Reference](./API.md) - Integrate with your tools
