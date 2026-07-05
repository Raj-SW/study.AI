/**
 * openai.provider.ts — Centralised AI client configuration.
 *
 * LLM routing  (controlled by LLM_PROVIDER in .env):
 *   LLM_PROVIDER=aida   → routes chat through the AIDA corporate proxy
 *   LLM_PROVIDER=openai → goes direct to OpenAI using OPENAI_API_KEY
 *
 * Embeddings (always OpenAI, controlled by EMBEDDINGS_PROVIDER in .env):
 *   EMBEDDINGS_PROVIDER=openai → uses OPENAI_API_KEY + EMBEDDINGS_MODEL
 */

import { ChatOpenAI, OpenAIEmbeddings } from '@langchain/openai';
import type { Embeddings } from '@langchain/core/embeddings';
import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { getAiConfig } from './config';
import { logger } from './logger';

// ── LLM provider config ──────────────────────────────────────────────────────

function aidaChatConfig() {
  const config = getAiConfig();
  return {
    apiKey: 'aida', // AIDA ignores the key but the SDK requires a non-empty string
    configuration: {
      baseURL: config.AIDA_BASE_URL,
      defaultHeaders: {
        'Aida-Team-Name': config.AIDA_TEAM_NAME,
        'Aida-User-Name': config.AIDA_USER_NAME,
        'Aida-Tool': config.AIDA_TOOL,
      },
    },
  };
}

function openAIChatConfig() {
  return { apiKey: getAiConfig().OPENAI_API_KEY ?? '' };
}

// ── Embeddings singleton (always OpenAI) ─────────────────────────────────────

let embeddingsInstance: OpenAIEmbeddings | null = null;

export function getEmbeddings(): Embeddings {
  if (!embeddingsInstance) {
    const config = getAiConfig();
    logger.info(
      { provider: config.EMBEDDINGS_PROVIDER, model: config.EMBEDDINGS_MODEL },
      'Embeddings: creating client',
    );
    embeddingsInstance = new OpenAIEmbeddings({
      apiKey: config.OPENAI_API_KEY ?? '',
      model: config.EMBEDDINGS_MODEL,
    });
  }
  return embeddingsInstance;
}

export function resetEmbeddings(): void {
  embeddingsInstance = null;
}

// ── Chat LLM factory ─────────────────────────────────────────────────────────

export function createChatLlm(maxTokens: number): BaseChatModel {
  const config = getAiConfig();
  const providerConfig = config.LLM_PROVIDER === 'aida' ? aidaChatConfig() : openAIChatConfig();

  logger.info({ provider: config.LLM_PROVIDER, model: config.OPENAI_CHAT_MODEL }, 'LLM: creating client');

  return new ChatOpenAI({
    ...providerConfig,
    model: config.OPENAI_CHAT_MODEL,
    maxRetries: 1,
    modelKwargs: { max_completion_tokens: maxTokens },
  }) as unknown as BaseChatModel;
}
