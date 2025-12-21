# Aspire Pipeline Viewer CLI

Command-line interface for parsing and analyzing .NET Aspire pipeline diagnostics.

## Installation

```bash
# Clone and install from source
git clone https://github.com/tjwald/AspirePipelineViewer.git
cd AspirePipelineViewer
pnpm install
pnpm build:all
```

## Usage

```bash
pnpm cli [options]
```

## Options

| Option | Alias | Description |
|--------|-------|-------------|
| `--diagnostics <path>` | `-d` | Path to diagnostics file |
| `--directory <path>` | `-C` | Path to AppHost directory |
| `--step <name>` | | Filter output to specific step and its dependencies |
| `--json` | | Output as JSON (default) |
| `--text` | | Output as human-readable text |
| `--no-interactive` | | Non-interactive mode (fail if inputs missing) |
| `--help` | `-h` | Show help message |

## Examples

### Parse a Diagnostics File

```bash
# Output as JSON (default)
pnpm cli -- --diagnostics ./diagnostics.txt

# Output as human-readable text
pnpm cli -- --diagnostics ./diagnostics.txt --text
```

### Filter by Step

Show only a specific step and its dependency chain:

```bash
pnpm cli -- --diagnostics ./diagnostics.txt --step deploy --text
```

### Parse from AppHost Directory

Automatically run `aspire do diagnostics` and parse the output:

```bash
pnpm cli -- --directory ./src/MyApp.AppHost --text
```

### Non-Interactive Mode (CI/CD)

Fail immediately if required inputs are missing:

```bash
pnpm cli -- --diagnostics ./diagnostics.txt --no-interactive --json
```

### Interactive Mode

When run without arguments, the CLI prompts for input:

```bash
$ pnpm cli

📋 Aspire Pipeline Viewer - Interactive Mode
──────────────────────────────────────────────

Parse from file (f) or directory (d)? [f/d]: f
Path to diagnostics file: ./diagnostics.txt
```

## Output Formats

### JSON Format

```json
{
  "id": "pipeline-abc123",
  "name": "My Pipeline",
  "steps": [
    {
      "id": "build",
      "name": "Build",
      "description": "Build the application",
      "dependencies": [],
      "resource": "builder (ExecutableContainerResource)",
      "tags": ["build"]
    },
    {
      "id": "test",
      "name": "Test",
      "description": "Run unit tests",
      "dependencies": ["build"],
      "resource": "tester (ExecutableContainerResource)",
      "tags": ["test"]
    }
  ],
  "edges": [
    { "id": "build-test", "source": "build", "target": "test" }
  ]
}
```

### Text Format

```
📊 Pipeline: My Pipeline
ID: pipeline-abc123
Steps: 2
Edges: 1

Steps:
  • Build (build)
    Description: Build the application
    Resource: builder (ExecutableContainerResource)
    Tags: build

  • Test (test)
    Description: Run unit tests
    Resource: tester (ExecutableContainerResource)
    Dependencies: build
    Tags: test
```

## Diagnostics File Format

The CLI expects diagnostics output in the following format:

```
Step: build
  Description: Build the application
  Resource: builder (ExecutableContainerResource)
  Tags: build

Step: test
  Description: Run unit tests
  Dependencies: build
  Resource: tester (ExecutableContainerResource)
  Tags: test

Step: deploy
  Description: Deploy to production
  Dependencies: test
  Resource: deployer (ExecutableContainerResource)
  Tags: deploy
```

### Field Reference

| Field | Required | Description |
|-------|----------|-------------|
| `Step` | Yes | Step identifier (must be unique) |
| `Description` | No | Human-readable description |
| `Dependencies` | No | Comma-separated list of dependency step IDs |
| `Resource` | No | Aspire resource that runs this step |
| `Tags` | No | Comma-separated list of tags |

## Exit Codes

| Code | Meaning |
|------|---------|
| 0 | Success |
| 1 | Missing required arguments |
| 2 | File or directory not found |
| 3 | Parse error |
| 4 | Step not found (when using `--step`) |

## Programmatic Usage

You can also use the CLI functions programmatically:

```typescript
import { DiagnosticsService } from '@aspire/core'

// Parse diagnostics text
const graph = DiagnosticsService.parse(diagnosticsText)

// Format as JSON
const json = DiagnosticsService.format(graph, 'json')

// Format as text with step filter
const text = DiagnosticsService.format(graph, 'text', 'deploy')

// All-in-one analyze
const output = DiagnosticsService.analyze(diagnosticsText, 'json', 'deploy')
```

## Troubleshooting

### "No diagnostics path or directory provided"

Provide either `--diagnostics` or `--directory`:

```bash
aspire-pipeline-cli --diagnostics ./file.txt
# or
aspire-pipeline-cli --directory ./AppHost
```

### "Step not found: xyz"

The specified step doesn't exist. List available steps:

```bash
aspire-pipeline-cli --diagnostics ./file.txt --text
```

### "Diagnostics file not found"

The path is relative to current working directory:

```bash
# Check the file exists
ls ./diagnostics.txt

# Use absolute path if needed
aspire-pipeline-cli --diagnostics /full/path/to/diagnostics.txt
```

## See Also

- [User Guide](./USER_GUIDE.md) - Desktop application documentation
- [Developer Guide](./DEVELOPER_GUIDE.md) - Contributing and architecture
