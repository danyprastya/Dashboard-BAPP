"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { showSuccessToast, showErrorToast, showInfoToast } from "@/lib/toast";
import {
  fetchContractsForYear,
  importContractsFromYear,
} from "@/lib/supabase/data";
import type { ContractSummary } from "@/types/database";
import {
  Download,
  Loader2,
  CheckSquare,
  Trash2,
  AlertCircle,
  Search,
} from "lucide-react";
import { Input } from "@/components/ui/input";

interface ImportYearDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentYear: number;
  onImportComplete: () => void;
}

export function ImportYearDialog({
  open,
  onOpenChange,
  currentYear,
  onImportComplete,
}: ImportYearDialogProps) {
  const [sourceYear, setSourceYear] = useState<number>(currentYear - 1);
  const [contracts, setContracts] = useState<ContractSummary[]>([]);
  const [selectedContracts, setSelectedContracts] = useState<Set<string>>(
    new Set()
  );
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Generate year options (last 5 years excluding current)
  const yearOptions = Array.from({ length: 5 }, (_, i) => currentYear - 1 - i);

  // Fetch contracts when source year changes
  useEffect(() => {
    if (open && sourceYear) {
      loadContracts();
    }
  }, [open, sourceYear]);

  // Reset when dialog closes
  useEffect(() => {
    if (!open) {
      setSelectedContracts(new Set());
      setContracts([]);
      setSearchQuery("");
    }
  }, [open]);

  // Filter contracts based on search query
  const filteredContracts = contracts.filter((contract) => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return (
      contract.name.toLowerCase().includes(query) ||
      contract.customerName.toLowerCase().includes(query) ||
      (contract.areaName && contract.areaName.toLowerCase().includes(query))
    );
  });

  const loadContracts = async () => {
    setLoading(true);
    try {
      const data = await fetchContractsForYear(sourceYear);
      setContracts(data);
      // Auto-select all by default
      setSelectedContracts(new Set(data.map((c) => c.id)));
    } catch (error) {
      showErrorToast(error, "Gagal memuat kontrak");
    } finally {
      setLoading(false);
    }
  };

  const toggleContract = (contractId: string) => {
    const newSelected = new Set(selectedContracts);
    if (newSelected.has(contractId)) {
      newSelected.delete(contractId);
    } else {
      newSelected.add(contractId);
    }
    setSelectedContracts(newSelected);
  };

  const selectAll = () => {
    setSelectedContracts(new Set(filteredContracts.map((c) => c.id)));
  };

  const selectNone = () => {
    setSelectedContracts(new Set());
  };

  const handleImport = async () => {
    if (selectedContracts.size === 0) {
      showInfoToast("Pilih minimal satu kontrak untuk diimport");
      return;
    }

    setImporting(true);
    try {
      const result = await importContractsFromYear(
        sourceYear,
        currentYear,
        Array.from(selectedContracts)
      );

      if (result.success > 0) {
        showSuccessToast(
          `${result.success} kontrak berhasil diimport ke tahun ${currentYear}`
        );
        onImportComplete();
        onOpenChange(false);
      }

      if (result.failed > 0) {
        showErrorToast(
          `${result.failed} kontrak gagal diimport: ${result.errors
            .slice(0, 3)
            .join(", ")}`,
          "Sebagian Gagal"
        );
      }
    } catch (error) {
      showErrorToast(error, "Import Gagal");
    } finally {
      setImporting(false);
    }
  };

  const formatPeriod = (period: string) => {
    const match = period?.match(/(\d+)/);
    if (!match) return period;
    const months = parseInt(match[1]);
    switch (months) {
      case 1:
        return "Per 1 Bulan";
      case 2:
        return "Per 2 Bulan";
      case 3:
        return "Per 3 Bulan";
      case 4:
        return "Per 4 Bulan";
      case 6:
        return "Per 6 Bulan";
      case 12:
        return "Per 12 Bulan";
      default:
        return period;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            Import Kontrak dari Tahun Sebelumnya
          </DialogTitle>
          <DialogDescription>
            Import kontrak dari tahun sebelumnya ke tahun {currentYear}.
            Progress dan catatan tidak akan diikutkan.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 flex-1 min-h-0">
          {/* Year Selector and Search */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex items-center gap-2">
              <Label className="whitespace-nowrap text-sm">Tahun:</Label>
              <Select
                value={sourceYear.toString()}
                onValueChange={(v) => setSourceYear(parseInt(v))}
              >
                <SelectTrigger className="w-24">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {yearOptions.map((year) => (
                    <SelectItem key={year} value={year.toString()}>
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <span className="text-muted-foreground">→</span>
              <Badge variant="secondary" className="text-sm">
                {currentYear}
              </Badge>
            </div>

            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Cari customer, kontrak, daerah..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>

          {/* Contract List */}
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              <span className="ml-2 text-muted-foreground">
                Memuat kontrak...
              </span>
            </div>
          ) : contracts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
              <AlertCircle className="h-8 w-8 mb-2" />
              <p>Tidak ada kontrak ditemukan untuk tahun {sourceYear}</p>
            </div>
          ) : (
            <>
              {/* Selection Controls */}
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  {selectedContracts.size} dari {filteredContracts.length}{" "}
                  kontrak dipilih
                  {searchQuery && ` (${contracts.length} total)`}
                </span>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={selectAll}>
                    <CheckSquare className="h-4 w-4 mr-1" />
                    Pilih Semua
                  </Button>
                  {selectedContracts.size > 0 && (
                    <Button variant="outline" size="sm" onClick={selectNone}>
                      <Trash2 className="h-4 w-4 mr-1" />
                      Hapus Pilihan
                    </Button>
                  )}
                </div>
              </div>

              {/* Scrollable Contract List */}
              <ScrollArea className="h-[400px] border rounded-md">
                <div className="p-3 space-y-2">
                  {filteredContracts.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                      <Search className="h-6 w-6 mb-2" />
                      <p className="text-sm">
                        Tidak ada kontrak yang cocok dengan "{searchQuery}"
                      </p>
                    </div>
                  ) : (
                    filteredContracts.map((contract) => (
                      <label
                        key={contract.id}
                        className="flex items-center gap-4 p-4 rounded-lg border hover:bg-muted cursor-pointer transition-colors"
                      >
                        <Checkbox
                          checked={selectedContracts.has(contract.id)}
                          onCheckedChange={() => toggleContract(contract.id)}
                          className="shrink-0"
                        />
                        <div className="flex-1 min-w-0 grid grid-cols-[1fr_auto_auto] gap-4 items-center">
                          <div className="min-w-0">
                            <div className="font-semibold truncate">
                              {contract.customerName}
                            </div>
                            <div className="text-sm text-muted-foreground truncate">
                              {contract.name}
                            </div>
                          </div>
                          <div className="text-sm text-center">
                            <Badge
                              variant="secondary"
                              className="whitespace-nowrap"
                            >
                              {formatPeriod(contract.period)}
                            </Badge>
                          </div>
                          {contract.areaName && (
                            <div className="text-sm text-muted-foreground truncate max-w-32">
                              {contract.areaName}
                            </div>
                          )}
                        </div>
                        <Badge variant="outline" className="text-xs shrink-0">
                          {contract.signatureCount} TTD
                        </Badge>
                      </label>
                    ))
                  )}
                </div>
              </ScrollArea>
            </>
          )}
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Batal
          </Button>
          <Button
            onClick={handleImport}
            disabled={importing || selectedContracts.size === 0}
          >
            {importing ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Mengimport...
              </>
            ) : (
              <>
                <Download className="h-4 w-4 mr-2" />
                Import {selectedContracts.size} Kontrak
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
