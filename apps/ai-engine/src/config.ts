/**
 * config.ts — ai-engine's own environment configuration.
 *
 * Parsed lazily (on first access) so that merely importing the package never
 * throws — validation errors surface only when an AI function is actually
 * used. The host app (backend) loads dotenv at startup; the fallback
 * dotenv.config() here covers standalone use (scripts, tests).
 */

import dotenv from 'dotenv';
import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),

  // OpenAI — used directly or via AIDA proxy
  OPENAI_API_KEY: z.string().optional(),
  OPENAI_CHAT_MODEL: z.string().default('gpt-4o-mini'),

  // Embeddings provider
  EMBEDDINGS_PROVIDER: z.enum(['openai']).default('openai'),
  EMBEDDINGS_MODEL: z.string().default('text-embedding-3-small'),
  EMBEDDINGS_PROVIDER_BASE_URL: z.string().default('https://api.openai.com/v1'),

  // LLM provider flag: 'aida' routes through corporate proxy, 'openai' goes direct
  LLM_PROVIDER: z.enum(['openai', 'aida']).default('openai'),

  // AIDA corporate proxy (required when LLM_PROVIDER=aida)
  AIDA_BASE_URL: z.string().optional(),
  AIDA_TEAM_NAME: z.string().default('testTeam'),
  AIDA_USER_NAME: z.string().default('testUser'),
  AIDA_TOOL: z.string().default('studyAI'),

  // Qdrant vector DB
  QDRANT_URL: z.string().default('http://localhost:6333'),
  QDRANT_COLLECTION: z.string().default('study_copilot'),
  QDRANT_API_KEY: z.string().optional(),

  LOG_LEVEL: z
    .enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'])
    .default('info'),
});

export type AiConfig = z.infer<typeof envSchema>;

let cached: AiConfig | null = null;

export function getAiConfig(): AiConfig {
  if (!cached) {
    dotenv.config();
    const parsed = envSchema.safeParse(process.env);
    if (!parsed.success) {
      throw new Error(
        `ai-engine: invalid environment configuration: ${JSON.stringify(parsed.error.flatten().fieldErrors)}`,
      );
    }
    cached = parsed.data;
  }
  return cached;
}

/** Reset the cached config — used by tests that mutate process.env. */
export function resetAiConfig(): void {
  cached = null;
}
