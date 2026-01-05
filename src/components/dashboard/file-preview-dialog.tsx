"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { parseFileUrl, getProviderName } from "@/lib/file-preview";
import {
  ExternalLink,
  X,
  FileText,
  Loader2,
  AlertCircle,
  Maximize2,
  FolderOpen,
  Lock,
} from "lucide-react";

interface FilePreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  url: string;
  title?: string;
  description?: string;
}

export function FilePreviewDialog({
  open,
  onOpenChange,
  url,
  title = "Preview Dokumen",
  description,
}: FilePreviewDialogProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  const fileInfo = parseFileUrl(url);

  const handleIframeLoad = () => {
    setIsLoading(false);
  };

  const handleIframeError = () => {
    setIsLoading(false);
    setHasError(true);
  };

  const openInNewTab = () => {
    window.open(fileInfo.originalUrl, "_blank", "noopener,noreferrer");
  };

  const openFullscreen = () => {
    if (fileInfo.previewUrl) {
      window.open(fileInfo.previewUrl, "_blank", "noopener,noreferrer");
    }
  };

  // Reset state when dialog opens
  const handleOpenChange = (open: boolean) => {
    if (open) {
      setIsLoading(true);
      setHasError(false);
    }
    onOpenChange(open);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-5xl w-[95vw] max-h-[95vh] flex flex-col p-0 gap-0">
        {/* Header */}
        <DialogHeader className="px-6 py-4 border-b shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <FileText className="h-5 w-5 text-muted-foreground" />
              <div>
                <DialogTitle className="text-lg">{title}</DialogTitle>
                {description && (
                  <DialogDescription className="text-sm">
                    {description}
                  </DialogDescription>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="text-xs">
                {getProviderName(fileInfo.type)}
              </Badge>
            </div>
          </div>
        </DialogHeader>

        {/* Preview Area */}
        <div className="flex-1 min-h-0 relative bg-muted/30">
          {/* Error for folder links */}
          {fileInfo.error ? (
            <div className="flex items-center justify-center h-[60vh]">
              <div className="flex flex-col items-center gap-4 text-center px-4 max-w-md">
                <div className="p-4 rounded-full bg-destructive/10">
                  {fileInfo.error.code === "folder_link" ? (
                    <FolderOpen className="h-12 w-12 text-destructive" />
                  ) : fileInfo.error.code === "not_shared" ? (
                    <Lock className="h-12 w-12 text-destructive" />
                  ) : (
                    <AlertCircle className="h-12 w-12 text-destructive" />
                  )}
                </div>
                <div>
                  <p className="font-medium text-destructive">
                    {fileInfo.error.message}
                  </p>
                  <p className="text-sm text-muted-foreground mt-2">
                    {fileInfo.error.suggestion}
                  </p>
                  {fileInfo.error.code === "folder_link" && (
                    <ol className="text-sm text-muted-foreground mt-4 text-left list-decimal list-inside space-y-1">
                      <li>Buka folder tersebut</li>
                      <li>Klik file yang ingin di-link</li>
                      <li>Klik kanan → &quot;Get link&quot;</li>
                      <li>Pastikan akses &quot;Anyone with the link&quot;</li>
                      <li>Copy link file (bukan folder)</li>
                    </ol>
                  )}
                </div>
                <Button onClick={() => onOpenChange(false)} className="mt-2">
                  Tutup
                </Button>
              </div>
            </div>
          ) : fileInfo.canEmbed && fileInfo.previewUrl ? (
            <>
              {/* Loading indicator */}
              {isLoading && (
                <div className="absolute inset-0 flex items-center justify-center bg-background z-10">
                  <div className="flex flex-col items-center gap-3">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">
                      Memuat preview...
                    </p>
                  </div>
                </div>
              )}

              {/* Error state */}
              {hasError && (
                <div className="absolute inset-0 flex items-center justify-center bg-background z-10">
                  <div className="flex flex-col items-center gap-3 text-center px-4">
                    <AlertCircle className="h-12 w-12 text-muted-foreground" />
                    <div>
                      <p className="font-medium">Tidak dapat memuat preview</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        File mungkin tidak tersedia atau tidak mendukung
                        preview.
                        <br />
                        Coba buka di tab baru.
                      </p>
                    </div>
                    <Button onClick={openInNewTab} className="mt-2">
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Buka di Tab Baru
                    </Button>
                  </div>
                </div>
              )}

              {/* Iframe */}
              <iframe
                src={fileInfo.previewUrl}
                className="w-full h-full min-h-[60vh] border-0"
                onLoad={handleIframeLoad}
                onError={handleIframeError}
                allow="autoplay"
                sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
                title="Document Preview"
              />
            </>
          ) : (
            /* Cannot embed - show message */
            <div className="flex items-center justify-center h-[60vh]">
              <div className="flex flex-col items-center gap-4 text-center px-4">
                <div className="p-4 rounded-full bg-muted">
                  <FileText className="h-12 w-12 text-muted-foreground" />
                </div>
                <div>
                  <p className="font-medium">Preview tidak tersedia</p>
                  <p className="text-sm text-muted-foreground mt-1 max-w-md">
                    Tipe file ini tidak mendukung preview dalam aplikasi.
                    <br />
                    Silakan buka di tab baru untuk melihat dokumen.
                  </p>
                </div>
                <Button onClick={openInNewTab} size="lg" className="mt-2">
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Buka di Tab Baru
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t shrink-0 flex items-center justify-between bg-background">
          <div className="text-xs text-muted-foreground truncate max-w-md">
            {fileInfo.originalUrl}
          </div>
          <div className="flex items-center gap-2">
            {fileInfo.canEmbed && fileInfo.previewUrl && (
              <Button variant="outline" size="sm" onClick={openFullscreen}>
                <Maximize2 className="h-4 w-4 mr-2" />
                Fullscreen
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={openInNewTab}>
              <ExternalLink className="h-4 w-4 mr-2" />
              Buka di Tab Baru
            </Button>
            <Button
              variant="default"
              size="sm"
              onClick={() => onOpenChange(false)}
            >
              <X className="h-4 w-4 mr-2" />
              Tutup
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
