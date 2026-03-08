import { z } from 'zod';

export const projectIdParamSchema = z.object({
  projectId: z.string().uuid('Invalid project ID'),
});

export type ProjectIdParam = z.infer<typeof projectIdParamSchema>;
