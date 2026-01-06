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
  FileText,
  PenTool,
  Pencil,
  StickyNote,
  AlertCircle,
  UserCheck,
  FileCheckCorner,
  Eye,
  EyeOff,
  ChevronDown,
  ChevronUp,
  ChevronRight,
  Download,
  Loader2,
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type {
  MonthlyProgressDetail,
  ContractWithProgress,
} from "@/types/database";
import { MONTH_NAMES_FULL, isHalfMonthPeriod } from "@/types/database";
import { getProgressColorClass } from "@/lib/placeholder-data";
import { EditProgressDialog } from "./edit-progress-dialog";
import {
  parseFileUrl,
  generateBAPPFilename,
  BAPP_UPLOAD_FOLDER_URL,
} from "@/lib/file-preview";

interface ProgressDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  progress: MonthlyProgressDetail | null;
  contract: ContractWithProgress | null;
  contractName: string;
  isAdmin?: boolean;
  year?: number;
  onProgressUpdate?: () => void;
  customerName?: string;
  areaName?: string;
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
  customerName = "",
  areaName = "",
}: ProgressDialogProps) {
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [showPreview, setShowPreview] = useState(true); // Preview shown by default
  const [showUploadInstructions, setShowUploadInstructions] = useState(false);
  const [copiedFilename, setCopiedFilename] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(true);

  if (!progress) return null;

  const completedSignatures = progress.signatures.filter(
    (s) => s.is_completed
  ).length;
  const totalItems = progress.signatures.length + 1;
  const completedItems =
    completedSignatures + (progress.is_upload_completed ? 1 : 0);

  // Parse file info for preview
  const fileInfo = progress.upload_link
    ? parseFileUrl(progress.upload_link)
    : null;

  // Generate suggested filename
  const period = contract ? parseInt(contract.period) : 1;
  const suggestedFilename = generateBAPPFilename(
    customerName,
    contractName,
    areaName,
    year,
    period,
    progress.month
  );

  const copyFilename = async () => {
    await navigator.clipboard.writeText(suggestedFilename);
    setCopiedFilename(true);
    setTimeout(() => setCopiedFilename(false), 2000);
  };

  const handleEditSave = () => {
    setEditDialogOpen(false);
    onOpenChange(false); // Close the detail dialog too
    onProgressUpdate?.();
  };

  // Can show preview if file is uploaded and has valid embed URL
  const canShowPreview =
    progress.is_upload_completed && fileInfo?.canEmbed && !fileInfo?.error;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent
          className={`${
            showPreview && canShowPreview
              ? "min-w-[50vw] min-h-[60vh] max-w-5xl"
              : "max-w-2xl"
          } p-0 gap-0 overflow-hidden`}
        >
          <div className="flex">
            {/* Left side - Detail Progress */}
            <div
              className={`${
                showPreview && canShowPreview ? "w-1/2 border-r pt-10" : "w-full "
              } p-6 overflow-y-auto max-h-[85vh]`}
            >
              <DialogHeader>
                <div className="flex items-center justify-between">
                  <DialogTitle className="text-lg">Detail Progress</DialogTitle>
                  <div className="flex items-center gap-2">
                    {/* Preview Toggle Button */}
                    {canShowPreview && (
                      <Button
                        variant={showPreview ? "default" : "outline"}
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => setShowPreview(!showPreview)}
                        title={
                          showPreview
                            ? "Sembunyikan preview"
                            : "Tampilkan preview"
                        }
                      >
                        {showPreview ? (
                          <Eye className="h-4 w-4" />
                        ) : (
                          <EyeOff className="h-4 w-4" />
                        )}
                      </Button>
                    )}
                    {isAdmin && contract && (
                      <Button
                        variant="outline"
                        className="mr-4"
                        size="sm"
                        onClick={() => setEditDialogOpen(true)}
                      >
                        <Pencil className="mr-2 h-4 w-4" />
                        Edit
                      </Button>
                    )}
                  </div>
                </div>
                <DialogDescription className="text-sm">
                  {contractName} - {MONTH_NAMES_FULL[progress.month - 1]}{" "}
                  {contract && isHalfMonthPeriod(contract.period) && (
                    <span className="font-medium">(Periode {progress.sub_period}) </span>
                  )}
                  {progress.year}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                {/* Progress Summary */}
                <div className="flex items-center justify-between rounded-lg bg-muted p-3">
                  <span className="text-sm font-medium">
                    Progress Keseluruhan
                  </span>
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
                      <p className="text-sm whitespace-pre-wrap overflow-clip">
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
                            <p className="text-sm font-medium">
                              {signature.name}
                            </p>
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
                      </div>
                    ) : (
                      <AlertCircle className="h-4 w-4 text-red-600" />
                    )}
                  </div>

                  {/* Upload Instructions - Only show when not uploaded, more compact */}
                  {!progress.is_upload_completed && (
                    <div className="rounded-md border bg-muted/50 p-2 space-y-2">
                      <div className="flex items-center">
                        <div className="flex items-center p-1 rounded-md" onClick={copyFilename}>
                          <Button
                            variant="default"
                            size="sm"
                            className="h-6 text-sm bg-black/50 p-3 rounded-md text-white"
                            onClick={() =>
                              window.open(BAPP_UPLOAD_FOLDER_URL, "_blank")
                            }
                          >
                            <ExternalLink className="h-3 w-3" />
                             Klik disini untuk upload file
                          </Button>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-auto p-0 text-sm text-muted-foreground hover:text-foreground hover:bg-transparent"
                        onClick={() =>
                          setShowUploadInstructions(!showUploadInstructions)
                        }
                      >
                        {showUploadInstructions ? (
                          <>
                            <ChevronDown className="h-3 w-3" />
                            Sembunyikan
                          </>
                        ) : (
                          <>
                            <ChevronRight className="h-3 w-3" />
                            Lihat tahapan upload file
                          </>
                        )}
                      </Button>
                      {showUploadInstructions && (
                        <ol className="text-xs text-muted-foreground space-y-0.5 list-decimal list-inside pl-4">
                          <li>Upload file ke folder <strong>Google Drive</strong> dari link diatas</li>
                          <li><strong>Klik kanan → Get link → Anyone with link</strong></li>
                          <li><strong>Copy link</strong> dan <strong>paste</strong> di Edit Progress</li>
                        </ol>
                      )}
                    </div>
                  )}

                  {/* Error for invalid links */}
                  {fileInfo?.error && (
                    <div className="rounded-md border border-destructive/50 bg-destructive/10 p-2">
                      <div className="flex items-center gap-2">
                        <AlertCircle className="h-4 w-4 text-destructive shrink-0" />
                        <span className="text-xs text-destructive">
                          {fileInfo.error.message} - {fileInfo.error.suggestion}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Right side - Preview Panel */}
            {showPreview && canShowPreview && fileInfo?.previewUrl && (
              <div className="w-1/2 flex flex-col min-h-[60vh] pt-7">
                <div className="p-3 border-b bg-background flex items-center justify-between">
                  <span className="text-lg font-medium">Preview Dokumen</span>
                  <div className="flex items-center gap-1">
                    {fileInfo.downloadUrl && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() =>
                              window.open(fileInfo.downloadUrl!, "_blank")
                            }
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent side="bottom">
                          <p>Download file</p>
                        </TooltipContent>
                      </Tooltip>
                    )}
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() =>
                            window.open(progress.upload_link!, "_blank")
                          }
                        >
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent side="bottom">
                        <p>Buka di tab baru</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                </div>
                <div className="flex-1 relative mb-6 border-b overflow-hidden">
                  {previewLoading && (
                    <div className="absolute inset-0 flex items-center justify-center bg-background/80 z-20">
                      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                  )}
                    <iframe
                      src={fileInfo.previewUrl}
                      className="w-full h-full min-h-[55vh] border-0"
                      onLoad={() => setPreviewLoading(false)}
                      title="Document Preview"
                    />
                </div>
              </div>
            )}
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
          subPeriod={progress.sub_period}
          onSave={handleEditSave}
        />
      )}
    </>
  );
}
