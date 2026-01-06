"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Loader2,
  CheckCircle2,
  AlertTriangle,
  Zap,
  ListChecks,
} from "lucide-react";
import type { ContractWithProgress } from "@/types/database";
import {
  MONTH_NAMES,
  MONTH_NAMES_FULL,
  isHalfMonthPeriod,
} from "@/types/database";
import { updateMonthlyProgress } from "@/lib/supabase/data";
import { isSupabaseConfigured } from "@/lib/supabase/client";
import {
  showSuccessToast,
  showErrorToast,
  showWarningToast,
} from "@/lib/toast";

interface BatchOperationsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contract: ContractWithProgress;
  year: number;
  onComplete: () => void;
}

export function BatchOperationsDialog({
  open,
  onOpenChange,
  contract,
  year,
  onComplete,
}: BatchOperationsDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [selectedMonths, setSelectedMonths] = useState<number[]>([]);
  const [selectedSubPeriods, setSelectedSubPeriods] = useState<
    Record<number, number[]>
  >({});
  const [operation, setOperation] = useState<
    "complete-signatures" | "complete-all"
  >("complete-signatures");

  const isHalfMonth = isHalfMonthPeriod(contract.period);

  // Toggle month selection
  const toggleMonth = (month: number) => {
    setSelectedMonths((prev) => {
      if (prev.includes(month)) {
        // Also clear sub-periods when deselecting month
        setSelectedSubPeriods((sp) => {
          const newSp = { ...sp };
          delete newSp[month];
          return newSp;
        });
        return prev.filter((m) => m !== month);
      }
      // For half-month periods, default to both 1-20 and 21-30
      if (isHalfMonth) {
        setSelectedSubPeriods((sp) => ({ ...sp, [month]: [1, 2] }));
      }
      return [...prev, month];
    });
  };

  // Toggle sub-period selection for half-month contracts
  const toggleSubPeriod = (month: number, subPeriod: number) => {
    setSelectedSubPeriods((prev) => {
      const current = prev[month] || [];
      if (current.includes(subPeriod)) {
        const newList = current.filter((sp) => sp !== subPeriod);
        if (newList.length === 0) {
          // If no sub-periods selected, deselect the month too
          setSelectedMonths((m) => m.filter((mm) => mm !== month));
          const newPrev = { ...prev };
          delete newPrev[month];
          return newPrev;
        }
        return { ...prev, [month]: newList };
      }
      // Add month if not selected
      if (!selectedMonths.includes(month)) {
        setSelectedMonths((m) => [...m, month]);
      }
      return { ...prev, [month]: [...current, subPeriod] };
    });
  };

  // Select all months
  const selectAllMonths = () => {
    setSelectedMonths([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
    if (isHalfMonth) {
      const allSubPeriods: Record<number, number[]> = {};
      for (let m = 1; m <= 12; m++) {
        allSubPeriods[m] = [1, 2];
      }
      setSelectedSubPeriods(allSubPeriods);
    }
  };

  // Clear all selections
  const clearSelection = () => {
    setSelectedMonths([]);
    setSelectedSubPeriods({});
  };

  // Get progress status for a month
  const getMonthProgress = (month: number, subPeriod?: number) => {
    return contract.monthly_progress.find(
      (p) =>
        p.month === month && (subPeriod ? p.sub_period === subPeriod : true)
    );
  };

  // Execute batch operation
  const handleExecute = async () => {
    if (selectedMonths.length === 0) {
      showWarningToast("Pilih minimal satu bulan");
      return;
    }

    setIsLoading(true);
    let successCount = 0;
    let errorCount = 0;

    try {
      for (const month of selectedMonths) {
        const subPeriodsToProcess = isHalfMonth
          ? selectedSubPeriods[month] || [1]
          : [1];

        for (const subPeriod of subPeriodsToProcess) {
          const progress = getMonthProgress(month, subPeriod);
          if (!progress) continue;

          try {
            if (isSupabaseConfigured()) {
              if (operation === "complete-signatures") {
                // Mark all signatures as complete
                const sigStatuses = progress.signatures.map((sig) => ({
                  signatureId: sig.id,
                  isCompleted: true,
                }));

                await updateMonthlyProgress(
                  contract.id,
                  month,
                  year,
                  progress.upload_link,
                  progress.is_upload_completed,
                  progress.notes,
                  sigStatuses,
                  subPeriod
                );
              } else if (operation === "complete-all") {
                // Mark all signatures AND upload as complete
                const sigStatuses = progress.signatures.map((sig) => ({
                  signatureId: sig.id,
                  isCompleted: true,
                }));

                await updateMonthlyProgress(
                  contract.id,
                  month,
                  year,
                  progress.upload_link,
                  true, // Mark upload as completed
                  progress.notes,
                  sigStatuses,
                  subPeriod
                );
              }
            } else {
              // Placeholder mode - simulate delay
              await new Promise((resolve) => setTimeout(resolve, 100));
            }
            successCount++;
          } catch (error) {
            console.error(`Error updating month ${month}:`, error);
            errorCount++;
          }
        }
      }

      if (successCount > 0) {
        showSuccessToast(`${successCount} progress berhasil diperbarui`, {
          description: contract.name,
        });
      }

      if (errorCount > 0) {
        showErrorToast(
          new Error(`${errorCount} progress gagal diperbarui`),
          "Sebagian Operasi Gagal"
        );
      }

      onOpenChange(false);
      onComplete();
    } catch (error) {
      showErrorToast(error, "Gagal Menjalankan Operasi Batch");
    } finally {
      setIsLoading(false);
    }
  };

  // Count total operations
  const totalOperations = isHalfMonth
    ? selectedMonths.reduce(
        (sum, m) => sum + (selectedSubPeriods[m]?.length || 0),
        0
      )
    : selectedMonths.length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-amber-500" />
            Operasi Batch
          </DialogTitle>
          <DialogDescription>
            {contract.name} - Tahun {year}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4 py-4">
          {/* Operation Type */}
          <div className="space-y-2">
            <Label>Jenis Operasi</Label>
            <Select
              value={operation}
              onValueChange={(v) => setOperation(v as typeof operation)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="complete-signatures">
                  <div className="flex items-center gap-2">
                    <ListChecks className="h-4 w-4" />
                    Tandai semua tanda tangan selesai
                  </div>
                </SelectItem>
                <SelectItem value="complete-all">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4" />
                    Tandai semua (tanda tangan + upload)
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Separator />

          {/* Month Selection */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Pilih Bulan</Label>
              <div className="space-x-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={selectAllMonths}
                >
                  Pilih Semua
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={clearSelection}
                >
                  Hapus Semua
                </Button>
              </div>
            </div>

            <ScrollArea className="h-64 rounded-md border p-3">
              <div className="space-y-2">
                {MONTH_NAMES.map((monthName, index) => {
                  const month = index + 1;
                  const progress = getMonthProgress(month, 1);
                  const isSelected = selectedMonths.includes(month);

                  return (
                    <div key={month} className="space-y-1">
                      <div
                        className={`flex items-center justify-between rounded-lg p-2 transition-colors ${
                          isSelected
                            ? "bg-primary/10 border border-primary/20"
                            : "bg-muted/50 hover:bg-muted"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <Checkbox
                            id={`month-${month}`}
                            checked={isSelected}
                            onCheckedChange={() => toggleMonth(month)}
                          />
                          <Label
                            htmlFor={`month-${month}`}
                            className="cursor-pointer font-medium"
                          >
                            {MONTH_NAMES_FULL[index]}
                          </Label>
                        </div>
                        {progress && (
                          <Badge
                            variant={
                              progress.percentage === 100
                                ? "default"
                                : "secondary"
                            }
                            className="text-xs"
                          >
                            {progress.percentage}%
                          </Badge>
                        )}
                      </div>

                      {/* Sub-period selection for half-month contracts */}
                      {isHalfMonth && isSelected && (
                        <div className="ml-8 flex gap-2">
                          {[1, 2].map((sp) => {
                            const spProgress = getMonthProgress(month, sp);
                            const isSpSelected =
                              selectedSubPeriods[month]?.includes(sp);

                            return (
                              <button
                                key={sp}
                                type="button"
                                onClick={() => toggleSubPeriod(month, sp)}
                                className={`flex items-center gap-2 rounded px-3 py-1 text-xs transition-colors ${
                                  isSpSelected
                                    ? sp === 1
                                      ? "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300"
                                      : "bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300"
                                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                                }`}
                              >
                                <span>{sp === 1 ? "1-20" : "21-30"}</span>
                                {spProgress && (
                                  <span className="opacity-70">
                                    ({spProgress.percentage}%)
                                  </span>
                                )}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          </div>

          {/* Warning */}
          {totalOperations > 0 && (
            <div className="flex items-start gap-2 rounded-lg bg-amber-50 dark:bg-amber-950 p-3 text-sm text-amber-700 dark:text-amber-300">
              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
              <p>
                {operation === "complete-signatures" ? (
                  <>
                    <strong>{totalOperations}</strong> progress akan ditandai
                    dengan semua tanda tangan selesai.
                  </>
                ) : (
                  <>
                    <strong>{totalOperations}</strong> progress akan ditandai
                    100% selesai (semua tanda tangan + upload).
                  </>
                )}
              </p>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 border-t pt-4">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
          >
            Batal
          </Button>
          <Button
            onClick={handleExecute}
            disabled={isLoading || totalOperations === 0}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Memproses...
              </>
            ) : (
              <>
                <Zap className="mr-2 h-4 w-4" />
                Jalankan ({totalOperations})
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Quick Complete Month Button - for inline use in table
interface QuickCompleteButtonProps {
  contract: ContractWithProgress;
  month: number;
  year: number;
  subPeriod?: number;
  onComplete: () => void;
  disabled?: boolean;
}

export function QuickCompleteButton({
  contract,
  month,
  year,
  subPeriod = 1,
  onComplete,
  disabled = false,
}: QuickCompleteButtonProps) {
  const [isLoading, setIsLoading] = useState(false);

  const progress = contract.monthly_progress.find(
    (p) => p.month === month && p.sub_period === subPeriod
  );

  // Already complete
  if (!progress || progress.percentage === 100) {
    return null;
  }

  const handleQuickComplete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsLoading(true);

    try {
      if (isSupabaseConfigured()) {
        const sigStatuses = progress.signatures.map((sig) => ({
          signatureId: sig.id,
          isCompleted: true,
        }));

        await updateMonthlyProgress(
          contract.id,
          month,
          year,
          progress.upload_link,
          true,
          progress.notes,
          sigStatuses,
          subPeriod
        );
      } else {
        await new Promise((resolve) => setTimeout(resolve, 300));
      }

      showSuccessToast("Progress ditandai selesai", {
        description: `${contract.name} - ${MONTH_NAMES_FULL[month - 1]}`,
      });
      onComplete();
    } catch (error) {
      showErrorToast(error, "Gagal menandai selesai");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button
      variant="ghost"
      size="sm"
      className="h-6 px-2 text-xs"
      onClick={handleQuickComplete}
      disabled={disabled || isLoading}
      title="Tandai 100% selesai"
    >
      {isLoading ? (
        <Loader2 className="h-3 w-3 animate-spin" />
      ) : (
        <CheckCircle2 className="h-3 w-3 text-emerald-500" />
      )}
    </Button>
  );
}
