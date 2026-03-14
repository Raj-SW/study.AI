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

  // HyDE: generate a hypothetical answer and embed it instead of the raw question.
  // Hypothetical answers are closer in embedding space to real document chunks,
  // which improves retrieval precision over short query strings.
  const llm = new ChatGoogleGenerativeAI({
    apiKey: config.GOOGLE_API_KEY,
    model: 'gemini-2.5-flash',
    maxOutputTokens: 256,
    maxRetries: 1,
  });

  let queryText = question;
  try {
    const hydeRes = await llm.invoke([
      new SystemMessage(
        'Generate a concise, factual answer (2-4 sentences) as if it were written in a document. ' +
        'Do not explain yourself — output only the hypothetical answer text.',
      ),
      new HumanMessage(question),
    ] as any);
    const hydeText =
      typeof hydeRes.content === 'string'
        ? hydeRes.content
        : Array.isArray(hydeRes.content)
          ? hydeRes.content.map((c: any) => (typeof c === 'string' ? c : c.text ?? '')).join('')
          : String(hydeRes.content);
    if (hydeText.trim().length > 0) {
      queryText = hydeText;
      logger.info({ projectId, userId }, 'HyDE query expansion applied');
    }
  } catch (err) {
    // HyDE failure is non-fatal — fall back to raw question
    logger.warn({ err, projectId, userId }, 'HyDE expansion failed, using raw question');
  }

  const queryEmbedding = await embeddings.embedQuery(queryText);

  const vectorStore = await getVectorStore();

  const TOP_K = 10;
  const MIN_SCORE = 0.4;

  // Restrict retrieval to the current project for tenant isolation
  const filter = { projectId } as const;

  const results = await vectorStore.similaritySearchVectorWithScore(queryEmbedding, TOP_K, filter as any);

  // Drop chunks below the relevance threshold to reduce noise
  const sources = results
    .filter(([, score]) => score >= MIN_SCORE)
    .map(([doc, score]) => {
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
      'You are a study assistant that answers questions strictly using the provided context from the user\'s documents. ' +
      'Use the conversation history to understand follow-up questions and resolve pronouns like "it", "that", or "they". ' +
      'Only use information from the provided context — never use prior knowledge or make assumptions beyond it. ' +
      'When answering counting or aggregation questions, read ALL provided sources carefully before computing a total; ' +
      'if the sources appear incomplete, state that explicitly rather than giving a potentially wrong partial count. ' +
      'Do not include source citations or document references in your answer — sources are provided separately. ' +
      'If the answer is not contained in the context, say "I don\'t know" — do not guess.',
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

  const answerLlm = new ChatGoogleGenerativeAI({
    apiKey: config.GOOGLE_API_KEY,
    model: 'gemini-2.5-flash',
    maxOutputTokens: 8192,
    maxRetries: 1,
  });

  let responseText = '';
  try {
    const res = await answerLlm.invoke([system, ...historyMessages, currentHuman] as any);
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
