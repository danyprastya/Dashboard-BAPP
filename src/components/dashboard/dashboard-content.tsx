"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/components/providers/auth-provider";
import { useSettings } from "@/components/providers/settings-provider";
import { DashboardHeader } from "./header";
import { DashboardFiltersBar } from "./filters";
import { BAPPTable } from "./bapp-table";
import { ContractFormDialog } from "./contract-form-dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LoadingSpinner } from "@/components/ui/loading";
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

export function DashboardContent() {
  const { loading: authLoading, isPlaceholderMode, user } = useAuth();
  const { settings, updateSettings } = useSettings();
  const { setIsOpen: setNotificationSidebarOpen } = useNotifications();
  const [data, setData] = useState<CustomerWithAreas[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showContractDialog, setShowContractDialog] = useState(false);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [showShortcutsDialog, setShowShortcutsDialog] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const [filters, setFilters] = useState<DashboardFilters>({
    year: new Date().getFullYear(),
    search: "",
    customer_id: null,
    invoice_type: null,
    status: "all",
  });

  // For demo purposes, treat logged in users as admin
  // In production, you'd check user.role or user_metadata
  const isAdmin = !!user;

  // Fetch data function
  const loadData = useCallback(
    async (silent = false) => {
      if (!silent) setIsLoading(true);

      try {
        // Simulate loading delay
        await new Promise((resolve) => setTimeout(resolve, 500));

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
    [filters.year, isPlaceholderMode]
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
            'input[placeholder*="Cari"]'
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
    [loadData, settings.theme, updateSettings, setNotificationSidebarOpen]
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

  // Calculate statistics
  const stats = {
    totalCustomers: data.length,
    totalContracts: data.reduce(
      (sum, c) =>
        sum + c.areas.reduce((aSum, a) => aSum + a.contracts.length, 0),
      0
    ),
    completed: data.reduce(
      (sum, c) =>
        sum +
        c.areas.reduce(
          (aSum, a) =>
            aSum +
            a.contracts.filter((con) => con.yearly_status === "completed")
              .length,
          0
        ),
      0
    ),
    inProgress: data.reduce(
      (sum, c) =>
        sum +
        c.areas.reduce(
          (aSum, a) =>
            aSum +
            a.contracts.filter((con) => con.yearly_status === "in_progress")
              .length,
          0
        ),
      0
    ),
    notStarted: data.reduce(
      (sum, c) =>
        sum +
        c.areas.reduce(
          (aSum, a) =>
            aSum +
            a.contracts.filter((con) => con.yearly_status === "not_started")
              .length,
          0
        ),
      0
    ),
  };

  if (authLoading) {
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
            </div>
          </div>

          {/* Statistics Cards */}
          <div className="grid gap-3 sm:gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-5">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-xs sm:text-[1rem] font-medium">
                  Total Customer
                </CardTitle>
                <Building2 className="h-4 w-4 sm:h-6 sm:w-6 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl sm:text-3xl font-bold">
                  {stats.totalCustomers}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-xs sm:text-[1rem] font-medium">
                  Total Kontrak
                </CardTitle>
                <FileText className="h-4 w-4 sm:h-6 sm:w-6 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl sm:text-3xl font-bold">
                  {stats.totalContracts}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Filter Section */}
        <div className="my-3 sm:my-4">
          <Card className="shadow-sm">
            <CardContent className="pt-4 sm:pt-6 pb-4">
              <DashboardFiltersBar
                filters={filters}
                onFiltersChange={setFilters}
                customers={data}
              />
            </CardContent>
          </Card>
        </div>

        {/* BAPP Table */}
        <div>
          <div className="h-[calc(100vh-320px)] sm:h-[calc(100vh-280px)] min-h-64 sm:min-h-96 rounded-lg border shadow-sm overflow-auto isolate">
            <BAPPTable
              data={data}
              filters={filters}
              isLoading={isLoading}
              isAdmin={isAdmin}
              onProgressUpdate={handleProgressUpdate}
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
      </main>
    </div>
  );
}
