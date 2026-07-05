import { Button } from "@/components/ui/button";
import { useDocuments, deriveKbStatus } from "../hooks/useDocuments";
import { UploadPdfCard } from "./UploadPdfCard";
import { DocumentList } from "./DocumentList";
import type { KbStatus } from "@/components/layout/Header";

interface DocumentsPanelProps {
  projectId: string | null;
  onKbStatusChange?: (status: KbStatus) => void;
}

export function DocumentsPanel({ projectId, onKbStatusChange }: DocumentsPanelProps) {
  const {
    documents,
    isLoading,
    isError,
    refetch,
    uploadDocument,
    isUploading,
    deleteDocument,
  } = useDocuments(projectId);

  // Notify parent of KB status changes
  const kbStatus = deriveKbStatus(documents);
  // Use a ref-stable callback
  if (onKbStatusChange) {
    // This is intentionally called during render to keep parent in sync
    // without an effect, since it's a lightweight state sync
    onKbStatusChange(kbStatus);
  }

  if (!projectId) {
    return (
      <div className="p-4 text-center text-sm text-muted-foreground">
        Select or create a project to manage documents.
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col">
      <div className="flex items-center justify-between p-4 pb-2">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Documents
        </h2>
      </div>

      <div className="px-4 pb-2">
        <UploadPdfCard
          onUpload={(file) => uploadDocument({ file })}
          isUploading={isUploading}
          disabled={!projectId}
        />
      </div>

      {isError ? (
        <div className="p-4 text-center">
          <p className="text-sm text-destructive">Failed to load documents</p>
          <Button variant="outline" size="sm" className="mt-2" onClick={() => refetch()}>
            Retry
          </Button>
        </div>
      ) : (
        <DocumentList
          documents={documents}
          isLoading={isLoading}
          onDelete={(documentId) => deleteDocument({ documentId })}
        />
      )}
    </div>
  );
}
