import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { documentsApi } from "../services/documentsApi";
import type { DocumentItem } from "../types";
import { toast } from "sonner";

const DOCUMENTS_KEY = "documents";

function documentsQueryKey(projectId: string) {
  return [DOCUMENTS_KEY, projectId] as const;
}

export function useDocuments(projectId: string | null) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: documentsQueryKey(projectId ?? ""),
    queryFn: () => documentsApi.list(projectId!),
    select: (data) => data.documents,
    enabled: !!projectId,
    retry: 2,
    // Poll while any document is pending
    refetchInterval: (query): number | false => {
      const docs = query.state.data?.documents;
      if (!docs) return false;
      const hasPending = docs.some(
        (d: { status: string }) => d.status === "UPLOADED" || d.status === "PROCESSING"
      );
      return hasPending ? 4000 : false;
    },
  });

  const uploadMutation = useMutation({
    mutationFn: ({ file }: { file: File }) => {
      if (!projectId) throw new Error("No project selected");
      return documentsApi.upload(projectId, file);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: documentsQueryKey(projectId!),
      });
      toast.success(`"${data.document.filename}" uploaded`);
    },
    onError: () => {
      toast.error("Upload failed. Please try again.");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: ({ documentId }: { documentId: string }) => {
      if (!projectId) throw new Error("No project selected");
      return documentsApi.delete(projectId, documentId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: documentsQueryKey(projectId!),
      });
      toast.success("Document deleted");
    },
    onError: () => {
      toast.error("Failed to delete document. Please try again.");
    },
  });

  return {
    documents: query.data ?? [],
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
    uploadDocument: uploadMutation.mutateAsync,
    isUploading: uploadMutation.isPending,
    deleteDocument: deleteMutation.mutateAsync,
    isDeleting: deleteMutation.isPending,
  };
}

export function deriveKbStatus(documents: DocumentItem[]) {
  if (documents.length === 0) return "empty" as const;
  if (documents.some((d) => d.status === "FAILED")) return "attention" as const;
  if (documents.some((d) => d.status === "UPLOADED" || d.status === "PROCESSING"))
    return "indexing" as const;
  return "ready" as const;
}
