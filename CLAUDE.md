# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository Overview

Code Notes is a cross-platform note-taking app for code questions and quizzes, built with Tauri (desktop) and React (web). This is a Turborepo monorepo using pnpm workspaces.

## Build & Development Commands

```bash
pnpm install               # Install all dependencies
pnpm dev:web               # Run web app (port 25092)
pnpm dev:tauri             # Run Tauri desktop app (port 1420)
pnpm build                 # Build all packages
pnpm build:web             # Build web app only
pnpm build:tauri           # Build Tauri app only
pnpm lint                  # Lint all packages
pnpm format                # Format with Prettier
```

### Single Package Development

```bash
turbo run dev --filter=@code-notes/web
turbo run build --filter=@code-notes/ui
turbo run lint --filter=@code-notes/shared

# Tauri CLI
cd apps/native && pnpm tauri dev
cd apps/native && pnpm tauri build
```

## Architecture

### Workspace Structure

```
apps/
  native/         # @code-notes/tauri - Tauri desktop app
  web/            # @code-notes/web - Web app
packages/
  ui/             # @code-notes/ui - Shared UI components, hooks, adapters, store
  shared/         # @code-notes/shared - Types, constants, utilities
  tsconfig/       # Shared TypeScript configs
  eslint-config/  # Shared ESLint config
```

### Unified IndexedDB Storage

Both Tauri and Web platforms use IndexedDB (via Dexie.js) for data storage. The Tauri backend is minimal - it only provides native plugins (dialog, fs, opener, store) while all data operations use the same web adapters.

Storage location: `packages/ui/src/adapters/web/database.ts`

### Service Locator Pattern

Services are registered via setter functions in `packages/ui/src/adapters/factory/ServiceFactory.ts`:

```typescript
setTopicsService(new WebTopicsAdapter());
setQuestionsService(new WebQuestionsAdapter());
// ... etc
```

Then retrieved with getters: `getTopicsService()`, `getQuestionsService()`, etc.

Service interfaces defined in `packages/ui/src/adapters/factory/interfaces/`.

### Platform Differences

The only difference between Tauri and Web is in `IPlatformServices`:

- **Tauri**: Uses `@tauri-apps/plugin-opener` for native URL handling
- **Web**: Uses `window.open` for browser URLs

Platform detection: `"__TAURI_INTERNALS__" in window`

### State Management

Zustand store with slices in `packages/ui/src/store/slices/`:

- `questionsSlice` - Question CRUD
- `topicsSlice` - Topic management
- `quizSlice` - Quiz session state
- `progressSlice` - Learning progress tracking
- `uiSlice` - UI state (modals, navigation)
- `searchSlice` - BM25 full-text search with filters (phase-02)

**Search slice internals**:
- `initSearchIndex()` builds BM25 index once from all questions + topics
- `globalSearch(query)` applies BM25 ranking, then filters by difficulty/topicId/tags
- `_questionsById`, `_topicMap` — cached during init for O(1) filter pass
- `_isIndexing` guard prevents concurrent index builds
- Search state (results, query, filters) intentionally excluded from persistence

### Component Design

Uses atomic design in `packages/ui/src/components/`:

- `atoms/` → `molecules/` → `organisms/` → `pages/` → `templates/`

Built on shadcn/ui with Radix UI primitives.

### Embeddable Component

The app can be embedded in other applications via:

```typescript
import { CodeNotesApp } from "@code-notes/ui/embed";

<CodeNotesApp
  authTokens={{ accessToken, refreshToken, userId }}
  embedded={true}
  useRouter={false}  // Share parent's router
  basePath="/code-notes"
  onLogoutRequest={() => {}}
/>
```

### Sync Architecture

- Uses `@qm-hub/sync-client-types` for sync type definitions
- `IndexedDBSyncAdapter` handles sync operations
- `QmServerAuthAdapter` manages authentication tokens
- Sync metadata stored in `_syncMeta` and `_pendingChanges` tables

## Key Conventions

- Path alias `@/*` maps to `./src/*` in apps
- Tailwind CSS v4 with `@tailwindcss/vite` plugin
- React 19 with TypeScript 5.8
- ESLint with simple-import-sort for import ordering
- pnpm 9.1.0 required (set in packageManager field)
- Package exports use subpath exports pattern (e.g., `@code-notes/ui/components/atoms`)
