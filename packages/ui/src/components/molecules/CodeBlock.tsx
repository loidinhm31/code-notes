import * as React from "react";
import { ChevronDown, ChevronUp, Code } from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@code-notes/ui/components/atoms";
import { Button } from "@code-notes/ui/components/atoms";
import { cn } from "@code-notes/ui/lib/utils";

interface CodeBlockProps extends React.HTMLAttributes<HTMLPreElement> {
  children: React.ReactNode;
  defaultOpen?: boolean;
}

export const CodeBlock = ({
  children,
  className,
  defaultOpen = false,
  ...props
}: CodeBlockProps) => {
  const [isOpen, setIsOpen] = React.useState(defaultOpen);

  return (
    <Collapsible
      open={isOpen}
      onOpenChange={setIsOpen}
      className={cn(
        "my-4 rounded-lg border-2 border-[var(--color-border-light)] overflow-hidden bg-[var(--color-bg-white)] shadow-[var(--shadow-clay-sm)]",
      )}
    >
      <CollapsibleTrigger asChild>
        <div className="flex items-center justify-between px-4 py-2 bg-[var(--color-secondary)] border-b-2 border-[var(--color-border-light)] cursor-pointer hover:brightness-105 transition-all">
          <div className="flex items-center gap-2 text-[var(--color-primary-dark)] font-semibold">
            <Code className="w-4 h-4" />
            <span className="text-sm">Code Snippet</span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            asChild
            className="h-8 px-3 py-1 flex items-center gap-1 border-2 border-[var(--color-border-light)] bg-[var(--color-bg-white)] hover:bg-[var(--color-bg-muted)]"
          >
            <div>
              {isOpen ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
              <span className="text-xs">{isOpen ? "Hide" : "Show"}</span>
            </div>
          </Button>
        </div>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="p-0 overflow-x-auto text-sm md:text-base">
          <pre className={cn("m-0! border-none!", className)} {...props}>
            {children}
          </pre>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
};
