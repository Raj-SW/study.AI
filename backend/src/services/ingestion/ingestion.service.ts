import { ingestionGraph } from './ingestion.graph';
import { logger } from '../../lib/logger';

export interface IngestDocumentInput {
  documentId: string;
  filepath: string;
  userId: string;
  projectId: string;
}

/**
 * Thin orchestration wrapper over the LangGraph ingestion graph.
 *
 * The graph owns all pipeline logic (parse → chunk → embed → upsert) and
 * all status transitions (PROCESSING → INDEXED | FAILED).
 *
 * To migrate to async (BullMQ):
 *  1. Serialise IngestDocumentInput and enqueue to Redis.
 *  2. Worker calls `ingestionService.ingestDocument(payload)` — no graph changes.
 */
async function ingestDocument(input: IngestDocumentInput): Promise<void> {
  logger.info({ documentId: input.documentId, projectId: input.projectId }, 'Starting ingestion pipeline');

  await ingestionGraph.invoke({
    documentId: input.documentId,
    filepath: input.filepath,
    userId: input.userId,
    projectId: input.projectId,
  });
}

export const ingestionService = {
  ingestDocument,
};
