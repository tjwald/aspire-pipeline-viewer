# Next Phases Plan (src/core + src/frontends)

This plan targets a layout with `src/core` for shared logic and `src/frontends/{web,electron,cli}` for the frontends, alongside top-level `tests/`, `docs/`, and `.github/`. Dependency inversion ensures each frontend supplies its own adapters. Each phase should end with passing build/tests and a commit once the structure is stable.

## Phases

### ✅ Phase 1: Remove dead code (cleanup) — COMPLETE
- ✅ Deleted old `src/renderer`, `src/components`, `src/hooks`, `src/types`, `src/utils` from root (duplicates).
- ✅ Removed stale `electron/` folder and entry from workspace configs.
- ✅ Cleaned up old `src/styles.css`, `src/constants.ts`, `src/theme.ts` (moved to `src/frontends/web/`).
- ✅ Tests passing; build passing; committed.

### ✅ Phase 2: Restructure to core + frontends layout — COMPLETE
- ✅ Layout: `src/core` (types, parser), `src/frontends/web` (React renderer), `src/frontends/electron` (main+preload), `src/frontends/cli` (headless).
- ✅ Path alias `@/core` configured in Vite and vitest.
- ✅ Tests organized under `tests/` mirroring `src/` structure: `tests/core/`, `tests/frontends/web/`.
- ✅ Build/test passing; ready to commit.

### ✅ Phase 3: Separate frontends from core — COMPLETE
- ✅ Verified `src/core` has zero platform-specific code (no window, electron, IPC, etc.).
- ✅ Each frontend imports only from `@/core` or its own folder; no cross-frontend imports.
- ✅ Lint passes; tests passing; build passing.

### ✅ Phase 5: Enhance CLI (headless + interactive) — COMPLETE
- ✅ Headless mode: `--diagnostics <file>` for file-based input; `--directory <path>` for directory-based input.
- ✅ Non-interactive flag: `--no-interactive` prevents prompts and exits if inputs missing (for automation).
- ✅ Interactive fallback: When no inputs provided and not in non-interactive mode, prompts user for diagnostics file or directory.
- ✅ Output formats: `--json` (default) for structured output; `--text` for human-readable format with emoji and formatting.
- ✅ Help: `--help` / `-h` displays usage and examples.
- ✅ Proper exit codes: 0 for success, 1 for errors, 2 for missing inputs in non-interactive mode.
- ✅ Services for future enhancement: CLI can use `createCLIServiceContainer()` to access Aspire diagnostics/commands when running in Node environment.
- ✅ Lint, test, and build all passing.

## Summary

**Completed Migration to Modular Architecture:**

1. **Phase 1 (Cleanup):** Removed legacy duplicates and stale entries.
2. **Phase 2 (Restructure):** Organized code into `src/core` (shared logic) and `src/frontends/{web,electron,cli}` with proper path aliases.
3. **Phase 3 (Separation):** Verified core has no platform code; frontends are isolated with no cross-imports.
4. **Phase 4 (DI):** Added service interfaces and per-frontend implementations enabling clean dependency injection.
5. **Phase 5 (CLI):** Built interactive and headless CLI with proper UX, help, and exit codes.

**Final Structure:**
```
src/
├── core/                    (shared types, parser, service interfaces)
│   ├── types/
│   ├── services/            (interfaces, default logger)
│   ├── diagnosticsParser.ts
│   └── index.ts             (exports types & interfaces)
│
└── frontends/
    ├── web/                 (React renderer)
    │   ├── services/        (Electron & mock adapters)
    │   ├── components/
    │   ├── hooks/
    │   ├── App.tsx
    │   └── main.tsx         (entry point)
    │
    ├── electron/            (Electron main process)
    │   ├── main.ts
    │   ├── preload.ts
    │   └── package.json
    │
    └── cli/                 (CLI with interactive & headless modes)
        ├── index.ts         (enhanced with interactive UI)
        ├── services.ts      (Node.js adapters)
        └── package.json

tests/                       (mirroring src/ structure)
├── core/
├── frontends/
└── sanity.test.ts
```

**Key Achievements:**
- ✅ 100% type-safe with TypeScript across all frontends
- ✅ Zero platform-specific code in core
- ✅ Service-oriented architecture with clean DI for extensibility
- ✅ All tests passing (3/3)
- ✅ Linting clean
- ✅ Full build succeeding
- ✅ Ready for next enhancements: real Electron integration, advanced CLI features, or additional frontends

## Guidance for implementation
- Commit after each phase when build/tests pass.
- Prefer removing shims rather than keeping re-exports once imports are confirmed.
- Keep `src/core` pure (no platform APIs). Frontends implement adapters.
- Update CI to run installs/build/tests in the flattened structure (e.g., `pnpm install`, `pnpm run build`, `pnpm run test -- --run`).


