export type MessageRole = "user" | "assistant";

export interface ChatSource {
  documentId: string;
  filename: string;
  chunkIndex?: number;
}

export interface ChatMessage {
  id: string;
  role: MessageRole;
  content: string;
  sources?: ChatSource[];
}

export interface ChatRequest {
  question: string;
}

export interface ChatResponse {
  answer: string;
  sources: ChatSource[];
}
