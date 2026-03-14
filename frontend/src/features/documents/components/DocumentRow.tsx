import type { DocumentItem } from "../types";
import { Badge } from "@/components/ui/badge";
import { FileText, AlertCircle, Trash2 } from "lucide-react";

interface DocumentRowProps {
  document: DocumentItem;
  onDelete?: () => void;
}

const statusVariant: Record<
  DocumentItem["status"],
  "secondary" | "success" | "destructive"
> = {
  UPLOADED: "secondary",
  PROCESSING: "secondary",
  INDEXED: "success",
  FAILED: "destructive",
};

export function DocumentRow({ document, onDelete }: DocumentRowProps) {
  return (
    <div className="group flex items-center gap-3 rounded-md px-2 py-1.5 text-sm hover:bg-muted/50">
      <FileText className="size-4 shrink-0 text-muted-foreground" />
      <span className="flex-1 truncate">{document.filename}</span>
      <Badge variant={statusVariant[document.status]} className="shrink-0">
        {document.status}
      </Badge>
      {document.status === "FAILED" && document.error && (
        <span title={document.error} className="cursor-help">
          <AlertCircle className="size-4 text-destructive" />
        </span>
      )}
      {onDelete && (
        <button
          onClick={onDelete}
          aria-label={`Delete ${document.filename}`}
          className="ml-auto rounded p-0.5 opacity-0 transition-opacity group-hover:opacity-100 hover:text-destructive"
        >
          <Trash2 className="size-3.5" />
        </button>
      )}
    </div>
  );
}
