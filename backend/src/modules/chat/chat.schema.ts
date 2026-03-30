import { z } from 'zod';

export const chatQuestionSchema = z.object({
  question: z.string().trim().min(1, 'Question is required'),
});

export type ChatQuestionBody = z.infer<typeof chatQuestionSchema>;
