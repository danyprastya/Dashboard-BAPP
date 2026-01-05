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
import {
  MONTH_NAMES,
  parsePeriodToNumber,
  getPeriodMonths,
} from "@/types/database";
import {
  Info,
  Trash2,
  Loader2,
  Pencil,
  CheckCircle2,
  XCircle,
  FileUp,
  Eye,
} from "lucide-react";
import { EditContractDialog } from "./edit-contract-dialog";
import { FilePreviewDialog } from "./file-preview-dialog";
import { parseFileUrl } from "@/lib/file-preview";

interface BAPPTableProps {
  data: CustomerWithAreas[];
  filters: DashboardFilters;
  isLoading: boolean;
  isAdmin?: boolean;
  onProgressUpdate?: () => void;
  year?: number;
  showPercentage?: boolean;
}

export function BAPPTable({
  data,
  filters,
  isLoading,
  isAdmin = false,
  onProgressUpdate,
  year = new Date().getFullYear(),
  showPercentage = true,
}: BAPPTableProps) {
  const [selectedProgress, setSelectedProgress] =
    useState<MonthlyProgressDetail | null>(null);
  const [selectedContract, setSelectedContract] =
    useState<ContractWithProgress | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [contractToDelete, setContractToDelete] =
    useState<ContractWithProgress | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [contractToEdit, setContractToEdit] =
    useState<ContractWithProgress | null>(null);
  const [editCustomerName, setEditCustomerName] = useState("");
  const [editAreaName, setEditAreaName] = useState("");
  const [progressCustomerName, setProgressCustomerName] = useState("");
  const [progressAreaName, setProgressAreaName] = useState("");
  const [previewDialogOpen, setPreviewDialogOpen] = useState(false);
  const [previewUrl, setPreviewUrl] = useState("");
  const [previewTitle, setPreviewTitle] = useState("");
  const [previewDescription, setPreviewDescription] = useState("");

  // Handler for opening file preview dialog
  const handlePreviewClick = (
    url: string,
    contractName: string,
    monthName: string,
    e: React.MouseEvent
  ) => {
    e.stopPropagation();
    setPreviewUrl(url);
    setPreviewTitle(`Dokumen - ${monthName}`);
    setPreviewDescription(contractName);
    setPreviewDialogOpen(true);
  };

  // Handler for opening edit contract dialog
  const handleEditClick = (
    contract: ContractWithProgress,
    customerName: string,
    areaName: string
  ) => {
    setContractToEdit(contract);
    setEditCustomerName(customerName);
    setEditAreaName(areaName);
    setEditDialogOpen(true);
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
    contract: ContractWithProgress,
    customerName: string,
    areaName: string
  ) => {
    setSelectedProgress(progress);
    setSelectedContract(contract);
    setProgressCustomerName(customerName);
    setProgressAreaName(areaName);
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
            <span className="text-muted-foreground font-medium">
              Keterangan:
            </span>
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
                  <span className="text-muted-foreground">
                    {row.contract.period}
                  </span>
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
                                handleProgressClick(progress, row.contract, row.customer.name, row.area.name)
                              }
                              className={`flex h-8 w-full items-center justify-center rounded text-xs font-medium transition-all hover:ring-2 hover:ring-primary/50 ${getProgressColorClass(
                                progress.percentage
                              )}`}
                            >
                              {showPercentage
                                ? `${progress.percentage}%`
                                : progress.percentage === 100
                                ? "✓"
                                : progress.percentage > 0
                                ? "○"
                                : ""}
                            </button>
                          </TooltipTrigger>
                          <TooltipContent className="max-w-sm">
                            {/* Progress & Status */}
                            <div className="flex items-center justify-between gap-4 text-sm">
                              <p className="font-medium">
                                {progress.completed_items}/
                                {progress.total_items} item selesai
                              </p>
                              <Badge
                                variant={
                                  status === "Selesai"
                                    ? "outline"
                                    : status === "Proses"
                                    ? "outline"
                                    : "outline"
                                }
                                className="text-xs text-white"
                              >
                                {status}
                              </Badge>
                            </div>

                            {/* Notes with timestamp */}
                            {progress.notes && (
                              <div className="mt-2 border-t pt-2">
                                <p className="text-xs font-medium text-slate">
                                  Catatan:
                                </p>
                                <p className="text-sm">{progress.notes}</p>
                                {progress.notes_updated_at && (
                                  <p className="mt-1 text-xs text-slate">
                                    Diupdate:{" "}
                                    {formatTimestamp(progress.notes_updated_at)}
                                  </p>
                                )}
                              </div>
                            )}

                            {/* Upload Document Status */}
                            <div className="mt-2 border-t pt-2">
                              <p className="text-sm font-medium text-slate mb-1">
                                Status Upload Dokumen:
                              </p>
                              <div className="flex items-center gap-2 text-xs">
                                {progress.is_upload_completed ? (
                                  <>
                                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                                    <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                                      Sudah diupload
                                    </span>
                                  </>
                                ) : (
                                  <>
                                    <XCircle className="h-4 w-4 text-red-500" />
                                    <span className="text-slate">
                                      Belum diupload
                                    </span>
                                  </>
                                )}
                                {progress.upload_link && (
                                  <>
                                    {parseFileUrl(progress.upload_link).canEmbed && (
                                      <button
                                        onClick={(e) => handlePreviewClick(
                                          progress.upload_link!,
                                          row.contract.name,
                                          `${MONTH_NAMES[progress.month - 1]} ${year}`,
                                          e
                                        )}
                                        className="ml-auto text-blue-500 hover:underline flex items-center gap-1"
                                      >
                                        <Eye className="h-3 w-3" />
                                        Preview
                                      </button>
                                    )}
                                    <a
                                      href={progress.upload_link}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className={`${parseFileUrl(progress.upload_link).canEmbed ? '' : 'ml-auto'} text-blue-500 hover:underline flex items-center gap-1`}
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      <FileUp className="h-3 w-3" />
                                      Buka
                                    </a>
                                  </>
                                )}
                              </div>
                            </div>

                            {/* Signatures Status */}
                            <div className="my-2 border-y py-2">
                              <p className="text-sm font-medium text-slate mb-1">
                                Status Tanda Tangan (
                                {completedSignatures.length}/
                                {progress.signatures.length}):
                              </p>
                              <ul className="space-y-1">
                                {progress.signatures.map((sig) => (
                                  <li
                                    key={sig.id || sig.name}
                                    className="text-xs flex items-center gap-2"
                                  >
                                    {sig.is_completed ? (
                                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                                    ) : (
                                      <XCircle className="h-3.5 w-3.5 text-red-500 shrink-0" />
                                    )}
                                    <span
                                      className={
                                        sig.is_completed
                                          ? "font-medium"
                                          : "text-slate"
                                      }
                                    >
                                      {sig.name}
                                    </span>
                                    {sig.is_completed && sig.completed_at && (
                                      <span className="text-slate text-xs ml-auto">
                                        {formatTimestamp(sig.completed_at)}
                                      </span>
                                    )}
                                  </li>
                                ))}
                              </ul>
                            </div>

                            {/* Last updated */}
                            {progress.updated_at && (
                              <p className="mt-2 text-xs text-slate">
                                Update terakhir:{" "}
                                {formatTimestamp(progress.updated_at)}
                              </p>
                            )}

                            <p className="mt-1 text-xs text-muted-foreground text-center">
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

                {/* Actions */}
                {isAdmin && (
                  <td className="px-2 py-2 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-primary"
                            onClick={() =>
                              handleEditClick(
                                row.contract,
                                row.customer.name,
                                row.area.name
                              )
                            }
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Edit kontrak</p>
                        </TooltipContent>
                      </Tooltip>
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
                    </div>
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
        customerName={progressCustomerName}
        areaName={progressAreaName}
      />

      {/* Edit Contract Dialog */}
      <EditContractDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        contract={contractToEdit}
        customerName={editCustomerName}
        areaName={editAreaName}
        onSave={() => onProgressUpdate?.()}
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

      {/* File Preview Dialog */}
      <FilePreviewDialog
        open={previewDialogOpen}
        onOpenChange={setPreviewDialogOpen}
        url={previewUrl}
        title={previewTitle}
        description={previewDescription}
      />
    </TooltipProvider>
  );
}
