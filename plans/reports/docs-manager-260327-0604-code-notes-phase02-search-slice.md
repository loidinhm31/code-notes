# Phase 02 Documentation Update: Search Store Slice

**Date**: 2026-03-27
**Task**: Document BM25 search store integration for code-notes embed app
**Status**: Complete

## Summary

Phase 02 adds full-text search capability via BM25 algorithm. Three files changed:

1. **searchSlice.ts** (NEW) — Zustand slice managing search index + query + filters
2. **store/index.ts** (MODIFIED) — Integrated SearchSlice into combined store type
3. **vite-env.d.ts** (NEW) — Ambient type declarations for `import.meta.env`

## Architecture

### SearchSlice Interface

```typescript
interface SearchSlice {
  searchQuery: string;                    // User's input
  searchResults: SearchResultItem[];      // Ranked results + metadata
  searchIndex: BM25SearchEngine | null;   // Lazily initialized
  searchIndexError: string | null;        // Init failure message
  filters: {
    difficulty: Difficulty | null;       // Filter by: easy/medium/hard/null
    topicId: string | null;              // Filter by topic, null = all
    tags: string[];                      // All tags must match
  };
  // ... actions below
}
```

### SearchResultItem Type

Extends raw BM25 result (`id`, `score`) with full question + metadata:

```typescript
type SearchResultItem = {
  question: Question;   // Full question object
  topicName: string;   // Topic display name
  topicSlug: string;   // Topic identifier
  score: number;       // BM25 relevance score
}
```

### Actions

#### `initSearchIndex(forceRebuild?: boolean)`

**When**: Called once on app mount (before search UI visible)
**What**: Builds BM25 index from all questions; caches topic/question maps
**Guard**: `_isIndexing` flag prevents concurrent builds
**Error handling**: Caught exception sets `searchIndexError`
**Skips**: If index already built & `forceRebuild=false`

```typescript
// Adds all documents to engine:
engine.addDocument({
  id: q.id,
  questionText: q.question,
  tags: q.tags.join(" "),
  topicName: topic?.name ?? "",
  answerMarkdown: q.answer.markdown,
})
```

#### `globalSearch(query: string)`

**When**: User types in search box
**What**: (1) BM25 search top-50 results, (2) filter by active filters, (3) emit results
**Returns**: Empty array if query empty or index not ready
**Filter logic**: Chained AND filters — all conditions must pass

```typescript
// Query "react hooks" → BM25 top-50 →
// filter: difficulty=medium & topicId=xyz & tags=["async"] →
// final: results matching ALL constraints
```

#### `setSearchFilters(filters: Partial<SearchSlice["filters"]>)`

Shallow merge filters into current state. Does NOT re-search automatically — caller must call `globalSearch()` after updating filters.

#### `clearSearch()`

Reset query, results, and filters to initial state.

## State Persistence

Per `store/index.ts` `partialize`:

| Field | Persist? | Reason |
|-------|----------|--------|
| `searchQuery` | ❌ | Ephemeral |
| `searchResults` | ❌ | Ephemeral |
| `searchIndex` | ❌ | Rebuilds on init |
| `_questionsById` | ❌ | Internal cache |
| `_topicMap` | ❌ | Internal cache |
| `filters` | ❌ | UI state (user-driven) |

Only `topics` and `questions` persist; search depends on fresh data each session.

## Environment Types

`vite-env.d.ts` adds ambient declarations for Vite env fields without importing `vite/client`:

```typescript
interface ImportMetaEnv {
  readonly DEV: boolean;
  readonly PROD: boolean;
  readonly MODE: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
```

**Why**: `@code-notes/ui` is a library package without vite as direct dep. Ambient types avoid hard dependency while enabling `import.meta.env.DEV` checks.

## Documentation Changes

### embed-app/code-notes/CLAUDE.md

Updated **State Management** section (line 78) to add:
- `searchSlice` entry
- Subsection explaining internal caching strategy + index initialization pattern
- Filter behavior clarification

**Location**: `/home/loidinh/ws/sharing/qm-sync/embed-app/code-notes/CLAUDE.md:78-98`

## Integration Points

1. **Search UI component** (TODO phase-03) will:
   - Call `initSearchIndex()` on mount
   - Subscribe to `useStore(s => ({ searchQuery, searchResults, filters }))`
   - Dispatch `globalSearch()` on input + `setSearchFilters()` on filter change

2. **Questions migration** (future):
   - When questions/topics CRUD happens, should call `initSearchIndex(true)` to rebuild
   - Currently assumed static — no subscription to CRUD actions

3. **Service dependency**:
   - Imports `questionService` from `@code-notes/ui/services`
   - Assumes `getAll()` returns complete question list (no pagination)

## Edge Cases & Notes

- **Concurrent init**: `_isIndexing` flag prevents multiple builds if user triggers mount race
- **Empty index**: `globalSearch()` returns `[]` if index null; UI must handle gracefully
- **Topic/question mismatch**: Missing topic → `topicName: ""`, missing question → skipped
- **Filter AND logic**: Tags filter requires ALL tags match; empty tags array = no tag filtering
- **Score ties**: BM25 ordering undefined when scores equal (implementation-dependent)

## Follow-up Tasks

1. ✅ Document store integration — DONE
2. ⏳ Implement search UI (SearchPage or SearchPanel component)
3. ⏳ Wire CRUD → index rebuild (questions/topicsSlice)
4. ⏳ Add E2E tests for filter combinations
5. ⏳ Benchmark BM25 on 1000+ questions
