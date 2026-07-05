import { useState, useRef, type KeyboardEvent } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { SendHorizonal } from "lucide-react";

interface ChatInputProps {
  onSend: (message: string) => void;
  isLoading: boolean;
  disabled: boolean;
}

export function ChatInput({ onSend, isLoading, disabled }: ChatInputProps) {
  const [value, setValue] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const canSend = !isLoading && !disabled && value.trim().length > 0;

  const handleSend = () => {
    if (!canSend) return;
    onSend(value.trim());
    setValue("");
    textareaRef.current?.focus();
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex items-end gap-2 border-t p-4">
      <Textarea
        ref={textareaRef}
        placeholder={
          disabled
            ? "Select a project to start chatting"
            : "Ask a question… (Enter to send, Shift+Enter for new line)"
        }
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        rows={1}
        className="min-h-[40px] resize-none"
        disabled={disabled || isLoading}
      />
      <Button
        size="icon"
        onClick={handleSend}
        disabled={!canSend}
        aria-label="Send message"
      >
        <SendHorizonal className="size-4" />
      </Button>
    </div>
  );
}
