# Migration to pnpm Workspaces (Updated)

## Overview
We’ve migrated the repo to pnpm workspaces with a shared `@aspire/core` package and a headless `@aspire/cli` package, while preserving the existing Electron + React renderer app. This document captures the current state, what changed, and how to run and iterate.

## Goals
- Convert repo to pnpm workspaces.
- Create `packages/core` and `packages/cli` as workspace packages.
- Preserve the Electron frontend (keep under `electron`) and make it a workspace package.
- Provide commands to install, build, and validate.
- Document rollback steps.

## Workspace Layout (Current)
Repository root contains:

- pnpm-workspace.yaml
- package.json (workspace root)
- packages/
  - core/ → shared parsing + DAG types (`@aspire/core`)
  - cli/ → headless CLI (`@aspire/cli`)
- electron/ → Electron main + preload (frontend host)
- src/ → React renderer
- test/ → Vitest tests

Notes:
- `electron` is a workspace member.
- Use `workspace:` protocol for inter-package dependencies.

## Code Migration Tasks (Completed + In-Progress)
Concrete changes performed to keep the code compiling while moving functionality into `packages/core` and `packages/cli`.

1) Create workspace config and root scripts (Completed)
- Add `pnpm-workspace.yaml` with:

```yaml
packages:
  - 'packages/*'
  - 'electron'
```

- Update root `package.json`:
  - set `private: true`
  - add scripts: `install`, `build`, `test`, `dev:electron` (see examples in this doc)

2) Add `packages/core` (core parsing + DAG model) (Completed)
- Files to add (suggested):
  - `packages/core/package.json` (name e.g. `@aspire/core`, scripts: `build`, `test`, `lint`)
  - `packages/core/tsconfig.json` (extend root config or copy)
  - `packages/core/src/index.ts` — export public API (see below)
  - `packages/core/src/types/pipeline.ts` — copy `src/types/pipeline.ts` types
  - `packages/core/src/diagnosticsParser.ts` — copy parsing logic from `src/utils/diagnosticsParser.ts`

Implementation notes:
- `packages/core/src/index.ts` exports type-only symbols and the parser:
  - `export type { PipelineGraph, PipelineStep, PipelineEdge, ExecutionStatus } from './types/pipeline'`
  - `export { parseDiagnostics } from './diagnosticsParser.js'` (explicit `.js` for Node ESM resolution)
- `packages/core/tsconfig.json` enables emit (`noEmit: false`, `declaration: true`) and overrides `allowImportingTsExtensions: false`.
- `packages/core/package.json` sets `main: dist/index.js` and an `exports` map for Vite/Node resolution.

3) Add `packages/cli` (headless frontend) (Completed)
- Files to add:
  - `packages/cli/package.json` (name e.g. `@aspire/cli`, `bin` entry)
  - `packages/cli/tsconfig.json`
  - `packages/cli/src/index.ts` — CLI entry that imports `@aspire/core`

CLI behavior (current):
- Accepts a diagnostics file path and prints parsed JSON graph.
- Command example: `node packages/cli/dist/index.js packages/cli/sample.txt`.

4) Keep renderer and electron working during migration (Shims used temporarily)
- Add a short-lived shim at `src/utils/diagnosticsParser.ts` that re-exports core's API:

Current status:
- Renderer imports changed to `@aspire/core`. For safety, `src/utils/diagnosticsParser.ts` now re-exports `parseDiagnostics` from core and no longer contains logic.
- `src/types/pipeline.ts` now re-exports the types from core instead of duplicating them.

- This allows existing imports in renderer/Electron to continue to work while you switch package imports.

5) Update imports in codebase (Completed)
- Gradually replace internal imports in Electron and renderer that point at local utils/types with `@aspire/core` (workspace name).
- Examples:
  - `import { parseDiagnostics } from '../utils/diagnosticsParser'` → `import { parseDiagnostics } from '@aspire/core'`
  - `import { PipelineGraph } from '../types/pipeline'` → `import { PipelineGraph } from '@aspire/core'`

6) Update `electron` package (In-progress/As-needed)
- In `electron/package.json`, add a dependency to `@aspire/core` using the workspace protocol:

```json
"dependencies": { "@aspire/core": "workspace:*" }
```

- Ensure `electron/tsconfig.json` (if present) can resolve `@aspire/core` (use `baseUrl` or path mapping if needed).

7) Update TypeScript paths & Vite aliases (optional) (As-needed)
- If you prefer to keep `@/` alias working during migration, update root `tsconfig.json` paths and `vite.config.ts` aliases to include workspace resolution where needed.

8) Tests and CI (Completed locally; CI update pending)
- Move or duplicate tests that exercise parsing/graph logic into `packages/core/test` and run them from core.
- Update CI to run `pnpm -w install` and `pnpm -w -r test` (or `pnpm -w -r build` then `test`).

9) Iterate and remove shims (Pending final cleanup)
- Once all imports reference `@aspire/core` and CI passes, remove the `src/utils/diagnosticsParser.ts` shim and any duplicated types in the renderer package.

10) Finalize package publishing/local usage (Optional, future)
- Keep `workspace:` dependencies in `package.json` so `pnpm` links packages locally. Optionally prepare `packages/core` for publishing if desired.

## Files Added / Edited (Highlights)
1. Root `package.json` (minimal changes): set `private: true` and add workspace-aware scripts.

Example scripts:

```json
"scripts": {
  "install": "pnpm -w install",
  "build": "pnpm -w -r run build",
  "test": "pnpm -w -r test",
  "dev:electron": "pnpm --filter electron dev"
}
```

2. `pnpm-workspace.yaml` (root):

```yaml
packages:
  - 'packages/*'
  - 'electron'
```

3. Create `packages/core/package.json` and `packages/cli/package.json`. Use `workspace:` deps between packages.

See the actual project files for authoritative content:
- `packages/core/package.json`, `packages/core/tsconfig.json`, `packages/core/src/*`
- `packages/cli/package.json`, `packages/cli/tsconfig.json`, `packages/cli/src/*`

4. Update `electron/package.json` to reference workspace packages via `workspace:` if it depends on them.

## Migration Steps (commands)

```pwsh
# 1. Add pnpm workspace file
cat > pnpm-workspace.yaml <<'YAML'
packages:
  - 'packages/*'
  - 'electron'
YAML

# 2. Install workspace dependencies
pnpm -w install

# 3. Bootstrap and build all packages
pnpm -w -r run build

# 4. Run tests across workspace
pnpm -w -r test

# 5. Run Electron dev for local verification
pnpm --filter electron dev
```

Notes:
- Use `pnpm -w install` at workspace root.
- `pnpm -w -r run <script>` runs `<script>` recursively across packages.
- Use `pnpm --filter <pkg>` to target a specific workspace package.

## Validation Steps (Current)
- CI: update CI to use `pnpm install --frozen-lockfile`.
- Build: `pnpm -w -r run build` completes without errors.
- Tests: `pnpm -w -r test` passes.
- Local app: run `pnpm --filter electron dev` and verify Electron UI.
- Packaging: run existing packaging to ensure artifacts build.

Suggested verification commands:

```pwsh
pnpm -w -r build
pnpm -w run test -- --run
node packages/cli/dist/index.js packages/cli/sample.txt
pnpm run dev:all
```

## Notes & Gotchas
- Replace local relative dependencies with `workspace:` protocol.
- pnpm uses a strict node_modules layout; some tools may need adjustments.
- Native modules & Electron: ensure native addons are built per-package and ABI matches Electron.
- Peer dependencies: install missing peers explicitly where required.
- Commit `pnpm-lock.yaml` at repo root.

## Rollback Plan
1. Revert the migration commit(s) if regressions occur:

```bash
git checkout main
git reset --hard origin/main
```

2. Restore old lockfiles if needed:

```bash
mv package-lock.json.bak package-lock.json || true
mv yarn.lock.bak yarn.lock || true
```

3. Remove `pnpm-workspace.yaml` and undo edits to `package.json` files.

## Checklist (pre-merge)
- [ ] All workspace `package.json` files present
- [ ] `pnpm-workspace.yaml` added
- [ ] `pnpm-lock.yaml` committed
- [ ] CI updated to use pnpm
- [ ] Electron dev validated
- [ ] Tests pass across workspace

---

Status: Workspace migration is active; core and cli build and run locally. Renderer and tests are updated to use core. Electron dev should work as before; next we’ll finalize IPC paths and end-to-end diagnostics loading.
