import { jest } from '@jest/globals';

/**
 * Unit tests for ingestion.graph.ts
 *
 * These tests target the LangGraph state machine directly — verifying that
 * conditional routing (error short-circuit) and state propagation work
 * correctly independent of the service wrapper.
 */

// ── Mocks (hoisted by Jest) ──────────────────────────────────────────────────

jest.mock('../../src/lib/prisma', () => ({ prisma: {} }));

jest.mock('../../src/lib/logger', () => ({
  logger: { info: jest.fn(), error: jest.fn(), warn: jest.fn() },
}));

jest.mock('../../src/modules/documents/documents.service');

jest.mock('../../src/services/ingestion/pdf.parser');

jest.mock('../../src/services/ingestion/chunker');

jest.mock('../../src/services/ingestion/vectorStore', () => ({
  upsertChunks: jest.fn<() => Promise<any>>(),
  deleteByDocument: jest.fn<() => Promise<any>>(),
  deleteByProject: jest.fn<() => Promise<any>>(),
  getVectorStore: jest.fn<() => Promise<any>>(),
}));

jest.mock('../../src/services/storage', () => ({
  createStorageService: () => ({
    save: jest.fn(),
    delete: jest.fn(),
    getAbsolutePath: jest.fn().mockReturnValue('/abs/path/file.pdf'),
    read: jest.fn(),
  }),
}));

// ── Imports (after mocks) ────────────────────────────────────────────────────

import { ingestionGraph } from '../../src/services/ingestion/ingestion.graph';
import { updateDocumentStatus } from '../../src/modules/documents/documents.service';
import { parsePdf } from '../../src/services/ingestion/pdf.parser';
import { chunkDocuments } from '../../src/services/ingestion/chunker';
import { upsertChunks } from '../../src/services/ingestion/vectorStore';
import { Document } from '@langchain/core/documents';

const mockUpdateStatus = updateDocumentStatus as jest.MockedFunction<typeof updateDocumentStatus>;
const mockParsePdf = parsePdf as jest.MockedFunction<typeof parsePdf>;
const mockChunkDocuments = chunkDocuments as jest.MockedFunction<typeof chunkDocuments>;
const mockUpsertChunks = upsertChunks as jest.MockedFunction<typeof upsertChunks>;

const baseInput = {
  documentId: 'doc-graph-1',
  filepath: 'user-1/proj-1/file.pdf',
  userId: 'user-1',
  projectId: 'proj-1',
};

// ── Tests ────────────────────────────────────────────────────────────────────

describe('IngestGraph', () => {
  beforeEach(() => jest.clearAllMocks());

  describe('happy path', () => {
    it('flows START → markProcessing → parsePdf → chunkText → embedAndUpsert → markIndexed → END', async () => {
      const pages = [new Document({ pageContent: 'Page content', metadata: {} })];
      const chunks = [
        new Document({ pageContent: 'Chunk A', metadata: {} }),
        new Document({ pageContent: 'Chunk B', metadata: {} }),
      ];

      mockUpdateStatus.mockResolvedValue(undefined);
      mockParsePdf.mockResolvedValue(pages);
      mockChunkDocuments.mockResolvedValue(chunks);
      mockUpsertChunks.mockResolvedValue(2);

      const finalState = await ingestionGraph.invoke(baseInput);

      // Graph state reflects pipeline output
      expect(finalState.pages).toEqual(pages);
      expect(finalState.chunks).toEqual(chunks);
      expect(finalState.chunkCount).toBe(2);
      expect(finalState.error).toBeNull();

      // DB status transitions: PROCESSING → INDEXED
      expect(mockUpdateStatus).toHaveBeenNthCalledWith(1, {
        documentId: 'doc-graph-1',
        status: 'PROCESSING',
      });
      expect(mockUpdateStatus).toHaveBeenNthCalledWith(2, {
        documentId: 'doc-graph-1',
        status: 'INDEXED',
        chunkCount: 2,
      });
      expect(mockUpdateStatus).toHaveBeenCalledTimes(2);
    });
  });

  describe('error routing — each fallible node short-circuits to handleError', () => {
    it('routes to handleError when parsePdf returns no pages', async () => {
      mockUpdateStatus.mockResolvedValue(undefined);
      mockParsePdf.mockResolvedValue([]); // empty → error set in parsePdfNode

      const finalState = await ingestionGraph.invoke(baseInput);

      expect(finalState.error).toBe('PDF contains no extractable text');

      // chunkText and embedAndUpsert must NOT have been called
      expect(mockChunkDocuments).not.toHaveBeenCalled();
      expect(mockUpsertChunks).not.toHaveBeenCalled();

      // DB transitions: PROCESSING → FAILED
      expect(mockUpdateStatus).toHaveBeenNthCalledWith(1, { documentId: 'doc-graph-1', status: 'PROCESSING' });
      expect(mockUpdateStatus).toHaveBeenNthCalledWith(2, {
        documentId: 'doc-graph-1',
        status: 'FAILED',
        error: 'PDF contains no extractable text',
      });
    });

    it('routes to handleError when parsePdf throws', async () => {
      mockUpdateStatus.mockResolvedValue(undefined);
      mockParsePdf.mockRejectedValue(new Error('Corrupted PDF'));

      const finalState = await ingestionGraph.invoke(baseInput);

      expect(finalState.error).toBe('Corrupted PDF');
      expect(mockChunkDocuments).not.toHaveBeenCalled();
      expect(mockUpdateStatus).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'FAILED', error: 'Corrupted PDF' }),
      );
    });

    it('routes to handleError when chunkDocuments produces no chunks', async () => {
      const pages = [new Document({ pageContent: 'Content', metadata: {} })];
      mockUpdateStatus.mockResolvedValue(undefined);
      mockParsePdf.mockResolvedValue(pages);
      mockChunkDocuments.mockResolvedValue([]); // empty → error set in chunkTextNode

      const finalState = await ingestionGraph.invoke(baseInput);

      expect(finalState.error).toBe('No chunks produced from PDF');
      expect(mockUpsertChunks).not.toHaveBeenCalled();
      expect(mockUpdateStatus).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'FAILED', error: 'No chunks produced from PDF' }),
      );
    });

    it('routes to handleError when upsertChunks throws', async () => {
      const pages = [new Document({ pageContent: 'Content', metadata: {} })];
      const chunks = [new Document({ pageContent: 'Chunk', metadata: {} })];
      mockUpdateStatus.mockResolvedValue(undefined);
      mockParsePdf.mockResolvedValue(pages);
      mockChunkDocuments.mockResolvedValue(chunks);
      mockUpsertChunks.mockRejectedValue(new Error('Embedding provider quota exceeded'));

      const finalState = await ingestionGraph.invoke(baseInput);

      expect(finalState.error).toBe('Embedding provider quota exceeded');
      expect(mockUpdateStatus).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'FAILED', error: 'Embedding provider quota exceeded' }),
      );
    });
  });

  describe('state propagation', () => {
    it('passes pages from parsePdf to chunkDocuments correctly', async () => {
      const pages = [
        new Document({ pageContent: 'Page 1', metadata: { source: 'test.pdf', loc: { pageNumber: 1 } } }),
        new Document({ pageContent: 'Page 2', metadata: { source: 'test.pdf', loc: { pageNumber: 2 } } }),
      ];
      mockUpdateStatus.mockResolvedValue(undefined);
      mockParsePdf.mockResolvedValue(pages);
      mockChunkDocuments.mockResolvedValue([new Document({ pageContent: 'Chunk', metadata: {} })]);
      mockUpsertChunks.mockResolvedValue(1);

      await ingestionGraph.invoke(baseInput);

      expect(mockChunkDocuments).toHaveBeenCalledWith(pages);
    });

    it('passes userId + projectId + documentId metadata to upsertChunks', async () => {
      const pages = [new Document({ pageContent: 'Content', metadata: {} })];
      const chunks = [new Document({ pageContent: 'C', metadata: {} })];
      mockUpdateStatus.mockResolvedValue(undefined);
      mockParsePdf.mockResolvedValue(pages);
      mockChunkDocuments.mockResolvedValue(chunks);
      mockUpsertChunks.mockResolvedValue(1);

      await ingestionGraph.invoke(baseInput);

      expect(mockUpsertChunks).toHaveBeenCalledWith(chunks, {
        userId: 'user-1',
        projectId: 'proj-1',
        documentId: 'doc-graph-1',
      });
    });
  });
});
