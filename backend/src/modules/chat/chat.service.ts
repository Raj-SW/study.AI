import { prisma } from '../../lib/prisma';
import type { ChatMessageResponse, MessageRole } from './chat.types';
import type { AnswerResult } from '../../services/rag.service';

const HISTORY_LIMIT = 20; // last 20 messages = 10 conversational turns

function toResponse(msg: {
  id: string;
  role: string;
  content: string;
  sources: unknown;
  createdAt: Date;
}): ChatMessageResponse {
  return {
    id: msg.id,
    role: msg.role as MessageRole,
    content: msg.content,
    sources: msg.sources
      ? (msg.sources as ChatMessageResponse['sources'])
      : undefined,
    createdAt: msg.createdAt.toISOString(),
  };
}

/**
 * Fetch the most recent messages for a project/user, oldest-first, for LLM context.
 */
export async function getHistory(
  projectId: string,
  userId: string,
  limit = HISTORY_LIMIT,
): Promise<ChatMessageResponse[]> {
  const rows = await prisma.chatMessage.findMany({
    where: { projectId, userId },
    orderBy: { createdAt: 'desc' },
    take: limit,
    select: { id: true, role: true, content: true, sources: true, createdAt: true },
  });
  // Reverse so oldest comes first (chronological order for LLM)
  return rows.reverse().map(toResponse);
}

/**
 * Persist the user question and the assistant answer as a pair.
 */
export async function saveExchange(
  projectId: string,
  userId: string,
  question: string,
  result: AnswerResult,
): Promise<{ userMessage: ChatMessageResponse; assistantMessage: ChatMessageResponse }> {
  const [userMsg, assistantMsg] = await prisma.$transaction([
    prisma.chatMessage.create({
      data: { projectId, userId, role: 'USER', content: question },
    }),
    prisma.chatMessage.create({
      data: {
        projectId,
        userId,
        role: 'ASSISTANT',
        content: result.answer,
        sources: result.sources as any,
      },
    }),
  ]);

  return {
    userMessage: toResponse(userMsg),
    assistantMessage: toResponse(assistantMsg),
  };
}
