export type MessageRole = 'USER' | 'ASSISTANT';

export interface ChatMessageResponse {
  id: string;
  role: MessageRole;
  content: string;
  sources?: Array<{
    documentId: string;
    chunkIndex: number;
    score: number;
    content: string;
  }>;
  createdAt: string;
}
