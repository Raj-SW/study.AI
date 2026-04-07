/**
 * openai.provider.ts — Centralised AI client configuration.
 *
 * Three call paths:
 *  - **Embeddings** → local Ollama (default) or any OpenAI-compatible endpoint
 *                      configured via EMBEDDINGS_BASE_URL.
 *  - **Chat LLM**   → routed through AIDA proxy when AIDA_BASE_URL is set,
 *                      otherwise direct to OpenAI.
 *
 * Switching providers:
 *  - Embeddings: change EMBEDDINGS_BASE_URL + EMBEDDINGS_MODEL in .env
 *  - LLM: remove AIDA_BASE_URL to go direct OpenAI with OPENAI_API_KEY
 */

import { ChatOpenAI, OpenAIEmbeddings } from '@langchain/openai';
import type { Embeddings } from '@langchain/core/embeddings';
import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { config } from '../config';

// ── Config helpers ───────────────────────────────────────────────────────────

const isAida = Boolean(config.AIDA_BASE_URL);

/** Config for AIDA-proxied calls (chat LLM only). */
function aidaChatConfig() {
  return {
    apiKey: 'aida', // AIDA ignores this but the SDK requires a non-empty string
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

/** Config for direct OpenAI calls (chat when AIDA is disabled). */
function directOpenAIConfig() {
  return { apiKey: config.OPENAI_API_KEY ?? '' };
}

// ── Embeddings singleton (local Ollama or any OpenAI-compatible endpoint) ───

let embeddingsInstance: OpenAIEmbeddings | null = null;

export function getEmbeddings(): Embeddings {
  if (!embeddingsInstance) {
    embeddingsInstance = new OpenAIEmbeddings({
      apiKey: config.OPENAI_API_KEY || 'ollama', // Ollama doesn't need a real key
      model: config.EMBEDDINGS_MODEL,
      configuration: {
        baseURL: config.EMBEDDINGS_BASE_URL,
      },
    });
  }
  return embeddingsInstance;
}

export function resetEmbeddings(): void {
  embeddingsInstance = null;
}

// ── Chat LLM factory (AIDA when available, otherwise direct OpenAI) ─────────

export function createChatLlm(maxTokens: number): BaseChatModel {
  const base = isAida ? aidaChatConfig() : directOpenAIConfig();
  return new ChatOpenAI({
    ...base,
    model: config.OPENAI_CHAT_MODEL,
    maxRetries: 1,
    modelKwargs: { max_completion_tokens: maxTokens },
  }) as unknown as BaseChatModel;
}
