import { BookOpen } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export type KbStatus = "ready" | "indexing" | "attention" | "empty";

interface HeaderProps {
  kbStatus?: KbStatus;
}

const statusConfig: Record<KbStatus, { label: string; variant: "success" | "secondary" | "destructive" | "outline" }> = {
  ready: { label: "KB Ready", variant: "success" },
  indexing: { label: "Indexing…", variant: "secondary" },
  attention: { label: "Needs attention", variant: "destructive" },
  empty: { label: "No documents", variant: "outline" },
};

export function Header({ kbStatus }: HeaderProps) {
  const status = kbStatus ? statusConfig[kbStatus] : null;

  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b bg-background px-4 lg:px-6">
      <div className="flex items-center gap-2">
        <BookOpen className="size-5 text-primary" />
        <h1 className="text-lg font-semibold">Study Copilot</h1>
      </div>
      <div className="flex items-center gap-2">
        {status && (
          <Badge variant={status.variant} aria-label={`Knowledge base status: ${status.label}`}>
            {status.label}
          </Badge>
        )}
      </div>
    </header>
  );
}
