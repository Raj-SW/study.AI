/**
 * ingestion.graph.ts — LangGraph StateGraph for the PDF ingestion pipeline.
 *
 * Models the ingestion as an explicit state machine:
 *
 *   START → markProcessing → parsePdf ─┬─ (error) → handleError → END
 *                                       └─ chunkText ─┬─ (error) → handleError → END
 *                                                      └─ embedAndUpsert ─┬─ (error) → handleError → END
 *                                                                          └─ markIndexed → END
 *
 * Benefits of LangGraph here:
 *  - Declarative, auditable state transitions
 *  - Each node is a pure function — easy to test, retry, or replace
 *  - Trivial to add checkpointing / human-in-the-loop later
 *  - BullMQ-ready: serialise IngestState and resume from any checkpoint
 *
 * The graph is built via `createIngestionGraph(deps)` so the host application
 * injects persistence (document status updates) and file resolution — ai-engine
 * has no knowledge of the host's database or storage layer.
 */

import { StateGraph, Annotation, START, END } from '@langchain/langgraph';
import { Document } from '@langchain/core/documents';
import { logger } from '../logger';

// ---------------------------------------------------------------------------
// Injected dependencies
// ---------------------------------------------------------------------------

export interface DocumentStatusUpdate {
  documentId: string;
  status: 'PROCESSING' | 'INDEXED' | 'FAILED';
  chunkCount?: number;
  error?: string;
}

export interface IngestionGraphDeps {
  /** Persist a document status transition (host-owned, e.g. Prisma). */
  updateStatus(update: DocumentStatusUpdate): Promise<void>;
  /** Resolve a stored relative filepath to an absolute path on disk. */
  resolvePath(filepath: string): string;
  /** Parse a PDF into per-page documents. */
  parsePdf(absolutePath: string): Promise<Document[]>;
  /** Split documents into chunks ready for embedding. */
  chunkDocuments(documents: Document[]): Promise<Document[]>;
  /** Embed chunks and upsert them into the vector store; returns stored count. */
  upsertChunks(
    chunks: Document[],
    metadata: { userId: string; projectId: string; documentId: string },
  ): Promise<number>;
}

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

/**
 * Every field that flows through the graph.
 * - Input fields (documentId, filepath, userId, projectId) are set once at invoke.
 * - Pipeline fields (pages, chunks, chunkCount) are populated by each node.
 * - error  is set by any node that fails; routing checks it to short-circuit.
 */
export const IngestStateAnnotation = Annotation.Root({
  // Immutable inputs
  documentId: Annotation<string>,
  filepath: Annotation<string>,
  userId: Annotation<string>,
  projectId: Annotation<string>,

  // Data produced by pipeline nodes (replace-semantics reducer)
  pages: Annotation<Document[]>({
    reducer: (_prev, next) => next,
    default: () => [],
  }),
  chunks: Annotation<Document[]>({
    reducer: (_prev, next) => next,
    default: () => [],
  }),
  chunkCount: Annotation<number>({
    reducer: (_prev, next) => next,
    default: () => 0,
  }),

  // Error propagation — any node can set this to cause handleError routing
  error: Annotation<string | null>({
    reducer: (_prev, next) => next,
    default: () => null,
  }),
});

export type IngestState = typeof IngestStateAnnotation.State;

// ---------------------------------------------------------------------------
// Conditional router — checks the error channel after each fallible node
// ---------------------------------------------------------------------------

function routeOnError(state: IngestState, nextNode: string): string {
  return state.error === null ? nextNode : 'handleError';
}

// ---------------------------------------------------------------------------
// Graph assembly & compilation
// ---------------------------------------------------------------------------

/**
 * Build and compile the ingestion graph with host-provided dependencies.
 * Call: await graph.invoke({ documentId, filepath, userId, projectId })
 */
export function createIngestionGraph(deps: IngestionGraphDeps) {
  async function markProcessing(state: IngestState): Promise<Partial<IngestState>> {
    try {
      await deps.updateStatus({ documentId: state.documentId, status: 'PROCESSING' });
    } catch (err) {
      // Non-fatal: the pipeline itself doesn't depend on this write succeeding,
      // only status visibility does. Swallowing here (rather than rejecting
      // graph.invoke()) lets parsing/chunking/embedding still run.
      logger.error(
        { documentId: state.documentId, err },
        'Ingestion graph: failed to persist PROCESSING status',
      );
    }
    logger.info({ documentId: state.documentId, projectId: state.projectId }, 'Ingestion graph: markProcessing');
    return {};
  }

  async function parsePdfNode(state: IngestState): Promise<Partial<IngestState>> {
    try {
      const absolutePath = deps.resolvePath(state.filepath);
      const pages = await deps.parsePdf(absolutePath);
      if (pages.length === 0) {
        return { error: 'PDF contains no extractable text' };
      }
      return { pages };
    } catch (err) {
      return { error: err instanceof Error ? err.message : 'PDF parsing failed' };
    }
  }

  async function chunkTextNode(state: IngestState): Promise<Partial<IngestState>> {
    try {
      const chunks = await deps.chunkDocuments(state.pages);
      if (chunks.length === 0) {
        return { error: 'No chunks produced from PDF' };
      }
      return { chunks };
    } catch (err) {
      return { error: err instanceof Error ? err.message : 'Chunking failed' };
    }
  }

  async function embedAndUpsertNode(state: IngestState): Promise<Partial<IngestState>> {
    try {
      const count = await deps.upsertChunks(state.chunks, {
        userId: state.userId,
        projectId: state.projectId,
        documentId: state.documentId,
      });
      return { chunkCount: count };
    } catch (err) {
      return { error: err instanceof Error ? err.message : 'Embedding/upsert failed' };
    }
  }

  async function markIndexed(state: IngestState): Promise<Partial<IngestState>> {
    logger.info(
      { documentId: state.documentId, chunkCount: state.chunkCount },
      'Ingestion graph: INDEXED',
    );
    try {
      await deps.updateStatus({
        documentId: state.documentId,
        status: 'INDEXED',
        chunkCount: state.chunkCount,
      });
    } catch (err) {
      // Embedding already succeeded — don't reject graph.invoke() over a
      // status-write failure. The document may be left stuck at PROCESSING;
      // logged distinctly so it's reconcilable, since the graph has no
      // retry/reconciliation mechanism of its own.
      logger.error(
        { documentId: state.documentId, chunkCount: state.chunkCount, err },
        'Ingestion graph: failed to persist INDEXED status — document may be stuck at PROCESSING',
      );
    }
    return {};
  }

  async function handleError(state: IngestState): Promise<Partial<IngestState>> {
    // Log the original ingestion error first — a persistence failure below
    // must never hide it.
    logger.error(
      { documentId: state.documentId, error: state.error },
      'Ingestion graph: FAILED',
    );
    try {
      await deps.updateStatus({
        documentId: state.documentId,
        status: 'FAILED',
        error: state.error ?? 'Unknown ingestion error',
      });
    } catch (err) {
      logger.error(
        { documentId: state.documentId, originalError: state.error, persistError: err },
        'Ingestion graph: failed to persist FAILED status',
      );
    }
    return {};
  }

  const workflow = new StateGraph(IngestStateAnnotation)
    .addNode('markProcessing', markProcessing)
    .addNode('parsePdf', parsePdfNode)
    .addNode('chunkText', chunkTextNode)
    .addNode('embedAndUpsert', embedAndUpsertNode)
    .addNode('markIndexed', markIndexed)
    .addNode('handleError', handleError)

    // Happy path edges
    .addEdge(START, 'markProcessing')
    .addEdge('markProcessing', 'parsePdf')

    // After each fallible node: check error, route accordingly
    .addConditionalEdges('parsePdf', (s) => routeOnError(s, 'chunkText'))
    .addConditionalEdges('chunkText', (s) => routeOnError(s, 'embedAndUpsert'))
    .addConditionalEdges('embedAndUpsert', (s) => routeOnError(s, 'markIndexed'))

    .addEdge('markIndexed', END)
    .addEdge('handleError', END);

  return workflow.compile();
}

export type IngestionGraph = ReturnType<typeof createIngestionGraph>;
