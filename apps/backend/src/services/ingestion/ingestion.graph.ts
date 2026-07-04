/**
 * Wires the ai-engine ingestion graph to backend-owned concerns:
 * document status persistence (Prisma) and file path resolution (storage).
 *
 * Pipeline functions are imported through the local adapter modules (not
 * directly from ai-engine) so tests can mock them at these backend paths.
 */
import { createIngestionGraph } from 'ai-engine';
import { updateDocumentStatus } from '../../modules/documents/documents.service';
import { createStorageService } from '../storage';
import { parsePdf } from './pdf.parser';
import { chunkDocuments } from './chunker';
import { upsertChunks } from './vectorStore';

const storage = createStorageService();

export const ingestionGraph = createIngestionGraph({
  updateStatus: updateDocumentStatus,
  resolvePath: (filepath) => storage.getAbsolutePath(filepath),
  parsePdf,
  chunkDocuments,
  upsertChunks,
});

export type { IngestState } from 'ai-engine';
