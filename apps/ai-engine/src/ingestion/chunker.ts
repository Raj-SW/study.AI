import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters';
import { Document } from '@langchain/core/documents';
import { logger } from '../logger';

// ~400 tokens ≈ 1500 chars — larger chunks preserve more context per retrieval
const DEFAULT_CHUNK_SIZE = 1500;
const DEFAULT_CHUNK_OVERLAP = 200;

export interface ChunkOptions {
  chunkSize?: number;
  chunkOverlap?: number;
}

export async function chunkDocuments(
  documents: Document[],
  options: ChunkOptions = {},
): Promise<Document[]> {
  const {
    chunkSize = DEFAULT_CHUNK_SIZE,
    chunkOverlap = DEFAULT_CHUNK_OVERLAP,
  } = options;

  const splitter = new RecursiveCharacterTextSplitter({
    chunkSize,
    chunkOverlap,
    separators: ['\n\n', '\n', '. ', ' ', ''],
  });

  const rawChunks = await splitter.splitDocuments(documents);

  // Discard whitespace-only chunks — these come from scanned/image-based PDFs where
  // pdf-parse finds no real text. Keeping them would cause the embedding API to reject
  // the empty strings and return zero-dimensional vectors.
  const chunks = rawChunks.filter((c) => c.pageContent.trim().length > 0);

  logger.info(
    { inputDocs: documents.length, rawChunks: rawChunks.length, outputChunks: chunks.length, chunkSize, chunkOverlap },
    'Documents chunked',
  );

  return chunks;
}
