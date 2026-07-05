import { PDFLoader } from '@langchain/community/document_loaders/fs/pdf';
import { Document } from '@langchain/core/documents';
import { logger } from '../logger';

export async function parsePdf(filePath: string): Promise<Document[]> {
  logger.info({ filePath }, 'Parsing PDF');

  const loader = new PDFLoader(filePath, {
    splitPages: true,
  });

  const docs = await loader.load();

  logger.info({ filePath, pageCount: docs.length }, 'PDF parsed successfully');
  return docs;
}
