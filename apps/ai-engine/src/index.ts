/**
 * ai-engine — public API.
 *
 * All AI-related capabilities for Study Copilot: LLM/embeddings providers,
 * RAG question answering, and the PDF ingestion pipeline (parse → chunk →
 * embed → upsert). Host applications inject persistence and storage concerns
 * via `createIngestionGraph`.
 */

export { getEmbeddings, resetEmbeddings, createChatLlm } from './openai.provider';
export { answerQuestion } from './rag.service';
export type { AnswerResult, ChatTurn } from './rag.service';
export { parsePdf } from './ingestion/pdf.parser';
export { chunkDocuments } from './ingestion/chunker';
export type { ChunkOptions } from './ingestion/chunker';
export {
  upsertChunks,
  similaritySearch,
  deleteByDocument,
  deleteByProject,
  closeVectorStore,
} from './ingestion/vectorStore';
export type { VectorMetadata } from './ingestion/vectorStore';
export { createIngestionGraph, IngestStateAnnotation } from './ingestion/ingestion.graph';
export type {
  IngestionGraph,
  IngestionGraphDeps,
  IngestState,
  DocumentStatusUpdate,
} from './ingestion/ingestion.graph';
export { getAiConfig, resetAiConfig } from './config';
export type { AiConfig } from './config';
