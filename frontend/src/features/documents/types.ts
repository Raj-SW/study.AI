export type DocumentStatus = "UPLOADED" | "PROCESSING" | "INDEXED" | "FAILED";

export type DocumentItem = {
  id: string;
  projectId: string;
  filename: string;
  status: DocumentStatus;
  createdAt: string;
  error?: string;
};

export type UploadDocumentResponse = {
  document: DocumentItem;
};

export type ListDocumentsResponse = { documents: DocumentItem[] };
