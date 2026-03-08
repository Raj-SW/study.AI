import { useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Upload, Loader2 } from "lucide-react";

const MAX_SIZE_MB = 50;
const ACCEPTED_TYPE = "application/pdf";

interface UploadPdfCardProps {
  onUpload: (file: File) => Promise<unknown>;
  isUploading: boolean;
  disabled?: boolean;
}

export function UploadPdfCard({ onUpload, isUploading, disabled }: UploadPdfCardProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== ACCEPTED_TYPE) {
      // toast is handled at hook level, but let's also reset input
      if (inputRef.current) inputRef.current.value = "";
      return;
    }

    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      if (inputRef.current) inputRef.current.value = "";
      return;
    }

    try {
      await onUpload(file);
    } finally {
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <Card className="py-3">
      <CardContent className="flex items-center gap-3 px-4 py-0">
        <input
          ref={inputRef}
          type="file"
          accept=".pdf"
          className="sr-only"
          id="pdf-upload"
          onChange={handleFileChange}
          disabled={disabled || isUploading}
          aria-label="Upload PDF"
        />
        <Button
          variant="outline"
          size="sm"
          className="gap-2"
          disabled={disabled || isUploading}
          onClick={() => inputRef.current?.click()}
          aria-label="Upload PDF"
        >
          {isUploading ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Upload className="size-4" />
          )}
          {isUploading ? "Uploading…" : "Upload PDF"}
        </Button>
        <span className="text-xs text-muted-foreground">PDF only, max {MAX_SIZE_MB}MB</span>
      </CardContent>
    </Card>
  );
}
