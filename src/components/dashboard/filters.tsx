"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Search, X, Filter, Calendar, ChevronLeft, ChevronRight } from "lucide-react";
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
  const [yearPickerOpen, setYearPickerOpen] = useState(false);
  const [displayYearRange, setDisplayYearRange] = useState(currentYear);
  
  // Generate years: 2 years before to 2 years after current year (fallback untuk select biasa)
  const years = Array.from({ length: 5 }, (_, i) => currentYear - 2 + i);
  
  // Generate years for popover (12 years in a grid)
  const startYear = Math.floor(displayYearRange / 12) * 12;
  const yearGrid = Array.from({ length: 12 }, (_, i) => startYear + i);

  const handleSearchChange = (value: string) => {
    onFiltersChange({ ...filters, search: value });
  };

  const handleYearChange = (value: string) => {
    onFiltersChange({ ...filters, year: parseInt(value) });
  };

  const handleYearSelect = (year: number) => {
    onFiltersChange({ ...filters, year });
    setYearPickerOpen(false);
  };

  const goToPreviousDecade = () => {
    setDisplayYearRange(displayYearRange - 12);
  };

  const goToNextDecade = () => {
    setDisplayYearRange(displayYearRange + 12);
  };

  const handleCustomerChange = (value: string) => {
    onFiltersChange({
      ...filters,
      customer_id: value === "all" ? null : value,
      // Reset area when customer changes
      area_name: value === "all" ? null : filters.area_name,
    });
  };

  const handleAreaChange = (value: string) => {
    onFiltersChange({
      ...filters,
      area_name: value === "all" ? null : value,
    });
  };

  const handlePeriodChange = (value: string) => {
    onFiltersChange({
      ...filters,
      period: value === "all" ? null : value,
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
      area_name: null,
      period: null,
      invoice_type: null,
      status: "all",
    });
  };

  const hasActiveFilters =
    filters.search ||
    filters.customer_id ||
    filters.area_name ||
    filters.period ||
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
        <div className="relative col-span-2 w-[25vw]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Cari kontrak..."
            value={filters.search}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Year Picker */}
        <Popover open={yearPickerOpen} onOpenChange={setYearPickerOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className="w-full sm:w-auto justify-start text-left font-normal"
            >
              <Calendar className="mr-2 h-4 w-4" />
              Tahun: {filters.year}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <div className="p-3">
              {/* Header with navigation */}
              <div className="flex items-center justify-between mb-3">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-7 w-7"
                  onClick={goToPreviousDecade}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <div className="text-sm font-medium">
                  {startYear} - {startYear + 11}
                </div>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-7 w-7"
                  onClick={goToNextDecade}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
              
              {/* Year grid */}
              <div className="grid grid-cols-4 gap-2">
                {yearGrid.map((year) => (
                  <Button
                    key={year}
                    variant={filters.year === year ? "default" : "outline"}
                    className="h-9"
                    onClick={() => handleYearSelect(year)}
                  >
                    {year}
                  </Button>
                ))}
              </div>

              {/* Quick action: Today */}
              <div className="mt-3 pt-3 border-t">
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full"
                  onClick={() => handleYearSelect(currentYear)}
                >
                  Tahun Ini ({currentYear})
                </Button>
              </div>
            </div>
          </PopoverContent>
        </Popover>

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

        {/* Area */}
        <Select
          value={filters.area_name || "all"}
          onValueChange={handleAreaChange}
        >
          <SelectTrigger className="w-full sm:w-auto">
            <SelectValue placeholder="Semua Area" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Area</SelectItem>
            {/* Get unique area names from all customers or filtered customer */}
            {Array.from(
              new Set(
                (filters.customer_id
                  ? customers.filter((c) => c.id === filters.customer_id)
                  : customers
                )
                  .flatMap((c) => c.areas || [])
                  .map((area) => area.name)
              )
            )
              .sort((a, b) => a.localeCompare(b))
              .map((areaName) => (
                <SelectItem key={areaName} value={areaName}>
                  {areaName}
                </SelectItem>
              ))}
          </SelectContent>
        </Select>

        {/* Periode */}
        <Select
          value={filters.period || "all"}
          onValueChange={handlePeriodChange}
        >
          <SelectTrigger className="w-full sm:w-auto">
            <SelectValue placeholder="Semua Periode" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Periode</SelectItem>
            <SelectItem value="Per 1/2 Bulan">Per 1/2 Bulan</SelectItem>
            <SelectItem value="Per 1 Bulan">Per 1 Bulan</SelectItem>
            <SelectItem value="Per 2 Bulan">Per 2 Bulan</SelectItem>
            <SelectItem value="Per 3 Bulan">Per 3 Bulan</SelectItem>
            <SelectItem value="Per 4 Bulan">Per 4 Bulan</SelectItem>
            <SelectItem value="Per 6 Bulan">Per 6 Bulan</SelectItem>
            <SelectItem value="Per 12 Bulan">Per 12 Bulan</SelectItem>
          </SelectContent>
        </Select>

        {/* Status (hidden) */}
        <div className="hidden">
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
    </div>
  );
}
