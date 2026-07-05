/**
 * Adapter — the provider implementation lives in the ai-engine package.
 * Kept at this path so existing backend imports and test mocks keep working.
 */
export { getEmbeddings, resetEmbeddings, createChatLlm } from 'ai-engine';
