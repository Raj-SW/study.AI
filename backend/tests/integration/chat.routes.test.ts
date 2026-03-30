import { jest } from '@jest/globals';

const PROJECT_ID = '550e8400-e29b-41d4-a716-446655440000';

// Mock Prisma
const mockPrisma = {
  user: {
    upsert: jest.fn<() => Promise<any>>().mockResolvedValue({}),
  },
  project: {
    findFirst: jest.fn<() => Promise<any>>(),
  },
  chatMessage: {
    findMany: jest.fn<() => Promise<any>>().mockResolvedValue([]),
    create: jest.fn<() => Promise<any>>(),
  },
  $transaction: jest.fn<(ops: any) => Promise<any>>(),
  $connect: jest.fn(),
  $disconnect: jest.fn(),
};

jest.mock('../../src/lib/prisma', () => ({
  prisma: mockPrisma,
}));

jest.mock('../../src/lib/logger', () => ({
  logger: { info: jest.fn(), error: jest.fn(), warn: jest.fn(), fatal: jest.fn() },
}));

// Mock RAG service so we don't need a real Gemini API key
jest.mock('../../src/services/rag.service', () => ({
  answerQuestion: jest.fn<() => Promise<any>>().mockResolvedValue({
    answer: 'Paris is the capital of France.',
    sources: [{ documentId: 'doc-1', chunkIndex: 0, score: 0.9, content: 'France capital is Paris.' }],
  }),
}));

import request from 'supertest';
import { createApp } from '../../src/app';
import { answerQuestion } from '../../src/services/rag.service';

const app = createApp();

describe('Chat Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPrisma.project.findFirst.mockResolvedValue({ id: PROJECT_ID });
    mockPrisma.chatMessage.findMany.mockResolvedValue([]);
    mockPrisma.$transaction.mockImplementation((ops: any[]) => Promise.all(ops));
  });

  describe('POST /api/projects/:projectId/chat', () => {
    it('should return 401 without auth header', async () => {
      const res = await request(app)
        .post(`/api/projects/${PROJECT_ID}/chat`)
        .send({ question: 'What is X?' });

      expect(res.status).toBe(401);
    });

    it('should return 400 when question is missing', async () => {
      const res = await request(app)
        .post(`/api/projects/${PROJECT_ID}/chat`)
        .set('x-user-id', 'user-1')
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.error.message).toMatch(/validation/i);
    });

    it('should return 400 when question is empty', async () => {
      const res = await request(app)
        .post(`/api/projects/${PROJECT_ID}/chat`)
        .set('x-user-id', 'user-1')
        .send({ question: '   ' });

      expect(res.status).toBe(400);
    });

    it('should return answer and sources on success', async () => {
      mockPrisma.$transaction.mockResolvedValue([
        { id: 'u1', role: 'USER', content: 'What is the capital of France?', sources: null, createdAt: new Date() },
        {
          id: 'a1',
          role: 'ASSISTANT',
          content: 'Paris is the capital of France.',
          sources: [{ documentId: 'doc-1', chunkIndex: 0, score: 0.9, content: 'France capital is Paris.' }],
          createdAt: new Date(),
        },
      ]);

      const res = await request(app)
        .post(`/api/projects/${PROJECT_ID}/chat`)
        .set('x-user-id', 'user-1')
        .send({ question: 'What is the capital of France?' });

      expect(res.status).toBe(200);
      expect(res.body.answer).toBe('Paris is the capital of France.');
      expect(res.body.sources).toHaveLength(1);
      expect(res.body.userMessage.role).toBe('USER');
      expect(res.body.assistantMessage.role).toBe('ASSISTANT');
    });

    it('should load history and pass it to answerQuestion', async () => {
      const historyRows = [
        { id: 'h1', role: 'USER', content: 'First question?', sources: null, createdAt: new Date(Date.now() - 2000) },
        { id: 'h2', role: 'ASSISTANT', content: 'First answer.', sources: null, createdAt: new Date(Date.now() - 1000) },
      ];
      mockPrisma.chatMessage.findMany.mockResolvedValue([...historyRows].reverse()); // desc from DB
      mockPrisma.$transaction.mockResolvedValue([
        { id: 'u2', role: 'USER', content: 'Follow up?', sources: null, createdAt: new Date() },
        { id: 'a2', role: 'ASSISTANT', content: 'Follow answer.', sources: [], createdAt: new Date() },
      ]);
      (answerQuestion as jest.MockedFunction<typeof answerQuestion>).mockResolvedValue({
        answer: 'Follow answer.',
        sources: [],
      });

      const res = await request(app)
        .post(`/api/projects/${PROJECT_ID}/chat`)
        .set('x-user-id', 'user-1')
        .send({ question: 'Follow up?' });

      expect(res.status).toBe(200);
      expect(answerQuestion).toHaveBeenCalledWith(
        expect.objectContaining({
          question: 'Follow up?',
          history: expect.arrayContaining([
            expect.objectContaining({ role: 'USER', content: 'First question?' }),
            expect.objectContaining({ role: 'ASSISTANT', content: 'First answer.' }),
          ]),
        }),
      );
    });
  });

  describe('GET /api/projects/:projectId/chat', () => {
    it('should return 401 without auth header', async () => {
      const res = await request(app).get(`/api/projects/${PROJECT_ID}/chat`);
      expect(res.status).toBe(401);
    });

    it('should return empty messages array when no history', async () => {
      mockPrisma.chatMessage.findMany.mockResolvedValue([]);

      const res = await request(app)
        .get(`/api/projects/${PROJECT_ID}/chat`)
        .set('x-user-id', 'user-1');

      expect(res.status).toBe(200);
      expect(res.body.messages).toEqual([]);
    });

    it('should return conversation history in chronological order', async () => {
      const now = new Date();
      const earlier = new Date(now.getTime() - 5000);
      // DB returns desc, service reverses to asc
      mockPrisma.chatMessage.findMany.mockResolvedValue([
        { id: 'msg-2', role: 'ASSISTANT', content: 'Paris.', sources: null, createdAt: now },
        { id: 'msg-1', role: 'USER', content: 'Capital?', sources: null, createdAt: earlier },
      ]);

      const res = await request(app)
        .get(`/api/projects/${PROJECT_ID}/chat`)
        .set('x-user-id', 'user-1');

      expect(res.status).toBe(200);
      expect(res.body.messages).toHaveLength(2);
      expect(res.body.messages[0].role).toBe('USER');   // oldest first
      expect(res.body.messages[1].role).toBe('ASSISTANT');
    });
  });
});
