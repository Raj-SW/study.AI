import { jest } from '@jest/globals';

// Mock dependencies
jest.mock('../../src/lib/prisma', () => ({
  prisma: {},
}));
jest.mock('../../src/modules/documents/documents.service');
jest.mock('../../src/services/ingestion/pdf.parser');
jest.mock('../../src/services/ingestion/chunker');
jest.mock('../../src/services/ingestion/vectorStore', () => ({
  upsertChunks: jest.fn<() => Promise<any>>(),
  deleteByDocument: jest.fn<() => Promise<any>>(),
  deleteByProject: jest.fn<() => Promise<any>>(),
  getVectorStore: jest.fn<() => Promise<any>>(),
  closeVectorStore: jest.fn<() => Promise<any>>(),
}));
jest.mock('../../src/services/storage', () => ({
  createStorageService: () => ({
    save: jest.fn(),
    delete: jest.fn(),
    getAbsolutePath: jest.fn().mockReturnValue('/abs/path/file.pdf'),
    read: jest.fn(),
  }),
}));
jest.mock('../../src/lib/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
  },
}));

import { ingestionService } from '../../src/services/ingestion/ingestion.service';
import { updateDocumentStatus } from '../../src/modules/documents/documents.service';
import { parsePdf } from '../../src/services/ingestion/pdf.parser';
import { chunkDocuments } from '../../src/services/ingestion/chunker';
import { upsertChunks } from '../../src/services/ingestion/vectorStore';
import { Document } from '@langchain/core/documents';

const mockUpdateStatus = updateDocumentStatus as jest.MockedFunction<typeof updateDocumentStatus>;
const mockParsePdf = parsePdf as jest.MockedFunction<typeof parsePdf>;
const mockChunkDocuments = chunkDocuments as jest.MockedFunction<typeof chunkDocuments>;
const mockUpsertChunks = upsertChunks as jest.MockedFunction<typeof upsertChunks>;

describe('IngestionService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const input = {
    documentId: 'doc-1',
    filepath: 'user-1/proj-1/file.pdf',
    userId: 'user-1',
    projectId: 'proj-1',
  };

  it('should process a PDF through the full pipeline', async () => {
    const mockPages = [new Document({ pageContent: 'Page 1 content', metadata: {} })];
    const mockChunks = [
      new Document({ pageContent: 'Chunk 1', metadata: {} }),
      new Document({ pageContent: 'Chunk 2', metadata: {} }),
    ];

    mockParsePdf.mockResolvedValue(mockPages);
    mockChunkDocuments.mockResolvedValue(mockChunks);
    mockUpsertChunks.mockResolvedValue(2);
    mockUpdateStatus.mockResolvedValue(undefined);

    await ingestionService.ingestDocument(input);

    // Verify pipeline order
    expect(mockUpdateStatus).toHaveBeenCalledWith({
      documentId: 'doc-1',
      status: 'PROCESSING',
    });
    expect(mockParsePdf).toHaveBeenCalled();
    expect(mockChunkDocuments).toHaveBeenCalledWith(mockPages);
    expect(mockUpsertChunks).toHaveBeenCalledWith(mockChunks, {
      userId: 'user-1',
      projectId: 'proj-1',
      documentId: 'doc-1',
    });
    expect(mockUpdateStatus).toHaveBeenCalledWith({
      documentId: 'doc-1',
      status: 'INDEXED',
      chunkCount: 2,
    });
  });

  it('should mark as FAILED when PDF has no text', async () => {
    mockParsePdf.mockResolvedValue([]);
    mockUpdateStatus.mockResolvedValue(undefined);

    await ingestionService.ingestDocument(input);

    expect(mockUpdateStatus).toHaveBeenCalledWith(
      expect.objectContaining({
        documentId: 'doc-1',
        status: 'FAILED',
        error: 'PDF contains no extractable text',
      }),
    );
  });

  it('should mark as FAILED on embedding error', async () => {
    const mockPages = [new Document({ pageContent: 'Content', metadata: {} })];
    const mockChunks = [new Document({ pageContent: 'Chunk', metadata: {} })];

    mockParsePdf.mockResolvedValue(mockPages);
    mockChunkDocuments.mockResolvedValue(mockChunks);
    mockUpsertChunks.mockRejectedValue(new Error('Embedding provider error'));
    mockUpdateStatus.mockResolvedValue(undefined);

    await ingestionService.ingestDocument(input);

    expect(mockUpdateStatus).toHaveBeenCalledWith(
      expect.objectContaining({
        documentId: 'doc-1',
        status: 'FAILED',
        error: 'Embedding provider error',
      }),
    );
  });
});
