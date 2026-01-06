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
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import {
  FileSpreadsheet,
  FileText,
  Download,
  Loader2,
  FileDown,
} from "lucide-react";
import type { CustomerWithAreas, ContractWithProgress } from "@/types/database";
import {
  exportToExcel,
  exportSummaryReport,
  exportContractReport,
  type ExportScope,
} from "@/lib/export";
import { showSuccessToast, showErrorToast } from "@/lib/toast";

interface ExportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  data: CustomerWithAreas[];
  year: number;
  selectedContract?: {
    contract: ContractWithProgress;
    customerName: string;
    areaName: string;
  } | null;
}

export function ExportDialog({
  open,
  onOpenChange,
  data,
  year,
  selectedContract,
}: ExportDialogProps) {
  const [isExporting, setIsExporting] = useState(false);
  const [exportType, setExportType] = useState<
    "summary" | "detail" | "contract"
  >(selectedContract ? "contract" : "summary");
  const [scope, setScope] = useState<ExportScope>("all");
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>("");
  const [includeTimeline, setIncludeTimeline] = useState(true);
  const [includeSignatures, setIncludeSignatures] = useState(true);
  const [includeNotes, setIncludeNotes] = useState(true);

  const handleExport = async () => {
    setIsExporting(true);
    try {
      if (exportType === "summary") {
        exportSummaryReport(data, year);
        showSuccessToast("Laporan ringkasan berhasil diunduh");
      } else if (exportType === "contract" && selectedContract) {
        exportContractReport(
          selectedContract.contract,
          selectedContract.customerName,
          selectedContract.areaName
        );
        showSuccessToast("Laporan kontrak berhasil diunduh");
      } else {
        // Detail export to Excel
        const filteredData =
          scope === "customer" && selectedCustomerId
            ? data.filter((c) => c.id === selectedCustomerId)
            : data;

        exportToExcel(filteredData, {
          format: "excel",
          scope,
          year,
          customerId: scope === "customer" ? selectedCustomerId : undefined,
          includeTimeline,
          includeSignatures,
          includeNotes,
        });
        showSuccessToast("Data berhasil diekspor ke Excel");
      }
      onOpenChange(false);
    } catch (error) {
      console.error("Export error:", error);
      showErrorToast(error, "Gagal mengekspor data");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileDown className="h-5 w-5" />
            Export Laporan
          </DialogTitle>
          <DialogDescription>
            Pilih format dan jenis laporan yang ingin diunduh.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Export Type */}
          <div className="space-y-3">
            <Label>Jenis Laporan</Label>
            <RadioGroup
              value={exportType}
              onValueChange={(v) => setExportType(v as typeof exportType)}
              className="grid gap-2"
            >
              <div className="flex items-center space-x-3 rounded-lg border p-3 hover:bg-muted/50">
                <RadioGroupItem value="summary" id="summary" />
                <div className="flex-1">
                  <Label
                    htmlFor="summary"
                    className="flex items-center gap-2 cursor-pointer"
                  >
                    <FileText className="h-4 w-4 text-blue-500" />
                    Ringkasan Progress
                  </Label>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Overview progress semua customer & kontrak (TXT)
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-3 rounded-lg border p-3 hover:bg-muted/50">
                <RadioGroupItem value="detail" id="detail" />
                <div className="flex-1">
                  <Label
                    htmlFor="detail"
                    className="flex items-center gap-2 cursor-pointer"
                  >
                    <FileSpreadsheet className="h-4 w-4 text-emerald-500" />
                    Data Detail
                  </Label>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Semua data progress per bulan (Excel/CSV)
                  </p>
                </div>
              </div>

              {selectedContract && (
                <div className="flex items-center space-x-3 rounded-lg border p-3 hover:bg-muted/50 border-primary">
                  <RadioGroupItem value="contract" id="contract" />
                  <div className="flex-1">
                    <Label
                      htmlFor="contract"
                      className="flex items-center gap-2 cursor-pointer"
                    >
                      <FileText className="h-4 w-4 text-amber-500" />
                      Laporan Kontrak
                    </Label>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Timeline detail untuk: {selectedContract.contract.name}
                    </p>
                  </div>
                </div>
              )}
            </RadioGroup>
          </div>

          {/* Scope selection for detail export */}
          {exportType === "detail" && (
            <>
              <Separator />
              <div className="space-y-3">
                <Label>Cakupan Data</Label>
                <Select
                  value={scope}
                  onValueChange={(v) => setScope(v as ExportScope)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih cakupan" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Semua Data</SelectItem>
                    <SelectItem value="customer">Per Customer</SelectItem>
                  </SelectContent>
                </Select>

                {scope === "customer" && (
                  <Select
                    value={selectedCustomerId}
                    onValueChange={setSelectedCustomerId}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih customer" />
                    </SelectTrigger>
                    <SelectContent>
                      {data.map((customer) => (
                        <SelectItem key={customer.id} value={customer.id}>
                          {customer.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>

              <Separator />

              <div className="space-y-3">
                <Label>Kolom yang Disertakan</Label>
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="includeTimeline"
                      checked={includeTimeline}
                      onCheckedChange={(c) => setIncludeTimeline(c === true)}
                    />
                    <Label
                      htmlFor="includeTimeline"
                      className="text-sm cursor-pointer"
                    >
                      Waktu Update Terakhir
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="includeSignatures"
                      checked={includeSignatures}
                      onCheckedChange={(c) => setIncludeSignatures(c === true)}
                    />
                    <Label
                      htmlFor="includeSignatures"
                      className="text-sm cursor-pointer"
                    >
                      Detail Tanda Tangan
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="includeNotes"
                      checked={includeNotes}
                      onCheckedChange={(c) => setIncludeNotes(c === true)}
                    />
                    <Label
                      htmlFor="includeNotes"
                      className="text-sm cursor-pointer"
                    >
                      Catatan
                    </Label>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Batal
          </Button>
          <Button onClick={handleExport} disabled={isExporting}>
            {isExporting ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Download className="mr-2 h-4 w-4" />
            )}
            {isExporting ? "Mengekspor..." : "Export"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
