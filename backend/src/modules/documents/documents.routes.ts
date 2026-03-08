import { Router } from 'express';
import multer from 'multer';
import * as documentsController from './documents.controller';
import { validate } from '../../middleware/validate';
import { projectIdParamSchema } from './documents.schema';
import { uploadLimiter } from '../../middleware/rateLimiter';
import { config } from '../../config';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: config.MAX_FILE_SIZE_BYTES,
    files: 1,
  },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype !== 'application/pdf') {
      cb(new Error('Only PDF files are allowed'));
      return;
    }
    cb(null, true);
  },
});

const router = Router({ mergeParams: true });

router.get(
  '/',
  validate(projectIdParamSchema, 'params'),
  documentsController.listDocuments,
);

router.post(
  '/',
  uploadLimiter,
  upload.single('file'),
  validate(projectIdParamSchema, 'params'),
  documentsController.uploadDocument,
);

export { router as documentsRouter };
