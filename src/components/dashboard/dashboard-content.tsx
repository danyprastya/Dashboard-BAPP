"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useAuth } from "@/components/providers/auth-provider";
import { useSettings } from "@/components/providers/settings-provider";
import { DashboardHeader } from "./header";
import { DashboardFiltersBar } from "./filters";
import { BAPPTable } from "./bapp-table";
import { ContractFormDialog } from "./contract-form-dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  LoadingSpinner,
  ContainerSpinner,
  TimeoutFallback,
} from "@/components/ui/loading";
import {
  generatePlaceholderData,
  calculateYearlyStatus,
} from "@/lib/placeholder-data";
import { fetchDashboardData } from "@/lib/supabase/data";
import { isSupabaseConfigured } from "@/lib/supabase/client";
import type { CustomerWithAreas, DashboardFilters } from "@/types/database";
import {
  FileText,
  CheckCircle2,
  Clock,
  AlertCircle,
  Building2,
  Plus,
  Download,
  RefreshCw,
} from "lucide-react";
import { ImportYearDialog } from "./import-year-dialog";
import { ExportDialog } from "./export-dialog";
import { logger } from "@/lib/logger";
import {
  useKeyboardShortcuts,
  KeyboardShortcutsDialog,
  SHORTCUTS,
  ShortcutHint,
} from "@/lib/keyboard-shortcuts";
import { useNotifications } from "@/components/providers/notification-provider";
import { ProgressCharts, type ChartFilter } from "./progress-charts";

export function DashboardContent() {
  const {
    loading: authLoading,
    isPlaceholderMode,
    canEdit,
    isSuperAdmin,
  } = useAuth();
  const { settings, updateSettings } = useSettings();
  const { setIsOpen: setNotificationSidebarOpen } = useNotifications();
  const [data, setData] = useState<CustomerWithAreas[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showContractDialog, setShowContractDialog] = useState(false);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [showShortcutsDialog, setShowShortcutsDialog] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const [chartFilter, setChartFilter] = useState<ChartFilter | null>(null);
  const [filters, setFilters] = useState<DashboardFilters>({
    year: new Date().getFullYear(),
    search: "",
    customer_id: null,
    area_name: null,
    period: null,
    invoice_type: null,
    status: "all",
  });

  // 5-second watchdog for auth loading — NOT a delay, just monitors if auth is stuck
  const [authTimedOut, setAuthTimedOut] = useState(false);
  useEffect(() => {
    if (!authLoading) {
      setAuthTimedOut(false);
      return;
    }
    const watchdog = setTimeout(() => setAuthTimedOut(true), 5000);
    return () => clearTimeout(watchdog);
  }, [authLoading]);

  // Role-based access: canEdit = admin or super_admin
  const isAdmin = canEdit;

  // Fetch data function
  const loadData = useCallback(
    async (silent = false) => {
      if (!silent) setIsLoading(true);

      try {
        let fetchedData: CustomerWithAreas[];

        if (isSupabaseConfigured() && !isPlaceholderMode) {
          // Fetch from Supabase
          fetchedData = await fetchDashboardData(filters.year);
        } else {
          // Use placeholder data
          fetchedData = generatePlaceholderData(filters.year);
        }

        // Update yearly status
        const dataWithStatus = fetchedData.map((customer) => ({
          ...customer,
          areas: customer.areas.map((area) => ({
            ...area,
            contracts: area.contracts.map((contract) => ({
              ...contract,
              yearly_status: calculateYearlyStatus(contract),
            })),
          })),
        }));

        setData(dataWithStatus);
        setLastRefresh(new Date());

        if (silent) {
          logger.info("Data dashboard diperbarui (auto-refresh)");
        }
      } catch (error) {
        console.error("Error loading data:", error);
        // Fallback to placeholder on error
        const placeholderData = generatePlaceholderData(filters.year);
        const dataWithStatus = placeholderData.map((customer) => ({
          ...customer,
          areas: customer.areas.map((area) => ({
            ...area,
            contracts: area.contracts.map((contract) => ({
              ...contract,
              yearly_status: calculateYearlyStatus(contract),
            })),
          })),
        }));
        setData(dataWithStatus);
      } finally {
        if (!silent) setIsLoading(false);
      }
    },
    [filters.year, isPlaceholderMode],
  );

  // Fetch data on mount and when year changes
  useEffect(() => {
    if (!authLoading) {
      loadData();
    }
  }, [authLoading, loadData]);

  // Auto-refresh effect
  useEffect(() => {
    if (!settings.autoRefresh || authLoading) return;

    const intervalMs = settings.refreshInterval * 1000;
    const intervalId = setInterval(() => {
      loadData(true); // Silent refresh
    }, intervalMs);

    return () => clearInterval(intervalId);
  }, [settings.autoRefresh, settings.refreshInterval, authLoading, loadData]);

  // Keyboard shortcuts handler
  const handleShortcutAction = useCallback(
    (action: string) => {
      switch (action) {
        case "SEARCH_FOCUS":
          // Focus search input
          const searchInput = document.querySelector(
            'input[placeholder*="Cari"]',
          ) as HTMLInputElement;
          searchInput?.focus();
          break;
        case "NEW_CONTRACT":
          setShowContractDialog(true);
          break;
        case "EXPORT":
          setShowExportDialog(true);
          break;
        case "REFRESH":
          loadData();
          break;
        case "TOGGLE_THEME":
          const nextTheme =
            settings.theme === "light"
              ? "dark"
              : settings.theme === "dark"
                ? "system"
                : "light";
          updateSettings({ theme: nextTheme });
          break;
        case "SHOW_SHORTCUTS":
          setShowShortcutsDialog(true);
          break;
        case "SHOW_NOTIFICATIONS":
          setNotificationSidebarOpen(true);
          break;
        case "PREV_YEAR":
          setFilters((prev) => ({ ...prev, year: prev.year - 1 }));
          break;
        case "NEXT_YEAR":
          setFilters((prev) => ({ ...prev, year: prev.year + 1 }));
          break;
      }
    },
    [loadData, settings.theme, updateSettings, setNotificationSidebarOpen],
  );

  useKeyboardShortcuts({ onAction: handleShortcutAction });

  // Handle progress update (refresh data)
  const handleProgressUpdate = () => {
    loadData();
  };

  // Handle contract save
  const handleContractSave = () => {
    setShowContractDialog(false);
    loadData();
  };

  // Filter data based on chart selection
  const chartFilteredData = useMemo(() => {
    if (!chartFilter) return data;

    switch (chartFilter.type) {
      case "customer":
        return data.filter((customer) => customer.id === chartFilter.value);
      case "area":
        return data
          .map((customer) => ({
            ...customer,
            areas: customer.areas.filter(
              (area) => area.id === chartFilter.value,
            ),
          }))
          .filter((customer) => customer.areas.length > 0);
      case "status":
        return data
          .map((customer) => ({
            ...customer,
            areas: customer.areas
              .map((area) => ({
                ...area,
                contracts: area.contracts.filter(
                  (contract) => contract.yearly_status === chartFilter.value,
                ),
              }))
              .filter((area) => area.contracts.length > 0),
          }))
          .filter((customer) => customer.areas.length > 0);
      default:
        return data;
    }
  }, [data, chartFilter]);

  // Calculate statistics
  const stats = {
    totalCustomers: data.length,
    totalContracts: data.reduce(
      (sum, c) =>
        sum + c.areas.reduce((aSum, a) => aSum + a.contracts.length, 0),
      0,
    ),
    completed: data.reduce(
      (sum, c) =>
        sum +
        c.areas.reduce(
          (aSum, a) =>
            aSum +
            a.contracts.filter((con) => con.yearly_status === "completed")
              .length,
          0,
        ),
      0,
    ),
    inProgress: data.reduce(
      (sum, c) =>
        sum +
        c.areas.reduce(
          (aSum, a) =>
            aSum +
            a.contracts.filter((con) => con.yearly_status === "in_progress")
              .length,
          0,
        ),
      0,
    ),
    notStarted: data.reduce(
      (sum, c) =>
        sum +
        c.areas.reduce(
          (aSum, a) =>
            aSum +
            a.contracts.filter((con) => con.yearly_status === "not_started")
              .length,
          0,
        ),
      0,
    ),
  };

  if (authLoading) {
    if (authTimedOut) {
      return <TimeoutFallback onRetry={() => window.location.reload()} />;
    }
    return <LoadingSpinner fullScreen text="Memuat..." />;
  }

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader />

      <main className="container mx-auto px-4 mt-5 sm:px-6 lg:px-8">
        <div className="space-y-4 sm:space-y-6">
          {/* Page Title */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight">
                Monitoring Kontrak BAPP
              </h1>
              <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                <span className="hidden sm:inline">
                  Pantau progress kontrak BAPP untuk semua customer dan daerah
                </span>
                <span className="sm:hidden">Progress kontrak BAPP</span>
                {settings.autoRefresh && (
                  <span className="flex items-center gap-1 text-xs bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-300 px-2 py-0.5 rounded-full">
                    <RefreshCw className="h-3 w-3 animate-spin" />
                    Auto {settings.refreshInterval}s
                  </span>
                )}
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowExportDialog(true)}
                title="Ctrl+E"
                className="flex-1 sm:flex-none"
              >
                <Download className="mr-2 h-4 w-4" />
                <span className="hidden sm:inline">Export</span>
                <ShortcutHint shortcut={SHORTCUTS.EXPORT} />
              </Button>
              {isAdmin && (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowImportDialog(true)}
                    className="flex-1 sm:flex-none"
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    <span className="hidden sm:inline">Import Tahun</span>
                    <span className="sm:hidden">Import</span>
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => setShowContractDialog(true)}
                    title="Ctrl+N"
                    className="flex-1 sm:flex-none"
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    <span className="hidden sm:inline">Tambah Kontrak</span>
                    <span className="sm:hidden">Tambah</span>
                    <ShortcutHint shortcut={SHORTCUTS.NEW_CONTRACT} />
                  </Button>
                </>
              )}
            </div>
          </div>

          {/* Statistics Cards & Filter Section */}
          <div className="flex flex-col lg:flex-col gap-3 sm:gap-4">
            {/* Statistics Cards */}
            <Card className="p-3 sm:p-4">
              {isLoading ? (
                <ContainerSpinner
                  text="Memuat statistik..."
                  className="min-h-20"
                />
              ) : (
                <div className="grid gap-2 sm:gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-5">
                  <div className="flex items-center gap-3 p-2 sm:p-3 rounded-lg bg-muted/50 border">
                    <Building2 className="h-5 w-5 text-muted-foreground shrink-0" />
                    <div>
                      <p className="text-xs text-muted-foreground">Customer</p>
                      <p className="text-lg sm:text-xl font-bold">
                        {stats.totalCustomers}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 p-2 sm:p-3 rounded-lg bg-muted/80 border">
                    <FileText className="h-5 w-5 text-muted-foreground shrink-0" />
                    <div>
                      <p className="text-xs text-muted-foreground">Kontrak</p>
                      <p className="text-lg sm:text-xl font-bold">
                        {stats.totalContracts}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 p-2 sm:p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border">
                    <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
                    <div>
                      <p className="text-xs text-muted-foreground">Selesai</p>
                      <p className="text-lg sm:text-xl font-bold text-emerald-600">
                        {stats.completed}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 p-2 sm:p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 border">
                    <Clock className="h-5 w-5 text-amber-600 shrink-0" />
                    <div>
                      <p className="text-xs text-muted-foreground">Proses</p>
                      <p className="text-lg sm:text-xl font-bold text-amber-600">
                        {stats.inProgress}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 p-2 sm:p-3 rounded-lg bg-neutral-100 dark:bg-neutral-800/50 col-span-2 sm:col-span-1 border">
                    <AlertCircle className="h-5 w-5 text-neutral-500 shrink-0" />
                    <div>
                      <p className="text-xs text-muted-foreground">
                        Belum Mulai
                      </p>
                      <p className="text-lg sm:text-xl font-bold text-neutral-500">
                        {stats.notStarted}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </Card>

            {/* Progress Charts */}
            <ProgressCharts
              data={data}
              isLoading={isLoading}
              onFilterChange={setChartFilter}
              activeFilter={chartFilter}
              onRefresh={() => loadData()}
            />
          </div>

          {/* Filter Section */}
          <div className="my-3 sm:my-4">
            <Card className="shadow-sm">
              <CardContent className="pt-4 sm:pt-6 pb-4">
                <DashboardFiltersBar
                  filters={filters}
                  onFiltersChange={setFilters}
                  customers={chartFilteredData}
                />
              </CardContent>
            </Card>
          </div>

          {/* BAPP Table */}
          <div>
            <div className="h-[calc(100vh-420px)] sm:h-[calc(100vh-380px)] min-h-64 sm:min-h-96 rounded-lg border shadow-sm overflow-auto isolate">
              <BAPPTable
                data={chartFilteredData}
                filters={filters}
                isLoading={isLoading}
                isAdmin={isAdmin}
                onProgressUpdate={handleProgressUpdate}
                onRefresh={() => loadData()}
                year={filters.year}
                showPercentage={settings.showProgressPercentage}
              />
            </div>
          </div>

          {/* Contract Form Dialog */}
          <ContractFormDialog
            open={showContractDialog}
            onOpenChange={setShowContractDialog}
            onSave={handleContractSave}
          />

          {/* Import Year Dialog */}
          <ImportYearDialog
            open={showImportDialog}
            onOpenChange={setShowImportDialog}
            currentYear={filters.year}
            onImportComplete={loadData}
          />

          {/* Export Dialog */}
          <ExportDialog
            open={showExportDialog}
            onOpenChange={setShowExportDialog}
            data={data}
            year={filters.year}
          />

          {/* Keyboard Shortcuts Dialog */}
          <KeyboardShortcutsDialog
            open={showShortcutsDialog}
            onOpenChange={setShowShortcutsDialog}
          />
        </div>
      </main>
    </div>
  );
}
