/**
 * Adapter — implementation lives in the ai-engine package.
 */
export {
  upsertChunks,
  similaritySearch,
  deleteByDocument,
  deleteByProject,
  closeVectorStore,
} from 'ai-engine';
export type { VectorMetadata } from 'ai-engine';
