import { StateCreator } from "zustand";
import type { Question, Topic } from "@code-notes/shared";
import { questionService } from "@code-notes/ui/services";
import { BM25SearchEngine, SearchResult } from "../../utils/bm25-search";

type Difficulty = Question["difficulty"];

export interface SearchResultItem {
  question: Question;
  topicName: string;
  topicSlug: string;
  score: number;
}

export interface SearchSlice {
  searchQuery: string;
  searchResults: SearchResultItem[];
  searchIndex: BM25SearchEngine | null;
  searchIndexError: string | null;
  /** Built once during initSearchIndex — O(1) lookup during filter pass */
  _questionsById: Map<string, Question>;
  /** Cached during initSearchIndex — avoids rebuilding on every search */
  _topicMap: Map<string, Topic>;
  /** In-flight guard to prevent concurrent index builds */
  _isIndexing: boolean;
  filters: {
    difficulty: Difficulty | null;
    topicId: string | null;
    tags: string[];
  };
  initSearchIndex: (forceRebuild?: boolean) => Promise<void>;
  globalSearch: (query: string) => void;
  setSearchFilters: (filters: Partial<SearchSlice["filters"]>) => void;
  clearSearch: () => void;
}

type WithTopics = { topics: Topic[] };

export const createSearchSlice: StateCreator<
  SearchSlice & WithTopics,
  [],
  [],
  SearchSlice
> = (set, get) => ({
  searchQuery: "",
  searchResults: [],
  searchIndex: null,
  searchIndexError: null,
  _questionsById: new Map(),
  _topicMap: new Map(),
  _isIndexing: false,
  filters: {
    difficulty: null,
    topicId: null,
    tags: [],
  },

  initSearchIndex: async (forceRebuild = false) => {
    const state = get();
    if (state._isIndexing) return;
    if (state.searchIndex && !forceRebuild) return;

    set({ _isIndexing: true, searchIndexError: null });

    try {
      const allQuestions = await questionService.getAll();
      const topicMap = new Map(state.topics.map((t) => [t.id, t]));
      const questionsById = new Map(allQuestions.map((q) => [q.id, q]));

      const engine = new BM25SearchEngine();
      for (const q of allQuestions) {
        const topic = topicMap.get(q.topicId);
        engine.addDocument({
          id: q.id,
          questionText: q.question,
          tags: q.tags.join(" "),
          topicName: topic?.name ?? "",
          answerMarkdown: q.answer.markdown,
        });
      }

      set({
        searchIndex: engine,
        _topicMap: topicMap,
        _questionsById: questionsById,
        _isIndexing: false,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      set({ searchIndexError: message, _isIndexing: false });
    }
  },

  globalSearch: (query: string) => {
    const { searchIndex, _questionsById, _topicMap, filters } = get();
    if (!searchIndex || !query.trim()) {
      set({ searchResults: [], searchQuery: query });
      return;
    }

    set({ searchQuery: query });

    const hasFilters =
      filters.difficulty !== null ||
      filters.topicId !== null ||
      filters.tags.length > 0;

    let rawResults = searchIndex.search(query, 50);

    if (hasFilters) {
      rawResults = rawResults.filter(({ id }: SearchResult) => {
        const q = _questionsById.get(id);
        if (!q) return false;
        if (filters.difficulty && q.difficulty !== filters.difficulty)
          return false;
        if (filters.topicId && q.topicId !== filters.topicId) return false;
        if (
          filters.tags.length > 0 &&
          !filters.tags.every((t) => q.tags.includes(t))
        )
          return false;
        return true;
      });
    }

    const results: SearchResultItem[] = rawResults.map(
      ({ id, score }: SearchResult) => {
        const q = _questionsById.get(id)!;
        const topic = _topicMap.get(q.topicId);
        return {
          question: q,
          topicName: topic?.name ?? "",
          topicSlug: topic?.slug ?? "",
          score,
        };
      },
    );

    set({ searchResults: results });
  },

  setSearchFilters: (filters) =>
    set((s) => ({ filters: { ...s.filters, ...filters } })),

  clearSearch: () =>
    set({
      searchQuery: "",
      searchResults: [],
      filters: { difficulty: null, topicId: null, tags: [] },
    }),
});
