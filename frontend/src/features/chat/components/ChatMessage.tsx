import { cn } from "@/lib/utils";
import { FileText } from "lucide-react";
import type { ChatMessage as ChatMessageType } from "../types";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface ChatMessageProps {
  message: ChatMessageType;
}

export function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.role === "USER";

  return (
    <div className={cn("flex flex-col gap-1.5", isUser ? "items-end" : "items-start")}>
      <div
        className={cn(
          "max-w-[80%] rounded-2xl px-4 py-2.5 text-sm",
          isUser
            ? "rounded-br-sm bg-primary text-primary-foreground"
            : "rounded-bl-sm bg-muted text-foreground"
        )}
      >
        {isUser ? (
          <p className="whitespace-pre-wrap break-words leading-relaxed">{message.content}</p>
        ) : (
          <div className="prose prose-sm dark:prose-invert max-w-none break-words leading-relaxed
            prose-p:my-1 prose-p:leading-relaxed
            prose-headings:mb-1 prose-headings:mt-3 first:prose-headings:mt-0
            prose-ul:my-1 prose-ol:my-1
            prose-li:my-0
            prose-pre:my-2 prose-pre:rounded-md prose-pre:bg-background/60 prose-pre:p-3
            prose-code:rounded prose-code:bg-background/60 prose-code:px-1 prose-code:py-0.5 prose-code:before:content-none prose-code:after:content-none
            prose-blockquote:my-2 prose-blockquote:border-l-2 prose-blockquote:pl-3 prose-blockquote:not-italic
            prose-table:text-xs prose-th:px-2 prose-th:py-1 prose-td:px-2 prose-td:py-1
            prose-a:text-primary prose-a:underline">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{message.content}</ReactMarkdown>
          </div>
        )}
      </div>

      {!isUser && message.sources && message.sources.length > 0 && (
        <div className="ml-1 flex flex-wrap gap-1.5">
          {message.sources.map((src, i) => (
            <span
              key={`${src.documentId}-${i}`}
              className="flex items-center gap-1 rounded-full border bg-background px-2 py-0.5 text-xs text-muted-foreground"
              title={src.filename}
            >
              <FileText className="size-3 shrink-0" />
              <span className="max-w-[160px] truncate">{src.filename}</span>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
