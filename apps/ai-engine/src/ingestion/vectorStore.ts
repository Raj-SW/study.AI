import { QdrantClient } from '@qdrant/js-client-rest';
import { Document } from '@langchain/core/documents';
import { getEmbeddings } from '../openai.provider';
import { getAiConfig } from '../config';
import { logger } from '../logger';
import { randomUUID } from 'crypto';

export interface VectorMetadata {
  userId: string;
  projectId: string;
  documentId: string;
  chunkIndex: number;
  source: string;
}

let qdrantClient: QdrantClient | null = null;

function getClient(): QdrantClient {
  if (!qdrantClient) {
    const config = getAiConfig();
    qdrantClient = new QdrantClient({
      url: config.QDRANT_URL,
      apiKey: config.QDRANT_API_KEY,
    });
  }
  return qdrantClient;
}

// Resolved lazily so importing the module never triggers env validation
function collection(): string {
  return getAiConfig().QDRANT_COLLECTION;
}
async function ensureCollection(vectorSize: number): Promise<void> {
  const client = getClient();
  const { collections } = await client.getCollections();
  const exists = collections.some((c) => c.name === collection());
  if (exists) {
    // Validate that the stored vector size matches; recreate if not
    const info = await client.getCollection(collection());
    const storedSize =
      typeof info.config?.params?.vectors === 'object' &&
      !Array.isArray(info.config.params.vectors) &&
      'size' in info.config.params.vectors
        ? (info.config.params.vectors as { size: number }).size
        : null;
    if (storedSize !== null && storedSize !== vectorSize) {
      logger.warn(
        { collection: collection(), storedSize, requiredSize: vectorSize },
        'Qdrant collection vector size mismatch — recreating collection',
      );
      await client.deleteCollection(collection());
      // Fall through to create below
    } else {
      return;
    }
  }
  await client.createCollection(collection(), {
    vectors: { size: vectorSize, distance: 'Cosine' },
  });
  // Create payload indexes for filtered queries
  await client.createPayloadIndex(collection(), {
    field_name: 'projectId',
    field_schema: 'keyword',
  });
  await client.createPayloadIndex(collection(), {
    field_name: 'documentId',
    field_schema: 'keyword',
  });
  logger.info({ collection: collection(), vectorSize }, 'Qdrant collection created');
}

export async function upsertChunks(
  chunks: Document[],
  metadata: Omit<VectorMetadata, 'chunkIndex' | 'source'>,
): Promise<number> {
  // Delete existing vectors for this document (idempotent re-index)
  await deleteByDocument(metadata.documentId);

  // Add metadata to each chunk
  const enrichedChunks = chunks.map((chunk, index) => ({
    pageContent: chunk.pageContent,
    metadata: {
      ...chunk.metadata,
      userId: metadata.userId,
      projectId: metadata.projectId,
      documentId: metadata.documentId,
      chunkIndex: index,
      source: chunk.metadata.source ?? 'pdf',
    } as VectorMetadata & Record<string, unknown>,
  }));

  // Precompute embeddings
  const texts = enrichedChunks.map((d) => d.pageContent);

  const maxAttempts = 3;
  let embeddings: unknown = null;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      embeddings = await getEmbeddings().embedDocuments(texts);

      try {
        const sample = Array.isArray(embeddings) ? embeddings.slice(0, 3).map((e: any) => (Array.isArray(e) ? e.length : typeof e)) : typeof embeddings;
        logger.debug({ documentId: metadata.documentId, attempt, sample }, 'Embeddings response sample');
      } catch {
        logger.debug({ documentId: metadata.documentId, attempt }, 'Embeddings response (unable to sample)');
      }

      if (Array.isArray(embeddings)) break;
    } catch (err) {
      const status = (err as any)?.status;
      const message = err instanceof Error ? err.message : String(err);
      const responseBody = (err as any)?.error ?? (err as any)?.body ?? null;
      logger.warn(
        {
          documentId: metadata.documentId,
          attempt,
          embeddingsBaseURL: getAiConfig().EMBEDDINGS_PROVIDER_BASE_URL,
          embeddingsModel: getAiConfig().EMBEDDINGS_MODEL,
          httpStatus: status,
          errorMessage: message,
          responseBody,
        },
        'Embedding provider call failed',
      );
    }

    await new Promise((r) => setTimeout(r, attempt * 500));
  }

  if (!Array.isArray(embeddings)) {
    logger.error({ documentId: metadata.documentId, embeddings }, 'Invalid embeddings response from provider');
    throw new Error('Invalid embeddings response from provider');
  }

  // Validate embeddings
  const validEmbeddings: number[][] = [];
  const validDocs: typeof enrichedChunks = [];
  const skippedIndices: number[] = [];

  (embeddings as number[][]).forEach((v, i) => {
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

  // Ensure collection exists with correct vector size (called every time; ensureCollection is idempotent)
  await ensureCollection(validEmbeddings[0].length);

  // Build Qdrant points
  const points = validDocs.map((doc, i) => ({
    id: randomUUID(),
    vector: validEmbeddings[i],
    payload: {
      content: doc.pageContent,
      ...doc.metadata,
    },
  }));

  const client = getClient();
  // Upsert in batches of 100
  const BATCH_SIZE = 100;
  for (let i = 0; i < points.length; i += BATCH_SIZE) {
    await client.upsert(collection(), {
      points: points.slice(i, i + BATCH_SIZE),
    });
  }

  logger.info(
    { documentId: metadata.documentId, stored: validDocs.length, total: enrichedChunks.length },
    'Vectors upserted to Qdrant',
  );

  return validDocs.length;
}

export async function similaritySearch(
  queryEmbedding: number[],
  topK: number,
  filter: Record<string, string>,
): Promise<Array<[Document, number]>> {
  await ensureCollection(queryEmbedding.length);

  const client = getClient();

  // Build Qdrant filter from key-value pairs
  const must = Object.entries(filter).map(([key, value]) => ({
    key,
    match: { value },
  }));

  const results = await client.search(collection(), {
    vector: queryEmbedding,
    limit: topK,
    with_payload: true,
    filter: { must },
  });

  return results.map((r) => {
    const payload = r.payload as Record<string, unknown>;
    return [
      new Document({
        pageContent: String(payload.content ?? ''),
        metadata: {
          documentId: payload.documentId,
          chunkIndex: payload.chunkIndex,
          projectId: payload.projectId,
          userId: payload.userId,
          source: payload.source,
        },
      }),
      r.score,
    ] as [Document, number];
  });
}

export async function deleteByDocument(documentId: string): Promise<void> {
  const client = getClient();
  try {
    await client.delete(collection(), {
      filter: {
        must: [{ key: 'documentId', match: { value: documentId } }],
      },
    });
    logger.info({ documentId }, 'Vectors deleted for document');
  } catch (err: any) {
    // Collection may not exist yet on first run
    if (err?.status === 404) return;
    throw err;
  }
}

export async function deleteByProject(projectId: string): Promise<void> {
  const client = getClient();
  try {
    await client.delete(collection(), {
      filter: {
        must: [{ key: 'projectId', match: { value: projectId } }],
      },
    });
    logger.info({ projectId }, 'Vectors deleted for project');
  } catch (err: any) {
    if (err?.status === 404) return;
    throw err;
  }
}

export async function closeVectorStore(): Promise<void> {
  qdrantClient = null;
}
