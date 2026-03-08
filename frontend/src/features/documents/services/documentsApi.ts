import { httpClient } from "@/lib/http";
import type { ListDocumentsResponse, UploadDocumentResponse } from "../types";

export const documentsApi = {
  list(projectId: string): Promise<ListDocumentsResponse> {
    return httpClient.get<ListDocumentsResponse>(
      `/projects/${encodeURIComponent(projectId)}/documents`
    );
  },

  upload(projectId: string, file: File): Promise<UploadDocumentResponse> {
    const formData = new FormData();
    formData.append("file", file);
    return httpClient.upload<UploadDocumentResponse>(
      `/projects/${encodeURIComponent(projectId)}/documents`,
      formData
    );
  },
};
