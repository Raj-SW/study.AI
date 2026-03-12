import express from 'express';
import { handleChat, listHistory } from './chat.controller';

export const chatRouter = express.Router({ mergeParams: true });

// GET  /api/projects/:projectId/chat  — fetch conversation history
chatRouter.get('/', listHistory);

// POST /api/projects/:projectId/chat  — ask a question
chatRouter.post('/', handleChat);

export default chatRouter;
