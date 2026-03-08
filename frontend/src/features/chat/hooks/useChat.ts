import { useState, useCallback, useEffect } from "react";
import { toast } from "sonner";
import { chatApi } from "../services/chatApi";
import type { ChatMessage } from "../types";

export function useChat(projectId: string | null) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Clear conversation when switching projects
  useEffect(() => {
    setMessages([]);
  }, [projectId]);

  const sendMessage = useCallback(
    async (question: string) => {
      if (!projectId || !question.trim()) return;

      const trimmed = question.trim();

      setMessages((prev) => [
        ...prev,
        { id: crypto.randomUUID(), role: "user", content: trimmed },
      ]);
      setIsLoading(true);

      try {
        const response = await chatApi.send(projectId, { question: trimmed });
        setMessages((prev) => [
          ...prev,
          {
            id: crypto.randomUUID(),
            role: "assistant",
            content: response.answer,
            sources: response.sources,
          },
        ]);
      } catch {
        toast.error("Failed to get an answer. Please try again.");
        setMessages((prev) => [
          ...prev,
          {
            id: crypto.randomUUID(),
            role: "assistant",
            content: "Sorry, something went wrong. Please try again.",
          },
        ]);
      } finally {
        setIsLoading(false);
      }
    },
    [projectId]
  );

  const clearMessages = useCallback(() => setMessages([]), []);

  return { messages, sendMessage, isLoading, clearMessages };
}
