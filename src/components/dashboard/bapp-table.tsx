"use client";

import { useState, useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ProgressDialog } from "./progress-dialog";
import { TableLoadingSkeleton } from "@/components/ui/loading";
import {
  getProgressColorClass,
  getStatusColorClass,
} from "@/lib/placeholder-data";
import { deleteContract } from "@/lib/supabase/data";
import { isSupabaseConfigured } from "@/lib/supabase/client";
import { showSuccessToast, showErrorToast } from "@/lib/toast";
import type {
  CustomerWithAreas,
  DashboardFilters,
  MonthlyProgressDetail,
  ContractWithProgress,
} from "@/types/database";
import { MONTH_NAMES } from "@/types/database";
import { Info, Trash2, Loader2 } from "lucide-react";

interface BAPPTableProps {
  data: CustomerWithAreas[];
  filters: DashboardFilters;
  isLoading: boolean;
  isAdmin?: boolean;
  onProgressUpdate?: () => void;
  year?: number;
}

export function BAPPTable({
  data,
  filters,
  isLoading,
  isAdmin = false,
  onProgressUpdate,
  year = new Date().getFullYear(),
}: BAPPTableProps) {
  const [selectedProgress, setSelectedProgress] = useState<MonthlyProgressDetail | null>(null);
  const [selectedContract, setSelectedContract] = useState<ContractWithProgress | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [contractToDelete, setContractToDelete] = useState<ContractWithProgress | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // --- PATCH: Responsive sticky header & progress info ---
  // Wrapper: progress info + table header sticky in one scrollable parent
  return (
    <div className="relative bg-card h-full flex flex-col overflow-auto">
      {/* Sticky Progress Info */}
      <div className="sticky top-0 z-30 bg-background border-b border-muted py-2 px-4 flex flex-col gap-1">
        {/* ... Progress color legend ... */}
        <div className="flex flex-wrap items-center gap-2 text-xs font-medium mb-1">
          Keterangan Progress:
          <span className="inline-flex items-center gap-1"><span className="inline-block w-3 h-3 rounded bg-emerald-200" /> 100%</span>
          <span className="inline-flex items-center gap-1"><span className="inline-block w-3 h-3 rounded bg-emerald-100" /> 75-99%</span>
          <span className="inline-flex items-center gap-1"><span className="inline-block w-3 h-3 rounded bg-amber-100" /> 50-74%</span>
          <span className="inline-flex items-center gap-1"><span className="inline-block w-3 h-3 rounded bg-orange-100" /> 25-49%</span>
          <span className="inline-flex items-center gap-1"><span className="inline-block w-3 h-3 rounded bg-rose-100" /> 1-24%</span>
          <span className="inline-flex items-center gap-1"><span className="inline-block w-3 h-3 rounded bg-muted" /> 0%</span>
        </div>
        <div className="text-xs text-muted-foreground flex items-center gap-2">
          <span>Kontrak dengan nama yang sama akan digabung barisnya secara otomatis</span>
        </div>
      </div>
      {/* Table scrollable area */}
      <div className="flex-1 overflow-auto">
        {/* ...existing table rendering code... */}
      </div>
    </div>
  );
  // --- END PATCH ---

  // ...existing code (filteredData, etc)...
  // (Pindahkan seluruh table rendering ke dalam <div className="flex-1 overflow-auto">)
                filters.search &&
                !contract.name
                  .toLowerCase()
                  .includes(filters.search.toLowerCase()) &&
                !customer.name
                  .toLowerCase()
                  .includes(filters.search.toLowerCase())
              ) {
                return false;
              }

              // Filter by invoice type
              if (
                filters.invoice_type &&
                contract.invoice_type !== filters.invoice_type
              ) {
                return false;
              }

              // Filter by status
              if (
                filters.status !== "all" &&
                contract.yearly_status !== filters.status
              ) {
                return false;
              }

              return true;
            });

            return { ...area, contracts: filteredContracts };
          })
          .filter((area) => area.contracts.length > 0);

        if (filteredAreas.length === 0) return null;

        return { ...customer, areas: filteredAreas };
      })
      .filter(Boolean) as CustomerWithAreas[];
  }, [data, filters]);

  // Flatten data for easier row merging calculation
  type FlatRow = {
    customer: CustomerWithAreas;
    area: CustomerWithAreas["areas"][0];
    contract: ContractWithProgress;
    rowNumber: number;
    isFirstInCustomer: boolean;
    customerRowSpan: number;
    isFirstInContractGroup: boolean;
    contractRowSpan: number;
  };

  const flattenedRows = useMemo(() => {
    const rows: FlatRow[] = [];
    let rowNum = 0;

    filteredData.forEach((customer) => {
      // Collect all contracts from all areas for this customer
      const allContractsInCustomer: {
        area: CustomerWithAreas["areas"][0];
        contract: ContractWithProgress;
      }[] = [];

      customer.areas.forEach((area) => {
        area.contracts.forEach((contract) => {
          allContractsInCustomer.push({ area, contract });
        });
      });

      // Sort by contract name to group same contracts together
      allContractsInCustomer.sort((a, b) =>
        a.contract.name.localeCompare(b.contract.name)
      );

      const totalContractsInCustomer = allContractsInCustomer.length;
      let isFirstInCustomer = true;

      allContractsInCustomer.forEach(({ area, contract }) => {
        rowNum++;
        rows.push({
          customer,
          area,
          contract,
          rowNumber: rowNum,
          isFirstInCustomer,
          customerRowSpan: totalContractsInCustomer,
          isFirstInContractGroup: false, // Will be calculated below
          contractRowSpan: 1, // Will be calculated below
        });
        isFirstInCustomer = false;
      });
    });

    // Calculate contract name grouping within each customer
    // Group rows with same contract name (now they are consecutive due to sorting)
    let i = 0;
    while (i < rows.length) {
      const currentCustomerId = rows[i].customer.id;
      const currentContractName = rows[i].contract.name;

      // Find all rows with same customer and contract name
      let groupSize = 1;
      while (
        i + groupSize < rows.length &&
        rows[i + groupSize].customer.id === currentCustomerId &&
        rows[i + groupSize].contract.name === currentContractName
      ) {
        groupSize++;
      }

      // Mark first row in group
      rows[i].isFirstInContractGroup = true;
      rows[i].contractRowSpan = groupSize;

      i += groupSize;
    }

    return rows;
  }, [filteredData]);

  // Handle progress cell click
  const handleProgressClick = (
    progress: MonthlyProgressDetail,
    contract: ContractWithProgress
  ) => {
    setSelectedProgress(progress);
    setSelectedContract(contract);
    setDialogOpen(true);
  };

  // Handle delete button click
  const handleDeleteClick = (contract: ContractWithProgress) => {
    setContractToDelete(contract);
    setDeleteDialogOpen(true);
  };

  // Handle delete confirmation
  const handleDeleteConfirm = async () => {
    if (!contractToDelete) return;

    setIsDeleting(true);
    try {
      if (isSupabaseConfigured()) {
        await deleteContract(contractToDelete.id);
      }
      showSuccessToast("Kontrak berhasil dihapus", {
        description: contractToDelete.name,
      });
      setDeleteDialogOpen(false);
      setContractToDelete(null);
      onProgressUpdate?.();
    } catch (error) {
      console.error("Error deleting contract:", error);
      showErrorToast(error, "Gagal Menghapus Kontrak");
    } finally {
      setIsDeleting(false);
    }
  };

  if (isLoading) {
    return <TableLoadingSkeleton rows={8} />;
  }

  if (filteredData.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-12 text-center">
        <Info className="mb-4 h-12 w-12 text-muted-foreground" />
        <h3 className="text-lg font-medium">Tidak ada data</h3>
        <p className="text-sm text-muted-foreground">
          Tidak ada kontrak yang sesuai dengan filter yang dipilih.
        </p>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="relative bg-card h-full overflow-auto">
        <table className="w-full border-collapse text-sm">
          <thead className="sticky top-0 z-30">
            <tr className="border-b bg-muted">
              <th className="sticky left-0 z-40 w-12 border-r bg-muted px-3 py-3 text-center font-medium">
                NO
              </th>
              <th className="sticky left-12 z-40 w-32 border-r bg-muted px-3 py-3 text-left font-medium">
                CUSTOMER
              </th>
              <th className="sticky left-44 z-40 w-[200px] border-r bg-muted px-3 py-3 text-left font-medium">
                NAMA KONTRAK
              </th>
              <th className="sticky left-[calc(11rem+200px)] z-40 w-[180px] border-r bg-muted px-3 py-3 text-left font-medium">
                AREA
              </th>
              <th className="w-20 border-r bg-muted px-3 py-3 text-center font-medium">
                PERIODE
              </th>
              {MONTH_NAMES.map((month) => (
                <th
                  key={month}
                  className="w-16 border-r bg-muted px-2 py-3 text-center font-medium"
                >
                  {month}
                </th>
              ))}
              <th className="w-24 border-r bg-muted px-3 py-3 text-center font-medium">
                REG / PUSAT
              </th>
              <th className="w-20 bg-muted px-3 py-3 text-center font-medium">
                STATUS
              </th>
              {isAdmin && (
                <th className="w-16 bg-muted px-3 py-3 text-center font-medium">
                  AKSI
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {flattenedRows.map((row) => (
              <tr
                key={row.contract.id + "-" + row.area.id}
                className="border transition-colors hover:bg-muted/30"
              >
                {/* Row number - sticky */}
                <td className="sticky left-0 z-10 border-r bg-background px-3 py-2 text-center font-medium">
                  {row.rowNumber}
                </td>

                {/* Customer name - sticky with rowspan */}
                {row.isFirstInCustomer && (
                  <td
                    rowSpan={row.customerRowSpan}
                    className="sticky left-0 z-10 border bg-background px-3 py-2 font-medium align-middle"
                  >
                    {row.customer.name}
                  </td>
                )}

                {/* Contract name - sticky with rowspan for same names */}
                {row.isFirstInContractGroup && (
                  <td
                    rowSpan={row.contractRowSpan}
                    className="sticky left-0 z-10 w-50 border bg-background px-3 py-2 align-middle"
                  >
                    <div className="w-45">
                      <div className="font-medium wrap-break-word">
                        {row.contract.name}
                      </div>
                      {row.contract.notes && (
                        <div className="mt-1 text-xs text-muted-foreground wrap-break-word">
                          {row.contract.notes}
                        </div>
                      )}
                      <div className="mt-1 text-xs text-muted-foreground">
                        {row.contract.total_signatures} tanda tangan
                      </div>
                    </div>
                  </td>
                )}

                {/* Area - sticky with fixed width */}
                <td className="sticky left-0 z-10 w-45 border bg-background px-3 py-2 align-middle">
                  <div className="w-40 wrap-break-word text-muted-foreground">
                    {row.area.name}
                  </div>
                </td>

                {/* Period */}
                <td className="border-r px-3 py-2 text-center text-muted-foreground">
                  {row.contract.period}
                </td>

                {/* Monthly progress cells */}
                {row.contract.monthly_progress.map((progress) => (
                  <td key={progress.month} className="border-r px-1 py-1">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          onClick={() =>
                            handleProgressClick(progress, row.contract)
                          }
                          className={`flex h-8 w-full items-center justify-center rounded text-xs font-medium transition-all hover:ring-2 hover:ring-primary/50 ${getProgressColorClass(
                            progress.percentage
                          )}`}
                        >
                          {progress.percentage}%
                        </button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>
                          {progress.completed_items}/{progress.total_items} item
                          selesai
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Klik untuk detail
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </td>
                ))}

                {/* Invoice type */}
                <td className="border-r px-3 py-2 text-center">
                  <Badge variant="outline" className="text-xs">
                    {row.contract.invoice_type}
                  </Badge>
                </td>

                {/* Status */}
                <td className="px-3 py-2 text-center">
                  <Badge
                    className={`text-xs ${getStatusColorClass(
                      row.contract.yearly_status
                    )}`}
                  >
                    {row.contract.yearly_status === "completed"
                      ? "Selesai"
                      : row.contract.yearly_status === "in_progress"
                      ? "Proses"
                      : "Belum"}
                  </Badge>
                </td>

                {/* Delete Action */}
                {isAdmin && (
                  <td className="px-3 py-2 text-center">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-destructive"
                          onClick={() => handleDeleteClick(row.contract)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Hapus kontrak</p>
                      </TooltipContent>
                    </Tooltip>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Progress Detail Dialog with Edit capability */}
      <ProgressDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        progress={selectedProgress}
        contract={selectedContract}
        contractName={selectedContract?.name || ""}
        isAdmin={isAdmin}
        year={year}
        onProgressUpdate={onProgressUpdate}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Kontrak</AlertDialogTitle>
            <AlertDialogDescription>
              Apakah Anda yakin ingin menghapus kontrak{" "}
              <strong>&quot;{contractToDelete?.name}&quot;</strong>? Semua data
              progress dan tanda tangan terkait akan ikut terhapus. Tindakan ini
              tidak dapat dibatalkan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </TooltipProvider>
  );
}
