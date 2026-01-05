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
import { MONTH_NAMES, parsePeriodToNumber, getPeriodMonths } from "@/types/database";
import { Info, Trash2, Loader2, Pencil } from "lucide-react";
import { EditPeriodDialog } from "./edit-period-dialog";

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
  const [periodDialogOpen, setPeriodDialogOpen] = useState(false);
  const [contractToEditPeriod, setContractToEditPeriod] = useState<ContractWithProgress | null>(null);

  // Handler for opening period edit dialog
  const handleEditPeriodClick = (contract: ContractWithProgress) => {
    setContractToEditPeriod(contract);
    setPeriodDialogOpen(true);
  };

  // Filter data based on filters
  const filteredData = useMemo(() => {
    return data
      .map((customer) => {
        // Filter by customer
        if (filters.customer_id && customer.id !== filters.customer_id) {
          return null;
        }

        const filteredAreas = customer.areas
          .map((area) => {
            const filteredContracts = area.contracts.filter((contract) => {
              // Filter by search
              if (
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
      <div className="relative bg-card">
        {/* Sticky Legend - di dalam container scroll */}
        <div className="sticky top-0 z-30 bg-background border-b">
          <div className="flex flex-wrap items-center gap-4 text-sm px-4 py-3 bg-muted/50">
            <span className="text-muted-foreground font-medium">Keterangan:</span>
            <div className="flex items-center gap-1">
              <div className="h-3 w-3 rounded bg-emerald-100 dark:bg-emerald-950" />
              <span className="text-xs">100%</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="h-3 w-3 rounded bg-teal-100 dark:bg-teal-950" />
              <span className="text-xs">75-99%</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="h-3 w-3 rounded bg-amber-100 dark:bg-amber-950" />
              <span className="text-xs">50-74%</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="h-3 w-3 rounded bg-orange-100 dark:bg-orange-950" />
              <span className="text-xs">25-49%</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="h-3 w-3 rounded bg-rose-100 dark:bg-rose-950" />
              <span className="text-xs">1-24%</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="h-3 w-3 rounded bg-neutral-100 dark:bg-neutral-800" />
              <span className="text-xs">0%</span>
            </div>
            <div className="ml-auto flex items-center gap-1 text-xs text-muted-foreground">
              <Info className="h-3 w-3" />
              <span>Kontrak dengan nama sama digabung otomatis</span>
            </div>
          </div>
        </div>
        
        <table className="w-full border-collapse text-sm">
          <thead className="sticky top-10 z-20 shadow-sm">
            <tr className="border-b bg-muted">
              <th className="sticky left-0 z-30 w-12 border-r bg-muted px-3 py-3 text-center font-medium">
                NO
              </th>
              <th className="sticky left-12 z-30 w-32 border-r bg-muted px-3 py-3 text-left font-medium">
                CUSTOMER
              </th>
              <th className="sticky left-44 z-30 w-50 border-r bg-muted px-3 py-3 text-left font-medium">
                NAMA KONTRAK
              </th>
              <th className="sticky left-94 z-30 w-45 border-r bg-muted px-3 py-3 text-left font-medium">
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
                <td className="border-r px-3 py-2 text-center">
                  <div className="flex items-center justify-center gap-1">
                    <span className="text-muted-foreground">
                      {row.contract.period}
                    </span>
                    {isAdmin && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 text-muted-foreground hover:text-primary"
                            onClick={() => handleEditPeriodClick(row.contract)}
                          >
                            <Pencil className="h-3 w-3" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Edit periode</p>
                        </TooltipContent>
                      </Tooltip>
                    )}
                  </div>
                </td>

                {/* Monthly progress cells with merged cell support */}
                {(() => {
                  const periodValue = parsePeriodToNumber(row.contract.period);
                  const activeMonths = getPeriodMonths(periodValue);
                  const cells: React.ReactNode[] = [];

                  // Format timestamp helper
                  const formatTimestamp = (dateStr: string | null) => {
                    if (!dateStr) return null;
                    try {
                      const date = new Date(dateStr);
                      return date.toLocaleDateString("id-ID", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      });
                    } catch {
                      return null;
                    }
                  };

                  // Track which months we've already rendered
                  let currentMonth = 1;

                  for (const activeMonth of activeMonths) {
                    // Calculate colspan: from currentMonth to activeMonth
                    const colspan = activeMonth - currentMonth + 1;

                    // Get progress for this active month
                    const progress = row.contract.monthly_progress.find(
                      (p) => p.month === activeMonth
                    );

                    if (!progress) {
                      currentMonth = activeMonth + 1;
                      continue;
                    }

                    // Determine status
                    const status =
                      progress.percentage === 100
                        ? "Selesai"
                        : progress.percentage > 0
                        ? "Proses"
                        : "Belum";

                    // Get completed signatures
                    const completedSignatures = progress.signatures.filter(
                      (sig) => sig.is_completed
                    );

                    cells.push(
                      <td
                        key={activeMonth}
                        colSpan={colspan}
                        className="border-r px-1 py-1"
                      >
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
                          <TooltipContent className="max-w-xs">
                            {/* Progress & Status */}
                            <div className="flex items-center justify-between gap-4">
                              <p className="font-medium">
                                {progress.completed_items}/{progress.total_items}{" "}
                                item selesai
                              </p>
                              <Badge
                                variant={
                                  status === "Selesai"
                                    ? "default"
                                    : status === "Proses"
                                    ? "secondary"
                                    : "outline"
                                }
                                className="text-xs"
                              >
                                {status}
                              </Badge>
                            </div>

                            {/* Notes with timestamp */}
                            {progress.notes && (
                              <div className="mt-2 border-t pt-2">
                                <p className="text-xs font-medium text-muted-foreground">
                                  Catatan:
                                </p>
                                <p className="text-sm">{progress.notes}</p>
                                {progress.notes_updated_at && (
                                  <p className="mt-1 text-xs text-muted-foreground">
                                    Diupdate:{" "}
                                    {formatTimestamp(progress.notes_updated_at)}
                                  </p>
                                )}
                              </div>
                            )}

                            {/* Completed signatures */}
                            {completedSignatures.length > 0 && (
                              <div className="mt-2 border-t pt-2">
                                <p className="text-xs font-medium text-muted-foreground">
                                  Tanda Tangan Selesai:
                                </p>
                                <ul className="mt-1 space-y-1">
                                  {completedSignatures.map((sig) => (
                                    <li
                                      key={sig.id || sig.name}
                                      className="text-xs"
                                    >
                                      <span className="font-medium">
                                        {sig.name}
                                      </span>
                                      {sig.completed_at && (
                                        <span className="text-muted-foreground">
                                          {" "}
                                          - {formatTimestamp(sig.completed_at)}
                                        </span>
                                      )}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}

                            {/* Last updated */}
                            {progress.updated_at && (
                              <p className="mt-2 text-xs text-muted-foreground">
                                Update terakhir:{" "}
                                {formatTimestamp(progress.updated_at)}
                              </p>
                            )}

                            <p className="mt-1 text-xs text-muted-foreground">
                              Klik untuk detail
                            </p>
                          </TooltipContent>
                        </Tooltip>
                      </td>
                    );

                    currentMonth = activeMonth + 1;
                  }

                  return cells;
                })()}

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

      {/* Edit Period Dialog */}
      <EditPeriodDialog
        open={periodDialogOpen}
        onOpenChange={setPeriodDialogOpen}
        contract={contractToEditPeriod}
        onPeriodUpdate={onProgressUpdate}
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
