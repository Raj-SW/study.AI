import { jest } from '@jest/globals';

/**
 * E2E flow test: Create project → Upload PDF → Document reaches INDEXED status
 *
 * This test mocks the embeddings/vector DB layer but exercises the full
 * request → service → ingestion pipeline → status update flow.
 */

// Mock Prisma with in-memory state
import { v4 as uuidv4 } from 'uuid';

const projectsStore: Record<string, any> = {};
const documentsStore: Record<string, any> = {};

const mockPrisma = {
  user: {
    upsert: jest.fn<() => Promise<any>>().mockResolvedValue({}),
  },
  project: {
    findMany: jest.fn().mockImplementation(({ where }: any) => {
      return Promise.resolve(
        Object.values(projectsStore).filter((p: any) => p.userId === where.userId),
      );
    }),
    create: jest.fn().mockImplementation(({ data }: any) => {
      const id = uuidv4();
      const project = { id, ...data, createdAt: new Date(), updatedAt: new Date() };
      projectsStore[id] = project;
      return Promise.resolve(project);
    }),
    findFirst: jest.fn().mockImplementation(({ where }: any) => {
      return Promise.resolve(
        Object.values(projectsStore).find(
          (p: any) => p.id === where.id && p.userId === where.userId,
        ) ?? null,
      );
    }),
  },
  document: {
    findMany: jest.fn().mockImplementation(({ where }: any) => {
      return Promise.resolve(
        Object.values(documentsStore).filter(
          (d: any) => d.projectId === where.projectId && d.userId === where.userId,
        ),
      );
    }),
    create: jest.fn().mockImplementation(({ data }: any) => {
      const id = uuidv4();
      const doc = { id, ...data, error: null, chunkCount: null, createdAt: new Date(), updatedAt: new Date() };
      documentsStore[id] = doc;
      return Promise.resolve(doc);
    }),
    update: jest.fn().mockImplementation(({ where, data }: any) => {
      const doc = documentsStore[where.id];
      if (doc) {
        Object.assign(doc, data, { updatedAt: new Date() });
      }
      return Promise.resolve(doc);
    }),
    findFirst: jest.fn().mockImplementation(({ where }: any) => {
      return Promise.resolve(
        Object.values(documentsStore).find(
          (d: any) => d.id === where.id && d.userId === where.userId,
        ) ?? null,
      );
    }),
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

// Mock storage
jest.mock('../../src/services/storage', () => ({
  createStorageService: () => ({
    save: jest.fn<() => Promise<any>>().mockResolvedValue('user-1/proj-1/file.pdf'),
    delete: jest.fn(),
    getAbsolutePath: jest.fn().mockReturnValue('/abs/path/file.pdf'),
    read: jest.fn(),
  }),
}));

// Mock ingestion to simulate success
jest.mock('../../src/services/ingestion/pdf.parser', () => ({
  parsePdf: jest.fn<() => Promise<any>>().mockResolvedValue([
    { pageContent: 'Test content from PDF', metadata: { source: 'test.pdf' } },
  ]),
}));

jest.mock('../../src/services/ingestion/chunker', () => ({
  chunkDocuments: jest.fn<() => Promise<any>>().mockResolvedValue([
    { pageContent: 'Chunk 1', metadata: {} },
    { pageContent: 'Chunk 2', metadata: {} },
  ]),
}));

jest.mock('../../src/services/ingestion/vectorStore', () => ({
  upsertChunks: jest.fn<() => Promise<any>>().mockResolvedValue(2),
  deleteByDocument: jest.fn(),
}));

import request from 'supertest';
import { createApp } from '../../src/app';

const app = createApp();
const USER_ID = 'e2e-user-1';

describe('E2E: Upload Flow', () => {
  beforeEach(() => {
    // Clear stores
    Object.keys(projectsStore).forEach((k) => delete projectsStore[k]);
    Object.keys(documentsStore).forEach((k) => delete documentsStore[k]);
  });

  it('should create project → upload PDF → document status becomes INDEXED', async () => {
    // Step 1: Create project
    const createRes = await request(app)
      .post('/api/projects')
      .set('x-user-id', USER_ID)
      .send({ name: 'Biology 101' });

    expect(createRes.status).toBe(201);
    const projectId = createRes.body.project.id;
    expect(projectId).toBeDefined();

    // Step 2: Upload PDF
    const pdfBuffer = Buffer.from('%PDF-1.4 test pdf content');

    const uploadRes = await request(app)
      .post(`/api/projects/${projectId}/documents`)
      .set('x-user-id', USER_ID)
      .attach('file', pdfBuffer, {
        filename: 'biology-chapter1.pdf',
        contentType: 'application/pdf',
      });

    expect(uploadRes.status).toBe(201);
    expect(uploadRes.body.document.status).toBe('UPLOADED');
    const documentId = uploadRes.body.document.id;

    // Step 3: Wait for ingestion (setImmediate used in controller)
    await new Promise((resolve) => setTimeout(resolve, 200));

    // Step 4: Check document status
    const listRes = await request(app)
      .get(`/api/projects/${projectId}/documents`)
      .set('x-user-id', USER_ID);

    expect(listRes.status).toBe(200);
    const doc = listRes.body.documents.find((d: any) => d.id === documentId);
    expect(doc).toBeDefined();
    // Status should be INDEXED after mock ingestion completes
    expect(doc.status).toBe('INDEXED');
  });
});
