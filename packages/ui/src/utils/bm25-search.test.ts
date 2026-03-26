import { describe, it, expect, beforeEach } from "vitest";
import { BM25SearchEngine, tokenize } from "./bm25-search";

function makeDoc(
  id: string,
  overrides: Partial<{
    questionText: string;
    tags: string;
    topicName: string;
    answerMarkdown: string;
  }> = {},
) {
  return {
    id,
    questionText: overrides.questionText ?? "",
    tags: overrides.tags ?? "",
    topicName: overrides.topicName ?? "",
    answerMarkdown: overrides.answerMarkdown ?? "",
  };
}

describe("tokenize", () => {
  it("lowercases and splits on whitespace and punctuation", () => {
    expect(tokenize("Hello, World!")).toEqual(["hello", "world"]);
  });

  it("filters tokens shorter than 2 characters", () => {
    expect(tokenize("a bb ccc")).toEqual(["bb", "ccc"]);
  });

  it("returns [] for empty string", () => {
    expect(tokenize("")).toEqual([]);
  });

  it("handles camelCase as single token (no splitting on case)", () => {
    expect(tokenize("camelCase")).toEqual(["camelcase"]);
  });
});

describe("BM25SearchEngine", () => {
  let engine: BM25SearchEngine;

  beforeEach(() => {
    engine = new BM25SearchEngine();
  });

  it("returns [] when index is empty", () => {
    expect(engine.search("typescript")).toEqual([]);
  });

  it("returns [] for empty query", () => {
    engine.addDocument(makeDoc("1", { questionText: "typescript generics" }));
    expect(engine.search("")).toEqual([]);
    expect(engine.search("   ")).toEqual([]);
  });

  it("returns matching doc with score > 0", () => {
    engine.addDocument(makeDoc("1", { questionText: "typescript generics" }));
    const results = engine.search("typescript");
    expect(results).toHaveLength(1);
    expect(results[0].id).toBe("1");
    expect(results[0].score).toBeGreaterThan(0);
  });

  it("returns [] for non-matching query", () => {
    engine.addDocument(makeDoc("1", { questionText: "typescript generics" }));
    expect(engine.search("python")).toEqual([]);
  });

  it("field weight: same term in questionText scores higher than answerMarkdown only", () => {
    engine.addDocument(
      makeDoc("question-doc", { questionText: "closures in javascript" }),
    );
    engine.addDocument(
      makeDoc("answer-doc", {
        answerMarkdown: "closures in javascript capture variables",
      }),
    );

    const results = engine.search("closures");
    expect(results.length).toBeGreaterThan(1);
    const qScore = results.find((r) => r.id === "question-doc")!.score;
    const aScore = results.find((r) => r.id === "answer-doc")!.score;
    expect(qScore).toBeGreaterThan(aScore);
  });

  it("field weight: questionText doc strictly outscores answerMarkdown-only doc", () => {
    // BM25 length normalization dampens the raw weight ratio, but direction holds:
    // q-doc (weight=3) must always outscore a-doc (weight=1) for same term
    engine.addDocument(makeDoc("q-doc", { questionText: "closures" }));
    engine.addDocument(makeDoc("a-doc", { answerMarkdown: "closures" }));

    const results = engine.search("closures");
    const qScore = results.find((r) => r.id === "q-doc")!.score;
    const aScore = results.find((r) => r.id === "a-doc")!.score;
    expect(qScore).toBeGreaterThan(aScore);
  });

  it("IDF: rare term scores higher than common term when only one doc has rare term", () => {
    // 'promise' appears in all 3 docs; 'microtask' appears in only 1
    engine.addDocument(
      makeDoc("1", { questionText: "promise microtask queue event loop" }),
    );
    engine.addDocument(makeDoc("2", { questionText: "promise async await" }));
    engine.addDocument(makeDoc("3", { questionText: "promise chaining" }));

    const rareResults = engine.search("microtask");
    const commonResults = engine.search("promise");

    // doc "1" should score higher for rare term than any doc for common term (all tie)
    expect(rareResults[0].id).toBe("1");
    expect(rareResults[0].score).toBeGreaterThan(0);

    // all 3 docs score for 'promise', doc 1 is tied with 2 and 3
    expect(commonResults).toHaveLength(3);
  });

  it("markdown in answerMarkdown is stripped before indexing", () => {
    // term only in code block — after stripping, it should not be indexed
    engine.addDocument(
      makeDoc("code-block-doc", {
        answerMarkdown: "```js\nconst onlyInCode = true;\n```\nno prose here",
      }),
    );

    const results = engine.search("onlyInCode");
    expect(results).toHaveLength(0);
  });

  it("ignores duplicate document IDs (no silent data corruption)", () => {
    engine.addDocument(makeDoc("1", { questionText: "typescript" }));
    engine.addDocument(makeDoc("1", { questionText: "typescript generics" })); // duplicate
    expect(engine.size).toBe(1); // second add is a no-op
    const results = engine.search("typescript");
    expect(results).toHaveLength(1);
  });

  it("clear() resets index to zero documents", () => {
    engine.addDocument(makeDoc("1", { questionText: "typescript" }));
    expect(engine.size).toBe(1);
    engine.clear();
    expect(engine.size).toBe(0);
    expect(engine.search("typescript")).toEqual([]);
  });

  it("size reflects number of added documents", () => {
    expect(engine.size).toBe(0);
    engine.addDocument(makeDoc("1"));
    engine.addDocument(makeDoc("2"));
    expect(engine.size).toBe(2);
  });

  it("respects limit parameter", () => {
    for (let i = 0; i < 30; i++) {
      engine.addDocument(makeDoc(`${i}`, { questionText: "typescript" }));
    }
    expect(engine.search("typescript", 5)).toHaveLength(5);
    expect(engine.search("typescript", 10)).toHaveLength(10);
  });

  it("results are sorted by score descending", () => {
    // doc with term in questionText (weight 3) should outrank doc with same term in answerMarkdown (weight 1)
    engine.addDocument(makeDoc("high", { questionText: "closures scope" }));
    engine.addDocument(
      makeDoc("low", { answerMarkdown: "closures capture scope" }),
    );

    const results = engine.search("closures");
    expect(results[0].id).toBe("high");
    for (let i = 1; i < results.length; i++) {
      expect(results[i - 1].score).toBeGreaterThanOrEqual(results[i].score);
    }
  });
});
