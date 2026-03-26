import { stripMarkdown } from "./strip-markdown";

export interface DocumentFields {
  id: string;
  questionText: string;
  tags: string;
  topicName: string;
  answerMarkdown: string;
}

export interface SearchResult {
  id: string;
  score: number;
}

const K1 = 1.5;
const B = 0.75;

// Field weights control relevance ranking. Higher weight = stronger signal.
// `as const satisfies` makes the object readonly at the type level without Object.freeze overhead.
const FIELD_WEIGHTS = {
  questionText: 3,
  tags: 2,
  topicName: 1.5,
  answerMarkdown: 1,
} as const satisfies Record<keyof Omit<DocumentFields, "id">, number>;

// Exported so callers (e.g. query highlighting) share the same tokenisation
// contract as the index and query paths never drift.
export function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[\s\W]+/)
    .filter((t) => t.length >= 2);
}

// BM25+ engine with per-field weighting.
//
// Design note – weighted TF in the scoring denominator:
//   Standard BM25 uses raw TF in both numerator and denominator. Here we bake
//   the field weight into `weightedTf` AND accumulate it into `docLengths`.
//   This keeps the length-normalisation term (B * dl / avgdl) consistent with
//   the weighted corpus: a doc whose mass comes mostly from high-weight fields
//   is correctly treated as "longer" than one whose mass is in low-weight fields.
//   The trade-off is a slower TF saturation curve for high-weight fields, which
//   is intentional – repeated occurrences in the question text deserve more
//   credit than repeated occurrences in the answer body.
//
// Update / delete:
//   There is no removeDocument or updateDocument. Callers must call clear() and
//   re-index. This is a conscious choice: the dataset is small (<10K docs) and
//   full re-index takes <50 ms; per-document mutation would add significant
//   complexity with negligible real-world benefit.
export class BM25SearchEngine {
  private index = new Map<string, Map<string, number>>();
  private docLengths = new Map<string, number>();
  // Running sum avoids floating-point drift from incremental weighted averages.
  private _totalDocLength = 0;
  private _docCount = 0;

  get size(): number {
    return this._docCount;
  }

  addDocument(doc: DocumentFields): void {
    if (this.docLengths.has(doc.id)) {
      // Guard against duplicate IDs. The stale entry stays in the index.
      // Call clear() and re-index to update an existing document.
      if (import.meta.env.DEV) {
        console.warn(`BM25SearchEngine: duplicate document id "${doc.id}" ignored. Call clear() before re-indexing.`);
      }
      return;
    }

    const { id, questionText, tags, topicName, answerMarkdown } = doc;

    const fieldTokens: Record<keyof Omit<DocumentFields, "id">, string[]> = {
      questionText: tokenize(questionText),
      tags: tokenize(tags),
      topicName: tokenize(topicName),
      answerMarkdown: tokenize(stripMarkdown(answerMarkdown)),
    };

    let weightedLength = 0;

    for (const field of Object.keys(fieldTokens) as Array<
      keyof typeof FIELD_WEIGHTS
    >) {
      const weight = FIELD_WEIGHTS[field];
      const tokens = fieldTokens[field];
      const tfMap = new Map<string, number>();

      for (const token of tokens) {
        tfMap.set(token, (tfMap.get(token) ?? 0) + 1);
      }
      weightedLength += tokens.length * weight;

      for (const [token, tf] of tfMap) {
        const postings = this.index.get(token) ?? new Map<string, number>();
        postings.set(id, (postings.get(id) ?? 0) + tf * weight);
        this.index.set(token, postings);
      }
    }

    this.docLengths.set(id, weightedLength);
    this._totalDocLength += weightedLength;
    this._docCount++;
  }

  search(query: string, limit = 20): SearchResult[] {
    if (!query.trim() || this._docCount === 0) return [];

    const avgDocLength = this._totalDocLength / this._docCount;
    const tokens = tokenize(query);
    const scores = new Map<string, number>();

    for (const token of tokens) {
      const postings = this.index.get(token);
      if (!postings) continue;

      const df = postings.size;
      const idf = Math.log((this._docCount - df + 0.5) / (df + 0.5) + 1);

      for (const [docId, weightedTf] of postings) {
        const dl = this.docLengths.get(docId) ?? 0;
        const norm = K1 * (1 - B + B * (dl / avgDocLength));
        const bm25 = (idf * (weightedTf * (K1 + 1))) / (weightedTf + norm);
        scores.set(docId, (scores.get(docId) ?? 0) + bm25);
      }
    }

    return Array.from(scores.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([id, score]) => ({ id, score }));
  }

  clear(): void {
    this.index.clear();
    this.docLengths.clear();
    this._totalDocLength = 0;
    this._docCount = 0;
  }
}
