export type DocumentStatus = 'UPLOADED' | 'PROCESSING' | 'INDEXED' | 'FAILED';

export interface DocumentResponse {
  id: string;
  projectId: string;
  filename: string;
  status: DocumentStatus;
  createdAt: string;
  error?: string;
}

export interface UploadDocumentInput {
  filename: string;
  filepath: string;
  mimeType: string;
  sizeBytes: number;
  projectId: string;
  userId: string;
}

export interface ListDocumentsInput {
  projectId: string;
  userId: string;
}

export interface UpdateDocumentStatusInput {
  documentId: string;
  status: DocumentStatus;
  error?: string;
  chunkCount?: number;
}
