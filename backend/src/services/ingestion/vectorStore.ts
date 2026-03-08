import { PGVectorStore } from '@langchain/community/vectorstores/pgvector';
import { Document } from '@langchain/core/documents';
import { getEmbeddings } from './embeddings';
import { config } from '../../config';
import { logger } from '../../lib/logger';

export interface VectorMetadata {
  userId: string;
  projectId: string;
  documentId: string;
  chunkIndex: number;
  source: string;
}

function getPoolConfig(): { connectionString: string } {
  return {
    connectionString: config.DATABASE_URL,
  };
}

let vectorStoreInstance: PGVectorStore | null = null;

export async function getVectorStore(): Promise<PGVectorStore> {
  if (!vectorStoreInstance) {
    vectorStoreInstance = await PGVectorStore.initialize(getEmbeddings(), {
      postgresConnectionOptions: getPoolConfig(),
      tableName: 'langchain_embeddings',
      columns: {
        idColumnName: 'id',
        vectorColumnName: 'embedding',
        contentColumnName: 'content',
        metadataColumnName: 'metadata',
      },
    });
  }
  return vectorStoreInstance;
}

export async function upsertChunks(
  chunks: Document[],
  metadata: Omit<VectorMetadata, 'chunkIndex' | 'source'>,
): Promise<number> {
  const vectorStore = await getVectorStore();

  // Delete existing vectors for this document (idempotent re-index)
  await deleteByDocument(metadata.documentId);

  // Add metadata to each chunk
  const enrichedChunks = chunks.map((chunk, index) => {
    return new Document({
      pageContent: chunk.pageContent,
      metadata: {
        ...chunk.metadata,
        userId: metadata.userId,
        projectId: metadata.projectId,
        documentId: metadata.documentId,
        chunkIndex: index,
        source: chunk.metadata.source ?? 'pdf',
      } satisfies VectorMetadata & Record<string, unknown>,
    });
  });

  // Precompute embeddings so we can validate dimensions before inserting
  const texts = enrichedChunks.map((d) => d.pageContent);

  // Retry wrapper + debug logging for embedder (helps diagnose empty/vector issues)
  const maxAttempts = 3;
  let embeddings: unknown = null;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      // call provider
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      // we keep the raw result in `embeddings` for deeper inspection in logs
      // @ts-ignore
      embeddings = await getEmbeddings().embedDocuments(texts as any);

      // Log a compact sample of the returned embeddings for debugging
      try {
        const sample = Array.isArray(embeddings) ? (embeddings as any[]).slice(0, 3).map((e) => (Array.isArray(e) ? e.length : typeof e)) : typeof embeddings;
        logger.debug({ documentId: metadata.documentId, attempt, sample }, 'Embeddings response sample');
      } catch (logErr) {
        logger.debug({ documentId: metadata.documentId, attempt }, 'Embeddings response (unable to sample)');
      }

      // Accept the response if it's an array (may still contain empty vectors)
      if (Array.isArray(embeddings)) break;
    } catch (err) {
      logger.warn({ err, documentId: metadata.documentId, attempt }, 'Embedding provider call failed');
    }

    // backoff before retrying
    // eslint-disable-next-line no-await-in-loop
    await new Promise((r) => setTimeout(r, attempt * 500));
  }

  if (!Array.isArray(embeddings)) {
    logger.error({ documentId: metadata.documentId, embeddings }, 'Invalid embeddings response from provider');
    throw new Error('Invalid embeddings response from provider');
  }

  // Validate embeddings: skip any empty vectors but continue with others.
  const validEmbeddings: number[][] = [];
  const validDocs: Document[] = [];
  const skippedIndices: number[] = [];

  (embeddings as any[]).forEach((v, i) => {
    if (!Array.isArray(v) || v.length === 0) {
      skippedIndices.push(i);
    } else {
      validEmbeddings.push(v);
      validDocs.push(enrichedChunks[i]);
    }
  });

  if (skippedIndices.length > 0) {
    logger.warn(
      { documentId: metadata.documentId, skippedIndices },
      'Some embeddings were empty and will be skipped',
    );
  }

  if (validEmbeddings.length === 0) {
    logger.error({ documentId: metadata.documentId }, 'All embeddings empty — aborting upsert');
    throw new Error('All embeddings empty — aborting upsert');
  }

  // Insert precomputed vectors together with documents (avoids double-embedding)
  await vectorStore.addVectors(validEmbeddings, validDocs);

  logger.info(
    { documentId: metadata.documentId, chunkCount: enrichedChunks.length },
    'Vectors upserted',
  );

  return enrichedChunks.length;
}

export async function deleteByDocument(documentId: string): Promise<void> {
  const vectorStore = await getVectorStore();
  await vectorStore.delete({ filter: { documentId } });
  logger.info({ documentId }, 'Vectors deleted for document');
}

export async function deleteByProject(projectId: string): Promise<void> {
  const vectorStore = await getVectorStore();
  await vectorStore.delete({ filter: { projectId } });
  logger.info({ projectId }, 'Vectors deleted for project');
}

export async function closeVectorStore(): Promise<void> {
  if (vectorStoreInstance) {
    await vectorStoreInstance.end();
    vectorStoreInstance = null;
  }
}
