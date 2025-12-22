"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/components/providers/auth-provider";
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
  HelpCircle,
} from "lucide-react";

export function DashboardContent() {
  const { loading: authLoading, isPlaceholderMode, user } = useAuth();
  const [data, setData] = useState<CustomerWithAreas[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showContractDialog, setShowContractDialog] = useState(false);
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
  const loadData = useCallback(async () => {
    setIsLoading(true);

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
      setIsLoading(false);
    }
  }, [filters.year, isPlaceholderMode]);

  // Fetch data on mount and when year changes
  useEffect(() => {
    if (!authLoading) {
      loadData();
    }
  }, [authLoading, loadData]);

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

      <main className="container mx-auto px-4 py-6 sm:px-6 lg:px-8">
        <div className="space-y-6">
          {/* Page Title */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold tracking-tight">
                Monitoring Kontrak BAPP
              </h1>
              <p className="text-muted-foreground">
                Pantau progress kontrak BAPP untuk semua customer dan daerah
              </p>
            </div>
            <Button onClick={() => setShowContractDialog(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Tambah Kontrak
            </Button>
          </div>

          {/* Statistics Cards */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Total Customer
                </CardTitle>
                <Building2 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalCustomers}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Total Kontrak
                </CardTitle>
                <FileText className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalContracts}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Selesai</CardTitle>
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-emerald-600">
                  {stats.completed}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Dalam Proses
                </CardTitle>
                <Clock className="h-4 w-4 text-amber-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-amber-600">
                  {stats.inProgress}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Belum Mulai
                </CardTitle>
                <AlertCircle className="h-4 w-4 text-neutral-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-neutral-500">
                  {stats.notStarted}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Sticky Filter Section */}
        <div className="sticky top-16 z-30 bg-background pt-4 pb-2">
          <Card className="shadow-sm">
            <CardContent className="pt-6">
              <DashboardFiltersBar
                filters={filters}
                onFiltersChange={setFilters}
                customers={data}
              />
            </CardContent>
          </Card>

          {/* Progress Legend */}
          <div className="flex flex-wrap items-center gap-4 text-sm mt-4 px-1">
            <span className="text-muted-foreground">Keterangan Progress:</span>
            <div className="flex items-center gap-2">
              <div className="h-4 w-4 rounded bg-emerald-100 dark:bg-emerald-950" />
              <span>100%</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-4 w-4 rounded bg-teal-100 dark:bg-teal-950" />
              <span>75-99%</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-4 w-4 rounded bg-amber-100 dark:bg-amber-950" />
              <span>50-74%</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-4 w-4 rounded bg-orange-100 dark:bg-orange-950" />
              <span>25-49%</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-4 w-4 rounded bg-rose-100 dark:bg-rose-950" />
              <span>1-24%</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-4 w-4 rounded bg-neutral-100 dark:bg-neutral-800" />
              <span>0%</span>
            </div>
            <div className="ml-auto flex items-center gap-2 text-xs text-muted-foreground">
              <HelpCircle className="h-3 w-3" />
              <span>
                Kontrak dengan nama yang sama akan digabung barisnya secara
                otomatis
              </span>
            </div>
          </div>
        </div>

        {/* BAPP Table - Taller with more padding */}
        <div className="mt-4 pb-8">
          <div className="h-[calc(100vh-320px)] min-h-[500px] overflow-auto rounded-lg border shadow-sm">
            <BAPPTable
              data={data}
              filters={filters}
              isLoading={isLoading}
              isAdmin={isAdmin}
              onProgressUpdate={handleProgressUpdate}
              year={filters.year}
            />
          </div>
        </div>

        {/* Contract Form Dialog */}
        <ContractFormDialog
          open={showContractDialog}
          onOpenChange={setShowContractDialog}
          onSave={handleContractSave}
        />
      </main>
    </div>
  );
}
