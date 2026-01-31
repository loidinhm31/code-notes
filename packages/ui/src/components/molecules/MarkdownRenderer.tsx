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
        components={{
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
