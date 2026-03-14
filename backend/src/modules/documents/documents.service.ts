import { prisma } from '../../lib/prisma';
import { NotFoundError } from '../../lib/errors';
import {
  DocumentResponse,
  UploadDocumentInput,
  ListDocumentsInput,
  UpdateDocumentStatusInput,
} from './documents.types';
interface DocumentRecord {
  id: string;
  filename: string;
  filepath: string;
  mimeType: string;
  sizeBytes: number;
  status: 'UPLOADED' | 'PROCESSING' | 'INDEXED' | 'FAILED';
  error: string | null;
  chunkCount: number | null;
  projectId: string;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
}

function toResponse(doc: DocumentRecord): DocumentResponse {
  return {
    id: doc.id,
    projectId: doc.projectId,
    filename: doc.filename,
    status: doc.status,
    createdAt: doc.createdAt.toISOString(),
    error: doc.error ?? undefined,
  };
}

export async function listDocuments(input: ListDocumentsInput): Promise<DocumentResponse[]> {
  const documents = await prisma.document.findMany({
    where: {
      projectId: input.projectId,
      userId: input.userId,
    },
    orderBy: { createdAt: 'desc' },
  });
  return documents.map(toResponse);
}

export async function createDocument(input: UploadDocumentInput): Promise<DocumentResponse> {
  const document = await prisma.document.create({
    data: {
      filename: input.filename,
      filepath: input.filepath,
      mimeType: input.mimeType,
      sizeBytes: input.sizeBytes,
      projectId: input.projectId,
      userId: input.userId,
      status: 'UPLOADED',
    },
  });
  return toResponse(document);
}

export async function updateDocumentStatus(input: UpdateDocumentStatusInput): Promise<void> {
  await prisma.document.update({
    where: { id: input.documentId },
    data: {
      status: input.status,
      error: input.error ?? null,
      chunkCount: input.chunkCount ?? undefined,
    },
  });
}

export async function getDocumentById(
  documentId: string,
  userId: string,
): Promise<DocumentResponse> {
  const doc = await prisma.document.findFirst({
    where: { id: documentId, userId },
  });

  if (!doc) {
    throw new NotFoundError('Document', documentId);
  }

  return toResponse(doc);
}

export async function getDocumentFilepath(
  documentId: string,
  userId: string,
): Promise<string> {
  const doc = await prisma.document.findFirst({
    where: { id: documentId, userId },
    select: { filepath: true },
  });

  if (!doc) {
    throw new NotFoundError('Document', documentId);
  }

  return doc.filepath;
}

export async function deleteDocument(
  documentId: string,
  userId: string,
): Promise<void> {
  const doc = await prisma.document.findFirst({
    where: { id: documentId, userId },
    select: { id: true },
  });

  if (!doc) {
    throw new NotFoundError('Document', documentId);
  }

  await prisma.document.delete({ where: { id: documentId } });
}

export async function listDocumentFilepaths(
  projectId: string,
  userId: string,
): Promise<string[]> {
  const docs = await prisma.document.findMany({
    where: { projectId, userId },
    select: { filepath: true },
  });
  return docs.map((d) => d.filepath);
}
