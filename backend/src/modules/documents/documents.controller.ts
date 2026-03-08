import { Request, Response, NextFunction } from 'express';
import * as documentsService from './documents.service';
import * as projectsService from '../projects/projects.service';
import { createStorageService } from '../../services/storage';
import { ingestionService } from '../../services/ingestion/ingestion.service';
import { UnsupportedFileTypeError, FileTooLargeError, ValidationError } from '../../lib/errors';
import { config } from '../../config';
import { logger } from '../../lib/logger';

const storage = createStorageService();

const ALLOWED_MIME_TYPES = ['application/pdf'];
const ALLOWED_EXTENSIONS = ['.pdf'];

export async function listDocuments(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const projectId = req.params.projectId as string;
    const userId = req.user.id;

    // Verify project ownership
    await projectsService.verifyProjectOwnership(projectId, userId);

    const documents = await documentsService.listDocuments({ projectId, userId });
    res.json({ documents });
  } catch (err) {
    next(err);
  }
}

export async function uploadDocument(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const projectId = req.params.projectId as string;
    const userId = req.user.id;

    // Verify project ownership
    await projectsService.verifyProjectOwnership(projectId, userId);

    const file = req.file;
    if (!file) {
      throw new ValidationError('No file provided');
    }

    // Validate file type
    const ext = '.' + file.originalname.split('.').pop()?.toLowerCase();
    if (!ALLOWED_MIME_TYPES.includes(file.mimetype) || !ALLOWED_EXTENSIONS.includes(ext)) {
      throw new UnsupportedFileTypeError(ALLOWED_EXTENSIONS);
    }

    // Validate file size
    if (file.size > config.MAX_FILE_SIZE_BYTES) {
      throw new FileTooLargeError(config.MAX_FILE_SIZE_MB);
    }

    // Store file
    const subPath = `${userId}/${projectId}`;
    const filepath = await storage.save(file.buffer, file.originalname, subPath);

    // Create document record
    const document = await documentsService.createDocument({
      filename: file.originalname,
      filepath,
      mimeType: file.mimetype,
      sizeBytes: file.size,
      projectId,
      userId,
    });

    // Respond immediately, then trigger ingestion
    res.status(201).json({ document });

    // Trigger ingestion pipeline (synchronous MVP — runs after response)
    // In async mode, this would be enqueued to a job queue
    setImmediate(async () => {
      try {
        await ingestionService.ingestDocument({
          documentId: document.id,
          filepath,
          userId,
          projectId,
        });
      } catch (err) {
        logger.error({ err, documentId: document.id }, 'Ingestion failed');
      }
    });
  } catch (err) {
    next(err);
  }
}
