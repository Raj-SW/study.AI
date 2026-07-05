import { jest } from '@jest/globals';

// Mock Prisma
const mockPrisma = {
  chatMessage: {
    findMany: jest.fn<() => Promise<any>>(),
    create: jest.fn<() => Promise<any>>(),
  },
  $transaction: jest.fn<() => Promise<any>>(),
};

jest.mock('../../src/lib/prisma', () => ({
  prisma: mockPrisma,
}));

import * as chatService from '../../src/modules/chat/chat.service';

describe('ChatService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getHistory', () => {
    it('should return messages in chronological order (oldest first)', async () => {
      const now = new Date();
      const earlier = new Date(now.getTime() - 5000);

      // findMany returns desc order — service must reverse them
      mockPrisma.chatMessage.findMany.mockResolvedValue([
        { id: 'msg-2', role: 'ASSISTANT', content: 'Paris.', sources: null, createdAt: now },
        { id: 'msg-1', role: 'USER', content: 'What is the capital?', sources: null, createdAt: earlier },
      ]);

      const result = await chatService.getHistory('proj-1', 'user-1');

      expect(result).toHaveLength(2);
      expect(result[0].role).toBe('USER');    // oldest first after reverse
      expect(result[1].role).toBe('ASSISTANT');
    });

    it('should pass projectId, userId and limit to Prisma', async () => {
      mockPrisma.chatMessage.findMany.mockResolvedValue([]);

      await chatService.getHistory('proj-1', 'user-1', 10);

      expect(mockPrisma.chatMessage.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { projectId: 'proj-1', userId: 'user-1' },
          take: 10,
        }),
      );
    });

    it('should return empty array when no history exists', async () => {
      mockPrisma.chatMessage.findMany.mockResolvedValue([]);

      const result = await chatService.getHistory('proj-1', 'user-1');

      expect(result).toEqual([]);
    });

    it('should parse sources JSON on ASSISTANT messages', async () => {
      const sources = [{ documentId: 'doc-1', chunkIndex: 0, score: 0.9, content: 'some text' }];

      mockPrisma.chatMessage.findMany.mockResolvedValue([
        { id: 'msg-1', role: 'ASSISTANT', content: 'Answer.', sources, createdAt: new Date() },
      ]);

      const result = await chatService.getHistory('proj-1', 'user-1');

      expect(result[0].sources).toEqual(sources);
    });
  });

  describe('saveExchange', () => {
    it('should create both user and assistant messages in a transaction', async () => {
      const userMsg = { id: 'u1', role: 'USER', content: 'Q?', sources: null, createdAt: new Date() };
      const assistantMsg = { id: 'a1', role: 'ASSISTANT', content: 'A!', sources: [], createdAt: new Date() };

      mockPrisma.$transaction.mockResolvedValue([userMsg, assistantMsg]);

      const result = await chatService.saveExchange('proj-1', 'user-1', 'Q?', {
        answer: 'A!',
        sources: [],
      });

      expect(mockPrisma.$transaction).toHaveBeenCalledTimes(1);
      expect(result.userMessage.role).toBe('USER');
      expect(result.userMessage.content).toBe('Q?');
      expect(result.assistantMessage.role).toBe('ASSISTANT');
      expect(result.assistantMessage.content).toBe('A!');
    });

    it('should store sources as JSON on the assistant message', async () => {
      const sources = [{ documentId: 'doc-1', chunkIndex: 2, score: 0.85, content: 'text' }];
      const assistantMsg = {
        id: 'a1',
        role: 'ASSISTANT',
        content: 'Answer with sources.',
        sources,
        createdAt: new Date(),
      };

      mockPrisma.$transaction.mockResolvedValue([
        { id: 'u1', role: 'USER', content: 'Q?', sources: null, createdAt: new Date() },
        assistantMsg,
      ]);

      const result = await chatService.saveExchange('proj-1', 'user-1', 'Q?', {
        answer: 'Answer with sources.',
        sources,
      });

      expect(result.assistantMessage.sources).toEqual(sources);
    });
  });
});
