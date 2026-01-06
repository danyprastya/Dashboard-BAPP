"use client";

import { useState, useMemo, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { Loader2, AlertTriangle, ArrowRight, FileText } from "lucide-react";
import {
  PERIOD_OPTIONS,
  getPeriodMonths,
  parsePeriodToNumber,
} from "@/types/database";
import type { ContractWithProgress } from "@/types/database";
import { showSuccessToast, showErrorToast } from "@/lib/toast";
import {
  migrateContractPeriod,
  type PeriodMigrationConfig,
} from "@/lib/supabase/data";
import { isSupabaseConfigured } from "@/lib/supabase/client";

interface EditPeriodDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contract: ContractWithProgress | null;
  onPeriodUpdate?: () => void;
}

// Short month names
const SHORT_MONTH_NAMES = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "Mei",
  "Jun",
  "Jul",
  "Agu",
  "Sep",
  "Okt",
  "Nov",
  "Des",
];

// Helper to get month range label
function getMonthRangeLabel(startMonth: number, endMonth: number): string {
  if (startMonth === endMonth) {
    return SHORT_MONTH_NAMES[startMonth - 1];
  }
  return `${SHORT_MONTH_NAMES[startMonth - 1]} - ${
    SHORT_MONTH_NAMES[endMonth - 1]
  }`;
}

// Helper to get the start month of a period given the end month
function getPeriodStartMonth(endMonth: number, periodValue: number): number {
  return endMonth - periodValue + 1;
}

// Generate progress options based on total signatures
function generateProgressOptions(
  totalSignatures: number
): { value: number; label: string }[] {
  const totalItems = totalSignatures + 1; // +1 for upload
  const options: { value: number; label: string }[] = [];

  for (let i = 0; i <= totalItems; i++) {
    const percentage = Math.round((i / totalItems) * 100);
    options.push({
      value: percentage,
      label: `${percentage}% (${i}/${totalItems} selesai)`,
    });
  }

  return options;
}

export function EditPeriodDialog({
  open,
  onOpenChange,
  contract,
  onPeriodUpdate,
}: EditPeriodDialogProps) {
  const [selectedPeriod, setSelectedPeriod] = useState<number>(1);
  const [isUpdating, setIsUpdating] = useState(false);
  const [step, setStep] = useState<"select" | "configure">("select");

  // Configuration for merge (converting UP)
  const [mergeMode, setMergeMode] = useState<"highest" | "last" | "manual">(
    "highest"
  );
  const [manualMergeValue, setManualMergeValue] = useState<number>(0);
  const [selectedNotes, setSelectedNotes] = useState<number[]>([]);

  // Configuration for split (converting DOWN)
  const [splitMode, setSplitMode] = useState<"duplicate" | "last" | "manual">(
    "duplicate"
  );
  const [manualSplitValues, setManualSplitValues] = useState<
    Record<number, number>
  >({});

  // Configuration for half-month conversion
  const [halfMonthMode, setHalfMonthMode] = useState<"duplicate" | "empty">(
    "duplicate"
  );

  // Get current period value from contract
  const currentPeriodValue = useMemo(() => {
    if (!contract) return 1;
    return parsePeriodToNumber(contract.period);
  }, [contract]);

  // Progress options based on total signatures
  const progressOptions = useMemo(() => {
    if (!contract) return [];
    return generateProgressOptions(contract.total_signatures);
  }, [contract]);

  // Calculate new active months based on selected period
  const newActiveMonths = useMemo(() => {
    return getPeriodMonths(selectedPeriod);
  }, [selectedPeriod]);

  // Calculate active month ranges for display
  const activeMonthRanges = useMemo(() => {
    return newActiveMonths.map((endMonth) => ({
      start: getPeriodStartMonth(endMonth, selectedPeriod),
      end: endMonth,
    }));
  }, [newActiveMonths, selectedPeriod]);

  // Determine conversion direction
  const isConvertingUp = selectedPeriod > currentPeriodValue;
  const isConvertingDown =
    selectedPeriod < currentPeriodValue && selectedPeriod !== 0.5;
  const isConvertingToHalfMonth =
    selectedPeriod === 0.5 && currentPeriodValue !== 0.5;

  // Get months with data
  const monthsWithData = useMemo(() => {
    if (!contract) return [];
    return contract.monthly_progress
      .filter((p) => p.percentage > 0 || p.notes)
      .map((p) => ({
        month: p.month,
        percentage: p.percentage,
        notes: p.notes,
        progress: p,
      }));
  }, [contract]);

  // Get months with notes
  const monthsWithNotes = useMemo(() => {
    if (!contract) return [];
    return contract.monthly_progress
      .filter((p) => p.notes)
      .map((p) => ({
        month: p.month,
        notes: p.notes!,
      }));
  }, [contract]);

  // Calculate affected data for merge (converting UP)
  const mergeAffectedData = useMemo(() => {
    if (!contract || !isConvertingUp) return [];

    const affected: {
      targetRange: { start: number; end: number };
      sourceMonths: {
        month: number;
        percentage: number;
        notes: string | null;
      }[];
      highestPercentage: number;
      lastMonthPercentage: number;
    }[] = [];

    for (const range of activeMonthRanges) {
      const sourceMonths = monthsWithData.filter(
        (m) => m.month >= range.start && m.month <= range.end
      );

      if (sourceMonths.length > 0) {
        const highestPercentage = Math.max(
          ...sourceMonths.map((m) => m.percentage)
        );
        const lastMonthData = contract.monthly_progress.find(
          (p) => p.month === range.end
        );

        affected.push({
          targetRange: range,
          sourceMonths: sourceMonths.map((m) => ({
            month: m.month,
            percentage: m.percentage,
            notes: m.notes,
          })),
          highestPercentage,
          lastMonthPercentage: lastMonthData?.percentage || 0,
        });
      }
    }

    return affected;
  }, [contract, isConvertingUp, activeMonthRanges, monthsWithData]);

  // Calculate affected data for split (converting DOWN)
  const splitAffectedData = useMemo(() => {
    if (!contract || !isConvertingDown) return [];

    const currentActiveMonths = getPeriodMonths(currentPeriodValue);
    const affected: {
      sourceRange: { start: number; end: number };
      sourcePercentage: number;
      sourceNotes: string | null;
      targetRanges: { start: number; end: number }[];
    }[] = [];

    for (const sourceEndMonth of currentActiveMonths) {
      const sourceStartMonth = getPeriodStartMonth(
        sourceEndMonth,
        currentPeriodValue
      );
      const sourceProgress = contract.monthly_progress.find(
        (p) => p.month === sourceEndMonth
      );

      if (
        sourceProgress &&
        (sourceProgress.percentage > 0 || sourceProgress.notes)
      ) {
        // Find which new ranges fall within this source range
        const targetRanges = activeMonthRanges.filter(
          (r) => r.start >= sourceStartMonth && r.end <= sourceEndMonth
        );

        if (targetRanges.length > 1) {
          affected.push({
            sourceRange: { start: sourceStartMonth, end: sourceEndMonth },
            sourcePercentage: sourceProgress.percentage,
            sourceNotes: sourceProgress.notes,
            targetRanges,
          });
        }
      }
    }

    return affected;
  }, [contract, isConvertingDown, currentPeriodValue, activeMonthRanges]);

  const hasAffectedData =
    mergeAffectedData.length > 0 || splitAffectedData.length > 0;

  // Reset state when dialog opens
  useEffect(() => {
    if (open && contract) {
      setSelectedPeriod(currentPeriodValue);
      setStep("select");
      setMergeMode("highest");
      setManualMergeValue(0);
      setSelectedNotes([]);
      setSplitMode("duplicate");
      setManualSplitValues({});
    }
  }, [open, contract, currentPeriodValue]);

  // Initialize manual split values when split mode changes to manual
  useEffect(() => {
    if (splitMode === "manual" && splitAffectedData.length > 0) {
      const initialValues: Record<number, number> = {};
      for (const data of splitAffectedData) {
        for (const range of data.targetRanges) {
          initialValues[range.end] = data.sourcePercentage;
        }
      }
      setManualSplitValues(initialValues);
    }
  }, [splitMode, splitAffectedData]);

  // Handle next step
  const handleNext = () => {
    if (hasAffectedData && step === "select") {
      setStep("configure");
    } else {
      handleSave();
    }
  };

  // Get year from contract's monthly progress
  const currentYear =
    contract?.monthly_progress[0]?.year || new Date().getFullYear();

  // Handle save
  const handleSave = async () => {
    if (!contract) return;

    setIsUpdating(true);

    try {
      if (isSupabaseConfigured()) {
        // Build migration config based on user selections
        const migrationConfig: PeriodMigrationConfig = {
          contractId: contract.id,
          year: currentYear,
          newPeriod: selectedPeriod,
          halfMonthMode: isConvertingToHalfMonth ? halfMonthMode : undefined,
        };

        // Configure merge (converting UP)
        if (isConvertingUp && mergeAffectedData.length > 0) {
          migrationConfig.mergeConfig = mergeAffectedData.map((data) => {
            // Determine which source month to use based on mode
            let sourceMonth: number;

            if (mergeMode === "highest") {
              // Find month with highest percentage
              const highestMonth = data.sourceMonths.reduce(
                (highest, current) =>
                  current.percentage > highest.percentage ? current : highest
              );
              sourceMonth = highestMonth.month;
            } else if (mergeMode === "last") {
              // Use last month of the period
              sourceMonth = data.targetRange.end;
            } else {
              // Manual - find a month with that percentage, or use highest
              const matchingMonth = data.sourceMonths.find(
                (m) => m.percentage === manualMergeValue
              );
              sourceMonth = matchingMonth?.month || data.sourceMonths[0].month;
            }

            // Get selected notes for this range
            const notesForRange = monthsWithNotes
              .filter(
                (m) =>
                  m.month >= data.targetRange.start &&
                  m.month <= data.targetRange.end &&
                  selectedNotes.includes(m.month)
              )
              .map((m) => `[${SHORT_MONTH_NAMES[m.month - 1]}] ${m.notes}`);

            return {
              targetMonth: data.targetRange.end,
              sourceMonth,
              notes: notesForRange,
            };
          });
        }

        // Configure split (converting DOWN)
        if (isConvertingDown && splitAffectedData.length > 0) {
          migrationConfig.splitConfig = splitAffectedData.map((data) => {
            const targetMonths = data.targetRanges.map((range) => {
              let percentage: number;

              if (splitMode === "duplicate") {
                percentage = data.sourcePercentage;
              } else if (splitMode === "last") {
                // Only last range gets the percentage
                const isLast =
                  range.end ===
                  data.targetRanges[data.targetRanges.length - 1].end;
                percentage = isLast ? data.sourcePercentage : 0;
              } else {
                // Manual
                percentage =
                  manualSplitValues[range.end] ?? data.sourcePercentage;
              }

              return {
                month: range.end,
                percentage,
              };
            });

            return {
              sourceMonth: data.sourceRange.end,
              targetMonths,
            };
          });
        }

        // Execute migration
        await migrateContractPeriod(migrationConfig);

        console.log("Period migrated:", migrationConfig);
      } else {
        // Placeholder mode - just simulate success
        await new Promise((resolve) => setTimeout(resolve, 500));
        console.log("[Placeholder] Period would be migrated with config:", {
          mergeMode,
          manualMergeValue,
          selectedNotes,
          splitMode,
          manualSplitValues,
        });
      }

      showSuccessToast(
        `Periode berhasil diubah ke Per ${selectedPeriod} Bulan`
      );
      onOpenChange(false);
      onPeriodUpdate?.();
    } catch (error) {
      console.error("Failed to update period:", error);
      showErrorToast("Gagal mengubah periode");
    } finally {
      setIsUpdating(false);
    }
  };

  if (!contract) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] p-0 gap-0 flex flex-col">
        <DialogHeader className="px-6 pt-6">
          <DialogTitle>Edit Periode Kontrak</DialogTitle>
          <DialogDescription>
            Ubah periode penagihan untuk kontrak:{" "}
            <span className="font-medium">{contract.name}</span>
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 py-4 min-h-0">
          {step === "select" ? (
            <div className="space-y-4">
              {/* Current Period */}
              <div className="flex items-center gap-4">
                <Label className="w-32 text-sm text-muted-foreground">
                  Periode Saat Ini:
                </Label>
                <Badge variant="outline">{contract.period}</Badge>
              </div>

              {/* New Period Selection */}
              <div className="flex items-center gap-4">
                <Label className="w-32 text-sm">Periode Baru:</Label>
                <Select
                  value={selectedPeriod.toString()}
                  onValueChange={(v) => setSelectedPeriod(parseFloat(v))}
                >
                  <SelectTrigger className="w-48">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PERIOD_OPTIONS.map((option) => (
                      <SelectItem
                        key={option.value}
                        value={option.value.toString()}
                      >
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Preview active months */}
              <div className="rounded-lg border p-3">
                <p className="mb-2 text-sm font-medium">Bulan Aktif:</p>
                <div className="flex flex-wrap gap-1">
                  {activeMonthRanges.map((range) => (
                    <Badge
                      key={range.end}
                      variant="secondary"
                      className="text-xs"
                    >
                      {getMonthRangeLabel(range.start, range.end)}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Warning for affected data */}
              {hasAffectedData && selectedPeriod !== currentPeriodValue && (
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 dark:border-amber-900 dark:bg-amber-950">
                  <div className="flex items-center gap-2 text-amber-800 dark:text-amber-200">
                    <AlertTriangle className="h-4 w-4" />
                    <p className="text-sm font-medium">
                      {isConvertingUp
                        ? `${mergeAffectedData.length} periode memiliki data yang perlu digabungkan`
                        : `${splitAffectedData.length} periode akan dipecah`}
                    </p>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-6 py-4">
              {/* Configure Merge (Converting UP) */}
              {isConvertingUp &&
                mergeAffectedData.map((data, idx) => (
                  <div key={idx} className="rounded-lg border p-4 space-y-4">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-sm">
                        {getMonthRangeLabel(
                          data.targetRange.start,
                          data.targetRange.end
                        )}
                      </Badge>
                      <span className="text-sm text-muted-foreground">
                        ({data.sourceMonths.length} bulan dengan data)
                      </span>
                    </div>

                    {/* Show source data */}
                    <div className="text-sm space-y-1 bg-muted/50 rounded p-2">
                      {data.sourceMonths.map((m) => (
                        <div key={m.month} className="flex items-center gap-2">
                          <span className="font-medium">
                            {SHORT_MONTH_NAMES[m.month - 1]}:
                          </span>
                          <span>{m.percentage}%</span>
                          {m.notes && (
                            <FileText className="h-3 w-3 text-muted-foreground" />
                          )}
                        </div>
                      ))}
                    </div>

                    {/* Mode selection */}
                    <div className="space-y-2">
                      <Label className="text-sm">
                        Pilih data yang akan digunakan:
                      </Label>
                      <div className="space-y-2">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name={`merge-mode-${idx}`}
                            checked={mergeMode === "highest"}
                            onChange={() => setMergeMode("highest")}
                            className="h-4 w-4"
                          />
                          <span className="text-sm">
                            Nilai tertinggi ({data.highestPercentage}%)
                          </span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name={`merge-mode-${idx}`}
                            checked={mergeMode === "last"}
                            onChange={() => setMergeMode("last")}
                            className="h-4 w-4"
                          />
                          <span className="text-sm">
                            Bulan terakhir periode ({data.lastMonthPercentage}%)
                          </span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name={`merge-mode-${idx}`}
                            checked={mergeMode === "manual"}
                            onChange={() => setMergeMode("manual")}
                            className="h-4 w-4"
                          />
                          <span className="text-sm">Pilih manual:</span>
                          {mergeMode === "manual" && (
                            <Select
                              value={manualMergeValue.toString()}
                              onValueChange={(v) =>
                                setManualMergeValue(parseInt(v))
                              }
                            >
                              <SelectTrigger className="w-40 h-8">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {progressOptions.map((opt) => (
                                  <SelectItem
                                    key={opt.value}
                                    value={opt.value.toString()}
                                  >
                                    {opt.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          )}
                        </label>
                      </div>
                    </div>

                    {/* Notes selection */}
                    {monthsWithNotes.length > 0 && (
                      <>
                        <Separator />
                        <div className="space-y-2">
                          <Label className="text-sm flex items-center gap-2">
                            <FileText className="h-4 w-4" />
                            Pilih catatan yang akan disimpan:
                          </Label>
                          <div className="space-y-2">
                            {monthsWithNotes
                              .filter(
                                (m) =>
                                  m.month >= data.targetRange.start &&
                                  m.month <= data.targetRange.end
                              )
                              .map((m) => (
                                <label
                                  key={m.month}
                                  className="flex items-start gap-2 cursor-pointer"
                                >
                                  <Checkbox
                                    checked={selectedNotes.includes(m.month)}
                                    onCheckedChange={(checked) => {
                                      if (checked) {
                                        setSelectedNotes([
                                          ...selectedNotes,
                                          m.month,
                                        ]);
                                      } else {
                                        setSelectedNotes(
                                          selectedNotes.filter(
                                            (n) => n !== m.month
                                          )
                                        );
                                      }
                                    }}
                                  />
                                  <div className="text-sm">
                                    <span className="font-medium">
                                      {SHORT_MONTH_NAMES[m.month - 1]}:
                                    </span>
                                    <span className="text-muted-foreground ml-1 line-clamp-2">
                                      {m.notes}
                                    </span>
                                  </div>
                                </label>
                              ))}
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                ))}

              {/* Configure Split (Converting DOWN) */}
              {isConvertingDown &&
                splitAffectedData.map((data, idx) => (
                  <div key={idx} className="rounded-lg border p-4 space-y-4">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-sm">
                        {getMonthRangeLabel(
                          data.sourceRange.start,
                          data.sourceRange.end
                        )}
                      </Badge>
                      <ArrowRight className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">
                        {data.targetRanges.length} periode baru
                      </span>
                    </div>

                    {/* Show source data */}
                    <div className="text-sm bg-muted/50 rounded p-2">
                      <span className="font-medium">Data saat ini:</span>
                      <span className="ml-2">{data.sourcePercentage}%</span>
                      {data.sourceNotes && (
                        <div className="mt-1 text-muted-foreground line-clamp-1">
                          <FileText className="h-3 w-3 inline mr-1" />
                          {data.sourceNotes}
                        </div>
                      )}
                    </div>

                    {/* Mode selection */}
                    <div className="space-y-3">
                      <Label className="text-sm">
                        Pilih cara pembagian data:
                      </Label>

                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name={`split-mode-${idx}`}
                          checked={splitMode === "duplicate"}
                          onChange={() => setSplitMode("duplicate")}
                          className="h-4 w-4"
                        />
                        <span className="text-sm">
                          Duplikasi ke semua periode ({data.sourcePercentage}%)
                        </span>
                      </label>

                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name={`split-mode-${idx}`}
                          checked={splitMode === "last"}
                          onChange={() => setSplitMode("last")}
                          className="h-4 w-4"
                        />
                        <span className="text-sm">
                          Hanya periode terakhir (
                          {getMonthRangeLabel(
                            data.targetRanges[data.targetRanges.length - 1]
                              .start,
                            data.targetRanges[data.targetRanges.length - 1].end
                          )}{" "}
                          = {data.sourcePercentage}%, lainnya 0%)
                        </span>
                      </label>

                      <label className="flex items-start gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name={`split-mode-${idx}`}
                          checked={splitMode === "manual"}
                          onChange={() => setSplitMode("manual")}
                          className="h-4 w-4 mt-1"
                        />
                        <span className="text-sm">
                          Pilih manual untuk setiap periode:
                        </span>
                      </label>

                      {splitMode === "manual" && (
                        <div className="ml-6 grid grid-cols-3 gap-2">
                          {data.targetRanges.map((range) => (
                            <div
                              key={range.end}
                              className="flex items-center gap-1"
                            >
                              <span className="text-xs font-medium w-12">
                                {getMonthRangeLabel(range.start, range.end)}:
                              </span>
                              <Select
                                value={(
                                  manualSplitValues[range.end] ??
                                  data.sourcePercentage
                                ).toString()}
                                onValueChange={(v) =>
                                  setManualSplitValues({
                                    ...manualSplitValues,
                                    [range.end]: parseInt(v),
                                  })
                                }
                              >
                                <SelectTrigger className="h-7 text-xs flex-1">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {progressOptions.map((opt) => (
                                    <SelectItem
                                      key={opt.value}
                                      value={opt.value.toString()}
                                    >
                                      {opt.value}%
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Notes for split */}
                    {data.sourceNotes && (
                      <>
                        <Separator />
                        <div className="space-y-2">
                          <Label className="text-sm flex items-center gap-2">
                            <FileText className="h-4 w-4" />
                            Catatan akan diduplikasi ke semua periode baru
                          </Label>
                          <p className="text-xs text-muted-foreground bg-muted/50 rounded p-2">
                            {data.sourceNotes}
                          </p>
                        </div>
                      </>
                    )}
                  </div>
                ))}
            </div>
          )}

          {/* Half-Month Configuration */}
          {isConvertingToHalfMonth && (
            <div className="space-y-4 rounded-lg border p-4 bg-amber-50/50 dark:bg-amber-950/20">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-500" />
                <span className="font-medium text-sm">
                  Konfigurasi Periode 1/2 Bulan
                </span>
              </div>

              <p className="text-xs text-muted-foreground">
                Setiap bulan akan memiliki 2 periode (1-20 dan 21-30). Pilih
                bagaimana data dari periode sebelumnya akan diperlakukan:
              </p>

              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="halfmonth-duplicate"
                    checked={halfMonthMode === "duplicate"}
                    onCheckedChange={() => setHalfMonthMode("duplicate")}
                  />
                  <Label htmlFor="halfmonth-duplicate" className="text-sm">
                    <span className="font-medium">Duplikasi ke 21-30</span>
                    <span className="text-muted-foreground ml-1">
                      - Data 1-20 akan diduplikasi ke 21-30
                    </span>
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="halfmonth-empty"
                    checked={halfMonthMode === "empty"}
                    onCheckedChange={() => setHalfMonthMode("empty")}
                  />
                  <Label htmlFor="halfmonth-empty" className="text-sm">
                    <span className="font-medium">Kosongkan 21-30</span>
                    <span className="text-muted-foreground ml-1">
                      - Hanya 1-20 yang berisi data, 21-30 kosong
                    </span>
                  </Label>
                </div>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="px-6 pb-6 pt-4 border-t">
          {step === "configure" && (
            <Button variant="outline" onClick={() => setStep("select")}>
              Kembali
            </Button>
          )}
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Batal
          </Button>
          <Button
            onClick={handleNext}
            disabled={isUpdating || selectedPeriod === currentPeriodValue}
          >
            {isUpdating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {step === "select" &&
            hasAffectedData &&
            selectedPeriod !== currentPeriodValue
              ? "Lanjutkan"
              : "Simpan Perubahan"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
