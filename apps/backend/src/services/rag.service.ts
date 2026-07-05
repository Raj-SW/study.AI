/**
 * Adapter — the RAG implementation lives in the ai-engine package.
 * Kept at this path so existing backend imports and test mocks keep working.
 */
export { answerQuestion } from 'ai-engine';
export type { AnswerResult, ChatTurn } from 'ai-engine';
