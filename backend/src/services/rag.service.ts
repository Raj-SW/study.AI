import { getEmbeddings } from './ingestion/embeddings';
import { getVectorStore } from './ingestion/vectorStore';
import { config } from '../config';
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { AIMessage, HumanMessage, SystemMessage, BaseMessage } from '@langchain/core/messages';
import { logger } from '../lib/logger';
import type { ChatMessageResponse } from '../modules/chat/chat.types';

export interface AnswerResult {
  answer: string;
  sources: Array<{
    documentId: string;
    chunkIndex: number;
    score: number;
    content: string;
  }>;
}

export async function answerQuestion({
  projectId,
  userId,
  question,
  history = [],
}: {
  projectId: string;
  userId: string;
  question: string;
  history?: ChatMessageResponse[];
}): Promise<AnswerResult> {
  const embeddings = getEmbeddings();

  // Embed the query
  const queryEmbedding = await embeddings.embedQuery(question);

  const vectorStore = await getVectorStore();

  const TOP_K = 5;

  // Restrict retrieval to the current project for tenant isolation
  const filter = { projectId } as const;

  const results = await vectorStore.similaritySearchVectorWithScore(queryEmbedding, TOP_K, filter as any);

  const sources = results.map(([doc, score]) => {
    return {
      documentId: String(doc.metadata?.documentId ?? ''),
      chunkIndex: Number(doc.metadata?.chunkIndex ?? 0),
      score: Number(score),
      content: doc.pageContent,
    };
  });

  // Build context string from retrieved chunks
  const context = sources
    .map((s, i) => `Source ${i + 1} (doc:${s.documentId} chunk:${s.chunkIndex} score:${s.score.toFixed(6)})\n${s.content}`)
    .join('\n\n---\n\n');

  // System instructions: ground answers in context, leverage history for follow-ups
  const system = new SystemMessage({
    content:
      'You are a study assistant that answers questions using the provided context from the user\'s documents. ' +
      'Use the conversation history to understand follow-up questions and resolve pronouns like "it", "that", or "they". ' +
      'Only use information from the provided context. ' +
      'Do not include source citations or document references in your answer — sources are provided separately. ' +
      'If the answer is not contained in the context, say you don\'t know.',
  });

  // Build history messages (USER → HumanMessage, ASSISTANT → AIMessage)
  const historyMessages: BaseMessage[] = history.map((msg) =>
    msg.role === 'USER'
      ? new HumanMessage({ content: msg.content })
      : new AIMessage({ content: msg.content }),
  );

  // Current turn: inject the retrieved context into the human message
  const currentHuman = new HumanMessage({
    content: `Question: ${question}\n\nContext:\n${context}`,
  });

  const llm = new ChatGoogleGenerativeAI({
    apiKey: config.GOOGLE_API_KEY,
    model: 'gemini-2.5-flash',
    maxOutputTokens: 8192,
    maxRetries: 1,
  });

  let responseText = '';
  try {
    const res = await llm.invoke([system, ...historyMessages, currentHuman] as any);
    responseText = typeof res.content === 'string'
      ? res.content
      : Array.isArray(res.content)
        ? res.content.map((c: any) => (typeof c === 'string' ? c : c.text ?? '')).join('')
        : String(res.content);
  } catch (err) {
    logger.error({ err, projectId, userId }, 'LLM generation failed');
    throw err;
  }

  return {
    answer: responseText,
    sources,
  };
}

export default { answerQuestion };
