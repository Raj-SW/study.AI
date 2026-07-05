export interface JobPayload {
  type: string;
  data: Record<string, unknown>;
}

export interface IJobQueue {
  enqueue(job: JobPayload): Promise<void>;
  process(handler: (job: JobPayload) => Promise<void>): void;
}
