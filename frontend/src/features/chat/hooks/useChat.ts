import { useState, useCallback, useEffect } from "react";
import { toast } from "sonner";
import { chatApi } from "../services/chatApi";
import type { ChatMessage } from "../types";

export function useChat(projectId: string | null) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Load conversation history from server when project changes
  useEffect(() => {
    if (!projectId) {
      setMessages([]);
      return;
    }

    let cancelled = false;

    chatApi
      .getHistory(projectId)
      .then((res) => {
        if (!cancelled) setMessages(res.messages);
      })
      .catch(() => {
        if (!cancelled) setMessages([]);
      });

    return () => {
      cancelled = true;
    };
  }, [projectId]);

  const sendMessage = useCallback(
    async (question: string) => {
      if (!projectId || !question.trim()) return;

      const trimmed = question.trim();
      const tempId = crypto.randomUUID();

      // Optimistic user message for instant feedback
      setMessages((prev) => [
        ...prev,
        { id: tempId, role: "USER", content: trimmed },
      ]);
      setIsLoading(true);

      try {
        const response = await chatApi.send(projectId, { question: trimmed });
        // Replace optimistic message with server-confirmed pair
        setMessages((prev) =>
          prev
            .filter((m) => m.id !== tempId)
            .concat([response.userMessage, response.assistantMessage])
        );
      } catch {
        toast.error("Failed to get an answer. Please try again.");
        // Keep the optimistic user message so the user can see what they asked
        setMessages((prev) => [
          ...prev,
          {
            id: crypto.randomUUID(),
            role: "ASSISTANT",
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

  const clearHistory = useCallback(async () => {
    if (!projectId) return;
    try {
      await chatApi.clearHistory(projectId);
      setMessages([]);
    } catch {
      toast.error("Failed to clear chat history. Please try again.");
    }
  }, [projectId]);

  return { messages, sendMessage, isLoading, clearMessages, clearHistory };
}
