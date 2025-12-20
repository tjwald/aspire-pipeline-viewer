# Next Phases Plan (flattened, no packages/monorepo)

This plan targets a flat repo (no packages/monorepo) with a single top-level `src/`, plus `test/`, `docs/`, and `.github/`. Core logic lives under `src/core`, frontends under `src/frontends/{web,electron,cli}`, and dependency inversion ensures each frontend can supply its own adapters. Each phase should end with passing build/tests and a commit.

## Phases

1) Remove dead code (cleanup)
- Delete duplicated shims once imports are stable (renderer: `src/types/pipeline.ts`, `src/utils/diagnosticsParser.ts` if still present as re-exports).
- Remove unused IPC handlers, assets, and stale scripts after verification.
- Verify build/test after cleanup and commit.

2) Flatten to ideal repo layout (no packages directory)
- Target top-level layout: `src/`, `test/`, `docs/`, `.github/` (no `packages/`).
- Move current core logic into `src/core/` (types, parser, service interfaces, shared utilities).
- Move renderer/web code into `src/frontends/web/` and Electron entry (main/preload) into `src/frontends/electron/` (or keep `electron/` only as a build output target pointing to `src/frontends/electron`).
- Move CLI into `src/frontends/cli/` (entry + argument parsing + adapters).
- Update `tsconfig`/Vite aliases to match the flattened structure; remove workspace-specific config (`pnpm-workspace.yaml`, workspace deps) when migration is complete.
- Build/test, then commit.

3) Separate frontends from core
- Keep `src/core` free of platform APIs; expose only types, pure functions (parser), and service interfaces (contracts for diagnostics, execution, file selection, logging).
- Frontends (`src/frontends/web`, `src/frontends/electron`, `src/frontends/cli`) depend on `src/core` and provide adapters; no cross-frontend imports.
- Add lint/path rules to prevent frontends importing each other.
- Build/test; commit.

4) Add DI abstractions for services
- In `src/core/services`, define interfaces for diagnostics provider, command runner, file chooser (optional), logging, and execution.
- Provide implementations per environment:
  - Electron: adapters that talk to main via IPC for filesystem/commands.
  - CLI: direct filesystem/process execution; no GUI dialogs.
  - Web: limited; rely on injected data or mock services.
- Provide small composition roots/factories per frontend entrypoint to wire DI.
- Build/test; commit.

5) Enhance CLI (headless + interactive)
- Headless flags: directory/diagnostics path, output format, non-interactive mode, exit codes; no prompts when all inputs provided.
- Interactive fallback: prompt for directory/path and step selection when inputs are missing.
- Integrate with Aspire directly (invoke the Aspire diagnostics command) instead of only static files when possible; fall back to file input.
- Add tests for CLI argument parsing, interactive prompts (mocked), and diagnostics retrieval.
- Build/test; commit.

## Guidance for implementation
- Commit after each phase when build/tests pass.
- Prefer removing shims rather than keeping re-exports once imports are confirmed.
- Keep `src/core` pure (no platform APIs). Frontends implement adapters.
- Update CI to run installs/build/tests in the flattened structure (e.g., `pnpm install`, `pnpm run build`, `pnpm run test -- --run`).
