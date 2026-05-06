import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypePrismPlus from "rehype-prism-plus";
import { CodeBlock } from "./CodeBlock";
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
      className={`prose prose-sm md:prose-base max-w-none ${className}`}
      style={{ fontSize: `${fontSize}%` }}
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypePrismPlus]}
        components={{
          table: ({ children, ...props }) => (
            <div className="my-6 w-full overflow-x-auto rounded-lg border-2 border-[var(--color-border-light)] bg-[var(--color-bg-white)] shadow-[var(--shadow-clay-sm)]">
              <table {...props} className="w-full text-sm text-left border-collapse">
                {children}
              </table>
            </div>
          ),
          pre: ({ children, ...props }) => (
            <CodeBlock {...props}>{children}</CodeBlock>
          ),
          hr: ({ ...props }) => (
            <hr {...props} className="my-6 border-dashed border-border" />
          ),
          li: ({ ...props }) => <li {...props} className="list-disc" />,
          strong: ({ ...props }) => (
            <strong {...props} className="font-black" />
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
};
