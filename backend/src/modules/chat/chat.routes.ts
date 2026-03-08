import express from 'express';
import { handleChat } from './chat.controller';

export const chatRouter = express.Router({ mergeParams: true });

// POST /api/projects/:projectId/chat
chatRouter.post('/', handleChat);

export default chatRouter;
