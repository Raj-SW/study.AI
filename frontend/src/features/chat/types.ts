export type MessageRole = "USER" | "ASSISTANT";

export interface ChatSource {
  documentId: string;
  chunkIndex?: number;
  score?: number;
  content?: string;
  filename?: string;
}

export interface ChatMessage {
  id: string;
  role: MessageRole;
  content: string;
  sources?: ChatSource[] | null;
  createdAt?: string;
}

export interface ChatRequest {
  question: string;
}

export interface ChatResponse {
  answer: string;
  sources: ChatSource[];
  userMessage: ChatMessage;
  assistantMessage: ChatMessage;
}

export interface ChatHistoryResponse {
  messages: ChatMessage[];
}
