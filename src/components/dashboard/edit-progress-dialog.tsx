"use client";

import { useState, useEffect, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Save, FileText, PenTool, StickyNote, CheckCircle, XCircle } from "lucide-react";
import type { ContractWithProgress } from "@/types/database";
import { MONTH_NAMES_FULL, isHalfMonthPeriod } from "@/types/database";
import { updateMonthlyProgress } from "@/lib/supabase/data";
import { isSupabaseConfigured } from "@/lib/supabase/client";
import { showSuccessToast, showErrorToast } from "@/lib/toast";
import { parseFileUrl, type FilePreviewInfo } from "@/lib/file-preview";

interface EditProgressDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contract: ContractWithProgress;
  month: number;
  year: number;
  subPeriod?: number;
  onSave: () => void;
}

export function EditProgressDialog({
  open,
  onOpenChange,
  contract,
  month,
  year,
  subPeriod = 1,
  onSave,
}: EditProgressDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [uploadLink, setUploadLink] = useState("");
  const [isUploadCompleted, setIsUploadCompleted] = useState(false);
  const [notes, setNotes] = useState("");
  const [signatureStatuses, setSignatureStatuses] = useState<
    Record<string, boolean>
  >({});
  
  // Real link verification state: 'idle' | 'checking' | 'valid' | 'invalid'
  const [linkStatus, setLinkStatus] = useState<'idle' | 'checking' | 'valid' | 'invalid'>('idle');

  // Verify link for preview availability (format check)
  const linkVerification = useMemo((): FilePreviewInfo | null => {
    if (!uploadLink || !uploadLink.trim()) return null;
    return parseFileUrl(uploadLink);
  }, [uploadLink]);

  // Extract file ID from Google Drive URL
  const extractFileId = (url: string): string | null => {
    const fileMatch = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
    if (fileMatch) return fileMatch[1];
    const openMatch = url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
    if (openMatch) return openMatch[1];
    const docsMatch = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
    if (docsMatch) return docsMatch[1];
    return null;
  };

  // Real verification: try to load thumbnail to check if file exists
  useEffect(() => {
    if (!uploadLink || !isUploadCompleted) {
      setLinkStatus('idle');
      return;
    }

    // Only verify Google Drive/Docs links
    if (!linkVerification?.canEmbed) {
      setLinkStatus('idle');
      return;
    }

    const fileId = extractFileId(uploadLink);
    if (!fileId) {
      setLinkStatus('invalid');
      return;
    }

    setLinkStatus('checking');

    // Try to load thumbnail image to verify file exists
    const img = new Image();
    img.onload = () => setLinkStatus('valid');
    img.onerror = () => setLinkStatus('invalid');
    img.src = `https://drive.google.com/thumbnail?id=${fileId}&sz=w100`;

    return () => {
      img.onload = null;
      img.onerror = null;
    };
  }, [uploadLink, isUploadCompleted, linkVerification?.canEmbed]);

  // Get the progress for this month and sub_period
  const monthProgress = contract.monthly_progress.find(
    (p) => p.month === month && p.sub_period === subPeriod
  );

  // Initialize form state when dialog opens
  useEffect(() => {
    if (open && monthProgress) {
      setUploadLink(monthProgress.upload_link || "");
      setIsUploadCompleted(monthProgress.is_upload_completed);
      setNotes(monthProgress.notes || "");
      const statuses: Record<string, boolean> = {};
      monthProgress.signatures.forEach((sig) => {
        statuses[sig.id] = sig.is_completed;
      });
      setSignatureStatuses(statuses);
    }
  }, [open, monthProgress]);

  const handleSignatureChange = (signatureId: string, checked: boolean) => {
    setSignatureStatuses((prev) => ({
      ...prev,
      [signatureId]: checked,
    }));
  };

  const handleSave = async () => {
    setIsLoading(true);
    try {
      if (isSupabaseConfigured()) {
        // Save to Supabase
        const sigStatuses = Object.entries(signatureStatuses).map(
          ([id, isCompleted]) => ({
            signatureId: id,
            isCompleted,
          })
        );

        await updateMonthlyProgress(
          contract.id,
          month,
          year,
          uploadLink || null,
          isUploadCompleted,
          notes || null,
          sigStatuses,
          subPeriod
        );
      } else {
        // Simulate delay for placeholder mode
        await new Promise((resolve) => setTimeout(resolve, 500));
      }

      showSuccessToast("Progress berhasil diperbarui", {
        description: `${contract.name} - ${
          MONTH_NAMES_FULL[month - 1]
        } ${year}`,
      });
      onSave();
    } catch (error) {
      console.error("Error saving progress:", error);
      showErrorToast(error, "Gagal Menyimpan Progress");
    } finally {
      setIsLoading(false);
    }
  };

  // Calculate new percentage
  const calculateNewPercentage = () => {
    const completedSigs =
      Object.values(signatureStatuses).filter(Boolean).length;
    const totalItems = contract.total_signatures + 1;
    const completedItems = completedSigs + (isUploadCompleted ? 1 : 0);
    return Math.round((completedItems / totalItems) * 100);
  };

  if (!monthProgress) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="min-w-[25vw] max-w-[95vw] h-auto max-h-[90vh] flex flex-col">
        <DialogHeader className="shrink-0">
          <DialogTitle className="text-lg">Edit Progress</DialogTitle>
          <DialogDescription className="text-sm">
            {contract.name} - {MONTH_NAMES_FULL[month - 1]}{" "}
            {isHalfMonthPeriod(contract.period) && (
              <span className="font-medium">(Periode {subPeriod}) </span>
            )}
            {year}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 min-h-0 overflow-y-auto space-y-4 py-4 pr-2">
          {/* Preview new percentage */}
          <div className="flex items-center justify-between rounded-lg bg-muted p-3">
            <span className="text-sm font-medium">Progress Baru</span>
            <span className="text-lg font-bold">
              {calculateNewPercentage()}%
            </span>
          </div>

          {/* Notes Section */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <StickyNote className="h-4 w-4 text-muted-foreground" />
              <Label htmlFor="notes">Catatan Bulan Ini</Label>
            </div>
            <Textarea
              id="notes"
              placeholder="Tuliskan catatan atau reminder untuk bulan ini..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="resize-none"
            />
            <p className="text-xs text-muted-foreground">
              Catatan ini untuk mengingatkan hal-hal yang perlu dilakukan
            </p>
          </div>

          <Separator />

          {/* Signatures Section */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <PenTool className="h-4 w-4 text-muted-foreground" />
              <h4 className="text-sm font-medium">
                Tanda Tangan ({contract.total_signatures})
              </h4>
            </div>

            <div className="space-y-2">
              {monthProgress.signatures.map((signature) => (
                <div
                  key={signature.id}
                  className="flex items-center space-x-3 rounded-md border p-3"
                >
                  <Checkbox
                    id={signature.id}
                    checked={signatureStatuses[signature.id] || false}
                    onCheckedChange={(checked) =>
                      handleSignatureChange(signature.id, checked === true)
                    }
                  />
                  <div className="flex-1">
                    <label
                      htmlFor={signature.id}
                      className="text-sm font-medium cursor-pointer"
                    >
                      {signature.name}
                    </label>
                    <p className="text-xs text-muted-foreground">
                      {signature.role}
                    </p>
                  </div>
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

            <div className="space-y-3">
              <div className="flex items-center space-x-3 rounded-md border p-3">
                <Checkbox
                  id="upload-completed"
                  checked={isUploadCompleted}
                  onCheckedChange={(checked) =>
                    setIsUploadCompleted(checked === true)
                  }
                />
                <label
                  htmlFor="upload-completed"
                  className="text-sm font-medium cursor-pointer"
                >
                  Dokumen sudah diupload
                </label>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="upload-link">Link Dokumen</Label>
                  {/* Inline verification status */}
                  {isUploadCompleted && uploadLink && (
                    <span className={`text-xs flex items-center gap-1 ${
                      linkStatus === 'checking' ? 'text-muted-foreground' :
                      linkStatus === 'valid' ? 'text-emerald-600' :
                      linkStatus === 'invalid' || linkVerification?.error ? 'text-destructive' :
                      'text-muted-foreground'
                    }`}>
                      {linkStatus === 'checking' ? (
                        <><Loader2 className="h-3 w-3 animate-spin" /> Memeriksa...</>
                      ) : linkStatus === 'valid' ? (
                        <><CheckCircle className="h-3 w-3" /> Preview tersedia</>
                      ) : linkStatus === 'invalid' || linkVerification?.error ? (
                        <><XCircle className="h-3 w-3" /> Preview tidak tersedia</>
                      ) : null}
                    </span>
                  )}
                </div>
                <Input
                  id="upload-link"
                  placeholder="https://drive.google.com/file/d/.../view"
                  value={uploadLink}
                  onChange={(e) => setUploadLink(e.target.value)}
                  disabled={!isUploadCompleted}
                  className={linkStatus === 'invalid' || linkVerification?.error ? "border-destructive" : linkStatus === 'valid' ? "border-emerald-500" : ""}
                />
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="shrink-0">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Batal
          </Button>
          <Button onClick={handleSave} disabled={isLoading}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            <Save className="mr-2 h-4 w-4" />
            Simpan
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
