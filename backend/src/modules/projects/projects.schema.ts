import { z } from 'zod';

export const createProjectSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Project name is required')
    .max(100, 'Project name must be 100 characters or less'),
});

export const projectIdParamSchema = z.object({
  projectId: z.string().uuid('Invalid project ID'),
});

export type CreateProjectBody = z.infer<typeof createProjectSchema>;
export type ProjectIdParam = z.infer<typeof projectIdParamSchema>;
