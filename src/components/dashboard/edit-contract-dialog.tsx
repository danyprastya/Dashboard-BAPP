"use client";

import { useState, useMemo, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AutocompleteInput } from "@/components/ui/autocomplete-input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Loader2,
  Plus,
  Trash2,
  Save,
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  FileText,
  Calendar,
  User,
  MapPin,
  FileSignature,
  StickyNote,
} from "lucide-react";
import type {
  ContractWithProgress,
  MonthlyProgressDetail,
} from "@/types/database";
import {
  PERIOD_OPTIONS,
  getPeriodMonths,
  parsePeriodToNumber,
} from "@/types/database";
import {
  updateContract,
  updateContractSignatures,
  getOrCreateCustomer,
  getOrCreateArea,
  fetchUniqueCustomerNames,
  fetchUniqueAreaNames,
  fetchUniqueContractNames,
  migrateContractPeriod,
  type PeriodMigrationConfig,
} from "@/lib/supabase/data";
import { isSupabaseConfigured } from "@/lib/supabase/client";
import { showSuccessToast, showErrorToast } from "@/lib/toast";

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

interface EditContractDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contract: ContractWithProgress | null;
  customerName: string;
  areaName: string;
  onSave: () => void;
}

interface SignatureInput {
  id: string;
  name: string;
  role: string;
}

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

export function EditContractDialog({
  open,
  onOpenChange,
  contract,
  customerName,
  areaName,
  onSave,
}: EditContractDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"general" | "period">("general");

  // Form data for general info
  const [formData, setFormData] = useState({
    customer: "",
    area: "",
    name: "",
    notes: "",
  });

  // Signatures state
  const [signatures, setSignatures] = useState<SignatureInput[]>([]);

  // Period edit state
  const [selectedPeriod, setSelectedPeriod] = useState<number>(1);
  const [periodStep, setPeriodStep] = useState<"select" | "configure">(
    "select"
  );

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

  // Autocomplete options
  const [customerOptions, setCustomerOptions] = useState<string[]>([]);
  const [areaOptions, setAreaOptions] = useState<string[]>([]);
  const [contractNameOptions, setContractNameOptions] = useState<string[]>([]);

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
  const isConvertingDown = selectedPeriod < currentPeriodValue;
  const isPeriodChanged = selectedPeriod !== currentPeriodValue;

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

  // Fetch autocomplete options when dialog opens
  useEffect(() => {
    if (open && isSupabaseConfigured()) {
      Promise.all([
        fetchUniqueCustomerNames(),
        fetchUniqueAreaNames(),
        fetchUniqueContractNames(),
      ]).then(([customers, areas, contracts]) => {
        setCustomerOptions(customers);
        setAreaOptions(areas);
        setContractNameOptions(contracts);
      });
    }
  }, [open]);

  // Initialize form when dialog opens
  useEffect(() => {
    if (open && contract) {
      setFormData({
        customer: customerName,
        area: areaName,
        name: contract.name,
        notes: contract.notes || "",
      });
      // Initialize signatures from contract
      setSignatures(
        contract.signatures.map((sig, idx) => ({
          id: sig.id || `sig-${idx}`,
          name: sig.name,
          role: sig.role,
        }))
      );
      setSelectedPeriod(currentPeriodValue);
      setPeriodStep("select");
      setMergeMode("highest");
      setManualMergeValue(0);
      setSelectedNotes([]);
      setSplitMode("duplicate");
      setManualSplitValues({});
      setActiveTab("general");
      setError(null);
    }
  }, [open, contract, customerName, areaName, currentPeriodValue]);

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

  const validateForm = (): string | null => {
    if (!formData.customer.trim()) {
      return "Nama customer harus diisi";
    }
    if (!formData.name.trim()) {
      return "Nama kontrak harus diisi";
    }
    const validSignatures = signatures.filter((s) => s.name.trim());
    if (validSignatures.length === 0) {
      return "Minimal harus ada 1 tanda tangan dengan nama yang diisi";
    }
    return null;
  };

  // Signature handlers
  const handleAddSignature = () => {
    const newId = `sig-new-${Date.now()}`;
    setSignatures([...signatures, { id: newId, name: "", role: "" }]);
  };

  const handleRemoveSignature = (id: string) => {
    if (signatures.length > 1) {
      setSignatures(signatures.filter((s) => s.id !== id));
    }
  };

  const handleSignatureChange = (
    id: string,
    field: "name" | "role",
    value: string
  ) => {
    setSignatures(
      signatures.map((s) => (s.id === id ? { ...s, [field]: value } : s))
    );
  };

  // Get year from contract's monthly progress
  const currentYear =
    contract?.monthly_progress[0]?.year || new Date().getFullYear();

  const handleSave = async () => {
    if (!contract) return;

    setError(null);
    const validationError = validateForm();
    if (validationError) {
      showErrorToast(validationError, "Validasi Gagal");
      setError(validationError);
      return;
    }

    setIsLoading(true);

    try {
      if (isSupabaseConfigured()) {
        // Get or create customer by name
        const customer = await getOrCreateCustomer(formData.customer.trim());
        if (!customer) {
          throw new Error("Gagal membuat/menemukan customer");
        }

        // Get or create area by name under the customer
        const areaNameValue = formData.area.trim() || "Default";
        const area = await getOrCreateArea(customer.id, areaNameValue);
        if (!area) {
          throw new Error("Gagal membuat/menemukan area");
        }

        // Update contract basic info
        await updateContract(contract.id, {
          customer_id: customer.id,
          area_id: area.id,
          name: formData.name.trim(),
          notes: formData.notes.trim() || null,
          year: currentYear,
        });

        // Update signatures
        const validSignatures = signatures
          .filter((s) => s.name.trim())
          .map((s) => ({
            id: s.id.startsWith("sig-new-") ? undefined : s.id, // Keep existing IDs, undefined for new ones
            name: s.name.trim(),
            role: s.role.trim() || "Pejabat",
          }));
        await updateContractSignatures(contract.id, validSignatures);

        // Handle period migration if changed
        if (isPeriodChanged) {
          const migrationConfig: PeriodMigrationConfig = {
            contractId: contract.id,
            year: currentYear,
            newPeriod: selectedPeriod,
          };

          // Configure merge (converting UP)
          if (isConvertingUp && mergeAffectedData.length > 0) {
            migrationConfig.mergeConfig = mergeAffectedData.map((data) => {
              let sourceMonth: number;

              if (mergeMode === "highest") {
                const highestMonth = data.sourceMonths.reduce(
                  (highest, current) =>
                    current.percentage > highest.percentage ? current : highest
                );
                sourceMonth = highestMonth.month;
              } else if (mergeMode === "last") {
                sourceMonth = data.targetRange.end;
              } else {
                const matchingMonth = data.sourceMonths.find(
                  (m) => m.percentage === manualMergeValue
                );
                sourceMonth =
                  matchingMonth?.month || data.sourceMonths[0].month;
              }

              // Get notes from selected months in this range
              const rangeNotes = selectedNotes
                .filter(
                  (month) =>
                    month >= data.targetRange.start &&
                    month <= data.targetRange.end
                )
                .map((month) => {
                  const monthData = data.sourceMonths.find(
                    (m) => m.month === month
                  );
                  return monthData?.notes || "";
                })
                .filter((note) => note.trim() !== "");

              return {
                targetMonth: data.targetRange.end,
                sourceMonth,
                notes: rangeNotes,
              };
            });
          }

          // Configure split (converting DOWN)
          if (isConvertingDown && splitAffectedData.length > 0) {
            migrationConfig.splitConfig = splitAffectedData.map((data) => {
              const targetMonths = data.targetRanges.map((targetRange) => {
                let targetPercentage: number;

                if (splitMode === "duplicate") {
                  targetPercentage = data.sourcePercentage;
                } else if (splitMode === "last") {
                  targetPercentage =
                    targetRange.end === data.sourceRange.end
                      ? data.sourcePercentage
                      : 0;
                } else {
                  targetPercentage =
                    manualSplitValues[targetRange.end] ?? data.sourcePercentage;
                }

                return {
                  month: targetRange.end,
                  percentage: targetPercentage,
                };
              });

              return {
                sourceMonth: data.sourceRange.end,
                targetMonths,
              };
            });
          }

          await migrateContractPeriod(migrationConfig);
        }

        showSuccessToast("Kontrak berhasil diperbarui", {
          description: `${formData.name} telah disimpan`,
        });
      } else {
        await new Promise((resolve) => setTimeout(resolve, 500));
        showSuccessToast("Mode Demo: Kontrak tersimpan", {
          description: "Perubahan tidak akan disimpan secara permanen",
        });
      }

      onSave();
      onOpenChange(false);
    } catch (err) {
      console.error("Error saving contract:", err);
      showErrorToast(err, "Gagal Menyimpan Kontrak");
      setError(
        err instanceof Error ? err.message : "Terjadi kesalahan saat menyimpan"
      );
    } finally {
      setIsLoading(false);
    }
  };

  // Handle period next step
  const handlePeriodNext = () => {
    if (hasAffectedData && periodStep === "select") {
      setPeriodStep("configure");
    }
  };

  if (!contract) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl h-[85vh] max-h-[85vh] flex flex-col overflow-hidden">
        <DialogHeader className="shrink-0">
          <DialogTitle className="text-lg flex items-center gap-2">
            <FileSignature className="h-5 w-5" />
            Edit Kontrak
          </DialogTitle>
          <DialogDescription className="text-sm">
            Edit informasi kontrak: {contract.name}
          </DialogDescription>
        </DialogHeader>

        {error && (
          <Alert variant="destructive" className="shrink-0">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Tab Navigation */}
        <div className="flex gap-2 border-b shrink-0">
          <button
            onClick={() => setActiveTab("general")}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === "general"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <span className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Informasi Umum
            </span>
          </button>
          <button
            onClick={() => setActiveTab("period")}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === "period"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <span className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Periode
              {isPeriodChanged && (
                <Badge variant="secondary" className="ml-1 text-xs">
                  Berubah
                </Badge>
              )}
            </span>
          </button>
        </div>

        {/* Tab Content - Scrollable */}
        <ScrollArea className="flex-1 min-h-0 pr-4">
          {activeTab === "general" && (
            <div className="space-y-4 py-4">
              {/* Customer */}
              <div className="space-y-2">
                <Label htmlFor="customer" className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Customer <span className="text-destructive">*</span>
                </Label>
                <AutocompleteInput
                  id="customer"
                  placeholder="Ketik atau pilih customer..."
                  value={formData.customer}
                  onChange={(value) =>
                    setFormData({ ...formData, customer: value })
                  }
                  options={customerOptions}
                  emptyMessage="Customer baru akan dibuat"
                />
              </div>

              {/* Area */}
              <div className="space-y-2">
                <Label htmlFor="area" className="flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  Area
                </Label>
                <AutocompleteInput
                  id="area"
                  placeholder="Ketik atau pilih area..."
                  value={formData.area}
                  onChange={(value) =>
                    setFormData({ ...formData, area: value })
                  }
                  options={areaOptions}
                  emptyMessage="Area baru akan dibuat"
                />
                <p className="text-xs text-muted-foreground">
                  Kosongkan untuk menggunakan area &quot;Default&quot;
                </p>
              </div>

              {/* Contract Name */}
              <div className="space-y-2">
                <Label htmlFor="name" className="flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Nama Kontrak <span className="text-destructive">*</span>
                </Label>
                <AutocompleteInput
                  id="name"
                  placeholder="Ketik atau pilih nama kontrak..."
                  value={formData.name}
                  onChange={(value) =>
                    setFormData({ ...formData, name: value })
                  }
                  options={contractNameOptions}
                  emptyMessage="Nama kontrak baru"
                />
              </div>

              {/* Signatures */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="flex items-center gap-2">
                    <FileSignature className="h-4 w-4" />
                    Tanda Tangan <span className="text-destructive">*</span>
                  </Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleAddSignature}
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Tambah
                  </Button>
                </div>
                <div className="space-y-3">
                  {signatures.map((sig, index) => (
                    <div
                      key={sig.id}
                      className="flex gap-2 items-start p-3 rounded-lg border bg-muted/30"
                    >
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-medium text-muted-foreground w-6">
                            #{index + 1}
                          </span>
                          <Input
                            placeholder="Nama penanda tangan"
                            value={sig.name}
                            onChange={(e) =>
                              handleSignatureChange(sig.id, "name", e.target.value)
                            }
                            className="flex-1"
                          />
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground w-6"></span>
                          <Input
                            placeholder="Jabatan (opsional)"
                            value={sig.role}
                            onChange={(e) =>
                              handleSignatureChange(sig.id, "role", e.target.value)
                            }
                            className="flex-1"
                          />
                        </div>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemoveSignature(sig.id)}
                        disabled={signatures.length <= 1}
                        className="text-muted-foreground hover:text-destructive shrink-0"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">
                  Minimal 1 tanda tangan diperlukan. Perubahan tanda tangan akan mempengaruhi perhitungan progress.
                </p>
              </div>

              <div className="border-t" />

              {/* Notes */}
              <div className="space-y-2">
                <Label htmlFor="notes" className="flex items-center gap-2">
                  <StickyNote className="h-4 w-4" />
                  Catatan Kontrak
                </Label>
                <Textarea
                  id="notes"
                  placeholder="Catatan tambahan untuk kontrak ini..."
                  value={formData.notes}
                  onChange={(e) =>
                    setFormData({ ...formData, notes: e.target.value })
                  }
                  rows={3}
                />
              </div>
            </div>
          )}

          {activeTab === "period" && (
            <div className="space-y-4 py-4">
              {/* Period Selection */}
              <div className="space-y-2">
                <Label>Periode Kontrak</Label>
                <Select
                  value={selectedPeriod.toString()}
                  onValueChange={(value) => {
                    setSelectedPeriod(parseInt(value));
                    setPeriodStep("select");
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih periode" />
                  </SelectTrigger>
                  <SelectContent>
                    {PERIOD_OPTIONS.map((option) => (
                      <SelectItem
                        key={option.value}
                        value={option.value.toString()}
                      >
                        {option.label}
                        {option.value === currentPeriodValue && " (saat ini)"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Period Change Preview */}
              {isPeriodChanged && (
                <div className="rounded-lg border p-4 space-y-3">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <AlertTriangle className="h-4 w-4 text-amber-500" />
                    Perubahan Periode
                  </div>

                  <div className="flex items-center gap-3 text-sm">
                    <Badge variant="outline">
                      {
                        PERIOD_OPTIONS.find(
                          (o) => o.value === currentPeriodValue
                        )?.label
                      }
                    </Badge>
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                    <Badge variant="default">
                      {
                        PERIOD_OPTIONS.find((o) => o.value === selectedPeriod)
                          ?.label
                      }
                    </Badge>
                  </div>

                  {/* Active months preview */}
                  <div className="mt-2">
                    <p className="text-xs text-muted-foreground mb-2">
                      Bulan aktif setelah perubahan:
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {activeMonthRanges.map((range, idx) => (
                        <Badge
                          key={idx}
                          variant="secondary"
                          className="text-xs"
                        >
                          {getMonthRangeLabel(range.start, range.end)}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Merge Configuration (Converting UP) */}
              {isConvertingUp &&
                hasAffectedData &&
                periodStep === "configure" && (
                  <div className="space-y-4 rounded-lg border p-4">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-amber-500" />
                      <span className="font-medium text-sm">
                        Konfigurasi Penggabungan Data
                      </span>
                    </div>

                    <p className="text-xs text-muted-foreground">
                      Data dari beberapa bulan akan digabung. Pilih cara
                      penggabungan:
                    </p>

                    <div className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="merge-highest"
                          checked={mergeMode === "highest"}
                          onCheckedChange={() => setMergeMode("highest")}
                        />
                        <Label htmlFor="merge-highest" className="text-sm">
                          Gunakan progress tertinggi
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="merge-last"
                          checked={mergeMode === "last"}
                          onCheckedChange={() => setMergeMode("last")}
                        />
                        <Label htmlFor="merge-last" className="text-sm">
                          Gunakan progress bulan terakhir
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="merge-manual"
                          checked={mergeMode === "manual"}
                          onCheckedChange={() => setMergeMode("manual")}
                        />
                        <Label htmlFor="merge-manual" className="text-sm">
                          Pilih manual
                        </Label>
                      </div>
                    </div>

                    {mergeMode === "manual" && (
                      <Select
                        value={manualMergeValue.toString()}
                        onValueChange={(v) => setManualMergeValue(parseInt(v))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Pilih progress" />
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

                    {/* Notes selection */}
                    {monthsWithNotes.length > 0 && (
                      <div className="space-y-2 pt-2 border-t">
                        <Label className="text-sm">
                          Catatan yang akan disimpan:
                        </Label>
                        <div className="space-y-1">
                          {monthsWithNotes.map((m) => (
                            <div
                              key={m.month}
                              className="flex items-start space-x-2"
                            >
                              <Checkbox
                                id={`note-${m.month}`}
                                checked={selectedNotes.includes(m.month)}
                                onCheckedChange={(checked) => {
                                  if (checked) {
                                    setSelectedNotes([
                                      ...selectedNotes,
                                      m.month,
                                    ]);
                                  } else {
                                    setSelectedNotes(
                                      selectedNotes.filter((n) => n !== m.month)
                                    );
                                  }
                                }}
                              />
                              <Label
                                htmlFor={`note-${m.month}`}
                                className="text-xs"
                              >
                                <span className="font-medium">
                                  {SHORT_MONTH_NAMES[m.month - 1]}:
                                </span>{" "}
                                {m.notes.length > 50
                                  ? m.notes.substring(0, 50) + "..."
                                  : m.notes}
                              </Label>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

              {/* Split Configuration (Converting DOWN) */}
              {isConvertingDown &&
                hasAffectedData &&
                periodStep === "configure" && (
                  <div className="space-y-4 rounded-lg border p-4">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-amber-500" />
                      <span className="font-medium text-sm">
                        Konfigurasi Pembagian Data
                      </span>
                    </div>

                    <p className="text-xs text-muted-foreground">
                      Data akan dibagi ke beberapa bulan. Pilih cara pembagian:
                    </p>

                    <div className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="split-duplicate"
                          checked={splitMode === "duplicate"}
                          onCheckedChange={() => setSplitMode("duplicate")}
                        />
                        <Label htmlFor="split-duplicate" className="text-sm">
                          Duplikasi ke semua bulan
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="split-last"
                          checked={splitMode === "last"}
                          onCheckedChange={() => setSplitMode("last")}
                        />
                        <Label htmlFor="split-last" className="text-sm">
                          Hanya bulan terakhir yang berisi data
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="split-manual"
                          checked={splitMode === "manual"}
                          onCheckedChange={() => setSplitMode("manual")}
                        />
                        <Label htmlFor="split-manual" className="text-sm">
                          Atur manual per bulan
                        </Label>
                      </div>
                    </div>

                    {splitMode === "manual" && splitAffectedData.length > 0 && (
                      <div className="space-y-3 pt-2 border-t">
                        {splitAffectedData.map((data) => (
                          <div key={data.sourceRange.end} className="space-y-2">
                            <p className="text-xs font-medium">
                              Dari{" "}
                              {getMonthRangeLabel(
                                data.sourceRange.start,
                                data.sourceRange.end
                              )}
                              :
                            </p>
                            <div className="grid gap-2 pl-4">
                              {data.targetRanges.map((range) => (
                                <div
                                  key={range.end}
                                  className="flex items-center gap-2"
                                >
                                  <span className="text-xs w-16">
                                    {SHORT_MONTH_NAMES[range.end - 1]}:
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
                                    <SelectTrigger className="h-8">
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
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

              {/* Configure button for period changes with affected data */}
              {isPeriodChanged &&
                hasAffectedData &&
                periodStep === "select" && (
                  <Button
                    variant="outline"
                    onClick={handlePeriodNext}
                    className="w-full"
                  >
                    Konfigurasi Migrasi Data
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                )}
            </div>
          )}
        </ScrollArea>

        <div className="shrink-0 border-t pt-4 mt-2">
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              Batal
            </Button>
            <Button onClick={handleSave} disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              <Save className="mr-2 h-4 w-4" />
              Simpan Perubahan
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
