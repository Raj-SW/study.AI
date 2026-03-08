import { httpClient } from "@/lib/http";
import type { ChatRequest, ChatResponse } from "../types";

export const chatApi = {
  send(projectId: string, data: ChatRequest): Promise<ChatResponse> {
    return httpClient.post<ChatResponse>(
      `/projects/${encodeURIComponent(projectId)}/chat`,
      { body: data }
    );
  },
};
