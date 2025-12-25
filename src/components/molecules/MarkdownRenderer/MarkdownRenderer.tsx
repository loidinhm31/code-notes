import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypePrismPlus from "rehype-prism-plus";
import "prismjs/themes/prism-tomorrow.css";

interface MarkdownRendererProps {
  content: string;
  className?: string;
  fontSize?: number;
}

export const MarkdownRenderer = ({
  content,
  className = "",
  fontSize = 100,
}: MarkdownRendererProps) => {
  return (
    <div
      className={`prose prose-sm md:prose-base dark:prose-invert max-w-none ${className}`}
      style={{ fontSize: `${fontSize}%` }}
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypePrismPlus]}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
};
