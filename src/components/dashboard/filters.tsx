"use client";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, X, Filter } from "lucide-react";
import type { DashboardFilters, CustomerWithAreas } from "@/types/database";

// Install select component
// We'll create a simple select for now

interface DashboardFiltersProps {
  filters: DashboardFilters;
  onFiltersChange: (filters: DashboardFilters) => void;
  customers: CustomerWithAreas[];
}

export function DashboardFiltersBar({
  filters,
  onFiltersChange,
  customers,
}: DashboardFiltersProps) {
  const currentYear = new Date().getFullYear();
  // Generate years: 2 years before to 2 years after current year
  const years = Array.from({ length: 5 }, (_, i) => currentYear - 2 + i);

  const handleSearchChange = (value: string) => {
    onFiltersChange({ ...filters, search: value });
  };

  const handleYearChange = (value: string) => {
    onFiltersChange({ ...filters, year: parseInt(value) });
  };

  const handleCustomerChange = (value: string) => {
    onFiltersChange({
      ...filters,
      customer_id: value === "all" ? null : value,
    });
  };

  const handleInvoiceTypeChange = (value: string) => {
    onFiltersChange({
      ...filters,
      invoice_type: value === "all" ? null : value,
    });
  };

  const handleStatusChange = (
    value: "all" | "completed" | "in_progress" | "not_started"
  ) => {
    onFiltersChange({ ...filters, status: value });
  };

  const clearFilters = () => {
    onFiltersChange({
      year: currentYear,
      search: "",
      customer_id: null,
      invoice_type: null,
      status: "all",
    });
  };

  const hasActiveFilters =
    filters.search ||
    filters.customer_id ||
    filters.invoice_type ||
    filters.status !== "all";

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <Filter className="h-5 w-5 text-muted-foreground" />
          <h2 className="font-medium">Filter & Pencarian</h2>
        </div>
        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearFilters}
            className="w-fit"
          >
            <X className="mr-2 h-4 w-4" />
            Reset Filter
          </Button>
        )}
      </div>

      <div className="grid grid-cols-2 sm:flex sm:flex-row gap-2 sm:gap-4 sm:flex-wrap">
        {/* Search */}
        <div className="relative col-span-2">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Cari kontrak..."
            value={filters.search}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Year */}
        <Select
          value={filters.year.toString()}
          onValueChange={handleYearChange}
        >
          <SelectTrigger className="w-full sm:w-auto">
            <SelectValue placeholder="Pilih Tahun" />
          </SelectTrigger>
          <SelectContent>
            {years.map((year) => (
              <SelectItem key={year} value={year.toString()}>
                {year}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Customer */}
        <Select
          value={filters.customer_id || "all"}
          onValueChange={handleCustomerChange}
        >
          <SelectTrigger className="w-full sm:w-auto">
            <SelectValue placeholder="Semua Customer" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Customer</SelectItem>
            {customers.map((customer) => (
              <SelectItem key={customer.id} value={customer.id}>
                {customer.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Status */}
        <Select value={filters.status} onValueChange={handleStatusChange}>
          <SelectTrigger className="col-span-2 sm:col-span-1 w-full sm:w-auto">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Status</SelectItem>
            <SelectItem value="completed">Selesai</SelectItem>
            <SelectItem value="in_progress">Dalam Proses</SelectItem>
            <SelectItem value="not_started">Belum Mulai</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
