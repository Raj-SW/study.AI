import express from 'express';
import { answerQuestion } from '../../services/rag.service';
import { getHistory, saveExchange, clearHistory } from './chat.service';
import { logger } from '../../lib/logger';

/**
 * GET /api/projects/:projectId/chat
 * Returns the full conversation history for this project/user.
 */
export async function listHistory(req: express.Request, res: express.Response): Promise<void> {
  const rawProjectId = req.params.projectId;
  const projectId = Array.isArray(rawProjectId) ? rawProjectId[0] : rawProjectId ?? '';
  const userId = req.user!.id;

  try {
    const messages = await getHistory(projectId, userId);
    res.json({ messages });
  } catch (err) {
    logger.error({ err, projectId, userId }, 'Failed to fetch chat history');
    res.status(500).json({ error: 'failed to fetch chat history' });
  }
}

/**
 * POST /api/projects/:projectId/chat
 * Answers a question using RAG + conversation history, then persists the exchange.
 */
export async function handleChat(req: express.Request, res: express.Response): Promise<void> {
  const rawProjectId = req.params.projectId;
  const projectId = Array.isArray(rawProjectId) ? rawProjectId[0] : rawProjectId ?? '';
  const userId = req.user!.id;
  const { question } = req.body as { question?: string };

  if (!question || question.trim().length === 0) {
    res.status(400).json({ error: 'question is required' });
    return;
  }

  try {
    // Load conversation history (last 20 messages = 10 turns)
    const history = await getHistory(projectId, userId);

    // Generate answer with full history for context-aware follow-ups
    const result = await answerQuestion({ projectId, userId, question, history });

    // Persist both the user question and assistant answer atomically
    const { userMessage, assistantMessage } = await saveExchange(
      projectId,
      userId,
      question,
      result,
    );

    res.json({
      answer: result.answer,
      sources: result.sources,
      userMessage,
      assistantMessage,
    });
  } catch (err) {
    logger.error({ err, projectId, userId }, 'Chat handler failed');
    res.status(500).json({ error: 'failed to generate answer' });
  }
}

/**
 * DELETE /api/projects/:projectId/chat
 * Clears the full conversation history for this project/user.
 */
export async function clearChatHistory(req: express.Request, res: express.Response): Promise<void> {
  const rawProjectId = req.params.projectId;
  const projectId = Array.isArray(rawProjectId) ? rawProjectId[0] : rawProjectId ?? '';
  const userId = req.user!.id;

  try {
    await clearHistory(projectId, userId);
    res.status(204).send();
  } catch (err) {
    logger.error({ err, projectId, userId }, 'Failed to clear chat history');
    res.status(500).json({ error: 'failed to clear chat history' });
  }
}

export default { listHistory, handleChat, clearChatHistory };
