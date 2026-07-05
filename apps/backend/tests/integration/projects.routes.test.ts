import { jest } from '@jest/globals';

// Mock Prisma before importing app
const mockPrisma = {
  user: {
    upsert: jest.fn<() => Promise<any>>().mockResolvedValue({}),
  },
  project: {
    findMany: jest.fn<() => Promise<any>>(),
    create: jest.fn<() => Promise<any>>(),
    findFirst: jest.fn<() => Promise<any>>(),
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

import request from 'supertest';
import { createApp } from '../../src/app';

const app = createApp();

describe('Projects Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/projects', () => {
    it('should return 401 without auth header', async () => {
      const res = await request(app).get('/api/projects');
      expect(res.status).toBe(401);
    });

    it('should return projects list', async () => {
      mockPrisma.project.findMany.mockResolvedValue([
        { id: '1', name: 'Bio', userId: 'user-1', createdAt: new Date(), updatedAt: new Date() },
      ]);

      const res = await request(app)
        .get('/api/projects')
        .set('x-user-id', 'user-1');

      expect(res.status).toBe(200);
      expect(res.body.projects).toHaveLength(1);
      expect(res.body.projects[0].name).toBe('Bio');
    });
  });

  describe('POST /api/projects', () => {
    it('should return 400 for empty name', async () => {
      const res = await request(app)
        .post('/api/projects')
        .set('x-user-id', 'user-1')
        .send({ name: '' });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return 400 for missing name', async () => {
      const res = await request(app)
        .post('/api/projects')
        .set('x-user-id', 'user-1')
        .send({});

      expect(res.status).toBe(400);
    });

    it('should create a project', async () => {
      mockPrisma.project.create.mockResolvedValue({
        id: '1',
        name: 'Biology 101',
        userId: 'user-1',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const res = await request(app)
        .post('/api/projects')
        .set('x-user-id', 'user-1')
        .send({ name: 'Biology 101' });

      expect(res.status).toBe(201);
      expect(res.body.project.name).toBe('Biology 101');
    });
  });
});
