import { z } from 'zod';

export const projectIdParamSchema = z.object({
  projectId: z.string().uuid('Invalid project ID'),
});

export const documentAndProjectParamSchema = z.object({
  projectId: z.string().uuid('Invalid project ID'),
  documentId: z.string().uuid('Invalid document ID'),
});

export type ProjectIdParam = z.infer<typeof projectIdParamSchema>;
export type DocumentAndProjectParam = z.infer<typeof documentAndProjectParamSchema>;
