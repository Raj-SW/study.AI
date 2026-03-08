import { jest } from '@jest/globals';

// Mock Prisma
const mockPrisma = {
  document: {
    findMany: jest.fn<() => Promise<any>>(),
    create: jest.fn<() => Promise<any>>(),
    update: jest.fn<() => Promise<any>>(),
    findFirst: jest.fn<() => Promise<any>>(),
  },
};

jest.mock('../../src/lib/prisma', () => ({
  prisma: mockPrisma,
}));

import * as documentsService from '../../src/modules/documents/documents.service';
import { NotFoundError } from '../../src/lib/errors';

describe('DocumentsService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('listDocuments', () => {
    it('should return documents for a project and user', async () => {
      const mockDocs = [
        {
          id: 'doc-1',
          filename: 'biology.pdf',
          filepath: 'user-1/proj-1/file.pdf',
          mimeType: 'application/pdf',
          sizeBytes: 1024,
          status: 'INDEXED',
          error: null,
          chunkCount: 10,
          projectId: 'proj-1',
          userId: 'user-1',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      mockPrisma.document.findMany.mockResolvedValue(mockDocs);

      const result = await documentsService.listDocuments({
        projectId: 'proj-1',
        userId: 'user-1',
      });

      expect(result).toHaveLength(1);
      expect(result[0].filename).toBe('biology.pdf');
      expect(result[0].status).toBe('INDEXED');
    });
  });

  describe('createDocument', () => {
    it('should create a document with UPLOADED status', async () => {
      const mockDoc = {
        id: 'doc-1',
        filename: 'test.pdf',
        filepath: 'user-1/proj-1/abc.pdf',
        mimeType: 'application/pdf',
        sizeBytes: 2048,
        status: 'UPLOADED',
        error: null,
        chunkCount: null,
        projectId: 'proj-1',
        userId: 'user-1',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrisma.document.create.mockResolvedValue(mockDoc);

      const result = await documentsService.createDocument({
        filename: 'test.pdf',
        filepath: 'user-1/proj-1/abc.pdf',
        mimeType: 'application/pdf',
        sizeBytes: 2048,
        projectId: 'proj-1',
        userId: 'user-1',
      });

      expect(result.status).toBe('UPLOADED');
      expect(result.filename).toBe('test.pdf');
    });
  });

  describe('updateDocumentStatus', () => {
    it('should update status to INDEXED with chunk count', async () => {
      mockPrisma.document.update.mockResolvedValue({});

      await documentsService.updateDocumentStatus({
        documentId: 'doc-1',
        status: 'INDEXED',
        chunkCount: 15,
      });

      expect(mockPrisma.document.update).toHaveBeenCalledWith({
        where: { id: 'doc-1' },
        data: {
          status: 'INDEXED',
          error: null,
          chunkCount: 15,
        },
      });
    });

    it('should update status to FAILED with error message', async () => {
      mockPrisma.document.update.mockResolvedValue({});

      await documentsService.updateDocumentStatus({
        documentId: 'doc-1',
        status: 'FAILED',
        error: 'Parse failed',
      });

      expect(mockPrisma.document.update).toHaveBeenCalledWith({
        where: { id: 'doc-1' },
        data: {
          status: 'FAILED',
          error: 'Parse failed',
          chunkCount: undefined,
        },
      });
    });
  });

  describe('getDocumentById', () => {
    it('should throw NotFoundError if not found', async () => {
      mockPrisma.document.findFirst.mockResolvedValue(null);

      await expect(
        documentsService.getDocumentById('doc-1', 'user-1'),
      ).rejects.toThrow(NotFoundError);
    });
  });
});
