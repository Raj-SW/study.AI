import { Request, Response, NextFunction } from 'express';
import { AppError } from '../lib/errors';
import { logger } from '../lib/logger';
import { config } from '../config';

export interface ErrorResponse {
  error: {
    code: string;
    message: string;
    details?: unknown[];
  };
}

export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (err instanceof AppError) {
    const response: ErrorResponse = {
      error: {
        code: err.code,
        message: err.message,
      },
    };

    if ('details' in err && Array.isArray((err as Record<string, unknown>).details)) {
      response.error.details = (err as Record<string, unknown>).details as unknown[];
    }

    if (err.statusCode >= 500) {
      logger.error({ err, statusCode: err.statusCode }, 'Server error');
    } else {
      logger.warn({ code: err.code, statusCode: err.statusCode }, err.message);
    }

    res.status(err.statusCode).json(response);
    return;
  }

  // Multer errors
  if (err.message === 'File too large') {
    res.status(413).json({
      error: {
        code: 'FILE_TOO_LARGE',
        message: `File size exceeds maximum allowed size of ${config.MAX_FILE_SIZE_MB}MB`,
      },
    });
    return;
  }

  if (err.message === 'Only PDF files are allowed') {
    res.status(415).json({
      error: {
        code: 'UNSUPPORTED_FILE_TYPE',
        message: 'Unsupported file type. Allowed types: .pdf',
      },
    });
    return;
  }

  // Unknown errors
  logger.error({ err }, 'Unhandled error');
  res.status(500).json({
    error: {
      code: 'INTERNAL_ERROR',
      message: config.isProd ? 'An unexpected error occurred' : err.message,
    },
  });
}
