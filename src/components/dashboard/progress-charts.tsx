"use client";

import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import {
  Building2,
  MapPin,
  X,
  BarChart3,
  PieChart as PieChartIcon,
  TrendingUp,
  MousePointerClick,
} from "lucide-react";
import type { CustomerWithAreas, ContractWithProgress } from "@/types/database";

// =============================================================================
// CONFIGURATION - Easily adjustable settings for maintenance and scalability
// =============================================================================

const CHART_CONFIG = {
  // Bar chart settings
  bar: {
    minHeight: 300, // px - minimum height of bar chart container
    maxHeight: 450, // px - maximum height before scroll
    barHeight: 32, // px - height per bar
    labelWidth: 140, // px - width for Y-axis labels (customer/area names)
    labelMaxChars: 25, // max characters before truncating
    barRadius: [0, 4, 4, 0] as [number, number, number, number],
    margin: { top: 10, right: 30, left: 10, bottom: 10 },
  },
  // Pie chart settings
  pie: {
    height: 220, // px
    innerRadius: 45,
    outerRadius: 75,
    paddingAngle: 2,
  },
  // Responsive breakpoints
  responsive: {
    barHeightMobile: 280,
    labelWidthMobile: 100,
    labelMaxCharsMobile: 18,
  },
} as const;

// Color palette - centralized for easy theming
const COLORS = {
  primary: "#3b82f6", // blue-500
  secondary: "#8b5cf6", // violet-500
  success: "#10b981", // emerald-500
  warning: "#f59e0b", // amber-500
  danger: "#ef4444", // red-500
  muted: "#6b7280", // gray-500
} as const;

const STATUS_CONFIG = {
  completed: { color: "#10b981", label: "Selesai" },
  in_progress: { color: "#f59e0b", label: "Dalam Proses" },
  not_started: { color: "#6b7280", label: "Belum Mulai" },
} as const;

type StatusType = keyof typeof STATUS_CONFIG;

// =============================================================================
// TYPES
// =============================================================================

export interface ChartFilter {
  type: "customer" | "area" | "status";
  value: string;
  label: string;
}

interface ProgressChartsProps {
  data: CustomerWithAreas[];
  onFilterChange: (filter: ChartFilter | null) => void;
  activeFilter: ChartFilter | null;
}

interface BarDataItem {
  id: string;
  name: string;
  fullName: string;
  progress: number;
  contracts: number;
  completedContracts: number;
  inProgressContracts: number;
  notStartedContracts: number;
  customerId?: string;
  customerName?: string;
}

interface StatusDataItem {
  name: string;
  value: number;
  percentage: number;
  status: StatusType;
  fill: string;
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Truncates text to maxChars and adds ellipsis if needed
 */
function truncateText(text: string, maxChars: number): string {
  return text.length > maxChars ? text.substring(0, maxChars) + "..." : text;
}

/**
 * Gets the appropriate color based on progress percentage
 */
function getProgressColor(progress: number, isSelected: boolean): string {
  if (isSelected) return COLORS.secondary;
  if (progress >= 75) return COLORS.success;
  if (progress >= 50) return COLORS.warning;
  if (progress > 0) return COLORS.danger;
  return COLORS.muted;
}

/**
 * Get relevant month indices for a contract period
 * Per 12 Bulan → [11] (December only)
 * Per 6 Bulan → [5, 11] (June, December)
 * Per 3 Bulan → [2, 5, 8, 11] (March, June, September, December)
 * Per 2 Bulan → [1, 3, 5, 7, 9, 11] (Feb, Apr, Jun, Aug, Oct, Dec)
 * Per 1 Bulan → [0-11] (all months)
 */
function getRelevantMonthIndices(period: string): number[] {
  const p = period.toLowerCase();

  if (p.includes("12 bulan") || p.includes("per 12")) {
    return [11]; // December
  }
  if (p.includes("6 bulan") || p.includes("per 6")) {
    return [5, 11]; // June, December
  }
  if (p.includes("3 bulan") || p.includes("per 3")) {
    return [2, 5, 8, 11]; // March, June, September, December
  }
  if (p.includes("2 bulan") || p.includes("per 2")) {
    return [1, 3, 5, 7, 9, 11]; // Feb, Apr, Jun, Aug, Oct, Dec
  }
  // Default: monthly - all months
  return [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
}

/**
 * Calculate progress for a single contract based on its period
 * Only counts relevant months based on the contract period
 * Returns average percentage of relevant month entries
 */
function calculateContractProgress(contract: ContractWithProgress): number {
  const relevantMonths = getRelevantMonthIndices(contract.period);

  // Get monthly progress for relevant months only
  const relevantProgress = contract.monthly_progress.filter((mp) =>
    relevantMonths.includes(mp.month - 1),
  );

  if (relevantProgress.length === 0) {
    return 0;
  }

  // Sum all percentages from relevant months
  const totalPercentage = relevantProgress.reduce(
    (sum, mp) => sum + mp.percentage,
    0,
  );

  // Average = total / expected number of entries
  return totalPercentage / relevantMonths.length;
}

/**
 * Calculates contract statistics and overall progress for a group of contracts
 * Progress = average of all contracts' individual progress
 * Each contract's progress is calculated based on its period and relevant months
 */
function calculateContractStats(contracts: ContractWithProgress[]): {
  progress: number;
  total: number;
  completed: number;
  inProgress: number;
  notStarted: number;
} {
  if (contracts.length === 0) {
    return {
      progress: 0,
      total: 0,
      completed: 0,
      inProgress: 0,
      notStarted: 0,
    };
  }

  const stats = contracts.reduce(
    (acc, contract) => {
      acc.total++;
      if (contract.yearly_status === "completed") acc.completed++;
      else if (contract.yearly_status === "in_progress") acc.inProgress++;
      else acc.notStarted++;
      return acc;
    },
    { total: 0, completed: 0, inProgress: 0, notStarted: 0 },
  );

  // Calculate progress as average of all contracts' progress
  // Each contract progress considers only its relevant period months
  let totalProgress = 0;
  contracts.forEach((contract) => {
    totalProgress += calculateContractProgress(contract);
  });

  // Average progress across all contracts
  const progress = totalProgress / contracts.length;

  return { progress, ...stats };
}

// =============================================================================
// TOOLTIP COMPONENTS
// =============================================================================

// Custom tooltip for bar charts
const CustomBarTooltip = ({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ value: number; payload: BarDataItem }>;
}) => {
  if (!active || !payload?.length) return null;

  const data = payload[0].payload;
  return (
    <div className="bg-popover border rounded-lg shadow-lg p-3 text-sm z-50">
      <p className="font-medium mb-1">{data.fullName}</p>
      {data.customerName && (
        <p className="text-xs text-muted-foreground mb-1">
          {data.customerName}
        </p>
      )}
      <div className="space-y-1 mt-2">
        <p className="text-muted-foreground">
          Kontrak Selesai:{" "}
          <span className="font-medium text-emerald-600">
            {data.completedContracts}/{data.contracts}
          </span>
        </p>
        {data.inProgressContracts > 0 && (
          <p className="text-muted-foreground">
            Dalam Proses:{" "}
            <span className="font-medium text-amber-600">
              {data.inProgressContracts}
            </span>
          </p>
        )}
        {data.notStartedContracts > 0 && (
          <p className="text-muted-foreground">
            Belum Mulai:{" "}
            <span className="font-medium text-gray-500">
              {data.notStartedContracts}
            </span>
          </p>
        )}
        <div className="border-t pt-1 mt-1">
          <p className="text-muted-foreground">
            Progress:{" "}
            <span className="font-bold text-foreground">
              {payload[0].value.toFixed(1)}%
            </span>
          </p>
        </div>
      </div>
    </div>
  );
};

// Custom tooltip for pie chart
const CustomPieTooltip = ({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{
    name: string;
    value: number;
    payload: StatusDataItem;
  }>;
}) => {
  if (!active || !payload?.length) return null;

  const data = payload[0].payload;
  return (
    <div className="bg-popover border rounded-lg shadow-lg p-3 text-sm z-50">
      <p className="font-medium">{data.name}</p>
      <div className="space-y-0.5">
        <p className="text-muted-foreground">
          Kontrak:{" "}
          <span className="font-medium text-foreground">{data.value}</span>
        </p>
        <p className="text-muted-foreground">
          Persentase:{" "}
          <span className="font-medium text-foreground">
            {data.percentage.toFixed(1)}%
          </span>
        </p>
      </div>
    </div>
  );
};

// Custom Y-axis tick component for clickable labels
interface CustomYAxisTickProps {
  x?: string | number;
  y?: string | number;
  payload?: { value: string; index: number };
  chartData: BarDataItem[];
  onLabelClick: (item: BarDataItem) => void;
  activeId: string | null;
}

const CustomYAxisTick = ({
  x = 0,
  y = 0,
  payload,
  chartData,
  onLabelClick,
  activeId,
}: CustomYAxisTickProps) => {
  if (!payload) return null;

  // Find item by matching the truncated name (payload.value) with chartData
  const item = chartData.find((d) => d.name === payload.value);
  if (!item) return null;

  const isActive = activeId === item.id;
  const xNum = typeof x === "string" ? parseFloat(x) : x;
  const yNum = typeof y === "string" ? parseFloat(y) : y;

  return (
    <g transform={`translate(${xNum},${yNum})`}>
      <text
        x={-5}
        y={0}
        dy={4}
        textAnchor="end"
        fill="currentColor"
        fontSize={12}
        fontWeight={isActive ? 600 : 400}
        className="cursor-pointer hover:fill-primary transition-colors"
        onClick={() => onLabelClick(item)}
        style={{
          textDecoration: isActive ? "underline" : "none",
          pointerEvents: "all",
        }}
      >
        {payload.value}
      </text>
    </g>
  );
};

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function ProgressCharts({
  data,
  onFilterChange,
  activeFilter,
}: ProgressChartsProps) {
  const [chartView, setChartView] = useState<"customer" | "area">("customer");

  // Calculate customer progress data - show ALL customers, sorted by progress
  const customerData = useMemo((): BarDataItem[] => {
    return data
      .map((customer) => {
        const allContracts = customer.areas.flatMap((area) => area.contracts);
        const stats = calculateContractStats(allContracts);
        return {
          id: customer.id,
          name: truncateText(customer.name, CHART_CONFIG.bar.labelMaxChars),
          fullName: customer.name,
          progress: stats.progress,
          contracts: stats.total,
          completedContracts: stats.completed,
          inProgressContracts: stats.inProgress,
          notStartedContracts: stats.notStarted,
        };
      })
      .sort((a, b) => b.progress - a.progress);
  }, [data]);

  // Calculate area progress data - show ALL areas, sorted by progress
  const areaData = useMemo((): BarDataItem[] => {
    const areas: BarDataItem[] = [];

    data.forEach((customer) => {
      customer.areas.forEach((area) => {
        const stats = calculateContractStats(area.contracts);
        areas.push({
          id: area.id,
          customerId: customer.id,
          name: truncateText(area.name, CHART_CONFIG.bar.labelMaxChars),
          fullName: area.name,
          customerName: customer.name,
          progress: stats.progress,
          contracts: stats.total,
          completedContracts: stats.completed,
          inProgressContracts: stats.inProgress,
          notStartedContracts: stats.notStarted,
        });
      });
    });

    return areas.sort((a, b) => b.progress - a.progress);
  }, [data]);

  // Get the selected bar data for pie chart context
  const selectedBarData = useMemo((): BarDataItem | null => {
    if (!activeFilter) return null;
    if (activeFilter.type === "customer") {
      return customerData.find((c) => c.id === activeFilter.value) || null;
    }
    if (activeFilter.type === "area") {
      return areaData.find((a) => a.id === activeFilter.value) || null;
    }
    return null;
  }, [activeFilter, customerData, areaData]);

  // Calculate status distribution - dynamic based on selected filter
  const statusData = useMemo((): StatusDataItem[] => {
    let statusCount: Record<StatusType, number>;

    // If a customer or area is selected, show their specific status distribution
    if (selectedBarData) {
      statusCount = {
        completed: selectedBarData.completedContracts,
        in_progress: selectedBarData.inProgressContracts,
        not_started: selectedBarData.notStartedContracts,
      };
    } else {
      // Otherwise show overall distribution
      statusCount = {
        completed: 0,
        in_progress: 0,
        not_started: 0,
      };

      data.forEach((customer) => {
        customer.areas.forEach((area) => {
          area.contracts.forEach((contract) => {
            const status = contract.yearly_status as StatusType;
            if (status in statusCount) {
              statusCount[status]++;
            }
          });
        });
      });
    }

    const total = Object.values(statusCount).reduce((a, b) => a + b, 0);

    return (
      Object.entries(STATUS_CONFIG) as [
        StatusType,
        (typeof STATUS_CONFIG)[StatusType],
      ][]
    )
      .map(([status, config]) => ({
        name: config.label,
        value: statusCount[status],
        percentage: total > 0 ? (statusCount[status] / total) * 100 : 0,
        status,
        fill: config.color,
      }))
      .filter((item) => item.value > 0);
  }, [data, selectedBarData]);

  // Handle bar click for filtering
  const handleBarClick = (barData: BarDataItem) => {
    if (!barData.id) return;

    const filterType = chartView;
    const isAlreadySelected =
      activeFilter?.type === filterType && activeFilter.value === barData.id;

    if (isAlreadySelected) {
      onFilterChange(null);
    } else {
      onFilterChange({
        type: filterType,
        value: barData.id,
        label: barData.fullName,
      });
    }
  };

  // Handle pie click for status filtering
  const handlePieClick = (pieData: StatusDataItem) => {
    if (!pieData.status) return;

    const isAlreadySelected =
      activeFilter?.type === "status" && activeFilter.value === pieData.status;

    if (isAlreadySelected) {
      onFilterChange(null);
    } else {
      onFilterChange({
        type: "status",
        value: pieData.status,
        label: pieData.name,
      });
    }
  };

  // Calculate summary statistics - dynamic based on selected filter
  const summaryStats = useMemo(() => {
    if (selectedBarData) {
      return {
        totalContracts: selectedBarData.contracts,
        progress: selectedBarData.progress,
        label: selectedBarData.fullName,
      };
    }

    // Overall stats
    const allContracts = data.flatMap((c) =>
      c.areas.flatMap((a) => a.contracts),
    );
    const stats = calculateContractStats(allContracts);

    return {
      totalContracts: stats.total,
      progress: stats.progress,
      label: "Semua Data",
    };
  }, [data, selectedBarData]);

  // Current chart data based on view
  const currentChartData = chartView === "customer" ? customerData : areaData;

  // Dynamic height based on number of bars - allow scrolling if too many
  const chartContentHeight = Math.max(
    CHART_CONFIG.bar.minHeight,
    currentChartData.length * CHART_CONFIG.bar.barHeight,
  );

  // Container height with max limit for scrolling
  const chartContainerHeight = Math.min(
    chartContentHeight,
    CHART_CONFIG.bar.maxHeight,
  );

  // Whether scrolling is needed
  const needsScroll = chartContentHeight > CHART_CONFIG.bar.maxHeight;

  if (data.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      {/* Active Filter Banner */}
      {activeFilter && (
        <div className="flex items-center gap-2 p-3 bg-primary/10 border border-primary/20 rounded-lg">
          <TrendingUp className="h-4 w-4 text-primary" />
          <span className="text-sm">
            Menampilkan data untuk:{" "}
            <span className="font-medium">{activeFilter.label}</span>
          </span>
          <Button
            variant="ghost"
            size="sm"
            className="ml-auto h-7 px-2"
            onClick={() => onFilterChange(null)}
          >
            <X className="h-4 w-4 mr-1" />
            Reset
          </Button>
        </div>
      )}

      {/* Charts Grid */}
      <div className="grid gap-4 lg:grid-cols-4">
        {/* Progress by Customer/Area Chart - takes 3 columns */}
        <Card className="lg:col-span-3">
          <CardHeader className="pb-3">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div>
                <CardTitle className="text-base font-medium flex items-center gap-2">
                  <BarChart3 className="h-4 w-4" />
                  Progress{" "}
                  {chartView === "customer" ? "per Customer" : "per Area"}
                </CardTitle>
                <div className="flex items-center gap-1.5 mt-1">
                  <MousePointerClick className="h-3 w-3 text-primary animate-pulse" />
                  <p className="text-xs text-muted-foreground">
                    <span className="text-primary font-medium">
                      Klik nama atau bar
                    </span>{" "}
                    untuk melihat detail & filter tabel
                  </p>
                </div>
              </div>
              <div className="flex gap-1">
                <Button
                  variant={chartView === "customer" ? "default" : "outline"}
                  size="sm"
                  className="h-8 text-xs"
                  onClick={() => setChartView("customer")}
                >
                  <Building2 className="h-3 w-3 mr-1" />
                  Customer
                </Button>
                <Button
                  variant={chartView === "area" ? "default" : "outline"}
                  size="sm"
                  className="h-8 text-xs"
                  onClick={() => setChartView("area")}
                >
                  <MapPin className="h-3 w-3 mr-1" />
                  Area
                </Button>
              </div>
            </div>
            {needsScroll && (
              <p className="text-xs text-muted-foreground mt-1">
                Scroll untuk melihat semua ({currentChartData.length} items)
              </p>
            )}
          </CardHeader>
          <CardContent className="pt-0">
            <div
              className={
                needsScroll
                  ? "overflow-y-auto scrollbar-thin scrollbar-thumb-muted scrollbar-track-transparent"
                  : ""
              }
              style={{ maxHeight: `${chartContainerHeight}px` }}
            >
              <div
                style={{
                  height: `${chartContentHeight}px`,
                  minHeight: `${CHART_CONFIG.bar.minHeight}px`,
                }}
              >
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={currentChartData}
                    layout="vertical"
                    margin={CHART_CONFIG.bar.margin}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      className="stroke-muted"
                      horizontal={true}
                      vertical={false}
                    />
                    <XAxis
                      type="number"
                      domain={[0, 100]}
                      tickFormatter={(v) => `${v}%`}
                      fontSize={12}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      type="category"
                      dataKey="name"
                      width={CHART_CONFIG.bar.labelWidth}
                      tickLine={false}
                      axisLine={false}
                      interval={0}
                      tick={(props) => (
                        <CustomYAxisTick
                          {...props}
                          chartData={currentChartData}
                          onLabelClick={handleBarClick}
                          activeId={
                            activeFilter?.type !== "status"
                              ? activeFilter?.value || null
                              : null
                          }
                        />
                      )}
                    />
                    <Tooltip content={<CustomBarTooltip />} />
                    <Bar
                      dataKey="progress"
                      fill={COLORS.primary}
                      radius={CHART_CONFIG.bar.barRadius}
                      cursor="pointer"
                      onClick={(_data, index) =>
                        handleBarClick(currentChartData[index])
                      }
                      animationDuration={300}
                    >
                      {currentChartData.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={getProgressColor(
                            entry.progress,
                            activeFilter?.value === entry.id,
                          )}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Status Distribution Pie Chart - takes 1 column */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-medium flex items-center gap-2">
              <PieChartIcon className="h-4 w-4" />
              Distribusi Status
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-1">
              {selectedBarData
                ? `Untuk: ${selectedBarData.fullName}`
                : "Klik bar untuk melihat detail"}
            </p>
          </CardHeader>
          <CardContent className="pt-0">
            <div style={{ height: `${CHART_CONFIG.pie.height}px` }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusData}
                    cx="50%"
                    cy="50%"
                    innerRadius={CHART_CONFIG.pie.innerRadius}
                    outerRadius={CHART_CONFIG.pie.outerRadius}
                    paddingAngle={CHART_CONFIG.pie.paddingAngle}
                    dataKey="value"
                    cursor="pointer"
                    onClick={(_data, index) =>
                      handlePieClick(statusData[index])
                    }
                    animationDuration={300}
                  >
                    {statusData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={entry.fill}
                        stroke={
                          activeFilter?.value === entry.status
                            ? COLORS.secondary
                            : "transparent"
                        }
                        strokeWidth={
                          activeFilter?.value === entry.status ? 3 : 0
                        }
                      />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomPieTooltip />} />
                  <Legend
                    verticalAlign="bottom"
                    height={36}
                    formatter={(value) => (
                      <span className="text-xs text-foreground">{value}</span>
                    )}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            {/* Summary statistics */}
            <div className="flex justify-center gap-4 mt-3 pt-3 border-t">
              <div className="text-center">
                <div className="font-bold text-xl">
                  {summaryStats.totalContracts}
                </div>
                <div className="text-xs text-muted-foreground">
                  Total Kontrak
                </div>
              </div>
              <div className="border-l" />
              <div className="text-center">
                <div className="font-bold text-xl text-primary">
                  {summaryStats.progress.toFixed(1)}%
                </div>
                <div className="text-xs text-muted-foreground">
                  Kontrak Selesai
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
