export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly isOperational: boolean;

  constructor(message: string, statusCode: number, code: string, isOperational = true) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = isOperational;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string, id?: string) {
    const message = id ? `${resource} with id '${id}' not found` : `${resource} not found`;
    super(message, 404, 'NOT_FOUND');
  }
}

export class ValidationError extends AppError {
  public readonly details: unknown[];

  constructor(message: string, details: unknown[] = []) {
    super(message, 400, 'VALIDATION_ERROR');
    this.details = details;
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super(message, 409, 'CONFLICT');
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Authentication required') {
    super(message, 401, 'UNAUTHORIZED');
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Access denied') {
    super(message, 403, 'FORBIDDEN');
  }
}

export class FileTooLargeError extends AppError {
  constructor(maxSizeMB: number) {
    super(`File size exceeds maximum allowed size of ${maxSizeMB}MB`, 413, 'FILE_TOO_LARGE');
  }
}

export class UnsupportedFileTypeError extends AppError {
  constructor(allowedTypes: string[]) {
    super(
      `Unsupported file type. Allowed types: ${allowedTypes.join(', ')}`,
      415,
      'UNSUPPORTED_FILE_TYPE',
    );
  }
}
