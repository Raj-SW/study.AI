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
 */

import { StateGraph, Annotation, START, END } from '@langchain/langgraph';
import { Document } from '@langchain/core/documents';
import { parsePdf } from './pdf.parser';
import { chunkDocuments } from './chunker';
import { upsertChunks } from './vectorStore';
import { updateDocumentStatus } from '../../modules/documents/documents.service';
import { createStorageService } from '../storage';
import { logger } from '../../lib/logger';

const storage = createStorageService();

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
// Node functions
// ---------------------------------------------------------------------------

async function markProcessing(state: IngestState): Promise<Partial<IngestState>> {
  await updateDocumentStatus({ documentId: state.documentId, status: 'PROCESSING' });
  logger.info({ documentId: state.documentId, projectId: state.projectId }, 'Ingestion graph: markProcessing');
  return {};
}

async function parsePdfNode(state: IngestState): Promise<Partial<IngestState>> {
  try {
    const absolutePath = storage.getAbsolutePath(state.filepath);
    const pages = await parsePdf(absolutePath);
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
    const chunks = await chunkDocuments(state.pages);
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
    const count = await upsertChunks(state.chunks, {
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
  await updateDocumentStatus({
    documentId: state.documentId,
    status: 'INDEXED',
    chunkCount: state.chunkCount,
  });
  logger.info(
    { documentId: state.documentId, chunkCount: state.chunkCount },
    'Ingestion graph: INDEXED',
  );
  return {};
}

async function handleError(state: IngestState): Promise<Partial<IngestState>> {
  await updateDocumentStatus({
    documentId: state.documentId,
    status: 'FAILED',
    error: state.error ?? 'Unknown ingestion error',
  });
  logger.error(
    { documentId: state.documentId, error: state.error },
    'Ingestion graph: FAILED',
  );
  return {};
}

// ---------------------------------------------------------------------------
// Conditional router — checks the error channel after each fallible node
// ---------------------------------------------------------------------------

function routeOnError(state: IngestState, nextNode: string): string {
  return state.error !== null ? 'handleError' : nextNode;
}

// ---------------------------------------------------------------------------
// Graph assembly & compilation
// ---------------------------------------------------------------------------

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

/**
 * Compiled ingestion graph.
 * Call: await ingestionGraph.invoke({ documentId, filepath, userId, projectId })
 */
export const ingestionGraph = workflow.compile();
