"use client";

import { useState, useMemo } from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { ProgressDialog } from "./progress-dialog";
import {
  getProgressColorClass,
  getStatusColorClass,
} from "@/lib/placeholder-data";
import type {
  CustomerWithAreas,
  DashboardFilters,
  MonthlyProgressDetail,
  ContractWithProgress,
} from "@/types/database";
import { MONTH_NAMES } from "@/types/database";
import { Check, Minus, FileText } from "lucide-react";

interface BAPPTableProps {
  data: CustomerWithAreas[];
  filters: DashboardFilters;
  isLoading?: boolean;
}

interface ProgressCellProps {
  progress: MonthlyProgressDetail;
  contractName: string;
  onClick: () => void;
}

function ProgressCell({ progress, contractName, onClick }: ProgressCellProps) {
  const hasProgress = progress.percentage > 0;
  const isComplete = progress.percentage === 100;

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={onClick}
            className={`flex h-10 w-full min-w-[48px] items-center justify-center rounded-md border transition-all hover:scale-105 hover:shadow-sm ${getProgressColorClass(
              progress.percentage
            )}`}
          >
            {isComplete ? (
              <Check className="h-4 w-4" />
            ) : hasProgress ? (
              <span className="text-xs font-medium">
                {progress.percentage}%
              </span>
            ) : (
              <Minus className="h-3 w-3 opacity-50" />
            )}
          </button>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs">
          <div className="space-y-1">
            <p className="font-medium">{contractName}</p>
            <p className="text-xs text-muted-foreground">
              Progress: {progress.percentage}%
            </p>
            <p className="text-xs">Klik untuk melihat detail</p>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export function BAPPTable({ data, filters, isLoading }: BAPPTableProps) {
  const [selectedProgress, setSelectedProgress] =
    useState<MonthlyProgressDetail | null>(null);
  const [selectedContractName, setSelectedContractName] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);

  // Filter data based on filters
  const filteredData = useMemo(() => {
    return data
      .map((customer) => {
        // Filter by customer if specified
        if (filters.customer_id && customer.id !== filters.customer_id) {
          return null;
        }

        const filteredAreas = customer.areas
          .map((area) => {
            const filteredContracts = area.contracts.filter((contract) => {
              // Search filter
              if (filters.search) {
                const searchLower = filters.search.toLowerCase();
                const matchesSearch =
                  contract.name.toLowerCase().includes(searchLower) ||
                  customer.name.toLowerCase().includes(searchLower) ||
                  area.name.toLowerCase().includes(searchLower);
                if (!matchesSearch) return false;
              }

              // Invoice type filter
              if (
                filters.invoice_type &&
                contract.invoice_type !== filters.invoice_type
              ) {
                return false;
              }

              // Status filter
              if (filters.status !== "all") {
                if (contract.yearly_status !== filters.status) {
                  return false;
                }
              }

              return true;
            });

            if (filteredContracts.length === 0) return null;

            return { ...area, contracts: filteredContracts };
          })
          .filter(Boolean);

        if (filteredAreas.length === 0) return null;

        return { ...customer, areas: filteredAreas };
      })
      .filter(Boolean) as CustomerWithAreas[];
  }, [data, filters]);

  const handleCellClick = (
    progress: MonthlyProgressDetail,
    contractName: string
  ) => {
    setSelectedProgress(progress);
    setSelectedContractName(contractName);
    setDialogOpen(true);
  };

  // Calculate row numbers
  let rowNumber = 0;

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">Memuat data...</p>
        </div>
      </div>
    );
  }

  if (filteredData.length === 0) {
    return (
      <div className="flex h-64 flex-col items-center justify-center rounded-lg border border-dashed">
        <FileText className="h-12 w-12 text-muted-foreground/50" />
        <p className="mt-4 text-lg font-medium">Tidak ada data</p>
        <p className="text-sm text-muted-foreground">
          Coba ubah filter pencarian Anda
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="relative overflow-hidden rounded-lg border">
        <div className="overflow-auto max-h-[calc(100vh-280px)]">
          <table className="w-full border-collapse text-sm">
            {/* Header */}
            <thead className="sticky top-0 z-20 bg-neutral-100 dark:bg-neutral-900">
              <tr>
                <th
                  className="sticky left-0 z-30 min-w-[50px] border-b border-r bg-neutral-100 px-3 py-3 text-center font-semibold dark:bg-neutral-900"
                  rowSpan={2}
                >
                  NO
                </th>
                <th
                  className="sticky left-[50px] z-30 min-w-[120px] border-b border-r bg-neutral-100 px-3 py-3 text-left font-semibold dark:bg-neutral-900"
                  rowSpan={2}
                >
                  CUSTOMER
                </th>
                <th
                  className="sticky left-[170px] z-30 min-w-[280px] border-b border-r bg-neutral-100 px-3 py-3 text-left font-semibold dark:bg-neutral-900"
                  colSpan={2}
                >
                  NAMA CHEKLIST / BA / BAPP
                </th>
                <th
                  className="min-w-[80px] border-b border-r bg-neutral-100 px-3 py-3 text-center font-semibold dark:bg-neutral-900"
                  rowSpan={2}
                >
                  PERIODE
                </th>
                <th
                  className="border-b bg-neutral-100 px-3 py-3 text-center font-semibold dark:bg-neutral-900"
                  colSpan={12}
                >
                  BULAN
                </th>
                <th
                  className="border-b border-l bg-neutral-100 px-3 py-3 text-center font-semibold dark:bg-neutral-900"
                  colSpan={2}
                >
                  INVOICE
                </th>
                <th
                  className="min-w-[150px] border-b border-l bg-neutral-100 px-3 py-3 text-left font-semibold dark:bg-neutral-900"
                  rowSpan={2}
                >
                  KETERANGAN
                </th>
              </tr>
              <tr>
                <th className="sticky left-[170px] z-30 min-w-[40px] border-b border-r bg-neutral-100 px-2 py-2 text-center text-xs font-medium dark:bg-neutral-900">
                  &nbsp;
                </th>
                <th className="sticky left-[210px] z-30 min-w-[240px] border-b border-r bg-neutral-100 px-2 py-2 text-left text-xs font-medium dark:bg-neutral-900">
                  Nama
                </th>
                {MONTH_NAMES.map((month) => (
                  <th
                    key={month}
                    className="min-w-[52px] border-b border-r bg-neutral-100 px-1 py-2 text-center text-xs font-medium dark:bg-neutral-900"
                  >
                    {month}
                  </th>
                ))}
                <th className="min-w-[90px] border-b border-r bg-neutral-100 px-2 py-2 text-center text-xs font-medium dark:bg-neutral-900">
                  REG / PUSAT
                </th>
                <th className="min-w-[60px] border-b bg-neutral-100 px-2 py-2 text-center text-xs font-medium dark:bg-neutral-900">
                  CHECK
                </th>
              </tr>
            </thead>

            {/* Body */}
            <tbody>
              {filteredData.map((customer) => {
                const totalContracts = customer.areas.reduce(
                  (sum, area) => sum + area.contracts.length,
                  0
                );
                let isFirstCustomerRow = true;

                return customer.areas.flatMap((area) =>
                  area.contracts.map((contract, contractIndex) => {
                    rowNumber++;
                    const isFirstInArea = contractIndex === 0;
                    const showCustomer = isFirstCustomerRow;
                    if (isFirstCustomerRow) isFirstCustomerRow = false;

                    // Calculate yearly completion
                    const yearlyProgress = Math.round(
                      contract.monthly_progress.reduce(
                        (sum, m) => sum + m.percentage,
                        0
                      ) / 12
                    );

                    return (
                      <tr
                        key={contract.id}
                        className="border-b transition-colors hover:bg-muted/50"
                      >
                        {/* Row Number */}
                        <td className="sticky left-0 z-10 border-r bg-background px-3 py-2 text-center font-medium">
                          {showCustomer ? rowNumber : ""}
                        </td>

                        {/* Customer */}
                        <td className="sticky left-[50px] z-10 border-r bg-background px-3 py-2 font-medium">
                          {showCustomer && (
                            <span className="inline-block max-w-[100px] truncate">
                              {customer.name}
                            </span>
                          )}
                        </td>

                        {/* Area Code */}
                        <td className="sticky left-[170px] z-10 border-r bg-background px-2 py-2 text-center text-xs">
                          {area.code}
                        </td>

                        {/* Contract Name */}
                        <td className="sticky left-[210px] z-10 border-r bg-background px-2 py-2">
                          <span className="inline-block max-w-[230px] truncate text-xs">
                            {contract.name}
                          </span>
                        </td>

                        {/* Period */}
                        <td className="border-r px-2 py-2 text-center text-xs">
                          {contract.period}
                        </td>

                        {/* Monthly Progress Cells */}
                        {contract.monthly_progress.map(
                          (progress, monthIndex) => (
                            <td key={monthIndex} className="border-r px-1 py-1">
                              <ProgressCell
                                progress={progress}
                                contractName={contract.name}
                                onClick={() =>
                                  handleCellClick(progress, contract.name)
                                }
                              />
                            </td>
                          )
                        )}

                        {/* Invoice Type */}
                        <td className="border-r px-2 py-2 text-center">
                          <Badge
                            variant="secondary"
                            className={`text-xs ${
                              contract.invoice_type === "Pusat"
                                ? "bg-neutral-100 dark:bg-neutral-800"
                                : contract.invoice_type === "Regional 2"
                                ? "bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300"
                                : "bg-purple-50 text-purple-700 dark:bg-purple-950 dark:text-purple-300"
                            }`}
                          >
                            {contract.invoice_type}
                          </Badge>
                        </td>

                        {/* Yearly Status Check */}
                        <td className="border-r px-2 py-2 text-center">
                          <div
                            className={`mx-auto flex h-7 w-7 items-center justify-center rounded ${getStatusColorClass(
                              contract.yearly_status
                            )}`}
                          >
                            {contract.yearly_status === "completed" ? (
                              <Check className="h-4 w-4" />
                            ) : (
                              <span className="text-xs font-medium">
                                {yearlyProgress}%
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Notes */}
                        <td className="px-3 py-2 text-xs text-muted-foreground">
                          {contract.notes && (
                            <span className="inline-block max-w-[140px] truncate">
                              {contract.notes}
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Progress Dialog */}
      <ProgressDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        progress={selectedProgress}
        contractName={selectedContractName}
      />
    </>
  );
}
