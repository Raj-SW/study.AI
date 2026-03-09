import { cn } from "@/lib/utils";
import { FileText } from "lucide-react";
import type { ChatMessage as ChatMessageType } from "../types";

interface ChatMessageProps {
  message: ChatMessageType;
}

export function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.role === "user";

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
        <p className="whitespace-pre-wrap break-words leading-relaxed">{message.content}</p>
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
