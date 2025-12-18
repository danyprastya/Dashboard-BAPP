"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { ExternalLink, Check, X, FileText, PenTool } from "lucide-react";
import type { MonthlyProgressDetail } from "@/types/database";
import { MONTH_NAMES_FULL } from "@/types/database";
import { getProgressColorClass } from "@/lib/placeholder-data";

interface ProgressDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  progress: MonthlyProgressDetail | null;
  contractName: string;
}

export function ProgressDialog({
  open,
  onOpenChange,
  progress,
  contractName,
}: ProgressDialogProps) {
  if (!progress) return null;

  const completedSignatures = progress.signatures.filter(
    (s) => s.is_completed
  ).length;
  const totalItems = progress.signatures.length + 1;
  const completedItems =
    completedSignatures + (progress.is_upload_completed ? 1 : 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-lg">Detail Progress</DialogTitle>
          <DialogDescription className="text-sm">
            {contractName} - {MONTH_NAMES_FULL[progress.month - 1]}{" "}
            {progress.year}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Progress Summary */}
          <div className="flex items-center justify-between rounded-lg bg-muted p-3">
            <span className="text-sm font-medium">Progress Keseluruhan</span>
            <Badge className={getProgressColorClass(progress.percentage)}>
              {progress.percentage}%
            </Badge>
          </div>

          <div className="text-sm text-muted-foreground">
            {completedItems} dari {totalItems} item selesai
          </div>

          <Separator />

          {/* Signatures Section */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <PenTool className="h-4 w-4 text-muted-foreground" />
              <h4 className="text-sm font-medium">
                Tanda Tangan ({completedSignatures}/{progress.signatures.length}
                )
              </h4>
            </div>

            <div className="space-y-2">
              {progress.signatures.map((signature) => (
                <div
                  key={signature.id}
                  className="flex items-center justify-between rounded-md border p-3"
                >
                  <div className="flex items-center gap-3">
                    <Checkbox
                      checked={signature.is_completed}
                      disabled
                      className="pointer-events-none"
                    />
                    <div>
                      <p className="text-sm font-medium">{signature.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {signature.role}
                      </p>
                    </div>
                  </div>
                  {signature.is_completed ? (
                    <Check className="h-4 w-4 text-emerald-600" />
                  ) : (
                    <X className="h-4 w-4 text-neutral-400" />
                  )}
                </div>
              ))}
            </div>
          </div>

          <Separator />

          {/* Upload Section */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <h4 className="text-sm font-medium">Upload Dokumen</h4>
            </div>

            <div className="flex items-center justify-between rounded-md border p-3">
              <div className="flex items-center gap-3">
                <Checkbox
                  checked={progress.is_upload_completed}
                  disabled
                  className="pointer-events-none"
                />
                <div>
                  <p className="text-sm font-medium">File BAPP</p>
                  <p className="text-xs text-muted-foreground">
                    {progress.is_upload_completed
                      ? "Sudah diupload"
                      : "Belum diupload"}
                  </p>
                </div>
              </div>
              {progress.is_upload_completed ? (
                <div className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-emerald-600" />
                  {progress.upload_link && (
                    <a
                      href={progress.upload_link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  )}
                </div>
              ) : (
                <X className="h-4 w-4 text-neutral-400" />
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
