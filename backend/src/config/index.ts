import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(3001),
  DATABASE_URL: z.string().default('postgresql://postgres:postgres@localhost:5432/study_copilot'),

  // OpenAI — used directly or via AIDA proxy
  OPENAI_API_KEY: z.string().optional(),
  OPENAI_CHAT_MODEL: z.string().default('gpt-5-mini'),

  // Embeddings — local Ollama by default; set to OpenAI URL + key for cloud
  EMBEDDINGS_BASE_URL: z.string().default('http://localhost:11434/v1'),
  EMBEDDINGS_MODEL: z.string().default('nomic-embed-text'),

  // AIDA corporate proxy (set AIDA_BASE_URL to enable; omit for direct OpenAI)
  AIDA_BASE_URL: z.string().optional(),
  AIDA_TEAM_NAME: z.string().default('testTeam'),
  AIDA_USER_NAME: z.string().default('testUser'),
  AIDA_TOOL: z.string().default('studyAI'),

  UPLOAD_DIR: z.string().default('./uploads'),
  MAX_FILE_SIZE_MB: z.coerce.number().default(50),
  CORS_ORIGIN: z.string().default('http://localhost:5173'),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().default(60000),
  RATE_LIMIT_MAX: z.coerce.number().default(100),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),

  // Qdrant vector DB
  QDRANT_URL: z.string().default('http://localhost:6333'),
  QDRANT_COLLECTION: z.string().default('study_copilot'),
  QDRANT_API_KEY: z.string().optional(),
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
