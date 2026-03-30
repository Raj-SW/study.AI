import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(3001),
  DATABASE_URL: z.string().default('postgresql://postgres:postgres@localhost:5432/study_copilot'),
  EMBEDDINGS_PROVIDER: z.enum(['gemini', 'openai']).default('gemini'),
  LLM_PROVIDER: z.enum(['gemini', 'openai']).default('gemini'),
  GOOGLE_API_KEY: z.string().optional(),
  OPENAI_API_KEY: z.string().optional(),
  AIDA_BASE_URL: z.string().optional(),
  AIDA_TEAM_NAME: z.string().default('testTeam'),
  AIDA_USER_NAME: z.string().default('testUser'),
  AIDA_TOOL: z.string().default('studyAI'),
  AIDA_MODEL: z.string().default('gpt-5-mini'),
  UPLOAD_DIR: z.string().default('./uploads'),
  MAX_FILE_SIZE_MB: z.coerce.number().default(50),
  CORS_ORIGIN: z.string().default('http://localhost:5173'),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().default(60000),
  RATE_LIMIT_MAX: z.coerce.number().default(100),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('Invalid environment variables:', parsed.error.flatten().fieldErrors);
  throw new Error('Invalid environment configuration');
}

export const config = {
  ...parsed.data,
  MAX_FILE_SIZE_BYTES: parsed.data.MAX_FILE_SIZE_MB * 1024 * 1024,
  isDev: parsed.data.NODE_ENV === 'development',
  isProd: parsed.data.NODE_ENV === 'production',
  isTest: parsed.data.NODE_ENV === 'test',
} as const;

export type AppConfig = typeof config;
