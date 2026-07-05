import { jest } from '@jest/globals';

// Mock Prisma
const mockPrisma = {
  user: {
    upsert: jest.fn<() => Promise<any>>().mockResolvedValue({}),
  },
  project: {
    findFirst: jest.fn<() => Promise<any>>(),
  },
  document: {
    findMany: jest.fn<() => Promise<any>>(),
    create: jest.fn<() => Promise<any>>(),
  },
  $connect: jest.fn(),
  $disconnect: jest.fn(),
};

jest.mock('../../src/lib/prisma', () => ({
  prisma: mockPrisma,
}));

jest.mock('../../src/lib/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    fatal: jest.fn(),
  },
}));

// Mock ingestion service (don't actually ingest)
jest.mock('../../src/services/ingestion/ingestion.service', () => ({
  ingestionService: {
    ingestDocument: jest.fn<() => Promise<any>>().mockResolvedValue(undefined),
  },
}));

// Mock storage
jest.mock('../../src/services/storage', () => ({
  createStorageService: () => ({
    save: jest.fn<() => Promise<any>>().mockResolvedValue('user-1/proj-1/file.pdf'),
    delete: jest.fn(),
    getAbsolutePath: jest.fn().mockReturnValue('/abs/path'),
    read: jest.fn(),
  }),
}));

import request from 'supertest';
import { createApp } from '../../src/app';

const app = createApp();

const PROJECT_ID = '550e8400-e29b-41d4-a716-446655440000';

describe('Documents Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Default: project exists
    mockPrisma.project.findFirst.mockResolvedValue({ id: PROJECT_ID });
  });

  describe('GET /api/projects/:projectId/documents', () => {
    it('should return 401 without auth', async () => {
      const res = await request(app).get(`/api/projects/${PROJECT_ID}/documents`);
      expect(res.status).toBe(401);
    });

    it('should return 400 for invalid projectId', async () => {
      const res = await request(app)
        .get('/api/projects/not-a-uuid/documents')
        .set('x-user-id', 'user-1');
      expect(res.status).toBe(400);
    });

    it('should return 404 if project not owned by user', async () => {
      mockPrisma.project.findFirst.mockResolvedValue(null);

      const res = await request(app)
        .get(`/api/projects/${PROJECT_ID}/documents`)
        .set('x-user-id', 'user-1');

      expect(res.status).toBe(404);
    });

    it('should return documents list', async () => {
      mockPrisma.document.findMany.mockResolvedValue([
        {
          id: 'doc-1',
          filename: 'biology.pdf',
          status: 'INDEXED',
          projectId: PROJECT_ID,
          error: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]);

      const res = await request(app)
        .get(`/api/projects/${PROJECT_ID}/documents`)
        .set('x-user-id', 'user-1');

      expect(res.status).toBe(200);
      expect(res.body.documents).toHaveLength(1);
      expect(res.body.documents[0].filename).toBe('biology.pdf');
    });
  });

  describe('POST /api/projects/:projectId/documents', () => {
    it('should reject non-PDF files', async () => {
      const res = await request(app)
        .post(`/api/projects/${PROJECT_ID}/documents`)
        .set('x-user-id', 'user-1')
        .attach('file', Buffer.from('not a pdf'), {
          filename: 'test.txt',
          contentType: 'text/plain',
        });

      // Multer rejects with 500 or our custom check catches it
      expect([400, 415, 500]).toContain(res.status);
    });

    it('should upload a PDF successfully', async () => {
      const mockDoc = {
        id: 'doc-1',
        filename: 'test.pdf',
        filepath: 'user-1/proj-1/abc.pdf',
        mimeType: 'application/pdf',
        sizeBytes: 100,
        status: 'UPLOADED',
        error: null,
        chunkCount: null,
        projectId: PROJECT_ID,
        userId: 'user-1',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrisma.document.create.mockResolvedValue(mockDoc);

      const pdfBuffer = Buffer.from('%PDF-1.4 fake pdf content');

      const res = await request(app)
        .post(`/api/projects/${PROJECT_ID}/documents`)
        .set('x-user-id', 'user-1')
        .attach('file', pdfBuffer, {
          filename: 'test.pdf',
          contentType: 'application/pdf',
        });

      expect(res.status).toBe(201);
      expect(res.body.document.filename).toBe('test.pdf');
      expect(res.body.document.status).toBe('UPLOADED');
    });
  });
});
