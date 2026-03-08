import { jest } from '@jest/globals';

// Mock Prisma
const mockPrisma = {
  project: {
    findMany: jest.fn<() => Promise<any>>(),
    create: jest.fn<() => Promise<any>>(),
    findFirst: jest.fn<() => Promise<any>>(),
  },
};

jest.mock('../../src/lib/prisma', () => ({
  prisma: mockPrisma,
}));

import * as projectsService from '../../src/modules/projects/projects.service';
import { ConflictError, NotFoundError } from '../../src/lib/errors';

describe('ProjectsService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('listProjects', () => {
    it('should return projects for a user', async () => {
      const mockProjects = [
        { id: '1', name: 'Biology', userId: 'user-1', createdAt: new Date(), updatedAt: new Date() },
        { id: '2', name: 'Math', userId: 'user-1', createdAt: new Date(), updatedAt: new Date() },
      ];

      mockPrisma.project.findMany.mockResolvedValue(mockProjects);

      const result = await projectsService.listProjects({ userId: 'user-1' });

      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('Biology');
      expect(result[1].name).toBe('Math');
      expect(mockPrisma.project.findMany).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
        orderBy: { createdAt: 'desc' },
      });
    });

    it('should return empty array when no projects', async () => {
      mockPrisma.project.findMany.mockResolvedValue([]);
      const result = await projectsService.listProjects({ userId: 'user-1' });
      expect(result).toEqual([]);
    });
  });

  describe('createProject', () => {
    it('should create a project', async () => {
      const mockProject = {
        id: '1',
        name: 'Biology',
        userId: 'user-1',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrisma.project.create.mockResolvedValue(mockProject);

      const result = await projectsService.createProject({
        name: 'Biology',
        userId: 'user-1',
      });

      expect(result.name).toBe('Biology');
      expect(result.id).toBe('1');
    });

    it('should throw ConflictError on duplicate name', async () => {
      const prismaError = Object.assign(new Error('Unique constraint'), { code: 'P2002' });
      mockPrisma.project.create.mockRejectedValue(prismaError);

      await expect(
        projectsService.createProject({ name: 'Biology', userId: 'user-1' }),
      ).rejects.toThrow(ConflictError);
    });
  });

  describe('verifyProjectOwnership', () => {
    it('should resolve if project exists for user', async () => {
      mockPrisma.project.findFirst.mockResolvedValue({ id: '1' });
      await expect(
        projectsService.verifyProjectOwnership('1', 'user-1'),
      ).resolves.not.toThrow();
    });

    it('should throw NotFoundError if project not found', async () => {
      mockPrisma.project.findFirst.mockResolvedValue(null);
      await expect(
        projectsService.verifyProjectOwnership('1', 'user-1'),
      ).rejects.toThrow(NotFoundError);
    });
  });
});
