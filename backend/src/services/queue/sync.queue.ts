import { IJobQueue, JobPayload } from './queue.interface';
import { logger } from '../../lib/logger';

/**
 * Synchronous queue for MVP.
 * Jobs run immediately inline. Replace with BullMQ for async.
 *
 * To migrate to BullMQ:
 * 1. Create BullMQQueue implementing IJobQueue
 * 2. Swap the factory to return BullMQQueue
 * 3. Start a separate worker process
 * 4. No API changes needed
 */
export class SyncQueue implements IJobQueue {
  private handler?: (job: JobPayload) => Promise<void>;

  async enqueue(job: JobPayload): Promise<void> {
    if (!this.handler) {
      logger.warn({ job }, 'No handler registered for sync queue');
      return;
    }

    logger.info({ jobType: job.type }, 'Processing job synchronously');
    await this.handler(job);
  }

  process(handler: (job: JobPayload) => Promise<void>): void {
    this.handler = handler;
  }
}
