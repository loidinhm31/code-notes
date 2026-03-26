// Order matters: fenced code blocks must be stripped before inline code,
// because a fenced block may contain backticks that would otherwise
// match the inline-code regex first.
export function stripMarkdown(md: string): string {
  return md
    .replace(/```[\s\S]*?```/g, " ") // fenced code blocks (before inline code)
    .replace(/`[^`]+`/g, " ") // inline code
    .replace(/!\[.*?\]\(.*?\)/g, " ") // images
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1") // links → keep label
    .replace(/#{1,6}\s+/g, " ") // headings
    .replace(/\*+([^*]+)\*+/g, "$1") // bold / italic / bold-italic (* markers, any count)
    .replace(/_+([^_]+)_+/g, "$1") // underscore bold / italic (_ markers, any count)
    // Note: nested cross-type markers like **_text_** leave inner _ markers; acceptable for
    // BM25 tokenisation since tokenize() splits on \W+ and discards lone underscores.
    .replace(/^>\s+/gm, " ") // blockquotes
    .replace(/^[-*+]\s+/gm, " ") // unordered list markers
    .replace(/^\d+\.\s+/gm, " ") // ordered list markers
    .replace(/\s+/g, " ") // collapse whitespace
    .trim();
}
