"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import {
  ExternalLink,
  Check,
  X,
  FileText,
  PenTool,
  Pencil,
  StickyNote,
  AlertCircle,
  CheckCircle,
  UserCheck,
  FileCheckCorner,
} from "lucide-react";
import type {
  MonthlyProgressDetail,
  ContractWithProgress,
} from "@/types/database";
import { MONTH_NAMES_FULL } from "@/types/database";
import { getProgressColorClass } from "@/lib/placeholder-data";
import { EditProgressDialog } from "./edit-progress-dialog";

interface ProgressDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  progress: MonthlyProgressDetail | null;
  contract: ContractWithProgress | null;
  contractName: string;
  isAdmin?: boolean;
  year?: number;
  onProgressUpdate?: () => void;
}

export function ProgressDialog({
  open,
  onOpenChange,
  progress,
  contract,
  contractName,
  isAdmin = false,
  year = new Date().getFullYear(),
  onProgressUpdate,
}: ProgressDialogProps) {
  const [editDialogOpen, setEditDialogOpen] = useState(false);

  if (!progress) return null;

  const completedSignatures = progress.signatures.filter(
    (s) => s.is_completed
  ).length;
  const totalItems = progress.signatures.length + 1;
  const completedItems =
    completedSignatures + (progress.is_upload_completed ? 1 : 0);

  const handleEditSave = () => {
    setEditDialogOpen(false);
    onOpenChange(false); // Close the detail dialog too
    onProgressUpdate?.();
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle className="text-lg">Detail Progress</DialogTitle>
              {isAdmin && contract && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setEditDialogOpen(true)}
                  className="mr-6"
                >
                  <Pencil className="mr-2 h-4 w-4" />
                  Edit
                </Button>
              )}
            </div>
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

            {/* Notes Section */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <StickyNote className="h-4 w-4 text-muted-foreground" />
                <h4 className="text-sm font-medium">Catatan Bulan Ini</h4>
              </div>
              <div className="rounded-md border bg-muted/30 p-3">
                {progress.notes ? (
                  <p className="text-sm whitespace-pre-wrap">
                    {progress.notes}
                  </p>
                ) : (
                  <p className="text-sm text-muted-foreground italic">
                    Tidak ada catatan untuk bulan ini
                  </p>
                )}
              </div>
            </div>

            <Separator />

            {/* Signatures Section */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <PenTool className="h-4 w-4 text-muted-foreground" />
                <h4 className="text-sm font-medium">
                  Tanda Tangan ({completedSignatures}/
                  {progress.signatures.length})
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
                      <UserCheck className="h-4 w-4 text-emerald-600" />
                    ) : (
                      <AlertCircle className="h-4 w-4 text-red-600" />
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
                    <FileCheckCorner className="h-4 w-4 text-emerald-600" />
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
                  <AlertCircle className="h-4 w-4 text-red-600" />
                )}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Progress Dialog */}
      {isAdmin && contract && (
        <EditProgressDialog
          open={editDialogOpen}
          onOpenChange={setEditDialogOpen}
          contract={contract}
          month={progress.month}
          year={year}
          onSave={handleEditSave}
        />
      )}
    </>
  );
}
