import { useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Bot, Trash2 } from "lucide-react";
import { useChat } from "../hooks/useChat";
import { ChatMessage } from "./ChatMessage";
import { ChatInput } from "./ChatInput";

interface ChatPanelProps {
  projectId: string | null;
}

export function ChatPanel({ projectId }: ChatPanelProps) {
  const { messages, sendMessage, isLoading, clearMessages } = useChat(projectId);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex shrink-0 items-center justify-between border-b px-4 py-3">
        <h2 className="text-sm font-semibold">Chat</h2>
        {messages.length > 0 && (
          <Button variant="ghost" size="sm" onClick={clearMessages} aria-label="Clear conversation">
            <Trash2 className="size-4" />
            <span className="ml-1 text-xs">Clear</span>
          </Button>
        )}
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1">
        <div className="flex flex-col gap-4 px-4 py-4">
          {messages.length === 0 ? (
            <EmptyState hasProject={!!projectId} />
          ) : (
            messages.map((msg) => <ChatMessage key={msg.id} message={msg} />)
          )}
          {isLoading && <TypingIndicator />}
          <div ref={bottomRef} />
        </div>
      </ScrollArea>

      {/* Input */}
      <ChatInput onSend={sendMessage} isLoading={isLoading} disabled={!projectId} />
    </div>
  );
}

function EmptyState({ hasProject }: { hasProject: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center text-muted-foreground">
      <Bot className="mb-3 size-10 opacity-40" />
      <p className="text-sm font-medium">
        {hasProject ? "Ask anything about your documents" : "Select a project to start chatting"}
      </p>
      <p className="mt-1 text-xs">
        {hasProject
          ? "RAG-powered answers with source citations"
          : "Upload and index PDFs to enable Q&A"}
      </p>
    </div>
  );
}

function TypingIndicator() {
  return (
    <div className="flex items-start">
      <div className="rounded-2xl rounded-bl-sm bg-muted px-4 py-3">
        <div className="flex gap-1">
          <span className="size-1.5 animate-bounce rounded-full bg-muted-foreground [animation-delay:-0.3s]" />
          <span className="size-1.5 animate-bounce rounded-full bg-muted-foreground [animation-delay:-0.15s]" />
          <span className="size-1.5 animate-bounce rounded-full bg-muted-foreground" />
        </div>
      </div>
    </div>
  );
}
