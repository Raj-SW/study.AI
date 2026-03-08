import express from 'express';
import { answerQuestion } from '../../services/rag.service';
import { logger } from '../../lib/logger';

export async function handleChat(req: express.Request, res: express.Response) {
  const rawProjectId = req.params.projectId;
  const projectId = Array.isArray(rawProjectId) ? rawProjectId[0] : rawProjectId ?? '';
  const userId = req.user?.id;
  const { question } = req.body as { question?: string };

  if (!question || question.trim().length === 0) {
    return res.status(400).json({ error: 'question is required' });
  }

  try {
    const result = await answerQuestion({ projectId, userId, question });
    return res.json(result);
  } catch (err) {
    logger.error({ err, projectId, userId }, 'Chat handler failed');
    return res.status(500).json({ error: 'failed to generate answer' });
  }
}

export default { handleChat };
