import { httpClient } from "@/lib/http";
import type { ChatRequest, ChatResponse, ChatHistoryResponse } from "../types";

export const chatApi = {
  send(projectId: string, data: ChatRequest): Promise<ChatResponse> {
    return httpClient.post<ChatResponse>(
      `/projects/${encodeURIComponent(projectId)}/chat`,
      { body: data }
    );
  },
  getHistory(projectId: string): Promise<ChatHistoryResponse> {
    return httpClient.get<ChatHistoryResponse>(
      `/projects/${encodeURIComponent(projectId)}/chat`
    );
  },
};
