import { describe, it, expect } from "vitest";
import { stripMarkdown } from "./strip-markdown";


describe("stripMarkdown", () => {
  it("removes fenced code blocks", () => {
    const result = stripMarkdown("Here is some\n```js\nconst x = 1;\n```\ncode");
    expect(result).not.toContain("const x");
    expect(result).toContain("Here is some");
    expect(result).toContain("code");
  });

  it("removes inline code", () => {
    const result = stripMarkdown("Use `Array.map` to transform");
    expect(result).not.toContain("`");
    expect(result).toContain("transform");
  });

  it("removes image syntax entirely", () => {
    const result = stripMarkdown("![alt text](https://example.com/img.png)");
    expect(result).toBe("");
  });

  it("preserves link label text, removes URL", () => {
    const result = stripMarkdown("[Click here](https://example.com)");
    expect(result).toBe("Click here");
    expect(result).not.toContain("https://");
  });

  it("strips bold markers, preserves text", () => {
    expect(stripMarkdown("**bold text**")).toBe("bold text");
    expect(stripMarkdown("__bold text__")).toBe("bold text");
  });

  it("strips italic markers, preserves text", () => {
    expect(stripMarkdown("*italic text*")).toBe("italic text");
    expect(stripMarkdown("_italic text_")).toBe("italic text");
  });

  it("removes heading markers", () => {
    const result = stripMarkdown("## My Heading\nSome text");
    expect(result).not.toContain("#");
    expect(result).toContain("My Heading");
    expect(result).toContain("Some text");
  });

  it("removes blockquote markers", () => {
    const result = stripMarkdown("> This is a quote");
    expect(result).not.toContain(">");
    expect(result).toContain("This is a quote");
  });

  it("removes list markers", () => {
    const result = stripMarkdown("- item one\n* item two\n+ item three");
    expect(result).not.toMatch(/^[-*+]/m);
    expect(result).toContain("item one");
  });

  it("removes ordered list markers", () => {
    const result = stripMarkdown("1. First\n2. Second");
    expect(result).not.toMatch(/\d+\./);
    expect(result).toContain("First");
    expect(result).toContain("Second");
  });

  it("strips bold-italic triple markers (***text***)", () => {
    expect(stripMarkdown("***bold italic***")).toBe("bold italic");
  });

  it("returns empty string for empty input", () => {
    expect(stripMarkdown("")).toBe("");
  });

  it("collapses multiple whitespace to single space", () => {
    const result = stripMarkdown("word1   \n\n   word2");
    expect(result).toBe("word1 word2");
  });
});
