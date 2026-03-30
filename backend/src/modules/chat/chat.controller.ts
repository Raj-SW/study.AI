import { Request, Response, NextFunction } from 'express';
import { answerQuestion } from '../../services/rag.service';
import { getHistory, saveExchange, clearHistory } from './chat.service';
import * as projectsService from '../projects/projects.service';

/**
 * GET /api/projects/:projectId/chat
 * Returns the full conversation history for this project/user.
 */
export async function listHistory(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const projectId = req.params.projectId as string;
    const userId = req.user!.id;

    await projectsService.verifyProjectOwnership(projectId, userId);

    const messages = await getHistory(projectId, userId);
    res.json({ messages });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/projects/:projectId/chat
 * Answers a question using RAG + conversation history, then persists the exchange.
 */
export async function handleChat(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const projectId = req.params.projectId as string;
    const userId = req.user!.id;
    const { question } = req.body as { question: string };

    // Load conversation history (last 20 messages = 10 turns)
    const history = await getHistory(projectId, userId);

    await projectsService.verifyProjectOwnership(projectId, userId);

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
    next(err);
  }
}

/**
 * DELETE /api/projects/:projectId/chat
 * Clears the full conversation history for this project/user.
 */
export async function clearChatHistory(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const projectId = req.params.projectId as string;
    const userId = req.user!.id;

    await projectsService.verifyProjectOwnership(projectId, userId);

    await clearHistory(projectId, userId);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

export default { listHistory, handleChat, clearChatHistory };
