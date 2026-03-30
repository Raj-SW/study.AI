import express from 'express';
import { handleChat, listHistory, clearChatHistory } from './chat.controller';
import { validate } from '../../middleware/validate';
import { chatQuestionSchema } from './chat.schema';

export const chatRouter = express.Router({ mergeParams: true });

// GET  /api/projects/:projectId/chat  — fetch conversation history
chatRouter.get('/', listHistory);

// POST /api/projects/:projectId/chat  — ask a question
chatRouter.post('/', validate(chatQuestionSchema), handleChat);

// DELETE /api/projects/:projectId/chat  — clear conversation history
chatRouter.delete('/', clearChatHistory);

export default chatRouter;
