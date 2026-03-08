import type { DocumentItem } from "../types";
import { Badge } from "@/components/ui/badge";
import { FileText, AlertCircle } from "lucide-react";

interface DocumentRowProps {
  document: DocumentItem;
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

export function DocumentRow({ document }: DocumentRowProps) {
  return (
    <div className="flex items-center gap-3 rounded-md px-2 py-1.5 text-sm hover:bg-muted/50">
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
    </div>
  );
}
