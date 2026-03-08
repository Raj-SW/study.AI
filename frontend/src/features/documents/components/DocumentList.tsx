import type { DocumentItem } from "../types";
import { DocumentRow } from "./DocumentRow";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";

interface DocumentListProps {
  documents: DocumentItem[];
  isLoading: boolean;
}

export function DocumentList({ documents, isLoading }: DocumentListProps) {
  if (isLoading) {
    return (
      <div className="space-y-2 p-2">
        <Skeleton className="h-7 w-full" />
        <Skeleton className="h-7 w-full" />
        <Skeleton className="h-7 w-3/4" />
      </div>
    );
  }

  if (documents.length === 0) {
    return (
      <div className="p-4 text-center text-sm text-muted-foreground">
        No documents yet. Upload a PDF to get started.
      </div>
    );
  }

  return (
    <ScrollArea className="flex-1">
      <div className="space-y-0.5 p-2" role="list" aria-label="Documents">
        {documents.map((doc) => (
          <div key={doc.id} role="listitem">
            <DocumentRow document={doc} />
          </div>
        ))}
      </div>
    </ScrollArea>
  );
}
