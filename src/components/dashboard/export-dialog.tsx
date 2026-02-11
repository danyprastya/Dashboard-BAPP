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
import type { CustomerWithAreas } from "@/types/database";
import { exportToExcel, exportToTxt, type ExportFormat } from "@/lib/export";
import { showSuccessToast, showErrorToast } from "@/lib/toast";

interface ExportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  data: CustomerWithAreas[];
  year: number;
}

export function ExportDialog({
  open,
  onOpenChange,
  data,
  year,
}: ExportDialogProps) {
  const [isExporting, setIsExporting] = useState(false);
  const [format, setFormat] = useState<ExportFormat>("excel");
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>("all");

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const selectedCustomer =
        selectedCustomerId !== "all"
          ? data.find((c) => c.id === selectedCustomerId)
          : null;

      const customerName = selectedCustomer?.name;

      if (format === "excel") {
        await exportToExcel(data, {
          format: "excel",
          scope: selectedCustomerId === "all" ? "all" : "customer",
          year,
          customerName,
        });
        showSuccessToast("Data berhasil diekspor ke Excel");
      } else {
        exportToTxt(data, {
          format: "txt",
          scope: selectedCustomerId === "all" ? "all" : "customer",
          year,
          customerName,
        });
        showSuccessToast("Data berhasil diekspor ke TXT");
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
            Pilih format dan data yang ingin diunduh.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Format Selection */}
          <div className="space-y-3">
            <Label>Format File</Label>
            <RadioGroup
              value={format}
              onValueChange={(v) => setFormat(v as ExportFormat)}
              className="grid gap-2"
            >
              <div className="flex items-center space-x-3 rounded-lg border p-3 hover:bg-muted/50">
                <RadioGroupItem value="excel" id="excel" />
                <div className="flex-1">
                  <Label
                    htmlFor="excel"
                    className="flex items-center gap-2 cursor-pointer"
                  >
                    <FileSpreadsheet className="h-4 w-4 text-emerald-500" />
                    Excel (.xlsx)
                  </Label>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Format tabel dengan cell merging untuk customer dan kontrak
                    yang sama
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-3 rounded-lg border p-3 hover:bg-muted/50">
                <RadioGroupItem value="txt" id="txt" />
                <div className="flex-1">
                  <Label
                    htmlFor="txt"
                    className="flex items-center gap-2 cursor-pointer"
                  >
                    <FileText className="h-4 w-4 text-blue-500" />
                    Text (.txt)
                  </Label>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Format teks sederhana untuk dokumentasi
                  </p>
                </div>
              </div>
            </RadioGroup>
          </div>

          <Separator />

          {/* Customer Selection */}
          <div className="space-y-3">
            <Label>Data Customer</Label>
            <Select
              value={selectedCustomerId}
              onValueChange={setSelectedCustomerId}
            >
              <SelectTrigger>
                <SelectValue placeholder="Pilih customer" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Customer</SelectItem>
                {data.map((customer) => (
                  <SelectItem key={customer.id} value={customer.id}>
                    {customer.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Pilih customer tertentu atau ekspor semua data sekaligus.
            </p>
          </div>
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
