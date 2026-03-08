import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters';
import { Document } from '@langchain/core/documents';
import { logger } from '../../lib/logger';

// ~500 tokens ≈ 2000 chars, ~50 token overlap ≈ 200 chars
const DEFAULT_CHUNK_SIZE = 2000;
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

  const chunks = await splitter.splitDocuments(documents);

  logger.info(
    { inputDocs: documents.length, outputChunks: chunks.length, chunkSize, chunkOverlap },
    'Documents chunked',
  );

  return chunks;
}
