"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/components/providers/auth-provider";
import { DashboardHeader } from "./header";
import { DashboardFiltersBar } from "./filters";
import { BAPPTable } from "./bapp-table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LoadingSpinner } from "@/components/ui/loading";
import {
  generatePlaceholderData,
  calculateYearlyStatus,
} from "@/lib/placeholder-data";
import type { CustomerWithAreas, DashboardFilters } from "@/types/database";
import {
  FileText,
  CheckCircle2,
  Clock,
  AlertCircle,
  Building2,
} from "lucide-react";

export function DashboardContent() {
  const { loading: authLoading, isPlaceholderMode } = useAuth();
  const [data, setData] = useState<CustomerWithAreas[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filters, setFilters] = useState<DashboardFilters>({
    year: new Date().getFullYear(),
    search: "",
    customer_id: null,
    invoice_type: null,
    status: "all",
  });

  // Fetch data (or use placeholder)
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);

      // Simulate loading delay
      await new Promise((resolve) => setTimeout(resolve, 800));

      if (isPlaceholderMode) {
        // Use placeholder data
        const placeholderData = generatePlaceholderData();
        // Update yearly status
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
      } else {
        // TODO: Fetch from Supabase
        // For now, still use placeholder
        const placeholderData = generatePlaceholderData();
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
      }

      setIsLoading(false);
    };

    if (!authLoading) {
      fetchData();
    }
  }, [authLoading, isPlaceholderMode, filters.year]);

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
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              Monitoring Kontrak BAPP
            </h1>
            <p className="text-muted-foreground">
              Pantau progress kontrak BAPP untuk semua customer dan daerah
            </p>
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

          {/* Filters */}
          <Card>
            <CardContent className="pt-6">
              <DashboardFiltersBar
                filters={filters}
                onFiltersChange={setFilters}
                customers={data}
              />
            </CardContent>
          </Card>

          {/* Progress Legend */}
          <div className="flex flex-wrap items-center gap-4 text-sm">
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
          </div>

          {/* BAPP Table */}
          <BAPPTable data={data} filters={filters} isLoading={isLoading} />
        </div>
      </main>
    </div>
  );
}
