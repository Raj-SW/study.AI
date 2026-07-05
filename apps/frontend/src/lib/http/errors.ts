export class HttpError extends Error {
  readonly status: number;
  readonly statusText: string;
  readonly body?: unknown;

  constructor(status: number, statusText: string, body?: unknown) {
    super(`HTTP ${status}: ${statusText}`);
    this.name = "HttpError";
    this.status = status;
    this.statusText = statusText;
    this.body = body;
  }
}
